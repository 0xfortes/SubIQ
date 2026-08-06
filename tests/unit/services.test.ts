import { describe, expect, it } from "vitest";
import { resolveBrand } from "@/lib/brands";
import { resolveService, serviceIdentity } from "@/lib/services";

describe("resolveService", () => {
  it("identifies known services by name", () => {
    expect(resolveService({ name: "Netflix" })).toEqual({
      canonical: "netflix",
      purpose: "VIDEO_STREAMING",
    });
    expect(resolveService({ name: "Spotify" })?.purpose).toBe(
      "MUSIC_STREAMING",
    );
    expect(resolveService({ name: "1Password" })?.purpose).toBe(
      "PASSWORD_MANAGER",
    );
  });

  it("strips plan tiers and punctuation from what users actually type", () => {
    for (const name of [
      "Spotify Premium",
      "spotify",
      "Spotify Family Plan",
      "  Spotify  ",
    ]) {
      expect(resolveService({ name })?.canonical).toBe("spotify");
    }
    expect(resolveService({ name: "Disney Plus" })?.canonical).toBe("disney+");
    expect(resolveService({ name: "ChatGPT Plus" })?.canonical).toBe("chatgpt");
  });

  it("prefers an exact match over a shorter prefix", () => {
    // "YouTube Music" must not collapse into the video-streaming "YouTube".
    expect(resolveService({ name: "YouTube Music" })?.purpose).toBe(
      "MUSIC_STREAMING",
    );
    expect(resolveService({ name: "YouTube Premium" })?.purpose).toBe(
      "VIDEO_STREAMING",
    );
    expect(resolveService({ name: "Apple Music" })?.purpose).toBe(
      "MUSIC_STREAMING",
    );
    expect(resolveService({ name: "Apple TV+" })?.purpose).toBe(
      "VIDEO_STREAMING",
    );
  });

  it("falls back to the vendor, then the URL hostname", () => {
    expect(
      resolveService({ name: "Family plan", vendor: "Netflix" })?.canonical,
    ).toBe("netflix");
    expect(
      resolveService({
        name: "Movies",
        url: "https://www.netflix.com/browse",
      })?.canonical,
    ).toBe("netflix");
  });

  it("returns null rather than guessing", () => {
    expect(resolveService({ name: "Bob's Gym" })).toBeNull();
    expect(resolveService({ name: "Local Newspaper" })).toBeNull();
    expect(resolveService({ name: "" })).toBeNull();
    // Ambiguous parents are deliberately unregistered — "Google" could be
    // storage, an office suite, or an AI assistant.
    expect(resolveService({ name: "Google" })).toBeNull();
    expect(resolveService({ name: "Proton" })).toBeNull();
  });

  it("survives a malformed URL", () => {
    expect(resolveService({ name: "Mystery", url: "not a url" })).toBeNull();
  });
});

describe("serviceIdentity", () => {
  it("collapses spellings of a known service onto one identity", () => {
    expect(serviceIdentity({ name: "Netflix Premium" })).toBe(
      serviceIdentity({ name: "netflix" }),
    );
  });

  it("groups unknown services by their normalized name", () => {
    expect(serviceIdentity({ name: "Bob's Gym" })).toBe("bobs gym");
    expect(serviceIdentity({ name: "Bobs Gym" })).toBe("bobs gym");
  });

  it("returns null when there is nothing to group on", () => {
    expect(serviceIdentity({ name: "   " })).toBeNull();
  });
});

describe("shared alias matching", () => {
  it("keeps the brand and purpose registries in agreement", () => {
    // Both lookups run the same matcher, so a name that finds a logo also
    // finds a purpose (for services present in both registries).
    for (const name of ["Spotify Premium", "GitHub Team", "Notion Plus"]) {
      expect(resolveBrand(name)).not.toBeNull();
      expect(resolveService({ name })).not.toBeNull();
    }
  });
});
