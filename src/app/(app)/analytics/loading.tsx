import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the analytics grid so content streams in without layout shift. */
export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="rounded-card border-line bg-surface border p-4"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-2 h-2.5 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-card border-line bg-surface border p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="mt-3 h-44 w-full" />
      </div>

      <div className="grid gap-3 min-[1020px]:grid-cols-[1fr_1.4fr]">
        <div className="rounded-card border-line bg-surface border p-4">
          <Skeleton className="h-3.5 w-24" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="rounded-pill mt-1.5 h-1 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border-line bg-surface border p-4">
          <Skeleton className="h-3.5 w-28" />
          <div className="mt-3 flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="size-[30px] shrink-0 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="mt-1.5 h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
