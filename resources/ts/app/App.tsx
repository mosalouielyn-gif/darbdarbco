import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Login } from "./components/login";
import { ProductionClerkDashboard } from "./components/dashboards/production-clerk";
import { InventoryBookkeeperDashboard } from "./components/dashboards/inventory-bookkeeper";
import { PayrollPersonnelDashboard } from "./components/dashboards/payroll-personnel";
import { FinanceOfficerDashboard } from "./components/dashboards/finance-officer";
import { ManagerAdminDashboard } from "./components/dashboards/manager-admin";
import { ROLE_LABELS, Role, User } from "./components/types";
import { AppData, fetchAppData, fetchCurrentSession, logout } from "./lib/api";
import { AppDataProvider } from "./lib/app-data-context";
import { usePersistentState } from "./lib/use-persistent-state";

export default function App() {
  const [user, setUser] = usePersistentState<User | null>("darbco.currentUser", null);
  const [data, setData] = useState<AppData | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setData(null);
      toast.error("Your session expired. Please sign in again.");
    };

    window.addEventListener("darbco:session-expired", handleSessionExpired);

    return () => window.removeEventListener("darbco:session-expired", handleSessionExpired);
  }, [setUser]);

  useEffect(() => {
    let active = true;

    fetchCurrentSession()
      .then((authenticatedUser) => {
        if (active) setUser(authenticatedUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
    };
  }, [setUser]);

  useEffect(() => {
    if (!sessionReady || !user) {
      setData(null);
      setDataError("");
      return;
    }

    let active = true;
    setLoadingData(true);
    fetchAppData(normalizeRole(user.role))
      .then((nextData) => {
        if (active) {
          setData(nextData);
          setDataError("");
        }
      })
      .catch((error) => {
        if (active) setDataError(error instanceof Error ? error.message : "Unable to load database records.");
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [sessionReady, user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Clear the local dashboard state even if the server session has expired.
    } finally {
      setUser(null);
      setData(null);
    }
  };

  const normalizedUser = user ? { ...user, role: normalizeRole(user.role) } : null;

  return (
    <>
      <Toaster position="top-right" richColors />
      {!sessionReady && <div className="flex min-h-screen items-center justify-center bg-[#f6f8f5] text-sm text-slate-600">Checking your DARBCO session…</div>}
      {sessionReady && !normalizedUser && <Login onLogin={setUser} />}
      {sessionReady && normalizedUser && (
        <AppDataProvider value={{ data, loading: loadingData, error: dataError }}>
          {normalizedUser.role === "production_clerk" && <ProductionClerkDashboard user={normalizedUser} onLogout={handleLogout} />}
          {normalizedUser.role === "inventory_bookkeeper" && <InventoryBookkeeperDashboard user={normalizedUser} onLogout={handleLogout} />}
          {normalizedUser.role === "payroll_personnel" && <PayrollPersonnelDashboard user={normalizedUser} onLogout={handleLogout} />}
          {normalizedUser.role === "finance_officer" && <FinanceOfficerDashboard user={normalizedUser} onLogout={handleLogout} />}
          {normalizedUser.role === "manager_admin" && <ManagerAdminDashboard user={normalizedUser} onLogout={handleLogout} />}
        </AppDataProvider>
      )}
    </>
  );
}

function normalizeRole(value: unknown): Role {
  if (typeof value !== "string") return "production_clerk";

  const code = value.trim().toLowerCase().replace(/[\s/-]+/g, "_");
  if (Object.prototype.hasOwnProperty.call(ROLE_LABELS, code)) {
    return code as Role;
  }

  const matched = Object.entries(ROLE_LABELS).find(([, label]) => label.toLowerCase() === value.trim().toLowerCase());
  return matched ? matched[0] as Role : "production_clerk";
}
