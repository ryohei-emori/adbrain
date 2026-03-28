import { getRiskMeta, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/cn";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const meta = getRiskMeta(level);
  const Icon = meta.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.bgColor,
        meta.borderColor,
        meta.textColor,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {level}
    </span>
  );
}
