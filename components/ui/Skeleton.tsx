import { cn } from "@/lib/utils";

/** Base shimmer block — compose into card/row/stat skeletons below. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg bg-muted relative overflow-hidden", className)}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.08), transparent)",
        }}
      />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-elevated-sm p-5 h-full">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-16 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function CardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full shrink-0" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}
