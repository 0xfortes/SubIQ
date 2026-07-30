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
