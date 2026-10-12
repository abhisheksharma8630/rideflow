# RideFlow — Implementation Plan

RideFlow is a Rapido-inspired ride-hailing prototype for the Indian market (default city: Chandigarh). It delivers an end-to-end ride demonstration across a customer app, a driver app, and an admin dashboard, backed by a single NestJS API, PostgreSQL database, and Socket.IO real-time layer.

> **Prototype notice.** This is a demonstration build. Authentication is demo-mode, driver movement is simulated (not production GPS), and payments are informational only. See "Known limitations" in the root `README.md`.

## 1. Technology stack

| Layer | Stack |
| --- | --- |
| Backend | Node 20, NestJS 10, TypeScript, Prisma 5, PostgreSQL 16, Socket.IO 4, Swagger, class-validator |
| Mobile | Expo (SDK 51), React Native, TypeScript, Expo Router, TanStack Query, React Hook Form + Zod, Zustand, socket.io-client, Expo SecureStore |
| Admin | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, RHF + Zod, socket.io-client |
| Infra | Docker, Docker Compose, PostgreSQL, migrations, seed scripts |
| Shared | `packages/shared-types`, `packages/validation`, `packages/config` |

Package manager: **npm workspaces** (widely available, no extra install needed).

## 2. Repository layout

```
rideflow/
├── apps/
│   ├── mobile/        # Expo app: customer + driver (shared codebase, role selector)
│   └── admin/         # Next.js admin dashboard
├── services/
│   └── api/           # NestJS backend + Prisma + Socket.IO
├── packages/
│   ├── shared-types/  # Enums, DTO types, socket event contracts
│   ├── validation/    # Zod schemas shared by clients
│   └── config/        # Shared constants (vehicle categories, fare defaults, service area)
├── docs/
├── docker-compose.yml
└── package.json       # npm workspaces root
```

## 3. Data model (Prisma / PostgreSQL)

Entities: `User`, `Driver`, `Vehicle`, `Ride`, `RideOffer`, `FareRule`, `Payment`, `Rating`, `Notification`.

Key enums:
- `UserRole`: CUSTOMER | DRIVER | ADMIN
- `UserStatus`: ACTIVE | SUSPENDED
- `DriverApprovalStatus`: PENDING | APPROVED | SUSPENDED
- `DriverAvailabilityStatus`: OFFLINE | ONLINE | ON_TRIP
- `VehicleCategory`: BIKE | AUTO | CAB
- `RideStatus`: REQUESTED | SEARCHING | ACCEPTED | ARRIVED_AT_PICKUP | IN_PROGRESS | COMPLETED | CANCELLED | NO_DRIVERS
- `RideOfferStatus`: PENDING | ACCEPTED | REJECTED | EXPIRED | CANCELLED
- `PaymentMethod`: CASH | ONLINE_DEMO
- `PaymentStatus`: PENDING | COLLECTED | FAILED

Fare snapshot is stored on the ride at booking time so later fare-rule edits never rewrite history.

## 4. Ride state machine (server-enforced)

```
REQUESTED ──> SEARCHING ──> ACCEPTED ──> ARRIVED_AT_PICKUP ──> IN_PROGRESS ──> COMPLETED
     │             │            │                │                  │
     └── CANCELLED ─┴─ CANCELLED ┴── CANCELLED ───┴── CANCELLED ─────┘   (permitted cancels)
SEARCHING ──> NO_DRIVERS  (dispatch exhausted)
```

Driver availability: OFFLINE ↔ ONLINE, ONLINE → ON_TRIP (on accept), ON_TRIP → ONLINE (on complete/cancel).

Transition rules live in `RideStateMachine` (backend service). Clients cannot set status directly; they call intent endpoints (`/accept`, `/arrive`, `/start`, `/complete`, `/cancel`).

## 5. API contracts

See `docs/API.md` for the full endpoint list. All list endpoints paginate (`page`, `pageSize`). Errors use a consistent `{ statusCode, message, error }` shape. Swagger served at `/api/docs`.

## 6. Dispatch engine

1. Ride created → status SEARCHING, fare snapshot persisted.
2. Find APPROVED + ONLINE + available drivers matching vehicle category.
3. Rank by distance from pickup (haversine on last known location).
4. Create a `RideOffer` (PENDING, expires after `OFFER_TIMEOUT_SECONDS`), emit to driver room.
5. On accept: transaction with conditional update guarantees exactly one winner; driver → ON_TRIP.
6. On reject/expiry: offer the next candidate.
7. No candidates left → ride NO_DRIVERS.

Concurrency: `prisma.$transaction` + conditional `updateMany` guards (assign only if `driverId IS NULL` and status SEARCHING; driver accepts only if not already ON_TRIP).

## 7. Real-time (Socket.IO)

- Auth via token in handshake; server joins `user:{id}`, `driver:{id}`, and per-ride `ride:{id}` rooms. Clients cannot join arbitrary rooms.
- Events: `ride:offer`, `ride:update`, `driver:location`, `ride:completed`, `ride:cancelled`, `admin:ride_update`.
- Critical state persisted before broadcast. Simulated movement is server-driven and throttled (location broadcast every ~2s, DB write throttled).

## 8. Risks & fallbacks

- **No map API key** → mobile uses a deterministic coordinate picker + straight-line (haversine) distance, clearly labelled "estimated (no routing)". App stays fully usable.
- **No SMS provider** → demo-login only, labelled development-only, disabled unless `DEMO_LOGIN_ENABLED=true`.
- **Physical phone networking** → `EXPO_PUBLIC_API_URL` configurable to LAN IP.

## 9. Phase tracking

- [x] Phase 1 — Plan & architecture docs
- [ ] Phase 2 — Monorepo foundation
- [ ] Phase 3 — Backend (schema, modules, tests)
- [ ] Phase 4 — Customer mobile app
- [ ] Phase 5 — Driver mobile app
- [ ] Phase 6 — Admin dashboard
- [ ] Phase 7 — Integration
- [ ] Phase 8 — Quality & delivery

Execution notes are appended at the bottom of this file after each phase.

---

## Execution log

### Phase 1–3 (backend) — COMPLETE & VERIFIED

Commands run:
- `npm install` (root workspaces) → 755 packages
- `npm run build:packages` → shared-types, validation, config compiled
- `prisma generate`, `prisma migrate dev --name init` → migration `20261012162154_init` applied to clean DB
- `npm run prisma:seed` → demo data loaded
- `npm test` → **23/23 passing** (fare calc, minimum fare, rounding, ride state machine, ownership, duplicate booking, concurrency accept, driver auth, duplicate completion, cancellation rules)
- `npm run start:dev` → API up, all routes mapped, Swagger at `/api/docs`
- `scripts/e2e-smoke.ps1` → **PASSED**: health, customer login, fare estimate, booking persists (SEARCHING), driver accept (ACCEPTED), non-assigned driver blocked (403), arrive→start→complete (COMPLETED, server final fare ₹64), stranger read blocked (403), admin overview reflects completed ride.
- No-driver scenario verified → ride resolves to `NO_DRIVERS`.

Outcome: backend acceptance criteria 2–5, 10–22 verified at the API level. Remaining: client apps (criteria 6–9, 17, 20, 23) and docs (25).

### Phase 4–6 (clients) — COMPLETE & VERIFIED

- Mobile app (customer + driver shared Expo codebase): `tsc --noEmit` clean; `expo export --platform web` bundles all 666 modules successfully.
- Admin dashboard (Next.js): `tsc --noEmit` clean; `next build` compiles and prerenders all 8 routes; `/login` serves HTTP 200 with branding.
- Install note: an interrupted install left corrupted packages (`.DELETE` tombstones). Resolved with a clean reinstall (1615 packages). React pinned to 18.2.0 across mobile + admin to avoid duplicate-React build failures. API tsconfig constrained with explicit `lib`/`types` to avoid picking up hoisted `@types/react-dom`.

### Phase 7–8 (integration + delivery) — COMPLETE & VERIFIED

- After clean reinstall: backend 23/23 unit tests pass; `nest build` clean.
- `scripts/e2e-smoke.ps1` re-run → PASSED (full happy path, ownership 403 guards, admin reflects completed ride).
- No-driver scenario re-verified → `NO_DRIVERS`.
- Admin dashboard verified serving and connecting to the same backend.
- Docs written: `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/PRODUCTION_READINESS.md`, demo walkthrough, reset script.

All phases complete.

### Phase status (final)

- [x] Phase 1 — Plan & architecture docs
- [x] Phase 2 — Monorepo foundation
- [x] Phase 3 — Backend (schema, modules, tests)
- [x] Phase 4 — Customer mobile app
- [x] Phase 5 — Driver mobile app
- [x] Phase 6 — Admin dashboard
- [x] Phase 7 — Integration
- [x] Phase 8 — Quality & delivery
