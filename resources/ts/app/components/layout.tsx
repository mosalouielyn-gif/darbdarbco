import { ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { LogOut, Leaf, Menu, X } from "lucide-react";
import { Role, ROLE_LABELS, User } from "./types";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface LayoutProps {
  user: User;
  onLogout: () => void;
  navItems: NavItem[];
  activeNav: string;
  onNavChange: (id: string) => void;
  children: ReactNode;
}

const ROLE_COLORS: Record<Role, string> = {
  production_clerk: "bg-emerald-700",
  inventory_bookkeeper: "bg-amber-700",
  payroll_personnel: "bg-sky-700",
  finance_officer: "bg-violet-700",
  manager_admin: "bg-slate-800",
  harvester: "bg-lime-700",
};

export function Layout({ user, onLogout, navItems, activeNav, onNavChange, children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const roleColor = ROLE_COLORS[user.role];
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const handleMobileNav = (id: string) => {
    onNavChange(id);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 xl:flex">
      <aside className="hidden xl:flex xl:w-64 2xl:w-72 bg-white border-r flex-col xl:sticky xl:top-0 xl:h-screen">
        <div className={`${roleColor} text-white p-4 flex items-center gap-2`}>
          <Leaf className="h-5 w-5" />
          <div>
            <div>DARBCO</div>
            <div className="text-xs opacity-80">Agri System</div>
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className={`${roleColor} text-white`}>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate">{user.name}</div>
              <Badge variant="secondary" className="text-xs">{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md mb-1 text-left transition ${
                activeNav === item.id
                  ? "bg-slate-900 text-white"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t">
          <Button variant="outline" className="w-full justify-start" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur xl:hidden relative">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="shrink-0 rounded-md border p-2 text-slate-700 hover:bg-slate-50"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className={`h-9 w-9 shrink-0 rounded-full ${roleColor} text-white flex items-center justify-center`}>
              <Leaf className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 px-2" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {menuOpen && (
            <nav className="max-h-[calc(100vh-65px)] overflow-y-auto border-t bg-white px-3 py-3 shadow-sm sm:px-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNav(item.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                      activeNav === item.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}
        </header>

        <div className="mx-auto w-full max-w-[1920px] p-3 sm:p-4 md:p-5 lg:p-6 2xl:p-8">{children}</div>
      </main>
    </div>
  );
}
