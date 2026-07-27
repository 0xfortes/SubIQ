import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="rounded-card border-line bg-surface border p-5">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="mt-1.5 h-2.5 w-48" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-2.5">
            <Skeleton className="size-[26px] shrink-0 rounded-[7px]" />
            <div className="flex-1">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-1.5 h-2.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
