import { resolveBrand } from "@/lib/brands";
import { isDarkColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ServiceAvatar } from "./service-avatar";

/**
 * A subscription's real service logo (via the brand registry) on a brand-tinted
 * chip, falling back to the letter avatar when the name isn't recognized — so
 * the layout is identical either way. Dark brand colors (GitHub, Notion, Vercel)
 * render their glyph in a light neutral so it stays legible on dark surfaces.
 *
 * Shared by the renewal timeline, subscriptions table, analytics leaderboard,
 * and the marketing preview so they can't drift apart.
 */
const CHIP = { xs: "size-4", sm: "size-7", md: "size-[30px]" } as const;
const GLYPH = { xs: "size-2.5", sm: "size-4", md: "size-[15px]" } as const;
const RADIUS = {
  xs: "rounded-[4px]",
  sm: "rounded-[7px]",
  md: "rounded-md",
} as const;

export function ServiceIcon({
  name,
  color,
  size = "md",
  shape = "square",
  className,
}: {
  name: string;
  color?: string | null;
  size?: keyof typeof CHIP;
  shape?: "square" | "circle";
  className?: string;
}) {
  const brand = resolveBrand(name);
  if (!brand) {
    return (
      <ServiceAvatar
        name={name}
        color={color}
        size={size}
        className={cn(shape === "circle" && "rounded-full", className)}
      />
    );
  }

  const dark = isDarkColor(brand.hex);
  const glyph = dark ? "var(--color-text)" : `#${brand.hex}`;
  const background = dark ? "rgba(255,255,255,0.09)" : `#${brand.hex}1F`;

  return (
    <span
      aria-hidden
      title={brand.title}
      className={cn(
        "flex shrink-0 items-center justify-center",
        CHIP[size],
        shape === "circle" ? "rounded-full" : RADIUS[size],
        className,
      )}
      style={{ backgroundColor: background }}
    >
      <svg viewBox="0 0 24 24" className={GLYPH[size]} fill={glyph}>
        <path d={brand.path} />
      </svg>
    </span>
  );
}
