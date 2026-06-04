import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";
import { Login } from "./components/login";
import { ProductionClerkDashboard } from "./components/dashboards/production-clerk";
import { InventoryBookkeeperDashboard } from "./components/dashboards/inventory-bookkeeper";
import { PayrollPersonnelDashboard } from "./components/dashboards/payroll-personnel";
import { FinanceOfficerDashboard } from "./components/dashboards/finance-officer";
import { ManagerAdminDashboard } from "./components/dashboards/manager-admin";
import { User } from "./components/types";
import { AppData, fetchAppData } from "./lib/api";
import { AppDataProvider } from "./lib/app-data-context";
import { usePersistentState } from "./lib/use-persistent-state";

export default function App() {
  const [user, setUser] = usePersistentState<User | null>("darbco.currentUser", null);
  const [data, setData] = useState<AppData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    if (!user) {
      setData(null);
      setDataError("");
      return;
    }

    let active = true;
    setLoadingData(true);
    fetchAppData()
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
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setData(null);
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      {!user && <Login onLogin={setUser} />}
      {user && (
        <AppDataProvider value={{ data, loading: loadingData, error: dataError }}>
          {user.role === "production_clerk" && <ProductionClerkDashboard user={user} onLogout={handleLogout} />}
          {user.role === "inventory_bookkeeper" && <InventoryBookkeeperDashboard user={user} onLogout={handleLogout} />}
          {user.role === "payroll_personnel" && <PayrollPersonnelDashboard user={user} onLogout={handleLogout} />}
          {user.role === "finance_officer" && <FinanceOfficerDashboard user={user} onLogout={handleLogout} />}
          {user.role === "manager_admin" && <ManagerAdminDashboard user={user} onLogout={handleLogout} />}
        </AppDataProvider>
      )}
    </>
  );
}
