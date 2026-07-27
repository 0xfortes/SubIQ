import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionsLoading() {
  return (
    <div className="rounded-card border-line bg-surface border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-1.5 h-2.5 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
