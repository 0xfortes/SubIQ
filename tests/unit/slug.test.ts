import { describe, expect, it } from "vitest";
import { categorySlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Streaming Extras")).toBe("streaming-extras");
    expect(slugify("Dev & Infra")).toBe("dev-infra");
  });

  it("strips accents rather than dropping the letter", () => {
    expect(slugify("Café")).toBe("cafe");
    expect(slugify("Ñandú")).toBe("nandu");
  });

  it("emits only [a-z0-9-] and never leading/trailing separators", () => {
    const slug = slugify("  ***Kids' stuff!! / TV  ");
    expect(slug).toBe("kids-stuff-tv");
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("caps length without leaving a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(47)} tail`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns an empty string when nothing survives the whitelist", () => {
    expect(slugify("音楽")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});

describe("categorySlug", () => {
  it("falls back to a URL-safe token for non-Latin names", () => {
    const slug = categorySlug("音楽");
    expect(slug).toMatch(/^c-[a-z0-9]+$/);
  });

  it("is deterministic — the same name always resolves to one category", () => {
    expect(categorySlug("音楽")).toBe(categorySlug("音楽"));
    expect(categorySlug("Streaming")).toBe(categorySlug("Streaming"));
  });

  it("distinguishes different non-Latin names", () => {
    expect(categorySlug("音楽")).not.toBe(categorySlug("映画"));
  });
});
