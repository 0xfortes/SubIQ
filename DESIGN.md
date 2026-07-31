# DESIGN.md — Cadence visual & interaction spec (approved v3)

Source of truth for all UI. Derived from the approved v3 prototype
(`cadence-dashboard-v3.jsx`). Quality bar: Linear / Stripe / Vercel — dark,
dense but calm, everything intentional. When implementing, map these tokens
into Tailwind theme config + shadcn CSS variables once; components consume
tokens, never raw hex values.

---

## Tokens

### Color (dark theme — the default and only theme in v1; light mode is a

### "design for, don't build" item: keep everything on CSS vars so it's a

### token swap, not a refactor)

| Token         | Value                                     | Use                                              |
| ------------- | ----------------------------------------- | ------------------------------------------------ |
| `bg`          | `#0B0C0F`                                 | App background                                   |
| `surface`     | `#12141A`                                 | Cards, sidebar panels                            |
| `surface-2`   | `#171A22`                                 | Nested surfaces: tooltips, insight rows, flags   |
| `line`        | `rgba(255,255,255,0.07)`                  | Default borders, dividers, minor ruler ticks     |
| `line-strong` | `rgba(255,255,255,0.12)`                  | Hover borders, major ticks, tooltip borders      |
| `text`        | `#EDEFF4`                                 | Primary text                                     |
| `muted`       | `#969CAB`                                 | Secondary text, nav labels                       |
| `faint`       | `#5C6272`                                 | Tertiary: captions, tick labels, placeholders    |
| `accent`      | `#8B93FF`                                 | Primary actions, selection, links, chart stroke  |
| `accent-soft` | `rgba(139,147,255,0.14)`                  | Selected nav/category bg, active chips           |
| `mint`        | `#4FD1A1` / soft `rgba(79,209,161,0.13)`  | Positive: savings, Active status                 |
| `amber`       | `#F2B25C` / soft `rgba(242,178,92,0.13)`  | Money leaving: urgent renewals (≤4 days), trials |
| `rose`        | `#F0708A` / soft `rgba(240,112,138,0.12)` | Warnings: duplicates, overspend                  |

Semantic rule: **amber always means money about to leave or convert**; mint
always means money saved or healthy; rose always means a problem found. Never
use them decoratively.

Category palette (stable per category, used for marks/dots only):
Design `#8B93FF` · Entertainment `#F0708A` · AI Tools `#C9A0F5` ·
Dev & Infra `#6FA8F5` · Productivity `#4FD1A1` · Health `#F2B25C`.
New categories get assigned from this hue family; store the color on the
Category record.

### Typography

- UI: **Inter** (400/500/600). Base 13.5px. Titles 500 weight, slight
  negative tracking (−0.005em to −0.02em on large figures).
- Data: **JetBrains Mono** with `font-variant-numeric: tabular-nums` for ALL
  money, dates, counts, and tick labels. Money is never set in Inter.
- Scale: 10–10.5px captions/ticks · 11–12px secondary · 12.5–13.5px body ·
  21px KPI figures.

### Shape & spacing

- Radii: cards 14px · inputs/buttons/nav 7–8px · pills 999px · flags 4px
  (with one squared corner pointing at the stem).
- Borders everywhere are 1px `line`; elevation via border contrast, not
  shadows (shadows only on floating tooltips).
- Card padding 16–18px; grid gaps 12px; sidebar width 244px.
- Content max-width 1160px, centered.

### Brand mark

The logo is the **"Renewal Pulse"** mark: four rounded vertical bars of varying
height (heights 10/17/8/14 on a 24-grid), reading as the rhythm of spend over a
renewal cycle — deliberately echoing the Renewal Ruler. One component,
`components/ui/brand-mark.tsx` (`<BrandMark size className />`), inherits color
via `currentColor`; render it in `text-accent` on nav/sidebar/auth/footer. The
tab/app favicon is `src/app/icon.svg` — the same bars knocked out of a rounded
accent→violet (`#8B93FF`→`#C9A0F5`) gradient tile so it reads on light and dark
tabs. Never re-introduce a letter-in-a-box lockup. Service logos (a different
concern) live in the brand registry — see the Renewal Ruler.

### Motion

The emil-design-eng skill (and its companion animation skills) is the
authority on motion mechanics: easing curves, durations, spring physics, and
what deserves animation. Defer to it for the _how_. This document only sets
the non-negotiable _whats_:

- Motion is functional, never decorative — no entrance animations on page
  content, no parallax.
- Never animate high-frequency or keyboard-initiated actions (table row
  interactions, filter chips, command palette).
- Hover/color/border micro-transitions stay in the 100–150ms range;
  larger elements (drawers, modals) may go up to ~300ms per the skill's
  guidance.
- `prefers-reduced-motion` is always respected.

**Marketing pages exception** (the `(marketing)` route group only — app
surfaces keep every rule above): entrance and scroll-reveal animations are
allowed to support storytelling. Rules: ≤700ms, strong ease-out curves
(`--ease-out-strong` / `--ease-out-back` in globals.css), once-per-view,
stagger 30–120ms, transform/opacity only (CSS-driven, off the main thread),
no scroll-jacking, and `prefers-reduced-motion` collapses everything to
opacity-only or none. Ambient background drift must be GPU-only
(`transform`) and imperceptibly slow (≥20s cycles).

---

## Layout

```
┌ sidebar 244px ┬ main (max 1160px) ─────────────────────────┐
│ brand         │ breadcrumb          [Search ⌘K] [+ Add]    │
│ nav (5 items) │ KPI row: 4 equal cards                     │
│ ──────────    │ Renewal Ruler (full width card)            │
│ CATEGORIES    │ Spending trend (1.9fr) | Insights (1fr)    │
│  accordion    │ Subscriptions table (full width card)      │
│ ──────────    │                                            │
│ workspace     │                                            │
└───────────────┴────────────────────────────────────────────┘
```

Breakpoints: ≤1020px → KPIs 2×2, mid grid stacks. ≤760px → sidebar hidden
(v1: replaced by a sheet/drawer trigger in the top bar — the drawer contains
the same nav + category accordion), table drops Category and Next-renewal
columns.

---

## Components & behaviors

### Sidebar

- Sections: brand → primary nav → **Categories** accordion → workspace footer.
- Nav item states: default `muted`; hover subtle white 4% bg; active
  `accent-soft` bg + `text` color. Insights item carries a mono count badge.

### Category accordion (core interaction)

- Each row: chevron (rotates 90° when open) · 7px square `CategoryMark` ·
  name · mono monthly total right-aligned (base currency, cents-precise so it
  equals the sum of the children).
- Clicking a row toggles expansion AND selects the category as the
  **dashboard-wide scope**: KPIs recalculate (first KPI relabels to
  "{Category} spend"), Renewal Ruler re-filters, table re-filters,
  breadcrumb shows the scope. Clicking the selected row again deselects.
- Selected row: `accent-soft` bg + 2px inset accent bar on the left edge.
- Expanded children: indented list with a 1px left guide line; each child
  shows service name + its **monthly-equivalent** spend in the base currency
  (`/mo`), so the children visibly sum to the header total. (Changed 2026-07-30
  from per-cycle charge to reconcile with the total.)
- A "Clear" action appears in the section heading while a scope is active.
- **State rules:** selected category lives in the URL (`?category=slug`) —
  shareable, back-button works, server can filter. Open/closed accordion
  state persists per user (localStorage in v1). Past ~10 categories, fold
  behind "Show more".

### KPI cards

Four equal cards: icon chip (24px, 7px radius) + 12px muted label, 21px mono
figure, 11.5px faint subline. Third card (Renewing this week) uses amber
chip tint; fourth (Potential savings) mint. All values derive from the
current scope — nothing hardcoded. Empty scope shows "—" with an honest
subline ("nothing due").

### Renewal Ruler → "Next 30 days" module (signature element — protect it)

Redesigned 2026-07-31 (UX-first) from the amount-flag ruler to a **hybrid**:
a spatial band for the month at a glance + a grouped agenda for exact detail,
so a first-time user instantly reads _what renews next, when, how much, and
which service_. Full-width card titled "Next 30 days", subline
"{n} renewals · {$total} leaving your account". Three synchronized parts share
one hover state (`activeDay`) — hovering/focusing a band node highlights its
agenda row and vice-versa:

1. **Spatial band** (compact, ~46px): 31 daily ticks (1px `line`), heavier
   weekly ticks (`line-strong`), mono labels Today / +15d / +30d. **One node
   per day** (same-day renewals merged; a merged node is slightly larger),
   positioned along the 0..30 axis, colored by the service's **brand color**
   when it reads on dark, else the category hue. Nodes within 4 days are amber.
   Each node is a keyboard-operable button with a full aria-label and a **Radix
   Tooltip** (`components/ui/tooltip.tsx`, portaled, `avoidCollisions`); on
   hover/focus it scales up (motion-safe) with a hued halo.
2. **Up next**: the single soonest renewal, emphasized — service logo + name ·
   category + relative time + amount. The time reads amber when ≤4 days, else
   muted (amber stays semantic: money leaving soon).
3. **Agenda**: the remaining renewals grouped **This week (≤7d) / Next week
   (8–14) / Later (15–30)**; each row = service logo + name + category +
   relative date (weekday for this week, else date) + amount. Rows cross-
   highlight their band node on hover.

- **Service logos** come from the brand registry `lib/brands.ts` (`resolveBrand`
  over `simple-icons`, ~60 curated services + aliases), rendered by
  `components/ui/service-icon.tsx` on a brand-tinted chip; unknown names fall
  back to the letter avatar (`ServiceAvatar`) so the layout is identical either
  way. Dark brand colors (GitHub/Notion/Vercel) render the glyph in a light
  neutral (`isDarkColor` in `lib/colors.ts`). ServiceIcon is shared by the
  timeline, subscriptions table, analytics leaderboard, and marketing preview.
- **Data shaping is pure** in `lib/renewal-ruler.ts` — `groupRenewalsByDay`
  (band), `bucketRenewals` (up-next + windows), `sortRenewals` — with unit
  tests (same-day merge, window bounds, bucket boundaries, empty).
- Motion follows the app-surface rules: 150ms hover transitions, node scale
  gated on `motion-safe`, no entrance animation. The marketing hero
  (`ruler-demo.tsx`) mirrors the same language with the marketing entrance
  stagger, and must not drift from the real module.

### Spending trend

Recharts area chart: accent stroke 1.8px, vertical gradient fill
(accent 28% → 0), horizontal-only gridlines in `line`, mono axis ticks in
`faint`, no axis lines. Tooltip: surface-2, 1px line-strong, 10px radius.

### Insights panel

Header: sparkle icon in accent + "Insights", right-aligned mint pill with
total recoverable amount. Each insight: 26px tone-tinted icon chip
(rose = duplicate, amber = trial/deadline, mint = saving), 12.5px 500-weight
title, 12px muted body, accent action link with arrow. Dismiss "X" per row.
Empty state: "All caught up. New insights arrive after your next sync."

### Subscriptions table

- Header row: search input + status filter chips (All/Active/Trial/Paused);
  active chip gets accent-soft treatment. Title shows current category scope
  as "Subscriptions — {Category}".
- Columns: Service (30px letter avatar in brand hue at 12% bg + name +
  provider subline, amber star for favorites) · Category (mark + name) ·
  Cost (mono, right-aligned, faint cycle suffix) · Next renewal (mono) ·
  Status pill.
- Status pills: dot + label; Active mint, Trial amber, Paused neutral.
- Rows: 1px `line` top borders, white 2.5% hover bg, focusable.
- Empty state names the failing filter and suggests changing it.

### Buttons & inputs

- Primary: accent bg, near-black text (`#101223`), 500 weight, brightness
  hover. One primary action per view ("Add subscription").
- Secondary/ghost: 1px line border or borderless muted text.
- Focus: 2px accent outline, 2px offset — on every interactive element.
- ⌘K search affordance in the top bar (command palette is a v1.5 item, but
  the affordance ships from day one).

---

## Voice

Interface copy is plain and specific: amounts and dates over adjectives
("$34.99 leaving your account", "Trial ends Jul 27" — never "Uh oh!").
Actions say what they do ("Add subscription", "Compare usage"). Empty states
direct the next action. Sentence case everywhere except tiny section
headings (uppercase, letterspaced, faint).

## Accessibility floor (non-negotiable)

WCAG AA contrast on all text tokens against their surfaces; visible focus on
everything interactive; complete aria-labels on icon-only and visual-only
controls (ruler stems, dismiss buttons); table semantics on the table;
keyboard path through sidebar accordion → ruler → table; reduced motion
respected.
