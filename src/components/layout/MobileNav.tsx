import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Link2,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/dashboard/proposals", icon: FileText, label: "Proposals", end: false },
  { to: "/dashboard/connections", icon: Link2, label: "Connect", end: false },
  { to: "/dashboard/audit", icon: ScrollText, label: "Audit", end: false },
  { to: "/dashboard/settings", icon: Settings, label: "Settings", end: false },
] as const;

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors",
                isActive ? "text-brand-primary" : "text-zinc-500",
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
