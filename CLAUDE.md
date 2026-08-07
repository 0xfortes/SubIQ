# CLAUDE.md

## Project: SubIQ

A SaaS app that helps users understand and optimize their recurring spend:
track subscriptions, forecast renewals, detect duplicates and waste, and get
AI-generated savings recommendations. Long-term vision includes AI agents that
act on the user's behalf — architect for that, don't build it yet.

Quality bar: Linear / Stripe / Vercel. Fast, minimal, intentional, accessible.

**Prose documentation lives in `docs/` (added 2026-08-06 — GITIGNORED, local to
the author's machine, deliberately not in the repo; a fresh clone won't have
it)** — written for a human learning the project, where this file is a status
log written for a tool: `docs/codebase-guide.md` (directory map, end-to-end
request trace, "which file do I change?" index, env var table), `docs/ci-cd.md`
(the four gates, the Vercel build, go-live runbook), `docs/security.md` (every
control + accepted risks). `README.md` (also gitignored) is the entry point.
When a change invalidates something in those files, update them alongside this
Status section — if they're present.

---

## Status (last updated 2026-08-07 — keep this section current)

**All five V1 scope items are BUILT and verified** (185 unit tests, 26/26 e2e,
typecheck clean, prod build green; lint has one pre-existing react-hook-form
warning in `subscription-form-dialog.tsx` — RHF's `watch()` can't be memoized by
the React Compiler). **Everything described in this file is COMMITTED** through
`02a8a73`; the working tree is clean. That includes the authenticated home,
editable profile name, Sentry observability + `nextRenewalAt` index, the
magic-link → email+password auth rework, the security-audit remediation, and all
of the 2026-08-06/07 work below.

1. ✅ Auth — **email + password** (magic link was removed 2026-07-30; see the
   Auth note below). Optional OAuth (Google/GitHub) still supported; personal
   workspace auto-created (`registerAction` calls `bootstrapPersonalWorkspace`
   explicitly; OAuth first-sign-in still bootstraps via `events.createUser`).
2. ✅ Subscriptions CRUD incl. sort select (default **cost**, matching the
   sidebar order), bulk select/archive with undo, an "Archived" chip view with
   per-row Restore (all URL-driven), and **permanent delete** (row + bulk,
   behind an `AlertDialog` confirm — `deleteSubscriptions` service +
   `deleteSubscriptionsAction`; `RenewalReminder` cascades, insights self-heal).
3. ✅ Dashboard per DESIGN.md v3 (KPIs, Renewal Ruler, trend, insights
   panel, table, category accordion scoping via `?category=`).
4. ✅ Renewal engine: `lib/recurrence.ts` math + nightly cron
   `GET /api/cron/nightly` (`app/api/cron/[job]/route.ts`, bearer-auth via
   `CRON_SECRET`, scheduled in `vercel.json`) — recomputes stale
   `nextRenewalAt`, regenerates insights, sends reminder emails
   (ledger-first **at-most-once** via `RenewalReminder` unique constraint).
   Framework in `lib/jobs/`; job bodies live in features.
5. ✅ Rule-based insights: pure rules in `features/insights/rules.ts`
   (duplicate-service + service-overlap — see the Insights note below,
   annual-switch ~2-months-free estimate,
   trial-ending ≤7d), persisted by `regenerateInsights` (upsert on
   `(workspaceId, dedupeKey)` + prune; update branch never touches
   status/dismissedAt so dismissals survive). Triggered post-mutation in
   `features/subscriptions/actions.ts` runMutation + nightly. Real
   `/insights` page shares `InsightRow` with the dashboard panel.
   Marketing landing page + route states (loading/error/not-found) done.

**Auth: email + password (2026-07-30 — replaced magic link):** magic link was
removed (no verified email domain → couldn't send in prod). Password
register/login run in **Server Actions** (`features/auth/actions.ts`:
`registerAction`/`loginAction`) that verify a **scrypt** hash (`lib/password.ts`,
no dependency) and **mint a database session** via `lib/session.ts` (opaque token

- `db.session.create` + the Auth.js session cookie) — we deliberately **kept
  `session.strategy: "database"`** and did NOT adopt the Credentials provider/JWT,
  so `session.user` self-sync, the proxy cookie check, and the e2e DB-session
  bypass all still work, and OAuth/magic-link can be re-added as pure provider
  additions. `User.passwordHash String?` (null for OAuth-only). Pages: `(auth)`
  route group → `/login` + `/register` (RHF forms; shared centered layout); old
  `/signin` + `/check-email` deleted. Logout added to `MobileNav` (was
  desktop-sidebar only). `lib/email.ts` + `RESEND_API_KEY`/`EMAIL_FROM` **stay** —
  still used by renewal reminders. Login/register are rate-limited; login returns a
  single generic "Invalid email or password" (no user enumeration).

**Insights reason about SERVICE PURPOSE, not category (2026-08-06 — replaced
the category-duplicate rule):** the old `duplicate:{categoryId}` rule flagged
any two active subs sharing a category, so Netflix + Spotify (both
"Entertainment") was reported as redundant spend — confidently wrong advice.
Redundancy is now decided by what a service is FOR, via a curated catalog:
`lib/services.ts` maps ~90 known services to one of 20 `ServicePurpose` tags
(VIDEO_STREAMING, AI_ASSISTANT, PASSWORD_MANAGER, …) plus a `canonical` id.
The name→service matcher was extracted from `lib/brands.ts` into shared
`lib/service-alias.ts` (`normalizeServiceName` + `createAliasRegistry`), so the
logo registry and the purpose registry can't drift; `resolveService` falls back
name → vendor → URL hostname and is the **single seam** an LLM classifier can
later fill for unknown services (same swap pattern as `lib/exchange-rates.ts`).
Two rules replace the old one: `DUPLICATE_SERVICE` (the same service billed
twice — applies to unknown services too, matched on normalized name; it's a
billing mistake, not a preference) and `SERVICE_OVERLAP` (different services,
same purpose; members collapse by canonical service first so a duplicate is
never also counted as an overlap). **Deliberately conservative: an
unrecognized service produces no redundancy insight at all** — silence beats
telling someone to cancel something they need, which makes catalog coverage
the honest limit of the feature. `InsightType.DUPLICATE_CATEGORY` is RETIRED
but stays in the Prisma enum (Postgres can't drop a value); no code emits it
and `regenerateInsights`' prune deleted the last rows. Dismissals of those old
insights were lost by design (accepted — they were the wrong insights).
Migration `20260806220534_add_service_insight_types`.

**Locked decisions** (expensive to reverse — don't change casually):
`AiInsight.savingsMinor` is always monthly-equivalent in the workspace **base**
currency (all amounts are FX-converted into it before summing — see Currency
below); dedupeKey grammar `dup-service:{serviceIdentity}` /
`overlap:{servicePurpose}` / `annual:{subId}` / `trial:{subId}:{date}` (format
change loses dismissals); reminders are at-most-once (ledger row claimed before
email).

**UI round from user testing (2026-08-06 → 08-07):**

- **One Add-subscription entry point.** The Subscriptions page header button was
  removed (the persistent topbar link is the only CTA); an empty account gets an
  inline "Add your first subscription" button in the table's empty state, shown
  ONLY when unfiltered. Bug this exposed and fixed: `?new=1` now opens the dialog
  via `useEffect` in `subscriptions-view.tsx`, because clicking the topbar link
  while already on `/subscriptions` is a soft navigation that never remounts the
  component, so the `useState(openNew)` initializer never re-ran.
- **Custom categories.** The form's Category select has an "Other…" option that
  reveals a free-text name. `categoryName` is sanitized BY CONSTRUCTION
  (`schemas.ts`: NFC + whitespace collapse, must start alphanumeric, then
  `[\p{L}\p{N} &'+./-]` only, ≤40 chars) — control chars, bidi overrides, angle
  brackets and quotes match no class, so nothing hostile is storable; the schema
  also rejects sending `categoryId` AND `categoryName` together. `lib/slug.ts`
  builds the URL token from a `[a-z0-9-]` whitelist (accents folded; names in
  non-Latin scripts fall back to a deterministic `c-{token}` so the display name
  survives). `resolveCategory` (service) reuses a matching slug, REVIVES a
  soft-deleted one (the unique constraint ignores `deletedAt`), caps a workspace
  at 50 categories (`ValidationError` → shown verbatim), and colors new rows via
  `fallbackColor` (DESIGN.md hue family). Create/update now run in
  `db.$transaction` so a failed insert can't orphan a category. A concurrent
  same-slug create rolls back rather than being caught — the retry finds the
  winner and reuses it.
- **The app shell brand links home (2026-08-07).** There was no way out of the
  authenticated app — the sidebar brand was a plain `<div>` and the topbar's
  leading "SubIQ" breadcrumb a plain `<span>`. All three brand elements
  (`sidebar.tsx`, `topbar.tsx` breadcrumb root, `mobile-nav.tsx` sheet title)
  are now `<Link href="/">`. **Relative, never the production domain** — that
  would break dev/preview and turn a same-origin nav cross-origin. The
  breadcrumb link matters most: below 760px the sidebar is `hidden md:flex`, so
  it's the only brand element on screen. Accessible names are deliberately
  split — "SubIQ home" (sidebar + drawer, never both in the a11y tree since
  their breakpoints are mutually exclusive) vs "SubIQ" (breadcrumb) — so
  `getByRole("link", …)` can't go ambiguous. Covered by two new e2e tests
  including a 390px-viewport one. Note for future work: **every `href` in
  `components/shell/` is a literal**; the only variable navigation targets are
  in the command palette (`sub.name` is `encodeURIComponent`'d, category slugs
  are `[a-z0-9-]` by construction via `lib/slug.ts`). Keep it that way.
- **Settings saves as one unit.** Three per-field Saves → one "Save changes":
  `updateSettingsSchema` + `updateSettings` (one `$transaction`, returns
  `currencyChanged` derived from the stored row, never the client) +
  `updateSettingsAction`; `profile-settings-form.tsx`/`workspace-settings-form.tsx`
  merged into `settings-form.tsx` (both cards kept, one submit, "Unsaved changes"
  hint). Insight regeneration now runs only when the currency actually changed.

**Subscription form dialog redesigned (2026-08-07):** replaced the uniform
2-column grid of nine equal-weight inputs with a three-tier composer — see the
new **Form dialog** section in DESIGN.md, which is the spec of record for any
future create/edit dialog. Identity header (live `ServiceIcon size="lg"`
resolving from `lib/brands.ts` as you type + borderless 20px title), 30px mono
amount with `currencySymbol()` prefix, quiet detail rows, progressive
disclosure for notes/website, and a footer showing the REAL computed renewal
(`computeNextRenewalAt` + `monthlyEquivalentMinor`) so the preview can't
disagree with what saves. New `components/ui/segmented-control.tsx` (Radix
RadioGroup + sliding indicator) replaces the interval and status Selects;
`ServiceIcon`/`ServiceAvatar` gained an `lg` (44px) size; `lib/money.ts` gained
`currencySymbol()`. The shared `dialog.tsx` primitive was deliberately NOT
touched (⌘K palette + delete confirm share it) — all styling is className
overrides on `DialogContent`. The `url` field is now reachable in the UI; it was
already in `createSubscriptionSchema` (http(s)-only), so this widened no
server-side surface. **Known nit:** Netflix-red `#E50914` has luminance 0.22,
under `isDarkColor`'s 0.32 threshold in `lib/colors.ts`, so its logo renders in
light neutral rather than brand red despite passing contrast (4.8:1) — the
threshold is tuned for near-black brands and catches saturated reds as
collateral. Left alone because it's app-wide (table, ruler, analytics,
marketing).

**Also built (post-V1):** `/settings` page (`features/settings/`) — profile
timezone + workspace default currency, both applied. Load-bearing rule in
`lib/dates.ts`: renewal dates are CALENDAR DAYS (UTC-midnight encoded,
always formatted in UTC); the profile timezone only moves the _"today"
reference_ (`todayInZone`) for day counts/ruler axis, and formats true
instants (insight `createdAt`). Currency change triggers `regenerateInsights`
(stored insights are denominated in the old currency) + layout-wide
revalidation. `SUPPORTED_CURRENCIES` lives in `lib/money.ts`; the
new-subscription form defaults to the workspace currency.
`/analytics` page (`features/analytics/`) — summary strip (annual run-rate,
projected 12-month total, priciest month), 12-month projection bar chart of
REAL upcoming charges via the recurrence engine (vs the dashboard trend's
backward approximation), category breakdown (direct-labeled HTML bar list),
cost leaderboard. Pure aggregations in `features/analytics/lib.ts`
(unit-tested); data comes free from the request-cached `fetchWorkspaceSubs`
(now exported from `@/features/dashboard`). `KpiCard` extracted to shared
`components/ui/stat-card.tsx`.

**Currency conversion (2026-07-30 — supersedes the old "no FX in v1"):** every
money figure now converts into the workspace **base** currency. Static
USD-anchored rate table in `lib/exchange-rates.ts` (approximate, hand-maintained,
**swappable for a live feed / DB-backed rates with zero call-site churn** — all
FX flows through one function). `lib/money.ts` adds `convertMinor(amountMinor,
from, to)` (via major units, so JPY/zero-decimal currencies are correct) and
`monthlyEquivalentInBaseMinor(sub, base)`, the single place a foreign sub becomes
a comparable base-currency monthly figure. Applied at every aggregation site
(dashboard KPIs/ruler/trend/accordion, analytics, insights, subscriptions cost
sort) AND the subscriptions-table Cost column — no more "N in other currencies
excluded" sublines. Display convention: the **table** shows each sub's converted
charge + cycle (e.g. €8.28/yr); the **sidebar accordion** shows the
monthly-equivalent (€0.69/mo) and its children sum **exactly** to a cents-precise
category total; both are base currency and both sort by monthly-equivalent desc,
so table order matches sidebar order. Store the original `amountMinor`/`currency`
and convert at read time — never persist converted values. `BILLING` status set
promoted to `lib/subscription-status.ts` (resolves the old duplication debt).

**Marketing landing redesign (2026-07-29→30):** nav reduced to one primary entry
point (logo-only brand + a scroll-revealed "Start free" that fades into the nav,
plus a persistent quiet "Log in"); all copy rewritten to a plain, understated
voice (no em dashes / hype); the three feature mock-cards replaced by ONE flagship
`marketing/components/product-preview.tsx` (editorial app mockup) + a redesigned
hero `ruler-demo.tsx` (category-hued nodes + letter-avatar flags, horizontal
scroll on mobile). Shared presentational primitives extracted so the preview and
the real dashboard can't drift: `components/ui/service-avatar.tsx` (ServiceAvatar,
xs/sm/md) and `components/ui/category-mark.tsx` (CategoryMark), with `fallbackColor`
moved to `lib/colors.ts`. New shadcn primitives: `components/ui/alert-dialog.tsx`
and `components/ui/tooltip.tsx`. The real dashboard Renewal Ruler tooltip was
rebuilt on **Radix Tooltip** (portal + `avoidCollisions`) so it never overflows
the viewport or overlaps at the edges.

**Authenticated home / returning-user `/` (2026-07-30 — in the working tree,
NOT yet committed):** the marketing `/` now branches on `auth()`. Logged-out
visitors get the marketing landing unchanged; authenticated users get a
personalized overview instead of acquisition copy (no "Start free"/email
capture). New `HomeOverview` (`features/dashboard/components/home-overview.tsx`,
exported from the dashboard barrel) — a "glance + go" lobby: greeting ("Welcome
back, {name}"; name = `session.user.name` → email local-part → null-safe), a
plain-voice KPI summary line, ONE primary CTA "Open dashboard" (+ quiet
"Manage subscriptions" / "Review insights"), then the REAL dashboard widgets
reused (`KpiRow` + `RenewalRuler` + `InsightsPanel`) — never mocked, so the home
can't drift from `/dashboard`. Empty-account path (zero subs) shows an
onboarding card (→ `/subscriptions?new=1`) instead of zeroed stats. `page.tsx`
fetches via `requireWorkspace` → `getDashboardData` + `listActiveInsights` +
`fetchWorkspaceSubs` (empty-check; all request-cached). No render-cost
regression: the `(marketing)` group was ALREADY dynamic (layout awaits
`auth()`). `HomeOverview` lives in `dashboard` (not `marketing`) so marketing
stays acquisition-only. E2e: new `tests/e2e/home-authenticated.spec.ts` (authed
`/` shows the overview); `landing.spec.ts` stays pinned logged-out. Known nit:
"Open dashboard" also renders in the persistent nav — two identical CTAs on the
home by design (nav shortcut vs hero); revisit if a strict single-CTA is wanted.

**Command palette is BUILT** (an earlier note here mislabeled it a "⌘K stub" —
corrected 2026-07-30): fully functional ⌘K palette — nav / search /
add-subscription / category jump, cmdk-based
(`components/shell/command-palette.tsx` + `components/ui/command.tsx`), wired in
the topbar and covered by `tests/e2e/command-palette.spec.ts`.

**Known debt:** the service-purpose catalog in `lib/services.ts` is
hand-maintained — services outside it are invisible to redundancy detection
(silent, never wrong); overlap is a heuristic about function, not actual usage,
so the copy stays suggestive ("if one is enough"); single-invocation cron vs
serverless timeout; reminder recipient = first workspace member; spending trend
approximates (no price history); the subscription form still has no way to clear
a category back to "None" once one is set; **the subscriptions table overflows a
390px viewport** (renders ~475px wide) — DESIGN.md specifies it should drop the
Category and Next-renewal columns ≤760px and that responsive rule was never
implemented, so phone users scroll the page sideways (found 2026-08-07 while
screenshotting the form dialog; pre-existing, unrelated to that work);
**`isDarkColor`'s 0.32 luminance threshold** in `lib/colors.ts` is tuned for
near-black brands (GitHub, Vercel) and catches saturated reds as collateral —
Netflix `#E50914` sits at 0.22 so its logo renders light-neutral instead of brand
red despite passing contrast at 4.8:1, everywhere ServiceIcon is used; timezone dropdown is a plain Select over ~400 IANA zones
(typeahead works; a Command combobox is future polish); DESIGN.md category hues #C9A0F5 (AI Tools)
vs #6FA8F5 (Dev & Infra)
are near-identical under red-green color blindness — mitigated everywhere by
direct labels, but a palette tweak is worth considering.

**Production readiness (audited 2026-07-27 — the current roadmap):**
Verified ready: prod build passes but requires `AUTH_SECRET`/`CRON_SECRET`
at build time (env schema hard-fails without them, by design — local check:
`AUTH_SECRET=$(openssl rand -base64 33) CRON_SECRET=$(openssl rand -hex 24)
pnpm build`); migrations in sync (`prisma migrate status` clean); Resend
email egress is real (`lib/email.ts`; dev logs to console); cron
bearer-auth, CSP/security headers, proxy gating all in place; `.env*` and
`tests/e2e/.auth/` gitignored; `src/generated/prisma` is committed by
design so no build-time `prisma generate` is needed.

Launch order (blockers first):

1. ✅ Initial git commit + GitHub remote — done MANUALLY by the user (Claude
   never commits; see Role & behavior). Repo has an `initial commit`;
   gitignore hygiene verified (`.env`, `.claude/settings.local.json`,
   `tests/e2e/.auth/` all untracked).
2. ✅ CI workflow — `.github/workflows/ci.yml` (single `verify` job: pnpm
   install → typecheck → lint → test → build; build carries DUMMY
   `DATABASE_URL`/`AUTH_SECRET`/`CRON_SECRET`) + `.nvmrc` (Node 22). Mirrors
   the local gate; no `prisma generate` (client committed). Runs on push/PR
   to `main`; `concurrency` cancel + least-priv `permissions`.
3. ✅ Migration deploy step — `vercel.json` `buildCommand` runs
   `prisma migrate deploy` **guarded to production**
   (`if [ "$VERCEL_ENV" = production ]`) then `pnpm run build`; a migrate
   failure aborts the deploy. Migrations use a DIRECT connection via new
   optional `DIRECT_URL` (`prisma.config.ts`: `DIRECT_URL ?? DATABASE_URL`)
   — runtime keeps the pooled `DATABASE_URL`. NOT in `package.json` build
   (would break CI/local) and NOT on preview deploys (protects a shared DB).
   `.env.example` documents `DIRECT_URL`.
4. ← Resume point (needs the USER's accounts). **The fresh PROD Supabase project
   is already created (DB only)**; the current project stays DEV (holds
   seed/test data). Remaining: wire Vercel env vars + Resend. From the prod project set
   on Vercel: `DATABASE_URL` = **pooled** (Supabase transaction pooler `:6543`;
   the app uses the `pg` driver adapter, serverless exhausts direct
   connections) and `DIRECT_URL` = direct/session (`:5432`) for migrations
   (`migrate deploy` on the empty prod DB builds clean schema — seeding never
   runs on deploy). Resend API key + `EMAIL_FROM` are still needed for **renewal
   reminder** emails (not auth anymore — auth is email+password, so a verified
   sending domain is no longer a launch blocker; reminders just won't send until
   one exists, which is fine pre-users); `AUTH_SECRET`/`CRON_SECRET` on Vercel.
   Disable the Data API on the prod project too (see Infra note).
5. Deploy → smoke-test **register + login** end-to-end (all covered by
   `tests/e2e/auth.spec.ts` locally; the prod smoke test confirms the session
   cookie is set on the real domain).

**Security audit remediation (2026-07-30):** full-app audit run; no critical/
injection/IDOR issues (tenant isolation, Zod-at-every-boundary, and
Prisma-only parameterization were already solid). Fixes shipped:

- **Login brute-force (was High):** durable per-account lockout on `User`
  (`failedLoginCount`/`lockedUntil`) — locks 15m after 10 fails, atomic
  increment, cleared on success. Survives serverless cold starts (the
  in-memory `rate-limit.ts` stays as a first line). _Remaining:_ a distributed
  IP/global limiter still needs a shared store (Redis) — noted for when infra
  is added.
- **Password hashing:** `lib/password.ts` now **async** scrypt (no event-loop
  block), **N=2^17** (OWASP), and **cost params encoded in the hash string**
  (`scrypt:N:r:p:salt:hash`) so cost can rise later without invalidating
  existing hashes. Login runs a dummy scrypt for unknown users → constant-time
  (no enumeration via timing).
- **Open redirect:** `callbackUrl` now rejects `//host` / `/\host`
  (`lib/safe-redirect.ts`, used by auth schemas + login/register pages).
- **Input hardening:** subscription `currency` is a real `z.enum`
  (`SUPPORTED_CURRENCIES`), not just ISO-shaped; `url` restricted to http(s)
  (latent stored-XSS guard).
- **Headers/CSP:** added HSTS + `poweredByHeader:false`; **CSP moved to
  `proxy.ts` with a per-request nonce + `strict-dynamic`** in production
  (dropped `script-src 'unsafe-inline'`; dev stays loose for HMR). Verified via
  `next start`: header nonce == script nonce, all scripts nonced.
- **Cron:** bearer check is constant-time (`timingSafeEqual`).
- **Session hygiene:** nightly job prunes expired `Session` rows
  (`pruneExpiredSessions`).
- **Accepted/deferred:** registration still reveals "email exists" and there's
  no email verification — both need a verified sending domain (revisit
  together); two long-unused secrets remain in git history (never reuse).

`subscriptions/service.ts` also validates a client-supplied `categoryId`
belongs to the workspace before write (`resolveCategoryId`, create + update) —
closes a cross-tenant category reference/leak. DB layer audited clean: zero raw
SQL in app code (all Prisma-parameterized), dynamic `orderBy`/status filters
whitelisted, every mutation workspace-scoped, all inputs Zod-validated.

**Supabase / infra decisions (2026-07-28):** Security Advisor's no-RLS warning
RESOLVED by **disabling the Data API** — SubIQ reaches Postgres only via Prisma
(the `postgres://` connection string), never the anon PostgREST API, so that
API was pure attack surface; disabling it needs no RLS and nothing to maintain.
(Fallback if ever re-enabled: a migration enabling RLS default-deny on every
table — Prisma is unaffected, connecting as the table owner which bypasses RLS.)
Tenant isolation does NOT depend on RLS — it's enforced in-app via `workspaceId`
filtering. **DB separation:** current Supabase project stays DEV; PROD gets its
own fresh project (databases don't merge — a connection string points at one DB;
`migrate deploy` changes schema only, never deletes rows; seed never runs on
deploy). All work through 2026-07-30 is committed (`821db26`); the DEV Supabase
project holds the mixed-currency seed data used to verify conversion end-to-end.

Pre-users, non-blocking: cron `maxDuration = 300` needs Vercel Pro (Hobby
caps at 60s);
**FX rates are a static hand-maintained table (approximate)** — swap to a live
feed / DB-backed rates when accuracy matters; privacy/terms pages; production
domain. E2E runs **serially** (`workers: 1` in `playwright.config.ts`) because
all specs share one seeded DB workspace.

**Error observability (2026-07-30 — DONE):** `@sentry/nextjs` wired as a
**runtime-only, errors-only** capture layer (locked decision: no `withSentryConfig`,
no source-map upload / `SENTRY_AUTH_TOKEN`, no Turbopack build changes, no
tracing/replay — DSN-gated so it's a no-op without `NEXT_PUBLIC_SENTRY_DSN`).
`@sentry/cli` build is intentionally skipped (`pnpm-workspace.yaml` allowBuilds:
false) since we don't upload maps. Client init in `src/instrumentation-client.ts`;
server/edge init + `onRequestError` in `src/instrumentation.ts`; explicit
`captureException` in `src/app/global-error.tsx` (new root boundary),
`(app)/error.tsx`, and the cron `lib/jobs/runner.ts` catch (swallows the throw,
so `onRequestError` never sees it). CSP `connect-src` allows Sentry ingest
wildcards. The DSN is public (ships in the client bundle) so it's read straight
from `NEXT_PUBLIC_SENTRY_DSN`, NOT via server-only `lib/env.ts`. Set the DSN on
Vercel at go-live to activate; end-to-end capture (throw → dashboard) is the one
thing unverifiable without a real Sentry project.

**`nextRenewalAt` index (2026-07-30 — DONE):** bare `@@index([nextRenewalAt])`
on `Subscription` (migration `20260730153146_add_subscription_next_renewal_idx`)
serves the two cron cross-workspace scans (`recomputeStaleRenewals`,
`sendDueRenewalReminders`) that filter `nextRenewalAt` with no `workspaceId`
predicate. A partial `WHERE deletedAt IS NULL` index is tighter but Prisma can't
express it declaratively — future polish only.

**Editable profile name (2026-07-30 — DONE):** `User.name` is now editable in
`/settings` (`updateNameSchema` → `updateUserName` → `updateNameAction` via the
existing `runSettingsMutation`; empty input clears to null). Two independent
Save buttons in the Profile card (name / timezone) with distinct aria-labels.
DB session strategy means `session.user.name` self-syncs — no auth callback.

**Dev gotchas:** test via `http://localhost:3000`, NEVER `127.0.0.1` (Next
blocks cross-origin dev resources → hydration silently stalls with zero
console errors). Before starting dev/e2e, kill orphaned dev servers:
suspended `next dev` processes hold the `.next/dev` lock and make new ones
exit with "Another next dev server is already running"
(`pkill -9 -f "next dev"; pkill -9 -f next-server; rm -rf .next/dev`).

---

## Role & behavior

Act as the founding engineer, not a code generator.

- **Never create git commits or push.** The user commits manually — always.
  Stage nothing; finish and verify the work, then leave the working tree for
  the user to review and commit.
- Question poor decisions and propose better alternatives **before** implementing.
- Identify edge cases and risks up front.
- Prefer maintainability over cleverness; explicit over magic.
- Optimize for a fast, correct v1. Avoid decisions that are _expensive to
  reverse_ (data model, auth, tenancy keys, money representation) — but do not
  build speculative features. When "don't overengineer" and "plan for scale"
  conflict, reversibility wins.
- If requirements are ambiguous, ask **one** focused question, then proceed.
- When adding any dependency: state why it's needed, the lighter alternative,
  and the maintenance cost. Default answer to new dependencies is "no".

---

## Commands

```bash
pnpm dev              # Next.js dev server (Turbopack)
pnpm build            # Production build
pnpm typecheck        # tsc --noEmit — run after every feature
pnpm lint             # ESLint
pnpm test             # Vitest (unit)
pnpm test:e2e         # Playwright
pnpm db:migrate       # prisma migrate dev
pnpm db:studio        # prisma studio
pnpm db:seed          # seed dev data
```

Always run `pnpm typecheck && pnpm lint && pnpm test` before declaring a
feature done.

---

## Tech stack

- **Next.js 16 (latest 16.2.x patch)** — App Router, Turbopack (default),
  Cache Components / explicit caching, async `params`/`searchParams`,
  **`proxy.ts` (not `middleware.ts`)**. Keep patched: 16.x had a coordinated
  security release in 2026 (middleware bypass, SSRF, cache poisoning) — never
  pin an old patch.
- **React 19.2**, TypeScript strict, `pnpm`.
- **Tailwind CSS v4 + shadcn/ui** — design tokens in CSS variables.
- **Prisma + PostgreSQL** (UUID PKs).
- **Auth.js** — session in HttpOnly, SameSite=Lax cookies.
- **Zod** at every boundary; **React Hook Form** for complex client forms.
- **Recharts** for charts, **Framer Motion** used sparingly, **Lucide** icons.
- **Vitest + Playwright**, ESLint + Prettier + Husky + lint-staged.
- Background jobs: **Vercel Cron → route handlers** for v1 (renewal
  reminders). Wrap in a `jobs/` abstraction so we can swap to
  Inngest/BullMQ later without touching business logic.

Deliberately **not** in v1 (add only when a real need appears, and say so):

- TanStack Query — Server Components + Server Actions + `revalidateTag`
  cover our data flow. Introduce only for genuinely client-heavy views.
- Redis, message queues, microservices, feature flags service.

---

## Architecture

Feature-based modules. Business logic never lives in components.

```
src/
  app/                  # routes only — thin, compose features
    (marketing)/
    (app)/dashboard/ subscriptions/ analytics/ settings/
    api/
  features/<name>/      # subscriptions, dashboard, analytics, insights, auth
    components/         # feature UI
    actions.ts          # server actions (validate → authorize → service)
    service.ts          # business logic (pure where possible)
    queries.ts          # data access for this feature
    schemas.ts          # zod schemas (single source of truth for types)
  components/ui/        # shadcn primitives + shared design system
  lib/                  # db client, auth, ai/, jobs/, money, dates, errors
  server/               # cross-feature server utilities (authz, rate-limit)
  types/
  proxy.ts
prisma/
tests/
```

Layering rule: `app → features → lib`. Features may not import from other
features' internals — only from their public `index.ts`.

**Server Components by default.** `"use client"` only for interactivity.
Server Actions for mutations: every action = Zod parse → authorize → service
call → `revalidateTag`/`revalidatePath` → typed result
(`{ ok: true, data } | { ok: false, error }` — never throw across the boundary).

### AI module (`lib/ai/`)

Isolated from UI and features. A `LLMProvider` interface (complete, stream,
structured output via Zod schema) with provider adapters (Anthropic, OpenAI,
OpenRouter, local). Model + provider chosen by config, never hardcoded.
Insight generation is a background/service concern that writes `AiInsight`
rows; UI only reads them. Prompts live in versioned files, not inline strings.

---

## V1 scope (✅ ALL BUILT — see Status section at top; kept as the spec of record)

1. Auth (email + password; OAuth optional; magic link removable/re-addable),
   personal workspace auto-created.
2. Subscriptions CRUD: create, edit, archive (soft delete), restore,
   duplicate, favorites, search/filter/sort, bulk archive, permanent delete.
3. Dashboard (matches the approved v3 prototype — see DESIGN.md): KPI row,
   30-day Renewal Ruler, spending trend, insights panel, subscriptions table,
   and a sidebar category accordion that scopes the entire dashboard.
   Selected category lives in the URL (`?category=`), never only in state.
4. Renewal engine: computed next-renewal dates, upcoming list, email reminders
   via cron job.
5. Rule-based insights (duplicates by category overlap, annual-vs-monthly
   savings, trial-ending alerts) behind the `AiInsight` model — so swapping
   in LLM-generated insights later is a service change, not a schema change.

## Design for, don't build

Organizations/teams & RBAC (beyond the tenancy key), invoices & receipt OCR,
bank/email import, AI agents, custom fields, public API, notifications beyond
email. Mention when a v1 decision would block these; otherwise ignore them.

---

## Non-negotiables (data & domain)

- **Tenancy from day one:** every tenant-owned table has `workspaceId`.
  v1 = one personal workspace per user. Every query filters by workspace;
  every authz check verifies membership. This is the single most expensive
  thing to retrofit — never skip it.
- **Money is integers.** `amountMinor Int` (cents) + `currency Char(3)`
  (ISO 4217). Never Float/Decimal math in JS. All formatting through
  `lib/money.ts` (Intl.NumberFormat). Monthly-equivalent normalization AND
  cross-currency conversion both live in `lib/money.ts` (`monthlyEquivalentMinor`
  / `convertMinor` / `monthlyEquivalentInBaseMinor`); every displayed total is in
  the workspace base currency (rates in `lib/exchange-rates.ts`, static +
  swappable). Store the original `amountMinor`/`currency`; convert at read time,
  never persist converted values.
- **Recurrence model:** `interval: WEEK|MONTH|YEAR` + `intervalCount Int` +
  `anchorDate`. Next renewal is **computed** (calendar-aware: Jan 31 + 1
  month = Feb 28/29), stored as a denormalized `nextRenewalAt` for querying,
  recomputed on write and by the nightly job. Date math lives in
  `lib/recurrence.ts` with exhaustive unit tests — this is the heart of the
  product.
- **Soft deletes** (`deletedAt`) on user data; default queries exclude them.
- UUIDs everywhere; indexes on all FKs and on
  `(workspaceId, nextRenewalAt)`, `(workspaceId, status)`.
- Timestamps in UTC (`timestamptz`); user timezone stored on profile and
  applied only at the presentation layer.
- Prisma enums for `status` (ACTIVE|TRIAL|PAUSED|CANCELLED), `interval`,
  insight types. No magic strings.

---

## Security (checked on every feature)

- Validate all input with Zod server-side; never trust client data,
  including hidden fields and IDs.
- Authorize in every server action and route handler: session → workspace
  membership → resource ownership. Central helper in `server/authz.ts`;
  authorization is never implied by the UI hiding a button.
- Rate-limit auth and mutation endpoints.
- CSP + secure headers in `next.config`; HttpOnly/SameSite cookies; CSRF
  covered by Auth.js + same-site actions.
- Safe errors to clients (no stack traces, no internals); structured server
  logs without PII/secrets.
- Secrets only via env vars, validated at boot with a Zod env schema.
- No raw SQL string interpolation; Prisma parameterization only.

---

## Design system

**DESIGN.md is the visual source of truth** — it specifies the approved v3
prototype (dark theme, tokens, type, and component behaviors). Read it before
building any UI. Never invent new colors, radii, or spacing values; map the
tokens into Tailwind theme variables + shadcn CSS vars once, then consume
them everywhere. If a new pattern is genuinely needed, propose it and add it
to DESIGN.md — don't improvise inline styles.

Precedence with the installed emil-design-eng / animation skills: Emil's skills
wins on tokens, color, typography, layout, and component behavior if makes sense; Emil's
skills win on motion and interaction craft** (easing, durations, what to
animate, tactile details). If the skill suggests changing a token or brand
decision, flag it instead of applying it.

## Code quality & UX conventions

- TypeScript strict, no `any`, no non-null assertions without justification.
- Derive types from Zod schemas (`z.infer`) — one source of truth.
- Small components; extract to shared `components/ui` only on the **second**
  use, not preemptively.
- Async UI states: loading (skeletons), success, empty (with a call to
  action), error (with retry). Optimistic updates for quick mutations with
  toast + undo where destructive.
- Accessibility: semantic HTML, keyboard operable, visible focus rings,
  labeled inputs, WCAG AA contrast, `prefers-reduced-motion` respected.
- `TODO(#issue):` with a reference is allowed; bare TODOs are not.
- No commented-out code, no dead code, no magic numbers (constants in the
  owning feature).

---

## Workflow (every feature)

1. Briefly state the plan: data model impact, files touched, risks.
2. Build incrementally — schema → service (+ unit tests) → action → UI.
3. Run `pnpm typecheck && pnpm lint && pnpm test`.
4. Self-review: security (authz? validation?), performance (N+1? missing
   index? payload size?), a11y.
5. Close with:
   - ✔ What was built
   - ✔ Why this way
   - ✔ Security notes
   - ✔ Performance notes
   - ✔ Future improvements / debt created (be honest)

Never generate the whole app at once. Never sacrifice the non-negotiables
for speed. If I ask for something that violates them, push back first.
