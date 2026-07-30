// Sentry browser SDK — errors only. The DSN is a public value (it ships in the
// client bundle by design), so it is read straight from NEXT_PUBLIC_SENTRY_DSN
// rather than through lib/env.ts, which is server-only by construction and
// cannot be imported into a browser bundle. With the DSN unset (local dev),
// `enabled` is false and the SDK is a no-op — no network, no console noise.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  // Errors only: no performance tracing, no session replay.
  tracesSampleRate: 0,
});
