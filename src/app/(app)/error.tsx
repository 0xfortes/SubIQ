"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Segment-level boundary for every app page. Safe errors only — the
 * digest is logged for correlation, internals never render. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render failed", error.digest ?? error.message);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="rounded-card border-line bg-surface border p-6">
      <h1 className="text-sm font-medium tracking-tight">
        Something went wrong loading this page.
      </h1>
      <p className="text-muted mt-1 text-xs">
        Your data is fine — this was a display problem on our side.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
