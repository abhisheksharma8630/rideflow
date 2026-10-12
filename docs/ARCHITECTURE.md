# RideFlow — Architecture

## Overview

RideFlow is a modular monorepo. A single NestJS API owns all business logic and is the authoritative source of truth. Three clients talk to it over REST (state changes, queries) and Socket.IO (real-time push).

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Customer app  │     │   Driver app   │     │ Admin dashboard│
│  (Expo RN)     │     │  (Expo RN)     │     │   (Next.js)    │
└───────┬────────┘     └───────┬────────┘     └───────┬────────┘
        │  REST + WS           │ REST + WS            │ REST + WS
        └──────────────┬───────┴──────────────┬───────┘
                       ▼                       ▼
                ┌──────────────────────────────────┐
                │        NestJS API (services/api)  │
                │  auth · users · drivers · vehicles│
                │  rides · dispatch · fares · pay   │
                │  ratings · notifications · admin  │
                │  + Socket.IO gateway + Swagger    │
                └───────────────┬───────────────────┘
                                │ Prisma
                                ▼
                       ┌─────────────────┐
                       │  PostgreSQL 16  │
                       └─────────────────┘
```

## Backend module responsibilities

| Module | Responsibility |
| --- | --- |
| `common` | Prisma service, guards (JWT, roles, ownership), filters, interceptors, pagination |
| `auth` | Demo-login, JWT issue/verify, `/me` |
| `users` | Customer profile + customer ride history |
| `drivers` | Driver profile, availability, location updates, driver ride list |
| `vehicles` | Vehicle records tied to drivers |
| `fares` | Fare rules + fare estimation service (pure, tested) |
| `rides` | Ride CRUD, state machine, lifecycle intents, ownership |
| `dispatch` | Driver matching, offers, concurrency-safe assignment, movement simulation |
| `payments` | Demo payment records (cash / online-demo) |
| `ratings` | Post-ride ratings |
| `notifications` | In-app notification records |
| `admin` | Aggregated metrics + management endpoints (admin-only) |
| `realtime` | Socket.IO gateway, room management, auth |
| `health` | Liveness/readiness, DB check |

## Design rules

- Business logic lives in services, never in controllers or React components.
- Ride transitions and fare math are in dedicated services (`RideStateMachine`, `FareService`).
- Critical operations run in DB transactions with conditional updates.
- External integrations (maps, payments, SMS) sit behind replaceable adapters/interfaces.

## Request lifecycle example — booking a ride

1. Customer `POST /api/rides` with pickup/destination/category.
2. API validates input, computes fare via `FareService`, snapshots fare on ride, status `SEARCHING`, persists.
3. `DispatchService` finds candidates, creates offer, emits `ride:offer` to `driver:{id}`.
4. Driver `POST /api/rides/:id/accept`. Transaction assigns driver (conditional), sets `ACCEPTED`, driver `ON_TRIP`.
5. API persists, then emits `ride:update` to `ride:{id}` + `admin:ride_update` to admins.
6. Driver advances `/arrive` → `/start` → `/complete`. On `/start`, server begins movement simulation; on `/complete`, computes final fare, creates payment, emits completion.

## Future upgrade paths

See `docs/PRODUCTION_READINESS.md`.
