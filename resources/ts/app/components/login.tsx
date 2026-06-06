import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Eye, EyeOff, Leaf, Loader2, ShieldCheck } from "lucide-react";
import { User } from "./types";
import { login } from "../lib/api";

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      clearDashboardNavigationState();
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f6f8f5] p-4 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-xl md:grid-cols-[minmax(0,1fr)_420px]">
        <div className="hidden bg-emerald-800 px-10 py-12 text-white md:flex md:flex-col md:justify-between">
          <div className="space-y-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
              <Leaf className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-100">DARBCO Cooperative</p>
              <h1 className="max-w-md text-3xl font-semibold leading-tight">Agri Workflow and Financial Processing System</h1>
              <p className="max-w-md text-sm leading-6 text-emerald-50/90">
                Secure access for daily production, inventory, payroll, finance, and management operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-50/90">
            <ShieldCheck className="h-4 w-4" />
            <span>Authorized cooperative accounts only</span>
          </div>
        </div>

        <Card className="w-full rounded-none border-0 shadow-none">
          <CardHeader className="space-y-2 px-6 pb-5 pt-8 sm:px-8 sm:pt-10">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">DARBCO Cooperative</p>
                <p className="text-xs text-muted-foreground">Authorized access</p>
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">Sign In</CardTitle>
            <CardDescription>Enter your account credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-8 sm:pb-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@darbco.coop"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 bg-white"
                  required
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 bg-white pr-11"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-emerald-700"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="h-11 w-full bg-emerald-700 font-medium hover:bg-emerald-800" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              {loading && (
                <p className="text-center text-xs text-muted-foreground">
                  Preparing your dashboard...
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function clearDashboardNavigationState() {
  if (typeof window === "undefined") return;

  [
    "darbco.productionClerk.active",
    "darbco.productionClerk.productionTab",
    "darbco.inventoryBookkeeper.active",
    "darbco.payrollPersonnel.active",
    "darbco.financeOfficer.active",
    "darbco.managerAdmin.active",
  ].forEach((key) => window.localStorage.removeItem(key));
}
