/**
 * Shared matcher for resolving a user's free-text subscription name to a known
 * service. Two registries key off it — lib/brands.ts (logo + brand color) and
 * lib/services.ts (what the service is FOR) — and they must agree: an insight
 * that says "Spotify Premium overlaps" while the row shows a letter avatar
 * would be an obvious tell that two lookups disagree.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeServiceName(value: string): string {
  return (
    value
      .toLowerCase()
      // Apostrophes are elided, not treated as a separator: "Bob's Gym" and
      // "Bobs Gym" are one service, not "bob s gym" and "bobs gym".
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Plan-tier words stripped from the end of a name before matching. */
const STOPWORDS = new Set([
  "premium",
  "plus",
  "pro",
  "family",
  "individual",
  "personal",
  "student",
  "team",
  "teams",
  "business",
  "enterprise",
  "subscription",
  "membership",
  "monthly",
  "annual",
  "annually",
  "yearly",
  "plan",
  "standard",
  "basic",
  "unlimited",
  "cloud",
  "app",
]);

export interface AliasRegistry<T> {
  /** Map every alias to the same entry. Aliases are normalized on the way in. */
  register: (entry: T, ...aliases: string[]) => void;
  /**
   * Resolve a free-text name, or null. Tries the exact normalized name, then
   * progressively shorter token prefixes with plan-tier words stripped
   * ("Spotify Premium" -> "spotify", "GitHub Team" -> "github").
   */
  resolve: (name: string) => T | null;
}

export function createAliasRegistry<T>(): AliasRegistry<T> {
  const entries: Record<string, T> = {};

  return {
    register(entry, ...aliases) {
      for (const alias of aliases) entries[normalizeServiceName(alias)] = entry;
    },

    resolve(name) {
      const norm = normalizeServiceName(name);
      if (!norm) return null;
      if (entries[norm]) return entries[norm];

      const tokens = norm.split(" ");
      let end = tokens.length;
      while (end > 1 && STOPWORDS.has(tokens[end - 1]!)) end--;
      for (let len = end; len >= 1; len--) {
        const hit = entries[tokens.slice(0, len).join(" ")];
        if (hit) return hit;
      }
      return null;
    },
  };
}
