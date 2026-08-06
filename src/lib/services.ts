/**
 * What a subscription is FOR — the missing fact that made insights wrong.
 *
 * A category is a filing label the user chose; it says nothing about whether
 * two services do the same job. Netflix and Spotify both live under
 * "Entertainment" and overlap in no useful way. This catalog answers the
 * actual question — "could one of these replace the other?" — by tagging
 * known services with a purpose.
 *
 * Deliberately CONSERVATIVE: a service that isn't listed resolves to null and
 * produces no overlap insight at all. Saying nothing is always better than
 * confidently telling someone to cancel a subscription they need. That makes
 * the catalog's coverage the honest limit of the feature, not a bug.
 *
 * `resolveService` is the single seam here: swapping in an LLM classifier for
 * unrecognized services later touches this one function, not any call site
 * (same shape as lib/exchange-rates.ts).
 *
 * Adding a service: pick the purpose that describes the JOB it does, then
 * `register({ canonical, purpose }, ...aliases)`. Aliases should be what
 * people actually type, not marketing names.
 */
import { createAliasRegistry, normalizeServiceName } from "@/lib/service-alias";

export const SERVICE_PURPOSES = [
  "VIDEO_STREAMING",
  "MUSIC_STREAMING",
  "AUDIOBOOKS",
  "CLOUD_STORAGE",
  "PASSWORD_MANAGER",
  "VPN",
  "AI_ASSISTANT",
  "AI_IMAGE",
  "AI_CODING",
  "DESIGN_TOOL",
  "NOTE_TAKING",
  "TASK_MANAGER",
  "CODE_HOSTING",
  "APP_HOSTING",
  "GAMING",
  "LEARNING",
  "FITNESS",
  "MEDITATION",
  "VIDEO_CALLS",
  "OFFICE_SUITE",
] as const;

export type ServicePurpose = (typeof SERVICE_PURPOSES)[number];

/** Lowercase noun phrases — they read mid-sentence in insight copy. */
export const SERVICE_PURPOSE_LABELS: Record<ServicePurpose, string> = {
  VIDEO_STREAMING: "video streaming",
  MUSIC_STREAMING: "music streaming",
  AUDIOBOOKS: "audiobooks",
  CLOUD_STORAGE: "cloud storage",
  PASSWORD_MANAGER: "password management",
  VPN: "VPN access",
  AI_ASSISTANT: "AI assistants",
  AI_IMAGE: "AI image generation",
  AI_CODING: "AI coding assistance",
  DESIGN_TOOL: "design work",
  NOTE_TAKING: "notes and documents",
  TASK_MANAGER: "task management",
  CODE_HOSTING: "code hosting",
  APP_HOSTING: "app hosting",
  GAMING: "gaming",
  LEARNING: "online courses",
  FITNESS: "fitness tracking",
  MEDITATION: "meditation",
  VIDEO_CALLS: "video calls",
  OFFICE_SUITE: "office suites",
};

export interface Service {
  /** Stable identity for "these two rows are the same service". */
  canonical: string;
  purpose: ServicePurpose;
}

const REGISTRY = createAliasRegistry<Service>();

function register(
  canonical: string,
  purpose: ServicePurpose,
  ...aliases: string[]
): void {
  REGISTRY.register({ canonical, purpose }, canonical, ...aliases);
}

// --- Video ------------------------------------------------------------------
register("netflix", "VIDEO_STREAMING");
register("disney+", "VIDEO_STREAMING", "disney plus", "disneyplus", "disney");
register("max", "VIDEO_STREAMING", "hbo", "hbo max", "hbomax");
register("hulu", "VIDEO_STREAMING");
register("prime video", "VIDEO_STREAMING", "amazon prime video");
register("apple tv+", "VIDEO_STREAMING", "apple tv", "appletv");
register("paramount+", "VIDEO_STREAMING", "paramount plus", "paramount");
register("peacock", "VIDEO_STREAMING");
register("youtube premium", "VIDEO_STREAMING", "youtube", "youtube tv");
register("mubi", "VIDEO_STREAMING");
register("crunchyroll", "VIDEO_STREAMING");
register("twitch", "VIDEO_STREAMING", "twitch turbo");

// --- Music ------------------------------------------------------------------
register("spotify", "MUSIC_STREAMING");
register("apple music", "MUSIC_STREAMING", "applemusic");
register("youtube music", "MUSIC_STREAMING", "yt music");
register("tidal", "MUSIC_STREAMING");
register("deezer", "MUSIC_STREAMING");
register("amazon music", "MUSIC_STREAMING");
register("soundcloud", "MUSIC_STREAMING", "soundcloud go");

// --- Audiobooks -------------------------------------------------------------
register("audible", "AUDIOBOOKS");
register("scribd", "AUDIOBOOKS", "everand");
register("storytel", "AUDIOBOOKS");

// --- Storage ----------------------------------------------------------------
register("dropbox", "CLOUD_STORAGE");
register("google one", "CLOUD_STORAGE", "google drive", "google storage");
register("icloud+", "CLOUD_STORAGE", "icloud", "apple icloud");
register("onedrive", "CLOUD_STORAGE", "microsoft onedrive");
register("box", "CLOUD_STORAGE");
register("pcloud", "CLOUD_STORAGE");
register("backblaze", "CLOUD_STORAGE");

// --- Passwords --------------------------------------------------------------
register("1password", "PASSWORD_MANAGER", "one password");
register("lastpass", "PASSWORD_MANAGER");
register("bitwarden", "PASSWORD_MANAGER");
register("dashlane", "PASSWORD_MANAGER");
register("nordpass", "PASSWORD_MANAGER");

// --- VPN --------------------------------------------------------------------
register("nordvpn", "VPN", "nord vpn");
register("expressvpn", "VPN", "express vpn");
register("surfshark", "VPN");
register("proton vpn", "VPN", "protonvpn");
register("mullvad", "VPN");

// --- AI ---------------------------------------------------------------------
register("chatgpt", "AI_ASSISTANT", "openai", "chat gpt", "gpt");
register("claude", "AI_ASSISTANT", "anthropic", "claude ai");
register("gemini", "AI_ASSISTANT", "google gemini", "gemini advanced");
register("perplexity", "AI_ASSISTANT", "perplexity ai");
register("copilot", "AI_CODING", "github copilot");
register("cursor", "AI_CODING");
register("midjourney", "AI_IMAGE");
register("dall e", "AI_IMAGE", "dalle");
register("stable diffusion", "AI_IMAGE", "dreamstudio");
register("runway", "AI_IMAGE", "runwayml");

// --- Design -----------------------------------------------------------------
register("figma", "DESIGN_TOOL");
register("sketch", "DESIGN_TOOL");
register("adobe creative cloud", "DESIGN_TOOL", "adobe", "creative cloud");
register("canva", "DESIGN_TOOL");
register("affinity", "DESIGN_TOOL");
register("framer", "DESIGN_TOOL");

// --- Notes & docs -----------------------------------------------------------
register("notion", "NOTE_TAKING");
register("evernote", "NOTE_TAKING");
register("obsidian", "NOTE_TAKING");
register("bear", "NOTE_TAKING");
register("craft", "NOTE_TAKING");
register("roam research", "NOTE_TAKING", "roam");

// --- Tasks ------------------------------------------------------------------
register("todoist", "TASK_MANAGER");
register("things", "TASK_MANAGER");
register("ticktick", "TASK_MANAGER");
register("asana", "TASK_MANAGER");
register("trello", "TASK_MANAGER");
register("linear", "TASK_MANAGER");
register("jira", "TASK_MANAGER", "atlassian", "confluence");

// --- Code & infra -----------------------------------------------------------
register("github", "CODE_HOSTING");
register("gitlab", "CODE_HOSTING");
register("bitbucket", "CODE_HOSTING");
register("vercel", "APP_HOSTING");
register("netlify", "APP_HOSTING");
register("render", "APP_HOSTING");
register("railway", "APP_HOSTING");
register("fly io", "APP_HOSTING");
register("heroku", "APP_HOSTING");
register("digitalocean", "APP_HOSTING", "digital ocean");
register("hetzner", "APP_HOSTING");
register("linode", "APP_HOSTING");

// --- Gaming -----------------------------------------------------------------
register("xbox game pass", "GAMING", "game pass", "xbox");
register("playstation plus", "GAMING", "playstation", "psn", "ps plus");
register("nintendo switch online", "GAMING", "nintendo");
register("ea play", "GAMING");

// --- Learning ---------------------------------------------------------------
register("coursera", "LEARNING");
register("udemy", "LEARNING");
register("skillshare", "LEARNING");
register("masterclass", "LEARNING");
register("pluralsight", "LEARNING");
register("duolingo", "LEARNING");

// --- Body & mind ------------------------------------------------------------
register("strava", "FITNESS");
register("whoop", "FITNESS");
register("peloton", "FITNESS");
register("apple fitness+", "FITNESS", "apple fitness", "fitness plus");
register("garmin connect", "FITNESS", "garmin");
register("headspace", "MEDITATION");
register("calm", "MEDITATION");
register("insight timer", "MEDITATION");

// --- Meetings & office ------------------------------------------------------
register("zoom", "VIDEO_CALLS");
register("webex", "VIDEO_CALLS");
register("google workspace", "OFFICE_SUITE", "gsuite", "google apps");
register("microsoft 365", "OFFICE_SUITE", "office 365", "microsoft office");

/**
 * Identify a subscription. Falls back from the service name to the billing
 * vendor to the URL's hostname — "Family plan" with vendor "Netflix" or url
 * "https://netflix.com/account" still resolves.
 */
export function resolveService(input: {
  name: string;
  vendor?: string | null;
  url?: string | null;
}): Service | null {
  const candidates = [input.name, input.vendor, hostnameOf(input.url)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hit = REGISTRY.resolve(candidate);
    if (hit) return hit;
  }
  return null;
}

/** "https://www.netflix.com/browse" -> "netflix com". Never throws. */
function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Identity for grouping two rows as "the same service". Known services share
 * their canonical name; unknown ones fall back to their normalized name, so
 * two rows both called "Bob's Gym" still read as duplicates of each other.
 * Returns null when a name normalizes to nothing to group on.
 */
export function serviceIdentity(input: {
  name: string;
  vendor?: string | null;
  url?: string | null;
}): string | null {
  const service = resolveService(input);
  if (service) return service.canonical;
  return normalizeServiceName(input.name) || null;
}
