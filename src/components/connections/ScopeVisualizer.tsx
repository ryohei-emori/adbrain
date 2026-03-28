import {
  BarChart3,
  Eye,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getScopeLabels, type ScopeLabel } from "@/lib/scopes";
import { getRiskMeta } from "@/lib/risk";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Eye,
  Megaphone,
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
  const risk = getRiskMeta(scope.riskLevel.toUpperCase() as "LOW" | "MEDIUM" | "HIGH");

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
        <span className={cn("text-xs font-medium whitespace-nowrap", risk.textColor)}>
          Risk: {scope.riskLevel.charAt(0).toUpperCase() + scope.riskLevel.slice(1)}
        </span>
      </div>
    </div>
  );
}
