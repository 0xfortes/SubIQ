import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="rounded-card border-line bg-surface border p-5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-1.5 h-2.5 w-48" />
          <div className="mt-5 flex flex-col gap-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-9 w-72 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
