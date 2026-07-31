/**
 * Brand registry: maps a user's free-text subscription name to a recognizable
 * service logo + official brand color, so the dashboard reads at a glance.
 *
 * Icons come from `simple-icons` (verified slugs only — a missing slug would
 * break the build). Only the ~60 services referenced here are pulled into the
 * bundle via named imports; everything else falls back to the letter avatar,
 * so the layout is identical whether or not a logo matches.
 *
 * Adding a service: import its `si*` export, then `register(icon, ...aliases)`.
 */
import {
  si1password,
  siAnthropic,
  siApplemusic,
  siAppletv,
  siArc,
  siAsana,
  siAtlassian,
  siAudible,
  siBitwarden,
  siClaude,
  siCloudflare,
  siCoursera,
  siDashlane,
  siDigitalocean,
  siDiscord,
  siDropbox,
  siEvernote,
  siExpressvpn,
  siFigma,
  siFramer,
  siGithub,
  siGitlab,
  siGoogle,
  siGoogledrive,
  siGrammarly,
  siHbo,
  siHetzner,
  siIcloud,
  siJetbrains,
  siLastpass,
  siLinear,
  siMax,
  siMedium,
  siMiro,
  siNamecheap,
  siNetflix,
  siNetlify,
  siNordvpn,
  siNotion,
  siObsidian,
  siPatreon,
  siPerplexity,
  siPlanetscale,
  siPlaystation,
  siProtonvpn,
  siRailway,
  siRaycast,
  siRender,
  siSpotify,
  siSteam,
  siStripe,
  siSubstack,
  siSupabase,
  siTodoist,
  siTrello,
  siTwitch,
  siUdemy,
  siVercel,
  siYoutube,
  siYoutubemusic,
  siZoom,
} from "simple-icons";

export interface Brand {
  title: string;
  /** 6-digit hex, no leading '#'. */
  hex: string;
  /** SVG path data for a 24x24 viewBox. */
  path: string;
}

const REGISTRY: Record<string, Brand> = {};

function register(icon: Brand, ...aliases: string[]): void {
  for (const alias of aliases) REGISTRY[normalize(alias)] = icon;
}

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

register(siNetflix, "netflix");
register(siSpotify, "spotify");
register(siYoutube, "youtube", "youtube tv");
register(siYoutubemusic, "youtube music");
register(siAppletv, "apple tv", "appletv");
register(siApplemusic, "apple music", "applemusic");
register(siIcloud, "icloud", "apple icloud");
register(siHbo, "hbo", "hbo max");
register(siMax, "max");
register(siFigma, "figma");
register(siNotion, "notion");
register(siGithub, "github");
register(siGitlab, "gitlab");
register(siVercel, "vercel");
register(siNetlify, "netlify");
register(siZoom, "zoom");
register(siDropbox, "dropbox");
register(siGoogle, "google", "google one", "google workspace", "gsuite");
register(siGoogledrive, "google drive");
register(siAnthropic, "anthropic");
register(siClaude, "claude", "claude ai");
register(siPerplexity, "perplexity", "perplexity ai");
register(siLinear, "linear");
register(siGrammarly, "grammarly");
register(si1password, "1password");
register(siDashlane, "dashlane");
register(siLastpass, "lastpass");
register(siBitwarden, "bitwarden");
register(siNordvpn, "nordvpn", "nord vpn");
register(siExpressvpn, "expressvpn", "express vpn");
register(siProtonvpn, "protonvpn", "proton vpn", "proton");
register(siAudible, "audible");
register(siPatreon, "patreon");
register(siSubstack, "substack");
register(siTwitch, "twitch");
register(siDiscord, "discord", "discord nitro");
register(siPlaystation, "playstation", "playstation plus", "psn");
register(siSteam, "steam");
register(siDigitalocean, "digitalocean", "digital ocean");
register(siCloudflare, "cloudflare");
register(siStripe, "stripe");
register(siCoursera, "coursera");
register(siUdemy, "udemy");
register(siMedium, "medium");
register(siEvernote, "evernote");
register(siTodoist, "todoist");
register(siObsidian, "obsidian");
register(siJetbrains, "jetbrains");
register(siFramer, "framer");
register(siMiro, "miro");
register(siAsana, "asana");
register(siTrello, "trello");
register(siAtlassian, "atlassian", "jira", "confluence");
register(siRaycast, "raycast");
register(siArc, "arc", "arc browser");
register(siHetzner, "hetzner");
register(siNamecheap, "namecheap");
register(siSupabase, "supabase");
register(siPlanetscale, "planetscale");
register(siRailway, "railway");
register(siRender, "render");

/**
 * Resolve a subscription name to a known brand, or null. Tries the exact
 * normalized name, then progressively shorter token prefixes with plan-tier
 * words stripped ("Spotify Premium" -> "spotify", "GitHub Team" -> "github").
 */
export function resolveBrand(name: string): Brand | null {
  const norm = normalize(name);
  if (!norm) return null;
  if (REGISTRY[norm]) return REGISTRY[norm];

  const tokens = norm.split(" ");
  let end = tokens.length;
  while (end > 1 && STOPWORDS.has(tokens[end - 1]!)) end--;
  for (let len = end; len >= 1; len--) {
    const key = tokens.slice(0, len).join(" ");
    const hit = REGISTRY[key];
    if (hit) return hit;
  }
  return null;
}
