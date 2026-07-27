"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
// Direct action import: the feature barrel also exports db-backed queries,
// which must never reach a client bundle.
import { dismissInsightAction } from "@/features/insights/actions";

export function DismissInsightButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={`Dismiss insight: ${title}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await dismissInsightAction({ id });
          if (!result.ok) toast.error(result.error);
        })
      }
      className="text-faint hover:text-muted focus-visible:outline-accent h-fit rounded-sm p-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
    >
      <X size={12} aria-hidden />
    </button>
  );
}
