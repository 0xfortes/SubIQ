import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the dashboard grid so content streams in without layout shift. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 min-[1020px]:grid-cols-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-card border-line bg-surface border p-4"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-2 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="rounded-card border-line bg-surface border p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="mt-4 h-[90px] w-full" />
      </div>

      <div className="grid gap-3 min-[1020px]:grid-cols-[1.9fr_1fr]">
        <div className="rounded-card border-line bg-surface border p-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
        <div className="rounded-card border-line bg-surface border p-4">
          <Skeleton className="h-3.5 w-20" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="size-[26px] shrink-0 rounded-[7px]" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="mt-1.5 h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-card border-line bg-surface border p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
