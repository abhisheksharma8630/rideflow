# RideFlow 🛺

A Rapido-inspired ride-hailing prototype for the Indian market (default city: **Chandigarh**). RideFlow delivers a complete, working end-to-end ride demonstration across three experiences backed by one API, database, and real-time layer:

- **Customer app** (React Native / Expo)
- **Driver app** (same shared Expo codebase)
- **Admin dashboard** (Next.js)

> **Prototype notice.** This is a demonstration build, not a production system. Authentication is **demo-mode** (no real OTP). Driver movement is **server-simulated** (not GPS). Payments are **informational only** (no money moves). See [Known limitations](#known-limitations) and [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).

RideFlow is an original product. It does not use Rapido's trademarks, assets, or source code and implies no affiliation.

---

## What works, end to end

Customer books → dispatch offers the ride to the nearest eligible driver → driver accepts → customer sees the assigned captain → driver arrives, starts, and the server simulates movement to the destination → trip completes with a server-computed final fare → the admin dashboard reflects every change live.

The whole flow runs **without any paid API keys** (no SMS, no maps, no payment gateway).

---

## Tech stack

| Layer   | Stack                                                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | Node 20, NestJS 10, TypeScript, Prisma 5, PostgreSQL 16, Socket.IO 4, Swagger, class-validator                                         |
| Mobile  | Expo SDK 51, React Native, TypeScript, Expo Router, TanStack Query, React Hook Form + Zod, Zustand, socket.io-client, Expo SecureStore |
| Admin   | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, socket.io-client                                                    |
| Infra   | Docker, Docker Compose, PostgreSQL, migrations, seed scripts                                                                           |
| Shared  | `packages/shared-types`, `packages/validation`, `packages/config`                                                                |

Package manager: **npm workspaces**.

---

## Repository layout

```
rideflow/
├── apps/
│   ├── mobile/        # Expo app: customer + driver (shared codebase, role selector)
│   └── admin/         # Next.js admin dashboard
├── services/
│   └── api/           # NestJS backend + Prisma + Socket.IO
├── packages/
│   ├── shared-types/  # Enums, DTO types, socket event contracts
│   ├── validation/    # Zod schemas
│   └── config/        # Branding, currency, service area, fare defaults
├── docs/              # Architecture, API, implementation plan, production readiness
├── scripts/           # e2e smoke test, demo reset
├── docker-compose.yml
└── package.json       # npm workspaces root
```

---

## Prerequisites

- **Node.js 20+** and npm 10+
- **Docker Desktop** (for PostgreSQL; the compose file can also run the API)
- For the mobile app: the **Expo Go** app on your phone, or an Android/iOS emulator

---

## Quick start

### 1. Install dependencies (from the repo root)

```bash
npm install
npm run build:packages        # compile the shared TS packages
```

> If `node_modules` is ever deleted, re-run `npm install`, then `npm run build:packages` and `npm run -w @rideflow/api prisma:generate`.

### 2. Create environment files

```bash
# root (used by docker-compose)
cp .env.example .env
# backend (used when running the API outside docker)
cp services/api/.env.example services/api/.env
# admin
cp apps/admin/.env.example apps/admin/.env.local
# mobile
cp apps/mobile/.env.example apps/mobile/.env
```

Defaults work out of the box for local development. **Never commit real secrets.**

### 3. Start PostgreSQL

```bash
npm run db:up                 # docker compose up -d db
```

### 4. Run migrations + seed the demo data

```bash
npm run api:migrate           # applies migrations to a clean DB
npm run api:seed              # loads deterministic demo data
```

### 5. Start the backend

```bash
npm run api:dev               # http://localhost:4000/api  (Swagger at /api/docs)
```

Check health: open http://localhost:4000/api/health → `{ "status": "ok", "db": "up" }`.

### 6. Start the admin dashboard

```bash
npm run admin:dev             # http://localhost:3000
```

Log in with the seeded admin number: **9800000000**.

### 7. Start the mobile app

```bash
npm run mobile:dev            # Expo dev server
```

Then press `a` (Android emulator), `i` (iOS simulator), or scan the QR with Expo Go.

> **Running on a physical phone?** `localhost` on the phone is the phone, not your computer. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer's LAN IP, e.g. `http://192.168.1.42:4000`. For the Android emulator use `http://10.0.2.2:4000`.

---

## Alternative: run the backend fully in Docker

```bash
docker compose up --build     # starts PostgreSQL + API (auto-migrates + seeds)
```

The API container applies migrations, seeds, and starts on `http://localhost:4000`. The mobile app and admin dashboard still run on your machine (not in Docker).

---

## Demo accounts

All accounts use **demo login** (type the number, pick the role — no OTP).

| Role                | Phone          | Notes                                          |
| ------------------- | -------------- | ---------------------------------------------- |
| Customer            | `9810000001` | Aarav Sharma (primary rider)                   |
| Driver · Bike      | `9820000001` | Vikram Singh — approved, online               |
| Driver · Auto      | `9820000002` | Manpreet Kaur — approved, online              |
| Driver · Cab       | `9820000003` | Suresh Kumar — approved, online               |
| Driver · (pending) | `9820000004` | Deepak Rana — pending approval, cannot accept |
| Admin               | `9800000000` | Operations dashboard                           |

New customer numbers you type are auto-created as demo riders. Driver/admin accounts must be seeded.

---

## Demo walkthrough (one successful ride)

You will need **two mobile sessions** (two devices/emulators, or one device plus Expo on web). One is the **rider**, one is the **captain**.

1. **Admin** (browser): log in as `9800000000`. Open **Live ops** — leave it visible.
2. **Captain** (mobile #1): on the welcome screen tap *Continue as Captain*, sign in as `9820000001` (Bike). Toggle **online**. The screen shows "Waiting for ride requests…".
3. **Rider** (mobile #2): tap *Continue as Rider*, sign in as `9810000001`. On the home screen your pickup is set; tap **Destination**, choose e.g. *Elante Mall*. Pick **Bike**, review the fare, tap **Book Bike**.
4. The rider screen switches to the live ride ("Finding your captain…").
5. On the **captain** screen a ride-request card appears with a countdown. Tap **Accept**.
6. The **rider** now sees the assigned captain, vehicle, and rating. Status → "Captain on the way".
7. On the **captain** screen tap **I've arrived** → **Start trip**. The server begins simulated movement.
8. The **rider** watches the captain marker move along the route; status → "On the trip".
9. The trip auto-completes when the simulation reaches the destination (or tap **Complete trip now**). The rider sees the **final fare** and a rating prompt.
10. **Admin → Overview / Live ops / Rides** reflect the completed ride and updated gross booking value.

### Failed-dispatch demo (no drivers)

Take the only Cab driver (`9820000003`) **offline** (or never bring Cab drivers online), then as a rider book a **Cab**. After the dispatch timeout the ride resolves to **No captains available** (`NO_DRIVERS`) and the rider is offered a retry.

---

## Common commands

| Command                                 | What it does                                        |
| --------------------------------------- | --------------------------------------------------- |
| `npm install`                         | Install all workspace dependencies                  |
| `npm run build:packages`              | Compile shared TS packages                          |
| `npm run db:up` / `npm run db:down` | Start / stop PostgreSQL (Docker)                    |
| `npm run api:migrate`                 | Apply DB migrations                                 |
| `npm run api:seed`                    | Seed demo data                                      |
| `npm run db:reset`                    | Reset DB + re-run migrations + seed (destroys data) |
| `npm run api:dev`                     | Run the backend (watch mode)                        |
| `npm run api:test`                    | Run backend unit tests                              |
| `npm run admin:dev`                   | Run the admin dashboard                             |
| `npm run mobile:dev`                  | Run the Expo mobile app                             |
| `scripts/e2e-smoke.ps1`               | End-to-end API smoke test (backend must be running) |

### Reset to a clean demo state

```bash
npm run db:reset              # prisma migrate reset --force (re-seeds automatically)
```

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

Highlights:

- The **NestJS API is the single source of truth**. Clients use REST for state changes/queries and Socket.IO for real-time push.
- **Ride state machine** and **fare calculation** are server-side services; clients never set status or final fare directly.
- **Dispatch** finds approved + online drivers by category, ranks by distance, makes timed offers, and advances to the next candidate on reject/expiry.
- **Concurrency safety**: acceptance uses a DB transaction with conditional `updateMany` guards, so exactly one driver can win a ride and a driver cannot hold two active trips.
- **Fare snapshot**: the fare rule values are copied onto the ride at booking time, so later fare edits never rewrite historical rides.

API reference: [docs/API.md](docs/API.md). Interactive Swagger: `http://localhost:4000/api/docs`.

---

## Testing

```bash
npm run api:test              # Jest unit tests (23 tests)
```

Covered: fare calculation, minimum fare, rounding, ride-state transitions (legal/illegal), ride ownership, duplicate-booking prevention, concurrency-safe acceptance, driver authorization/eligibility, duplicate completion idempotency, and cancellation rules.

`scripts/e2e-smoke.ps1` exercises the full HTTP flow against a running backend, including ownership guards (403 for non-owners/non-assigned drivers) and the no-driver scenario.

---

## Configuration & branding

Branding, currency, service area, vehicle categories, and default fares live in `packages/config/src/index.ts` (and are mirrored in `apps/mobile/theme`). Change the product name, colours, city, or fare defaults there.

- Primary colour (warm yellow): `#FFC107`
- Default city: Chandigarh (`SERVICE_AREA`)
- Currency: INR (₹)

---

## Maps & location

The app is fully usable **without a map provider**. When no routing key is configured:

- The mobile app renders a **schematic map** (grid with pickup/destination/driver markers), clearly watermarked "no routing provider".
- Distances and fares use **straight-line (haversine)** distance and are labelled "estimated (no routing)". We never present straight-line distance as road distance.
- Location selection falls back to a deterministic preset-places picker; denied device-location permission shows a clear notice and still lets you pick manually.

To integrate a real map/routing provider later, replace the distance source and the `MiniMap` component. Keys would come from `EXPO_PUBLIC_MAP_PROVIDER_KEY`.

---

## Known limitations

These are intentional for the prototype scope:

- **Demo authentication** — no real OTP/phone verification. Guarded by `DEMO_LOGIN_ENABLED` and force-disabled when `NODE_ENV=production`.
- **Simulated driver movement** — server-controlled interpolation between pickup and destination, not real GPS.
- **Informational payments** — cash and "online (demo)" selection only; no gateway, no real money.
- **Straight-line distances** — no routing provider; distances/fares are labelled as estimates.
- **Single-region, single-instance** — no Redis, queues, or horizontal scaling (deferred by design).

See [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) for the upgrade path to each of these.

---

## License / attribution

Original prototype built for demonstration. "RideFlow" is a temporary placeholder product name. Not affiliated with Rapido or any third party.
