import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  trendPositive?: boolean;
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  trendPositive,
}: MetricCardProps) {
  const isPositive = trendPositive ?? trend === "up";
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:bg-zinc-800/50 transition-colors">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight font-mono">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <TrendIcon
          className={cn(
            "h-3.5 w-3.5",
            isPositive ? "text-green-400" : "text-red-400",
          )}
        />
        <span
          className={cn(
            "text-xs font-medium",
            isPositive ? "text-green-400" : "text-red-400",
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
