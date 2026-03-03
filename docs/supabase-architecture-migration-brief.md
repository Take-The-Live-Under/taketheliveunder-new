# Supabase Architecture — Product-Site
### Purpose, Data Model & Migration Brief to NeonDB + Drizzle + Server Actions

---

## 1. Overview

The `product-site` (`apps/product-site`) is a **Next.js 14 App Router** application that serves as the live, customer-facing dashboard for the **Take The Live Under** sports betting prediction platform. It fetches real-time NCAAB game data, runs a PPM (Points Per Minute) analysis engine, and displays betting triggers to users.

Supabase is used as the **sole persistent database layer** for this application. It is accessed exclusively via the `@supabase/supabase-js` SDK (not Supabase Auth — the app implements its own custom JWT auth on top of the raw Postgres layer that Supabase provides).

The key insight for migration: **Supabase is used purely as a managed Postgres host with a REST-over-HTTP client.** No Supabase-specific features (Auth, Storage, Realtime, Edge Functions, Row-Level Security) are actively relied upon. This makes a migration to NeonDB straightforward.

---

## 2. Configuration & Environment Variables

All Supabase connection details live in two environment variables:

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | The Supabase project REST API URL |
| `SUPABASE_ANON_KEY` | Server-side only | The anonymous service key for SDK auth |

**Important:** Despite the `NEXT_PUBLIC_` prefix on the URL, the Supabase client is instantiated **only on the server** (inside API route handlers), because `SUPABASE_ANON_KEY` has no `NEXT_PUBLIC_` prefix. The client is a lazy singleton via a module-level `getSupabaseClient()` factory with a hard-disable flag (`supabaseDisabled`) that short-circuits gracefully when env vars are missing.

```typescript
// lib/supabase.ts — client bootstrap
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseDisabled) return null;
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      supabaseDisabled = true;
      return null;
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}
```

This graceful-degradation pattern means **all DB-dependent features silently disable themselves** when the database is not configured — the app remains functional (just without logging/persistence).

---

## 3. The Central Library: `lib/supabase.ts`

This single 660-line file is **the entire database access layer**. It contains:

1. The singleton client factory.
2. TypeScript interfaces for every database table (acting as the schema contract).
3. All data access functions grouped by domain.

There is **no ORM, no query builder, no schema migration tooling** — everything is raw Supabase SDK calls (`.from('table').select()`, `.insert()`, `.update()`, `.upsert()`).

---

## 4. Database Schema

The application relies on **9 database tables**, all created directly in the Supabase project's Postgres database (no migration files tracked in this repo).

### 4.1 `trigger_logs`

**Purpose:** The core audit log of every betting trigger the engine fires. This is the most important table — it powers the daily performance report.

| Column | Type | Description |
|---|---|---|
| `id` | `number` (auto) | Primary key |
| `created_at` | `timestamp` | Auto-set by Supabase |
| `game_id` | `string` | ESPN game ID |
| `home_team` | `string` | Home team name |
| `away_team` | `string` | Away team name |
| `home_score` | `number` | Score at trigger time |
| `away_score` | `number` | Score at trigger time |
| `live_total` | `number` | Combined live score at trigger time |
| `ou_line` | `number` | O/U betting line at trigger time |
| `required_ppm` | `number` | PPM needed to hit the line |
| `current_ppm` | `number` | Actual current PPM |
| `ppm_difference` | `number` | `required_ppm - current_ppm` (positive = under pace) |
| `minutes_remaining` | `number` | Minutes left in regulation at trigger time |
| `period` | `number` | Game period (1 = first half, 2 = second half) |
| `clock` | `string` | Game clock string (e.g. `"12:34"`) |
| `trigger_strength` | `string` | `"STRONG"` / `"GOOD"` / `"MODERATE"` / `"NONE"` |
| `trigger_type` | `enum` | `"under"` / `"over"` / `"tripleDipper"` |

**Written by:** `logTrigger()` — called fire-and-forget from `api/games/route.ts` for every live game that meets trigger criteria. Duplicate logging is prevented by `hasBeenLoggedRecently()` which checks for a matching `game_id` within the last 5 minutes of game time.

**Read by:** `getTriggerLogs()` (admin view), `api/daily-report/route.ts` (the performance report engine).

---

### 4.2 `game_snapshots`

**Purpose:** A dense time-series log of **every live game's state**, written every polling cycle (~30s intervals when the `/api/games` endpoint is called). Used for model training data and game-level charting.

| Column | Type | Description |
|---|---|---|
| `id` | `number` (auto) | Primary key |
| `created_at` | `timestamp` | Auto-set |
| `game_id` | `string` | ESPN game ID |
| `home_team` / `away_team` | `string` | Team names |
| `home_score` / `away_score` | `number` | Score at snapshot time |
| `live_total` | `number` | Combined score |
| `ou_line` | `number \| null` | O/U line (null if unavailable) |
| `current_ppm` | `number \| null` | Actual PPM |
| `required_ppm` | `number \| null` | Needed PPM to hit line |
| `ppm_difference` | `number \| null` | Difference |
| `minutes_remaining` | `number` | Regulation minutes left |
| `period` | `number` | Period number |
| `clock` | `string` | Game clock |
| `status` | `string` | `"in"` / `"pre"` / `"post"` |
| `is_under_triggered` | `boolean` | Whether the under trigger was active |
| `is_over_triggered` | `boolean` | Whether the over trigger was active |

**Written by:** `logGameSnapshots()` — batch insert of all live game snapshots, fire-and-forget from `api/games/route.ts`.

**Read by:** `api/game-snapshots/route.ts` — fetches ordered timeline for a specific `game_id` for chart rendering.

---

### 4.3 `line_history`

**Purpose:** Tracks the opening O/U line and the min/max movement for each game throughout the day. Powers the "line movement" feature on the game card UI.

| Column | Type | Description |
|---|---|---|
| `game_id` | `string` (PK, unique) | ESPN game ID |
| `opening_line` | `number` | First line recorded for the game |
| `max_line` | `number` | Highest line seen |
| `min_line` | `number` | Lowest line seen |
| `last_updated` | `timestamp` | Last write time |

**Special pattern — in-memory + DB hybrid cache:**
This table has an interesting dual-layer pattern. An in-memory `Map<string, LineHistory>` (`lineCache`) is the primary read target. On the first request of the day, `initializeLineCache()` loads today's existing lines from Supabase into the map. All subsequent reads happen in-memory (O(1)). Writes are debounced — `persistLineHistory()` only writes to Supabase when max/min values actually change, and never awaited (fire-and-forget). Stale game entries are cleaned from the in-memory map via `cleanLineCache()` after each `/api/games` response.

**Written by:** `updateLineCache()` (via `persistLineHistory()`), called for every pre-game and live game on each poll.

**Read by:** Merged into the `Game` response object by `api/games/route.ts`.

---

### 4.4 `site_analytics`

**Purpose:** Custom event tracking for page views and user actions within the product site.

| Column | Type | Description |
|---|---|---|
| `id` | `number` (auto) | Primary key |
| `created_at` | `timestamp` | Auto-set |
| `event_type` | `string` | Event name (e.g. `"page_view"`) |
| `page` | `string \| null` | Page path |
| `user_agent` | `string \| null` | Browser user agent |
| `referrer` | `string \| null` | HTTP referer header |
| `user_id` | `string \| null` | Linked user ID (if logged in) |
| `session_id` | `string \| null` | Ephemeral session identifier |
| `metadata` | `JSONB \| null` | Arbitrary extra data |

**Written by:** `logAnalyticsEvent()`, called from `api/analytics/route.ts` via `POST /api/analytics`.

**Read by:** `getAnalyticsSummary(days)` — aggregates total visits, unique users, unique sessions, and per-page view counts over a rolling N-day window. Served by `GET /api/analytics`.

---

### 4.5 `email_signups`

**Purpose:** A lightweight pre-launch waitlist capture. Stores email addresses collected from the landing page before users create full accounts.

| Column | Type | Description |
|---|---|---|
| `email` | `string` (unique PK) | User email |
| `signed_up_at` | `timestamp` | When they signed up |
| `source` | `string` | Signup source label (e.g. `"landing_page"`) |

**Special behavior:** Uses `upsert` with `onConflict: 'email'` to silently de-duplicate if the same email submits multiple times. Failures are intentionally swallowed — the endpoint returns `{ success: true }` regardless of DB errors to avoid blocking user access.

**Written by:** `api/signup/route.ts` — `POST /api/signup`.

**Read by:** `api/signup/route.ts` — `GET /api/signup` (admin list with count).

---

### 4.6 `users`

**Purpose:** The custom user accounts table. **Supabase Auth is NOT used** — this is a hand-rolled auth system with bcrypt passwords and JWT tokens.

| Column | Type | Description |
|---|---|---|
| `id` | `string` (UUID, PK) | User UUID |
| `email` | `string` (unique) | Lowercased email |
| `password_hash` | `string \| null` | bcrypt hash (null for OAuth users) |
| `google_id` | `string \| null` | Google OAuth ID (if applicable) |
| `display_name` | `string \| null` | Optional display name |
| `created_at` | `timestamp` | Account creation time |
| `email_verified` | `boolean` | Whether email is verified |

**Functions:** `createUser()`, `getUserByEmail()`, `getUserById()`.

**Auth flow:** Passwords are hashed with `bcryptjs` (cost factor 12) in `lib/auth.ts`. JWTs are signed/verified with `jsonwebtoken` using `JWT_SECRET` env var, with a 7-day expiry. The JWT payload contains only `{ userId, email }`.

---

### 4.7 `subscriptions`

**Purpose:** Tracks the subscription/billing state for each user, including Stripe integration fields and trial management.

| Column | Type | Description |
|---|---|---|
| `id` | `string` (UUID, PK) | Subscription UUID |
| `user_id` | `string` | Foreign key → `users.id` |
| `status` | `enum` | `"trial"` / `"active"` / `"past_due"` / `"canceled"` / `"expired"` |
| `trial_start` | `timestamp` | Trial start (set on registration) |
| `trial_end` | `timestamp` | Trial end (14 days from start, set by DB default) |
| `stripe_customer_id` | `string \| null` | Stripe customer ID |
| `stripe_subscription_id` | `string \| null` | Stripe subscription ID |
| `plan` | `string \| null` | Plan name/tier |
| `created_at` | `timestamp` | Auto-set |
| `updated_at` | `timestamp` | Updated on changes |

**Functions:** `createSubscription()` (called on registration, sets 14-day trial in DB defaults), `getSubscriptionByUserId()`, `updateSubscription()`.

**Note:** The initial trial period (14 days) is set as a **database-level default**, not in application code — `createSubscription()` just inserts `{ user_id }` and the DB fills in the rest.

---

### 4.8 `user_preferences`

**Purpose:** Stores per-user configuration preferences.

| Column | Type | Description |
|---|---|---|
| `id` | `string` (UUID, PK) | UUID |
| `user_id` | `string` | Foreign key → `users.id` |
| `favorite_teams` | `string[]` | Array of favorite team names |
| `notifications_enabled` | `boolean` | Push notification setting |
| `onboarding_completed` | `boolean` | Whether onboarding flow was finished |
| `created_at` | `timestamp` | Auto-set |

**Functions:** `createUserPreferences()` — called once on registration, creates a default row.

---

### 4.9 `user_activity`

**Purpose:** Tracks aggregate usage metrics per user for analytics and feature gating.

| Column | Type | Description |
|---|---|---|
| `id` | `string` (UUID, PK) | UUID |
| `user_id` | `string` | Foreign key → `users.id` |
| `triggers_viewed` | `number` | Count of triggers the user has viewed |
| `games_tracked` | `number` | Count of games tracked |
| `alerts_received` | `number` | Count of alerts received |
| `last_active` | `timestamp` | Last activity timestamp |

**Functions:** `createUserActivity()` (on registration), `getUserActivity()`, `incrementUserActivity()`.

**Special pattern:** `incrementUserActivity()` attempts to use a Supabase RPC call (`increment_user_activity` — a stored Postgres function) for atomic increments. If the RPC fails, it falls back to a manual read-then-update pattern. This Postgres stored procedure **must be recreated** when migrating.

---

## 5. API Routes — Supabase Consumer Map

| Route | Method | Tables Accessed | Operations |
|---|---|---|---|
| `api/auth/register` | `POST` | `users`, `subscriptions`, `user_preferences`, `user_activity` | INSERT × 4 |
| `api/auth/login` | `POST` | `users`, `subscriptions` | SELECT × 2 |
| `api/auth/me` | `GET` | `users`, `subscriptions`, `user_activity` | SELECT × 3 |
| `api/auth/route.ts` | — | — | (auth utility only, no DB) |
| `api/signup` | `POST` | `email_signups` | UPSERT |
| `api/signup` | `GET` | `email_signups` | SELECT |
| `api/analytics` | `POST` | `site_analytics` | INSERT |
| `api/analytics` | `GET` | `site_analytics` | SELECT (aggregation) |
| `api/games` | `GET` | `trigger_logs`, `game_snapshots`, `line_history` | INSERT, UPSERT, SELECT |
| `api/game-snapshots` | `GET` | `game_snapshots` | SELECT |
| `api/daily-report` | `GET` | `trigger_logs` | SELECT (date-range query) |
| `api/cron` | — | — | (triggers `/api/games` poll, no direct DB) |

---

## 6. Data Flow Diagrams

### 6.1 Live Game Polling Loop (`/api/games`)

This is the **highest-frequency and most data-intensive** flow:

```
Browser/Cron → GET /api/games
                    │
                    ├─► ESPN Scoreboard API (live scores)
                    ├─► ESPN Summary API (foul/bonus data, parallel per live game)
                    ├─► The Odds API (O/U lines, if ODDS_API_KEY set)
                    │
                    ├─► updateLineCache() [for each game with a line]
                    │       └─► Supabase: SELECT line_history (cold start only)
                    │       └─► Supabase: UPSERT line_history (if min/max changed)
                    │
                    ├─► [For triggered live games] hasBeenLoggedRecently()
                    │       └─► Supabase: SELECT trigger_logs (last 5 min)
                    │       └─► if not recent: logTrigger()
                    │               └─► Supabase: INSERT trigger_logs
                    │
                    └─► logGameSnapshots() [ALL live games]
                            └─► Supabase: INSERT game_snapshots (fire & forget)
```

### 6.2 User Registration Flow (`/api/auth/register`)

```
POST /api/auth/register { email, password, displayName }
        │
        ├─► getUserByEmail() → SELECT users (check for duplicate)
        ├─► hashPassword() (bcrypt, cost=12)
        ├─► createUser() → INSERT users
        ├─► createSubscription() → INSERT subscriptions (trial dates set by DB)
        ├─► createUserPreferences() → INSERT user_preferences
        ├─► createUserActivity() → INSERT user_activity
        └─► generateToken() → JWT (7-day, no DB call)
        │
        └─► Response: { token, user, subscription }
```

### 6.3 Daily Report Flow (`/api/daily-report`)

```
GET /api/daily-report?date=YYYY-MM-DD
        │
        ├─► getTriggersForDate(date)
        │       └─► Supabase: SELECT trigger_logs WHERE created_at BETWEEN [6am EST, next day 6am EST]
        │
        ├─► fetchFinalScores(date) → ESPN Scoreboard API (completed games)
        │
        └─► Business logic: match triggers to final scores, calculate win rates by trigger type
                └─► Response: { summary, topPerformers, allResults }
```

---

## 7. Patterns & Quirks Worth Noting

### 7.1 No Supabase Auth
The app does **not** use `supabase.auth.*` APIs at all. Authentication is fully custom:
- Passwords via `bcryptjs`
- Sessions via `jsonwebtoken` (stored client-side, sent as `Authorization: Bearer <token>`)
- No cookies, no server-side sessions, no refresh tokens

### 7.2 Fire-and-Forget Writes
The three highest-throughput writes — `logTrigger`, `logGameSnapshots`, and `persistLineHistory` — are **never awaited**. They are called without `await` so they never block the API response. This means write failures are silent and the response latency is unaffected. This is a key architectural characteristic to preserve in migration.

### 7.3 Stored Procedure Dependency
`incrementUserActivity()` calls a Postgres stored procedure: `increment_user_activity(p_user_id, p_field)`. This function must exist in the database — it is not defined in the codebase (it was created directly in Supabase's SQL editor). A Drizzle migration will need to recreate it.

### 7.4 Database-Level Defaults
The `subscriptions` table relies on DB-level defaults for `trial_start`, `trial_end`, `status`, etc. These defaults are defined in Supabase and are not in the codebase. They must be explicitly recreated in Drizzle schema definitions.

### 7.5 The `PGRST116` Error Code
Several functions (e.g. `getUserByEmail`, `getSubscriptionByUserId`, `getUserActivity`) check for error code `PGRST116` — the PostgREST "no rows returned" code — and treat it as a non-error. In Drizzle with raw queries or `drizzle-orm`, `.findFirst()` returning `undefined` is the equivalent, so this pattern will be eliminated naturally.

### 7.6 Graceful Degradation
Every single DB function wraps its logic in a try/catch and returns `null` / `[]` / `false` on failure. The app is designed to operate without a database (just without persistence). This behavior should be preserved in the migration.

---

## 8. Proposed Migration: NeonDB + Drizzle + Server Actions

### 8.1 What Changes

| Current (Supabase) | Target (Neon + Drizzle) |
|---|---|
| `@supabase/supabase-js` SDK | `drizzle-orm` + `@neondatabase/serverless` |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_ANON_KEY` | `DATABASE_URL` (Neon connection string) |
| `lib/supabase.ts` (SDK queries) | `lib/db.ts` (Drizzle schema + queries) |
| API Route Handlers calling DB directly | Next.js Server Actions (or kept as Route Handlers) |
| Raw `.from().select()` calls | Drizzle `db.select().from().where()` |
| Supabase RPC for `increment_user_activity` | Drizzle `sql` template or a regular update |
| No migration files | Drizzle Kit migration files |
| DB schema managed in Supabase UI | Schema managed in code (`schema.ts`) |

### 8.2 New Files Needed

```
apps/product-site/src/
├── lib/
│   ├── db.ts           # Drizzle client (Neon serverless driver)
│   ├── schema.ts       # All 9 table definitions in Drizzle schema syntax
│   └── queries/        # One file per domain (replaces lib/supabase.ts)
│       ├── triggers.ts
│       ├── snapshots.ts
│       ├── lineHistory.ts
│       ├── analytics.ts
│       ├── users.ts
│       ├── subscriptions.ts
│       └── signups.ts
├── actions/            # Server Actions (if migrating from Route Handlers)
│   ├── auth.ts
│   ├── analytics.ts
│   └── signup.ts
drizzle.config.ts       # Drizzle Kit config pointing at Neon DATABASE_URL
drizzle/
└── migrations/         # Auto-generated by `drizzle-kit generate`
```

### 8.3 Schema Translation Example

**Supabase TypeScript interface → Drizzle schema:**

```typescript
// BEFORE: lib/supabase.ts interface (no DB enforcement)
export interface TriggerLog {
  id?: number;
  created_at?: string;
  game_id: string;
  trigger_type: 'under' | 'over' | 'tripleDipper';
  // ...
}

// AFTER: lib/schema.ts (Drizzle, code-first, generates migration SQL)
import { pgTable, serial, timestamp, text, real, integer, pgEnum } from 'drizzle-orm';

export const triggerTypeEnum = pgEnum('trigger_type', ['under', 'over', 'tripleDipper']);

export const triggerLogs = pgTable('trigger_logs', {
  id:               serial('id').primaryKey(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  gameId:           text('game_id').notNull(),
  homeTeam:         text('home_team').notNull(),
  awayTeam:         text('away_team').notNull(),
  homeScore:        integer('home_score').notNull(),
  awayScore:        integer('away_score').notNull(),
  liveTotal:        real('live_total').notNull(),
  ouLine:           real('ou_line').notNull(),
  requiredPpm:      real('required_ppm').notNull(),
  currentPpm:       real('current_ppm').notNull(),
  ppmDifference:    real('ppm_difference').notNull(),
  minutesRemaining: real('minutes_remaining').notNull(),
  period:           integer('period').notNull(),
  clock:            text('clock').notNull(),
  triggerStrength:  text('trigger_strength').notNull(),
  triggerType:      triggerTypeEnum('trigger_type').notNull(),
});
```

### 8.4 Query Translation Example

**Supabase SDK → Drizzle query:**

```typescript
// BEFORE: lib/supabase.ts
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error && error.code !== 'PGRST116') return null;
  return data;
}

// AFTER: lib/queries/users.ts
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function getUserByEmail(email: string) {
  try {
    return await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    }) ?? null;
  } catch {
    return null;
  }
}
```

### 8.5 Server Actions Example

If migrating the auth endpoints to Server Actions instead of Route Handlers:

```typescript
// actions/auth.ts
'use server';

import { hashPassword, generateToken } from '@/lib/auth';
import { createUser, getUserByEmail, createSubscription } from '@/lib/queries/users';

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const existing = await getUserByEmail(email);
  if (existing) return { error: 'An account with this email already exists' };

  const passwordHash = await hashPassword(password);
  const user = await createUser(email.toLowerCase(), passwordHash);
  if (!user) return { error: 'Failed to create account' };

  const subscription = await createSubscription(user.id);
  const token = generateToken({ userId: user.id, email: user.email });

  return { success: true, token, user, subscription };
}
```

### 8.6 Neon Serverless Driver Setup

```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### 8.7 The `increment_user_activity` Stored Procedure

Currently called as a Supabase RPC, this should become a simple Drizzle `sql` raw expression or a proper ORM update — eliminating the stored procedure entirely:

```typescript
// AFTER: lib/queries/users.ts
import { sql } from 'drizzle-orm';

export async function incrementUserActivity(
  userId: string,
  field: 'triggers_viewed' | 'games_tracked' | 'alerts_received'
) {
  try {
    await db
      .update(userActivity)
      .set({
        [field]: sql`${userActivity[field as keyof typeof userActivity]} + 1`,
        lastActive: new Date(),
      })
      .where(eq(userActivity.userId, userId));
  } catch (err) {
    console.error('Failed to increment user activity:', err);
  }
}
```

---

## 9. Migration Checklist

### Pre-Migration
- [ ] Create a Neon project and get the `DATABASE_URL` connection string
- [ ] Install dependencies: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`
- [ ] Create `drizzle.config.ts` pointing at `DATABASE_URL`

### Schema
- [ ] Write `lib/schema.ts` with all 9 tables (see §8.3 for pattern)
  - [ ] `trigger_logs` + `trigger_type` enum
  - [ ] `game_snapshots`
  - [ ] `line_history`
  - [ ] `site_analytics`
  - [ ] `email_signups`
  - [ ] `users`
  - [ ] `subscriptions` (with DB-level defaults for trial dates)
  - [ ] `user_preferences`
  - [ ] `user_activity`
- [ ] Run `drizzle-kit generate` to create migration SQL
- [ ] Run `drizzle-kit migrate` to apply to Neon

### Data Migration
- [ ] Export existing Supabase data via `pg_dump` or Supabase dashboard CSV export
- [ ] Import into Neon via `psql` or Neon's import tools

### Code Changes
- [ ] Create `lib/db.ts` (Neon + Drizzle client)
- [ ] Create `lib/queries/` folder with domain-specific files
- [ ] Migrate all 22 functions from `lib/supabase.ts` to new query files
- [ ] Replace `import { ... } from '@/lib/supabase'` across all 9 consumer files
- [ ] Remove `@supabase/supabase-js` dependency
- [ ] Remove `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars
- [ ] Add `DATABASE_URL` env var

### Testing
- [ ] Verify user registration → login → JWT auth flow
- [ ] Verify `/api/games` trigger logging (fire-and-forget, must not block response)
- [ ] Verify `/api/games` snapshot logging (fire-and-forget)
- [ ] Verify `/api/games` line tracking (cold-start cache load + incremental updates)
- [ ] Verify `/api/daily-report` date-range query with timezone handling
- [ ] Verify graceful degradation when `DATABASE_URL` is missing

---

## 10. Risk Assessment

| Risk | Severity | Notes |
|---|---|---|
| **Stored procedure `increment_user_activity`** | Low | Easy to replace with a Drizzle `sql` expression |
| **DB-level defaults on `subscriptions`** | Medium | Must explicitly define in Drizzle schema or apply via migration SQL |
| **Timezone-aware date queries in `daily-report`** | Low | Pure application logic, no DB change needed |
| **Fire-and-forget write pattern** | Low | Preserved as-is in Drizzle — just don't `await` |
| **In-memory line cache cold-start** | Low | Replace `SELECT * FROM line_history WHERE last_updated >= today` with identical Drizzle query |
| **`PGRST116` error code handling** | None | Eliminated naturally — Drizzle returns `undefined` for no-rows, not an error |
| **Data migration from Supabase** | Medium | `trigger_logs` and `game_snapshots` may be large; plan a pg_dump + restore |
| **Supabase URL is `NEXT_PUBLIC_`** | None | The key was never exposed to the browser anyway — easy rename |
