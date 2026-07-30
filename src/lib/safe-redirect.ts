/**
 * True only for a same-origin relative path. Rejects protocol-relative
 * (`//host`) and backslash (`/\host`) forms, which browsers resolve to an
 * external origin — the open-redirect vector for post-auth `callbackUrl`s.
 */
export function isSafeInternalPath(value: string): boolean {
  return (
    value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
  );
}
