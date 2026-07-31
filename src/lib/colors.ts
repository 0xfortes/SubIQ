/** Deterministic fallback hue for services without a stored brand color. */
export function fallbackColor(name: string): string {
  const palette = [
    "#8B93FF",
    "#F0708A",
    "#C9A0F5",
    "#6FA8F5",
    "#4FD1A1",
    "#F2B25C",
  ];
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return palette[Math.abs(hash) % palette.length] ?? "#8B93FF";
}

/**
 * True when a hex color is too dark to read as a glyph on SubIQ's dark
 * surfaces. Many official brand colors (GitHub #181717, Notion/Vercel #000,
 * Anthropic #191919) are near-black, so their logos must render in a light
 * neutral instead. Uses relative luminance; non-6-digit hex is treated as light.
 */
export function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return false;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.32;
}
