// Server + edge error capture (errors only, DSN-gated). Uses the same public
// NEXT_PUBLIC_SENTRY_DSN as the client (see instrumentation-client.ts for why
// it is read from env directly). No build-time Sentry plugin / source-map
// upload — this is a thin runtime capture layer. `onRequestError` is the
// Next.js hook that reports errors thrown in Server Components, route handlers,
// and Server Actions.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({ dsn, tracesSampleRate: 0 });
  }
}

export const onRequestError = Sentry.captureRequestError;
