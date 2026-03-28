import { Bot } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LLMUsage } from "@/lib/mock-data";

interface LLMUsageCardProps {
  usage: LLMUsage;
  className?: string;
}

export function LLMUsageCard({ usage, className }: LLMUsageCardProps) {
  const creditPercent = (usage.creditRemaining / usage.creditLimit) * 100;

  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-6", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10">
          <Bot className="h-4.5 w-4.5 text-brand-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">LLM Usage</h3>
          <p className="text-xs text-zinc-500">{usage.model}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-xs text-zinc-500">Invocations</p>
          <p className="text-lg font-mono font-semibold">{usage.invocations}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Cost Today</p>
          <p className="text-lg font-mono font-semibold">${usage.costToday.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Input Tokens</p>
          <p className="text-lg font-mono font-semibold">{(usage.inputTokens / 1000).toFixed(1)}K</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Output Tokens</p>
          <p className="text-lg font-mono font-semibold">{(usage.outputTokens / 1000).toFixed(1)}K</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-zinc-400">Credit Remaining</span>
          <span className="font-mono text-zinc-300">
            ${usage.creditRemaining.toFixed(2)} / ${usage.creditLimit.toFixed(2)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              creditPercent > 50
                ? "bg-green-500"
                : creditPercent > 20
                  ? "bg-amber-500"
                  : "bg-red-500",
            )}
            style={{ width: `${creditPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
