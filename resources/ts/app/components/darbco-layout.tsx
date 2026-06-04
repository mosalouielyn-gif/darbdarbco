import { ReactNode, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { LogOut, Leaf, Menu, X } from "lucide-react";
import { ROLE_LABELS, User } from "./types";
import { useAppData } from "../lib/app-data-context";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface Props {
  user: User;
  onLogout: () => void;
  navItems: NavItem[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
}

export function DarbcoLayout({ user, onLogout, navItems, active, onChange, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { loading, error } = useAppData();
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const handleMobileNav = (id: string) => {
    onChange(id);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 xl:flex">
      <aside className="hidden xl:flex xl:w-64 2xl:w-72 bg-gradient-to-b from-emerald-900 to-emerald-950 text-emerald-50 flex-col xl:sticky xl:top-0 xl:h-screen">
        <div className="p-5 border-b border-emerald-800">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Leaf className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="tracking-wide">DARBCO</div>
              <div className="text-[10px] text-emerald-300/80 leading-tight">
                Banana Production<br />Management System
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition ${
                active === item.id
                  ? "bg-emerald-500 text-white shadow"
                  : "text-emerald-100/90 hover:bg-emerald-800/60"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-emerald-800">
          <div className="flex items-center gap-3 p-2 rounded-md bg-emerald-800/40">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-500 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{user.name}</div>
              <div className="text-[11px] text-emerald-300/80">{ROLE_LABELS[user.role]}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded hover:bg-emerald-700/60"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur xl:hidden relative">
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
            <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
              <Leaf className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">DARBCO</div>
              <div className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-md border px-2.5 py-2 text-sm hover:bg-slate-50"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          {menuOpen && (
            <nav className="max-h-[calc(100vh-65px)] overflow-y-auto border-t bg-white px-3 py-3 shadow-sm sm:px-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNav(item.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                      active === item.id
                        ? "bg-emerald-600 text-white"
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

        {loading && (
          <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
            Syncing the latest records in the background...
          </div>
        )}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="mx-auto w-full max-w-[1920px] p-3 sm:p-4 md:p-5 lg:p-6 2xl:p-8">{children}</div>
      </main>
    </div>
  );
}
