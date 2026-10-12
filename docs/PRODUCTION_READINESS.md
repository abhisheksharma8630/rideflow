# RideFlow — Production Readiness Checklist

RideFlow is a prototype. This document lists what is **fully implemented**, what is **simulated**, and the concrete upgrade path to a production-grade platform. Nothing here is required for the demo.

## Status summary

| Area | Prototype status | Production upgrade |
| --- | --- | --- |
| Authentication | Demo login (phone + role), JWT, no OTP | Real OTP via SMS provider (e.g. MSG91/Twilio), refresh tokens, device binding, rate-limited OTP |
| Driver location | Simulated server-side interpolation | Background GPS from the driver app, throttled uploads, map-matching |
| Fare distance | Straight-line haversine | Routing/Directions provider for road distance + ETA |
| Payments | Cash / "online (demo)" records only | Real gateway (Razorpay/UPI), webhooks, reconciliation, refunds |
| Dispatch | In-memory timers, DB-backed offers | Redis-backed queues + geospatial index, worker pool |
| Real-time | Single Socket.IO instance | Socket.IO Redis adapter for multi-instance fan-out |
| Scaling | Single API instance | Horizontal scaling behind a load balancer, stateless workers |
| Observability | Structured Nest logging, health endpoint | Metrics (Prometheus), tracing (OpenTelemetry), alerting |

## Fully implemented (prototype)

- Relational schema with migrations, indexes, FKs, uniqueness constraints.
- Server-authoritative ride state machine and fare calculation.
- Concurrency-safe ride acceptance (transaction + conditional updates): exactly one winner; no double-active-driver.
- Ownership and role authorization on every sensitive endpoint; admin-only admin APIs.
- Request validation (class-validator), consistent error shape, CORS, rate limiting.
- Fare snapshotting so historical rides are immutable to later fare edits.
- Dispatch with timed offers and next-candidate fallback; `NO_DRIVERS` resolution.
- Real-time updates persisted before broadcast; reconnect refetch.
- Deterministic seed + reset workflow; demo data flagged distinctly from live bookings.
- Unit tests for the critical business logic + an end-to-end API smoke test.
- Docker Compose for PostgreSQL + API with health checks.

## Upgrade paths (deferred by design)

### Real OTP verification
Introduce an SMS adapter behind an interface; issue short-lived OTPs with attempt limits; keep demo-login strictly dev-only (already force-disabled when `NODE_ENV=production`).

### Production GPS tracking & background location
Add `expo-location` background tracking in the driver app; upload throttled positions; replace the simulation service with real location ingestion. The `driver:location` socket contract already matches.

### Real payment gateway
Implement a `PaymentProvider` adapter (the payment module is already isolated). Add signed webhooks, idempotent capture, refunds, and reconciliation jobs. Never trust client-side payment status.

### Redis-based dispatch & location caching
Move driver availability/location into a Redis geospatial index for fast nearest-driver queries; move offer timers into a Redis-backed delayed queue.

### Queues & async jobs
Add a job runner (BullMQ) for notifications, receipts, payouts, and reconciliation.

### Demand-based (surge) pricing
Extend `FareService` with a multiplier derived from supply/demand per zone; keep the snapshot pattern.

### Service-area management
Promote `SERVICE_AREA` to a DB-backed, admin-managed table of zones/polygons with per-zone fare rules.

### Driver payouts & financial reconciliation
Add ledgers, settlement runs, and payout integrations. Current earnings are informational only.

### Monitoring, alerting, load testing, horizontal scaling
Add metrics/tracing, SLO alerts, k6/Gatling load tests, the Socket.IO Redis adapter, and stateless multi-instance deployment.

### Regulatory & operational
KYC for drivers, document verification, insurance, trip receipts/invoices, data-retention and privacy controls, audit logging for admin actions.
