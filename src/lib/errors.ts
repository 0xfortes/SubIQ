/**
 * Typed result crossing the server-action boundary — actions never throw
 * to the client. Errors are safe, human-readable strings (no internals).
 */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err<T = never>(error: string): ActionResult<T> {
  return { ok: false, error };
}

/** Generic fallback message — never leak internals to the client. */
export const GENERIC_ERROR = "Something went wrong. Please try again.";
