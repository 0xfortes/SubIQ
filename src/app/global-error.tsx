"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root error boundary — catches failures in the root layout itself, which the
 * per-segment (app)/error.tsx can't reach. It replaces the whole document, so
 * it renders its own <html>/<body> and uses inline styles (matching DESIGN.md's
 * dark tokens) to stay legible even if global CSS never loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "6rem 1rem",
          textAlign: "center",
          background: "#0b0c0f",
          color: "#edeff4",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 500, margin: 0 }}>
          Something went wrong.
        </h1>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#969cab",
            margin: 0,
            maxWidth: "24rem",
          }}
        >
          Your data is fine — this was a display problem on our side. Try again,
          and if it keeps happening, reload the page.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.375rem 0.875rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "#0b0c0f",
            background: "#8B93FF",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
