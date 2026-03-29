import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Link2,
  ScrollText,
  Settings,
  Bot,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useConnections";
import { MobileNav } from "./MobileNav";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/dashboard/proposals", icon: FileText, label: "Proposals", end: false },
  { to: "/dashboard/connections", icon: Link2, label: "Connections", end: false },
  { to: "/dashboard/audit", icon: ScrollText, label: "Audit Log", end: false },
  { to: "/dashboard/settings", icon: Settings, label: "Settings", end: false },
] as const;

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { connections } = useConnections();
  const connectedPlatforms = connections
    .filter((c) => c.status === "connected" && c.provider !== "tiktok-ads")
    .map((c) => c.displayName);

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-950">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-200",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-zinc-800">
          <div className="h-7 w-7 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight">AdBrain</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                  collapsed && "justify-center px-2",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-zinc-800 p-3">
          {!collapsed ? (
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              {connectedPlatforms.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Connected</p>
                  {connectedPlatforms.map((name) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-400 shrink-0" />
                      <span className="text-xs text-zinc-300">{name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-amber-400">No accounts</p>
                    <p className="text-[10px] text-zinc-500">Connect to start</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              {connectedPlatforms.length > 0 ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Link2 className="h-4 w-4 text-amber-400" />
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-zinc-800 px-4 h-14 bg-zinc-950">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-zinc-400 hover:text-zinc-100"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="md:hidden flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-brand-primary flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">AdBrain</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-7 w-7 rounded-full"
                />
                <span className="hidden sm:block text-sm text-zinc-400">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-950 border-r border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold">AdBrain</span>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
