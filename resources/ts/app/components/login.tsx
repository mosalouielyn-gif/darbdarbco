import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Leaf, ShieldCheck } from "lucide-react";
import { User } from "./types";
import { login } from "../lib/api";

interface LoginProps {
  onLogin: (user: User) => void;
}

const LOGIN_ACCOUNTS = [
  { label: "Production Clerk", email: "clerk@darbco.coop", password: "clerk123" },
  { label: "Inventory Bookkeeper", email: "inventory@darbco.coop", password: "inv123" },
  { label: "Payroll Personnel", email: "payroll@darbco.coop", password: "pay123" },
  { label: "Finance Officer", email: "finance@darbco.coop", password: "fin123" },
  { label: "Manager / Admin", email: "admin@darbco.coop", password: "admin123" },
];

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = LOGIN_ACCOUNTS.find((account) => account.email === email)?.email ?? "";

  const fillAccount = (accountEmail: string) => {
    const account = LOGIN_ACCOUNTS.find((item) => item.email === accountEmail);
    if (!account) return;

    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-6xl grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] md:gap-8 xl:gap-12 items-center">
        <div className="hidden md:block space-y-4 lg:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800">
            <Leaf className="h-4 w-4" />
            <span>DARBCO Cooperative</span>
          </div>
          <h1 className="tracking-tight text-2xl lg:text-3xl xl:text-4xl">DARBCO Agri Workflow & Financial Processing</h1>
          <p className="text-muted-foreground">
            A role-based platform for the Davao Abaca Banana Cooperative — Panabo City, Davao del Norte.
            Streamlined harvest logging, inventory ledger, dual-track payroll, finance audits, and management oversight.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Read/write rules strictly enforced across 5 roles</span>
          </div>
        </div>

        <Card className="w-full shadow-xl border-emerald-100">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your assigned cooperative account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quick-account">Quick account</Label>
                <Select value={selectedAccount} onValueChange={fillAccount}>
                  <SelectTrigger id="quick-account" className="bg-white">
                    <SelectValue placeholder="Choose an account to fill credentials" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGIN_ACCOUNTS.map((account) => (
                      <SelectItem key={account.email} value={account.email}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@darbco.coop"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
