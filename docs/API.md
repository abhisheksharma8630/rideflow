# RideFlow API Reference

Base URL: `http://localhost:4000/api`
Interactive docs (Swagger): `http://localhost:4000/api/docs`

All responses use JSON. Errors follow a consistent shape:

```json
{ "statusCode": 403, "error": "ForbiddenException", "message": "You cannot view this ride" }
```

Authentication: send `Authorization: Bearer <accessToken>` on all endpoints except those marked **public**. Tokens are issued by demo-login.

List endpoints paginate with `?page=&pageSize=` and return:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20, "totalPages": 1 }
```

---

## Auth

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| POST | `/auth/demo-login` | public | Demo login. Body `{ phone, role, name? }`. Dev-only; disabled in production. Returns `{ accessToken, user }`. |
| POST | `/auth/logout` | any | Stateless logout (client discards token). |
| GET | `/auth/me` | any | Current authenticated user. |

## Users (customer)

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/users/me` | any | Current profile. |
| PATCH | `/users/me` | any | Update `{ name?, email? }`. |
| GET | `/users/me/rides` | any | Current user's ride history (paginated). |

## Drivers

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/drivers/me` | DRIVER | Driver profile + vehicle. |
| PATCH | `/drivers/me/availability` | DRIVER | Body `{ availabilityStatus: ONLINE \| OFFLINE }`. Approved drivers only; blocked while ON_TRIP. |
| POST | `/drivers/me/location` | DRIVER | Body `{ latitude, longitude }`. |
| GET | `/drivers/me/rides` | DRIVER | Driver ride history. |
| GET | `/drivers/me/earnings` | DRIVER | Earnings summary (informational). |

## Fares

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/fares` | public | List fare rules per category. |
| POST | `/fares/estimate` | any | Body `{ vehicleCategory, pickup, destination }`. Returns a fare breakdown (haversine distance, `estimatedWithoutRouting: true`). |

## Rides

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| POST | `/rides` | CUSTOMER | Create a booking. Validates, computes + snapshots fare, starts dispatch. Rejects duplicate active rides. |
| GET | `/rides` | any | List current user's rides (customer or driver scoped). |
| GET | `/rides/:id` | any | Get a ride. **Ownership-checked** (customer, assigned driver, or admin). |
| POST | `/rides/:id/cancel` | customer/driver/admin | Cancel (only before IN_PROGRESS). Idempotent for already-cancelled. |
| POST | `/rides/:id/rate` | CUSTOMER | Rate a completed ride `{ score 1-5, comment? }`. |

### Driver lifecycle intents

Clients never set `status` directly — they call these intents, which the server validates against the ride state machine.

| Method | Path | Transition |
| --- | --- | --- |
| POST | `/rides/:id/accept` | SEARCHING → ACCEPTED (concurrency-safe; one winner) |
| POST | `/rides/:id/reject` | declines offer, dispatch tries next driver |
| POST | `/rides/:id/arrive` | ACCEPTED → ARRIVED_AT_PICKUP |
| POST | `/rides/:id/start` | ARRIVED_AT_PICKUP → IN_PROGRESS (begins simulated movement) |
| POST | `/rides/:id/complete` | IN_PROGRESS → COMPLETED (server computes final fare) |

## Admin (ADMIN role only)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/overview` | Aggregated metrics from live DB. |
| GET | `/admin/rides` | Search/filter rides: `rideId, status, vehicleCategory, dateFrom, dateTo`. |
| GET | `/admin/drivers` | List/search drivers (`search`). |
| PATCH | `/admin/drivers/:id/approval` | `{ approvalStatus: PENDING \| APPROVED \| SUSPENDED }`. |
| PATCH | `/admin/drivers/:id/status` | `{ status: ACTIVE \| SUSPENDED }` (account suspension). |
| GET | `/admin/customers` | List/search customers (`search`). |
| GET | `/admin/fares` | List fare rules. |
| PATCH | `/admin/fares/:id` | Update `{ baseFare?, perKmRate?, perMinuteRate?, minimumFare?, enabled? }`. Validated. |

## Health

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness + DB readiness. |

---

## Socket.IO events

Connect with the JWT in the handshake: `io(baseUrl, { auth: { token } })`. The server joins `user:{id}`, `driver:{id}` (drivers), and `admin` (admins) rooms automatically. To follow a specific ride, emit `ride:subscribe` with `{ rideId }` — the server verifies you are the customer, the assigned driver, or an admin before joining the `ride:{id}` room.

### Server → client

| Event | Payload | Sent to |
| --- | --- | --- |
| `ride:offer` | offer + ride summary + distance/earnings | offered driver |
| `ride:update` | full RideDTO | ride room + customer + driver |
| `driver:location` | `{ rideId, driverId, location, bearing }` | ride room + customer |
| `ride:completed` | full RideDTO | ride room |
| `ride:cancelled` | full RideDTO | ride room |
| `offer:expired` | `{ rideId, offerId }` | driver |
| `admin:ride_update` | full RideDTO | admins |

### Client → server

| Event | Payload | Behaviour |
| --- | --- | --- |
| `ride:subscribe` | `{ rideId }` | Server-verified access, then joins `ride:{id}`. |

> Critical ride changes are **persisted before broadcast**. REST + DB remain authoritative; clients refetch current ride state on reconnect.

---

## Fare formula

```
subtotal = baseFare + perKmRate * distanceKm + perMinuteRate * durationMinutes
total    = round( max(subtotal, minimumFare) )
```

Distance is straight-line (haversine). Duration is estimated from category average speed. Values are snapshotted on the ride at booking time. Demonstration defaults:

| Category | Base | Per km | Per min | Minimum |
| --- | --- | --- | --- | --- |
| Bike | ₹20 | ₹8 | ₹1 | ₹30 |
| Auto | ₹30 | ₹12 | ₹1 | ₹40 |
| Cab | ₹50 | ₹15 | ₹2 | ₹70 |
