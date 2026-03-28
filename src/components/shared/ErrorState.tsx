import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onReconnect?: () => void;
  reconnectLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load the data. Please try again.",
  onRetry,
  onReconnect,
  reconnectLabel = "Reconnect",
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500/10 mb-5">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-sm mb-6">{message}</p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            Retry
          </button>
        )}
        {onReconnect && (
          <button
            onClick={onReconnect}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {reconnectLabel}
          </button>
        )}
      </div>
    </div>
  );
}
