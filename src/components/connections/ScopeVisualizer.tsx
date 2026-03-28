import {
  BarChart3,
  Eye,
  Megaphone,
  ShieldCheck,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getScopeLabels, type ScopeLabel } from "@/lib/scopes";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Eye,
  Megaphone,
};

const PROTECTION_LABELS: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  high: { label: "MFA Protected", color: "text-brand-primary", icon: Lock },
  medium: { label: "MFA Protected", color: "text-brand-primary", icon: Lock },
  low: { label: "Read-only", color: "text-green-400", icon: ShieldCheck },
};

interface ScopeVisualizerProps {
  provider: string;
  className?: string;
}

export function ScopeVisualizer({ provider, className }: ScopeVisualizerProps) {
  const scopes = getScopeLabels(provider);

  if (!scopes.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {scopes.map((scope) => (
        <ScopeItem key={scope.technical} scope={scope} />
      ))}
    </div>
  );
}

function ScopeItem({ scope }: { scope: ScopeLabel }) {
  const Icon = ICON_MAP[scope.icon] ?? BarChart3;
  const protection = PROTECTION_LABELS[scope.riskLevel] ?? PROTECTION_LABELS.low!;
  const ProtIcon = protection.icon;

  return (
    <div className="rounded-lg bg-zinc-800/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <Icon className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-200">{scope.display}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{scope.description}</p>
          </div>
        </div>
        <span className={cn("flex items-center gap-1 text-xs font-medium whitespace-nowrap", protection.color)}>
          <ProtIcon className="h-3 w-3" />
          {protection.label}
        </span>
      </div>
    </div>
  );
}
