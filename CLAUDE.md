# CLAUDE.md

## Project: SubIQ

A SaaS app that helps users understand and optimize their recurring spend:
track subscriptions, forecast renewals, detect duplicates and waste, and get
AI-generated savings recommendations. Long-term vision includes AI agents that
act on the user's behalf — architect for that, don't build it yet.

Quality bar: Linear / Stripe / Vercel. Fast, minimal, intentional, accessible.

---

## Status (last updated 2026-07-27 — keep this section current)

**All five V1 scope items are BUILT and verified** (126 unit tests, 11/11 e2e,
typecheck clean; lint has one pre-existing react-hook-form warning):

1. ✅ Auth (magic link + optional OAuth), personal workspace auto-created.
   Magic-link submit redirects to `/check-email` from the action itself
   (`features/auth/actions.ts`), not via Auth.js verify-request pages.
2. ✅ Subscriptions CRUD incl. sort select, bulk select/archive with undo,
   and an "Archived" chip view with per-row Restore (all URL-driven).
3. ✅ Dashboard per DESIGN.md v3 (KPIs, Renewal Ruler, trend, insights
   panel, table, category accordion scoping via `?category=`).
4. ✅ Renewal engine: `lib/recurrence.ts` math + nightly cron
   `GET /api/cron/nightly` (`app/api/cron/[job]/route.ts`, bearer-auth via
   `CRON_SECRET`, scheduled in `vercel.json`) — recomputes stale
   `nextRenewalAt`, regenerates insights, sends reminder emails
   (ledger-first **at-most-once** via `RenewalReminder` unique constraint).
   Framework in `lib/jobs/`; job bodies live in features.
5. ✅ Rule-based insights: pure rules in `features/insights/rules.ts`
   (duplicate-category, annual-switch ~2-months-free estimate,
   trial-ending ≤7d), persisted by `regenerateInsights` (upsert on
   `(workspaceId, dedupeKey)` + prune; update branch never touches
   status/dismissedAt so dismissals survive). Triggered post-mutation in
   `features/subscriptions/actions.ts` runMutation + nightly. Real
   `/insights` page shares `InsightRow` with the dashboard panel.
   Marketing landing page + route states (loading/error/not-found) done.

**Locked decisions** (expensive to reverse — don't change casually):
`AiInsight.savingsMinor` is always monthly-equivalent in workspace default
currency (it gets summed); dedupeKey grammar `duplicate:{categoryId}` /
`annual:{subId}` / `trial:{subId}:{date}` (format change loses dismissals);
reminders are at-most-once (ledger row claimed before email).

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

**Not built (placeholder, by explicit scope decision):** command palette
(⌘K button is a stub). Known debt: no bare index on `nextRenewalAt` for the
cron's stale scan; single-invocation cron vs serverless timeout; reminder
recipient = first workspace member; spending trend approximates (no price
history); timezone dropdown is a plain Select over ~400 IANA zones
(typeahead works; a Command combobox is future polish); `User.name` shown
read-only in settings, not editable; the BILLING status set (ACTIVE+TRIAL)
is duplicated in dashboard + analytics (promote to `src/lib/` when touched
next); DESIGN.md category hues #C9A0F5 (AI Tools) vs #6FA8F5 (Dev & Infra)
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

1. Initial git commit + GitHub remote — done MANUALLY by the user (Claude
   never commits; see Role & behavior). Repo has ZERO commits (everything
   untracked on `main`); gitignore hygiene verified safe.
2. CI workflow (`.github/workflows`) mirroring the local gate: typecheck,
   lint, test, build (build needs the dummy secrets above). This is
   Claude's resume point — the workflow files can be written before the
   user's commit exists and simply be included in it.
3. Migration deploy step — nothing runs migrations in prod today; change
   `build` to `prisma migrate deploy && next build` (or a release step).
4. Provision: hosted Postgres with a **pooled** connection string (the app
   uses the `pg` driver adapter — serverless exhausts direct connections);
   Resend API key + **verified sending domain** (default `EMAIL_FROM`
   implies owning `subiq.app`; magic-link auth is unusable without email);
   `AUTH_SECRET`/`CRON_SECRET` on Vercel.
5. Deploy a preview → smoke-test magic-link sign-in end-to-end (the one
   flow no local test covers — dev email is console-only).

Pre-users, non-blocking: cron `maxDuration = 300` needs Vercel Pro (Hobby
caps at 60s); error observability (Sentry — the one new dependency worth
arguing for); bare `nextRenewalAt` index migration for the cron stale scan;
privacy/terms pages; production domain.

**Remaining feature work (after launch list):** command palette, editable
profile name.

**Dev gotchas:** test via `http://localhost:3000`, NEVER `127.0.0.1` (Next
blocks cross-origin dev resources → hydration silently stalls with zero
console errors). Before starting dev/e2e, kill orphaned dev servers:
suspended `next dev` processes hold the `.next/dev` lock and make new ones
exit with "Another next dev server is already running"
(`pkill -9 -f "next dev"; pkill -9 -f next-server; rm -rf .next/dev`).
Nothing is committed yet — the whole repo is untracked files on `main`.

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

1. Auth (email magic link + OAuth), personal workspace auto-created.
2. Subscriptions CRUD: create, edit, archive (soft delete), restore,
   duplicate, favorites, search/filter/sort, bulk archive.
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
  `lib/money.ts` (Intl.NumberFormat). Monthly-equivalent calculations happen
  in one place only.
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
