/**
 * URL-facing slugs for user-named records (categories today).
 *
 * The slug is the only part of a user-supplied name that ever reaches a URL
 * (`?category=`), a route match, or a Prisma unique key — so it is BUILT from
 * a whitelist (`[a-z0-9-]`) rather than escaped after the fact. Anything the
 * whitelist doesn't cover simply doesn't survive.
 */

/** Comfortably under any URL/index limit; names stay full-length for display. */
const MAX_SLUG_LENGTH = 48;

export function slugify(value: string): string {
  return (
    value
      // Decompose accents so "Café" slugs to "cafe" instead of "caf".
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_SLUG_LENGTH)
      // The slice can land mid-separator.
      .replace(/-+$/, "")
  );
}

/** Deterministic short token for names that slugify to nothing. */
function nameToken(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * A category's URL token. Names written entirely in a non-Latin script (e.g.
 * "音楽") slugify to an empty string — those fall back to a stable opaque
 * token so the display name survives untouched and the URL stays safe.
 * Deterministic: the same name always yields the same slug, which is what
 * makes "reuse the existing category" work.
 */
export function categorySlug(name: string): string {
  return slugify(name) || `c-${nameToken(name)}`;
}
