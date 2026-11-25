# How Papolona works

A map of the whole system: the mobile app, the backend, the database and the outside services, and
what is connected to what. Written 20 November 2026; check the code when something here looks out of date.

---

## 1. The big picture

```
┌──────────────────────────┐        HTTPS / JSON         ┌───────────────────────────┐
│  Mobile app (this repo)  │  ─────────────────────────▶ │  Backend (papolona-backend)│
│  React Native + Expo     │   /api/v1/...  Bearer JWT   │  Node + Express            │
│  TanStack Query cache    │ ◀─────────────────────────  │  deployed on Vercel        │
└──────────────────────────┘                             └─────────────┬─────────────┘
                                                                       │
              ┌───────────────────────┬───────────────────┬────────────┼──────────────┬──────────────────┐
              ▼                       ▼                   ▼            ▼              ▼                  ▼
     Postgres (Neon)          ANU Quantum RNG       AI judge (LLM)  Cloudinary     Mail (Brevo/SMTP)  Google Sign-In
     every table              the 6-letter clues    Claude, else    avatars and    codes, reminders,  verifies Google
     (Drizzle ORM)                                  Ollama          journal photos retreat inbox      ID tokens
```

- **App repo:** `C:\RN\Papolona`. **Backend repo:** `C:\Users\pc\Desktop\papolona-backend`.
- The app only talks to the backend; it never calls the database, the RNG or the AI directly.
- Where the app points: `src/services/api.ts`. It is currently switched to a **local** backend
  (`http://10.0.2.2:4000/api/v1` on the Android emulator, `localhost:4000` on iOS) for testing. The
  commented line above it uses `EXPO_PUBLIC_API_URL` from `.env` (the hosted Vercel backend).
- MongoDB is retired; the backend is Postgres-only.

---

## 2. The user's journey

```
Welcome → Opening story screens → Questionnaire (cohort) → Intro video → Sign up / Log in
   │
   ▼
APPRENTICE (status 'probation')
   Draw a clue for a question → interpret it → the AI judge passes or fails it
   Each PASSED reading counts; after PROBATION_READINGS (28) the apprenticeship is complete
   │
   ▼
GRADUATION → Membership screen: join (free) and choose Explorer, Creator or Collector
   │
   ▼
MEMBER (status 'member')
   Optional series: Single (1), Twin (2), Level 1–4 (3, 6, 12, 24 readings)
   Each passed reading in a series reveals one tile of the series' artwork
   Level 1–4 series completed → a butterfly emblem (rarity by level) → kept in the Gallery
   │
   ├─ convert the emblem into an NFT (paid, demo payments for now) → can be listed for sale
   ├─ listing it puts it on the public collective artwork (the "wall")
   └─ other members buy it on the marketplace; Papolona keeps MARKET_FEE_PERCENT (50%)
   │
   ▼
ACTIVE MEMBER: bought the Sensitisation Package AND converted an NFT in the last ACTIVE_WINDOW_DAYS (60)
   Only active members can sell on the marketplace
```

---

## 3. The mobile app

### Stack
React Native 0.86 with Expo 57, React Navigation 7 (native stack + bottom tabs), TanStack Query 5 for
server data, `expo-secure-store` for tokens, `expo-speech-recognition` for voice journaling,
`react-native-svg` for icons and butterflies. Fonts load in `App.tsx` (clue strings in **Doto**, a dot
matrix face, see `src/theme/fonts.ts`).

### Folder layout (`src/`)

| Folder | What it holds |
|---|---|
| `navigation/` | `RootNavigator` (restores the session, then opens Welcome or the tabs), `AppNavigator` (every stack screen), `BottomTabs` + `customBottom/` (the floating tab bar), `types.ts` (route params) |
| `constants/screens.ts` | Every screen name |
| `services/api.ts` | The HTTP client: base URL, `Authorization: Bearer`, refresh-on-401, error shape |
| `services/session.ts` | One function per backend endpoint, plus token storage, login, logout, restore |
| `services/queries.ts` / `queryKeys.ts` | TanStack Query hooks (`useProbation`, `useClueStatus`, `useActiveSeries`, `useWall`, …) and their cache keys |
| `features/<area>/` | Screens and components per area (below) |
| `components/` | Shared UI: headers, bottom sheet, buttons, backgrounds, photo/zoom viewers |
| `theme/` | Colours (`colors.ts`) and fonts (`fonts.ts`) |

### The five tabs

| Tab | File | What it shows | Backend it uses |
|---|---|---|---|
| **Home** | `features/home/screen/HomeTab.tsx` | Reading of the day (one emblem from the wall, changes daily, opens its readings), "Start new papolona reading" (to the Journal), apprenticeship progress, stats, month density | `/artwork/wall`, `/users/me/probation`, `/stats` |
| **Journal** | `features/journal/screen/JournalTab.tsx` | "My private journal": the question card (ask → draw clue) with its interpretation attached, the Series box (members), the month calendar, the threads (one per day) | `/clue-string`, `/clue-string/:id/interpretation`, `/journal`, `/journal/calendar`, `/series/*`, `/stats` |
| **Discover** | `features/discover/screen/DiscoverTab.tsx` | The collective artwork, the marketplace, packages and retreat, the Pyramid art story, the community map | `/artwork/*`, `/market/*`, `/membership/*`, `/community/*` |
| **Gallery** (route `Collect`) | `features/collect/screen/CollectTab.tsx` | The member's emblems grouped by rarity, their listings | `/series`, `/market/mine` |
| **Profile** | `features/profile/screen/ProfileTab.tsx` | Account, settings, billing info, membership & purchases, reminders, help | `/users/me/*`, `/membership`, `/reminders` |

### Stack screens opened from the tabs
`JournalThread` (one day's notes and AI insights), `ReadingsGallery` (every reading; can open one day's),
`StartSeries`, `SeriesDetail` (a completed series: emblem, NFT conversion, mint choice), `CollectiveArtwork`,
`WallTile` (one emblem on the wall with every reading that earned it), `MemberGallery`, `Marketplace`,
`Listing`, `PackageDetail`, `RetreatDetail`, `Membership`, `Purchases`, `BillingInfo`, `Reminders`,
`Settings`, `HelpInformation`, `CommunityMap`, `PyramidArtStory`, plus the onboarding and auth screens.

### How data flows in the app
1. A screen calls a hook from `services/queries.ts` (for example `useClueStatus()`).
2. The hook calls a `session.ts` function, which calls `api.ts`, which sends the request with the access token.
3. On a 401 the client refreshes the token once (`/auth/refresh`) and retries; if that fails the user is signed out.
4. The response is cached under its query key. Actions (draw a clue, interpret, start a series, buy)
   update the cache directly (`setQueryData`) or invalidate the keys that changed, so other tabs refresh.
5. Journal notes are optimistic: they appear at once and are replaced by the saved entry (`journalCache.ts`).

---

## 4. The backend

### Stack
Node + Express, Zod for validation and config, Drizzle ORM on Postgres (Neon), JWT access tokens (15 min)
with rotating refresh tokens stored as sessions, Helmet and rate limiting. One Vercel serverless function
(`api/index.js`) serves every route. Config and defaults: `src/config/env.js`.

### Modules (`src/modules/`) and their routes (all under `/api/v1`)

| Module | Routes | Responsible for |
|---|---|---|
| `app` | `/health`, `/app/config` | Health check, app config (legal versions etc.) |
| `onboarding` | `/onboarding/questionnaire`, `/questionnaire/submit` | The questionnaire; its answers set the user's **cohort** |
| `auth` | `/auth/register`, `/login`, `/google`, `/refresh`, `/logout`, `/logout-all`, password reset | Accounts, sessions, Google sign-in |
| `users` | `/users/me`, `/me/settings`, `/me/billing`, `/me/purchases`, `/me/probation`, avatar, email/phone change, sessions, delete | The profile and everything about the signed-in user |
| `clue` | `GET/POST /clue-string`, `/clue-string/history`, `/clue-string/:id/interpretation`, `/clue-string/:id/rating` | Drawing the clue (ANU RNG), the cooldown, the AI judge, ratings |
| `journal` | `/journal`, `/journal/photos`, `/journal/calendar`, `/journal/insights` | Notes (text/voice/photos), the calendar, AI insights per day |
| `stats` | `/stats` | Readings, pass rate, notes, streaks, eeriness/satisfaction over time |
| `membership` | `/membership`, `/join`, `/checkout`, `/type`, `/stone`, `/retreat` | Graduation, membership type, active status, Sensitisation Package, retreat applications |
| `series` | `/series/options`, `/active`, list, start, `/:id/convert`, `/:id/mint-choice`, `/:id/publish` | Series, tiles, emblems, NFT conversion |
| `artwork` | `/artwork/wall`, `/wall/:id`, `/members/:id`, `/badges/me` | The collective artwork (the wall), member galleries |
| `market` | `/market/listings`, `/mine`, list/cancel/buy | The NFT marketplace and its fee |
| `community` | `/community/map`, `/community/stats` | World map of users by country, collective figures |
| `reminders` | `/reminders`, `/internal/cron/reminders` | Emailed reminders, sent by a scheduler (guarded by `CRON_SECRET`) |
| `billing` | (used by membership/series/market) | Billing profiles and demo payments |

### Database tables (`src/db/postgres/schema.js`)

| Table | Holds | Linked to |
|---|---|---|
| `users` | Account, `status` (probation/member), `membership_type`, cohort, clue cooldown slot | everything |
| `user_identities` | Google identities | users |
| `sessions` | Refresh-token sessions | users |
| `password_resets`, `pending_changes` | One-time codes | users |
| `questionnaires`, `questionnaire_submissions` | The questionnaire and answers (→ cohort) | users |
| `legal_acceptances`, `app_config` | Accepted terms, app config | users |
| `clue_draws` | Every reading: question, clue, interpretation, verdict, judge feedback, ratings, `series_id` | users, nft_series |
| `nft_series` | Each series: length, grid, rarity, artwork, reveal order, revealed tiles, status, deadline, conversion, owner/creator | users, clue_draws, nft_listings |
| `nft_listings` | Marketplace listings: price, fee, seller, buyer | nft_series, users |
| `payments` | Demo payments (memberships, conversions, packages, purchases) | users |
| `billing_profiles` | Who pays | users |
| `stone_orders` | Sensitisation Package orders | users |
| `retreat_applications` | Retreat applications (also emailed) | users |
| `journal_entries`, `journal_insights` | Notes and the AI's reading of each day | users, clue_draws |
| `reminders` | Reminder schedules | users |
| `user_badges` | Old badges (no longer awarded) | users, nft_series |

### Outside services

| Service | Used for | Config |
|---|---|---|
| Neon Postgres | All data | `DATABASE_URL` |
| ANU Quantum Random Numbers | The six letters of every clue | `QRNG_API_URL`, `QRNG_API_KEY` (unset → drawing answers 503) |
| Claude (Anthropic), else Ollama | The AI judge of interpretations and the journal insights (`src/utils/llm.js`) | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OLLAMA_URL` |
| Cloudinary | Avatars and journal photos | `CLOUDINARY_*` |
| Brevo or SMTP | Reset codes, email/phone confirmations, reminders, retreat applications | `BREVO_API_KEY` / `SMTP_*`, `MAIL_FROM`, `RETREAT_APPLICATIONS_EMAIL` |
| Google | Sign-in (ID token checked server-side) | `GOOGLE_WEB_CLIENT_ID` |
| A scheduler (cron) | Calls `/internal/cron/reminders` | `CRON_SECRET` |

---

## 5. The core loop, step by step

### Drawing and judging a reading
1. **Ask** (Journal, question card): the user types a question (3–500 characters) and taps Draw clue.
2. `POST /clue-string { question }` → `clue.service.generateClue`:
   - claims the user's cooldown slot (`CLUE_COOLDOWN_HOURS`, default 24; 0 = no limit),
   - draws six letters from ANU,
   - saves a `clue_draws` row, attaching it to the member's active series if there is one,
   - seals the day's open journal entries to this clue.
3. **Interpret** (Journal, interpretation): the user splits the letters into parts, gives each a meaning
   and combines them into one message (typed or spoken), then submits it once.
4. `POST /clue-string/:id/interpretation` → the AI judge (`judge.ai.js`) returns pass/fail, the parts it read,
   feedback, and its own eeriness/satisfaction scores.
5. A **pass** moves the apprenticeship on one reading, or, in a series, reveals the next tile
   (`series.onJudged`). The user then rates the reading (eeriness, satisfaction).

### Series and emblems (today's rules)
- Options (`series.service.js` `OPTIONS`): Single 1, Twin 2 (practice, no emblem), Triple 3 / Level 1
  (common), Hexa 6 / Level 2 (epic), Dozen 12 / Level 3 (mythic), Double Dozen 24 / Level 4 (legendary).
- One series at a time. After each clue opens, the member has `SERIES_WINDOW_HOURS` (24) to draw the next,
  or the series is abandoned.
- Completing a Level 1–4 series earns **one** butterfly emblem; the app names it by level
  ("Level three reading", `features/series/artworks.ts`).
- Converting it into an NFT costs the level's price (`CONVERSION_PRICE_CENTS`: $90, $180, $540, $2,160),
  demo payments for now; no on-chain minting yet.

### Marketplace and the wall
- An NFT owner lists it with a price → `nft_listings`; listing also puts it on the collective artwork.
- A buyer pays; Papolona keeps `MARKET_FEE_PERCENT` (50%), the seller the rest; the NFT moves to the buyer
  (the creator is kept, so the wall still credits who made it).
- Home's "Reading of the day" picks one wall emblem per day; tapping it opens `WallTile`, which lists every
  reading that earned it.

### Membership types (today)
- Chosen at graduation (`membership.service.js` `MEMBERSHIP_TYPES`): Explorer €10/month, Creator €25/month,
  Collector free (provisional prices, demo payments). The questionnaire's cohort only suggests one.
- **Active member** = Sensitisation Package bought + an NFT converted within the last 60 days; only active
  members can sell.

---

## 6. Where to change things

| To change… | Look in |
|---|---|
| The clue cooldown | `CLUE_COOLDOWN_HOURS` in backend env (0 = no limit); the Journal's `clueLocked` / `nextClueAt` logic |
| Apprenticeship length | `PROBATION_READINGS` |
| Series lengths, rarities, prices | `series.service.js` (`OPTIONS`, `CONVERSION_PRICE_CENTS`); app `features/series/artworks.ts` |
| Membership types and prices | `membership.service.js` (`MEMBERSHIP_TYPES`), `MEMBERSHIP_*_CENTS` env |
| Marketplace fee | `MARKET_FEE_PERCENT` |
| What the AI judge accepts | `src/modules/clue/judge.ai.js` (system prompt) |
| Where the app points | `src/services/api.ts` (`API_BASE_URL`) and `.env` (`EXPO_PUBLIC_API_URL`) |
| Fonts and colours | `App.tsx`, `src/theme/fonts.ts`, `src/theme/colors.ts` |

---

## 7. Changes the client has asked for (not built yet)

From Mark, 19 November 2026 (see the planning notes for open questions):
1. No daily reading limit for anyone (no bot check for now).
2. Explorer free, Level 2 only, cannot profit; Collector buys one member NFT a month and keeps a minimum
   wallet balance, or pays a fee; Creator converts a reading into an NFT at least every two months.
3. One emblem per passed reading in a Level 1–4 series (3, 6, 12, 24 emblems), only Levels 1–4 convertible.
4. NFT prices per level as a class, recommended minimum resale prices, sales through Papolona as agent,
   50/50 split.
5. An About / constitution statement explaining Papolona's 50% share.
