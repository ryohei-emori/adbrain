import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800",
        className,
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <Skeleton className="h-4 w-16 mb-3" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function ProposalCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function ConnectionCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function AuditEntrySkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "proposals" | "connections" | "audit" | "settings" }) {
  switch (variant) {
    case "dashboard":
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      );
    case "proposals":
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProposalCardSkeleton key={i} />
          ))}
        </div>
      );
    case "connections":
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <ConnectionCardSkeleton key={i} />
          ))}
        </div>
      );
    case "audit":
      return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <AuditEntrySkeleton key={i} />
          ))}
        </div>
      );
    case "settings":
      return (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      );
  }
}
