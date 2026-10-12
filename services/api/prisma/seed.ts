/**
 * Deterministic demo seed for RideFlow.
 * Creates: 1 admin, 1 primary demo customer (+2 extra), 4 drivers (3 approved+online,
 * 1 pending), vehicles across BIKE/AUTO/CAB, fare rules, and sample completed/cancelled
 * rides with ratings. All seeded rides are flagged isDemoSeed=true so the admin UI can
 * distinguish historical demo data from newly created live bookings.
 *
 * Safe to re-run: performs upserts and clears prior seeded rides/offers.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, VehicleCategory } from '@prisma/client';
import { DEFAULT_FARE_RULES, SERVICE_AREA, VehicleCategoryKey } from '@rideflow/config';

// Minimal .env loader so `ts-node prisma/seed.ts` works without an extra dep.
// (prisma migrate loads .env automatically; a bare ts-node run does not.)
function loadEnv(): void {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const prisma = new PrismaClient();

const C = SERVICE_AREA.center;

// A few named Chandigarh landmarks (approx coords) for realistic demo rides.
const PLACES = {
  sector17: { address: 'Sector 17 Plaza, Chandigarh', latitude: 30.7411, longitude: 76.7822 },
  elante: { address: 'Elante Mall, Industrial Area Phase 1', latitude: 30.7056, longitude: 76.8013 },
  pgi: { address: 'PGIMER, Sector 12', latitude: 30.7645, longitude: 76.7752 },
  sukhna: { address: 'Sukhna Lake', latitude: 30.7421, longitude: 76.8188 },
  isbt43: { address: 'ISBT Sector 43', latitude: 30.7079, longitude: 76.7616 },
  rockGarden: { address: 'Rock Garden', latitude: 30.7525, longitude: 76.8103 },
};

async function main(): Promise<void> {
  console.log('Seeding RideFlow demo data...');

  // --- Fare rules ---
  for (const category of Object.keys(DEFAULT_FARE_RULES) as VehicleCategoryKey[]) {
    const r = DEFAULT_FARE_RULES[category];
    await prisma.fareRule.upsert({
      where: { vehicleCategory: category },
      update: { ...r, enabled: true },
      create: { vehicleCategory: category, ...r, enabled: true },
    });
  }

  // --- Admin ---
  await prisma.user.upsert({
    where: { phone: '9800000000' },
    update: {},
    create: {
      phone: '9800000000',
      name: 'RideFlow Admin',
      email: 'admin@rideflow.demo',
      role: 'ADMIN',
      isDemo: true,
    },
  });

  // --- Customers ---
  const customer = await prisma.user.upsert({
    where: { phone: '9810000001' },
    update: {},
    create: {
      phone: '9810000001',
      name: 'Aarav Sharma',
      email: 'aarav@rideflow.demo',
      role: 'CUSTOMER',
      isDemo: true,
    },
  });
  const customer2 = await prisma.user.upsert({
    where: { phone: '9810000002' },
    update: {},
    create: { phone: '9810000002', name: 'Priya Verma', role: 'CUSTOMER', isDemo: true },
  });
  await prisma.user.upsert({
    where: { phone: '9810000003' },
    update: {},
    create: { phone: '9810000003', name: 'Rohan Gupta', role: 'CUSTOMER', isDemo: true },
  });

  // --- Drivers (user + driver + vehicle) ---
  const driverSpecs: {
    phone: string;
    name: string;
    category: VehicleCategory;
    reg: string;
    model: string;
    color: string;
    approved: boolean;
    online: boolean;
    lat: number;
    lng: number;
    rating: number;
  }[] = [
    { phone: '9820000001', name: 'Vikram Singh', category: 'BIKE', reg: 'CH01AB1234', model: 'Honda Activa', color: 'Grey', approved: true, online: true, lat: 30.7395, lng: 76.7850, rating: 4.8 },
    { phone: '9820000002', name: 'Manpreet Kaur', category: 'AUTO', reg: 'CH01CD5678', model: 'Bajaj RE', color: 'Yellow-Green', approved: true, online: true, lat: 30.7300, lng: 76.7900, rating: 4.6 },
    { phone: '9820000003', name: 'Suresh Kumar', category: 'CAB', reg: 'CH03EF9012', model: 'Maruti Dzire', color: 'White', approved: true, online: true, lat: 30.7200, lng: 76.7950, rating: 4.9 },
    { phone: '9820000004', name: 'Deepak Rana', category: 'BIKE', reg: 'CH04GH3456', model: 'TVS Jupiter', color: 'Blue', approved: false, online: false, lat: C.latitude, lng: C.longitude, rating: 5.0 },
  ];

  const driverIds: Record<string, string> = {};
  for (const d of driverSpecs) {
    const user = await prisma.user.upsert({
      where: { phone: d.phone },
      update: {},
      create: { phone: d.phone, name: d.name, role: 'DRIVER', isDemo: true },
    });
    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: {
        approvalStatus: d.approved ? 'APPROVED' : 'PENDING',
        availabilityStatus: d.online ? 'ONLINE' : 'OFFLINE',
        rating: d.rating,
        currentLat: d.lat,
        currentLng: d.lng,
        lastLocationAt: new Date(),
      },
      create: {
        userId: user.id,
        approvalStatus: d.approved ? 'APPROVED' : 'PENDING',
        availabilityStatus: d.online ? 'ONLINE' : 'OFFLINE',
        rating: d.rating,
        currentLat: d.lat,
        currentLng: d.lng,
        lastLocationAt: new Date(),
      },
    });
    driverIds[d.phone] = driver.id;
    await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: { category: d.category, registrationNumber: d.reg, model: d.model, color: d.color },
      create: {
        driverId: driver.id,
        category: d.category,
        registrationNumber: d.reg,
        model: d.model,
        color: d.color,
        status: 'ACTIVE',
      },
    });
  }

  // --- Clear prior seeded rides so re-seeding is idempotent ---
  await prisma.rideOffer.deleteMany({ where: { ride: { isDemoSeed: true } } });
  await prisma.rating.deleteMany({ where: { ride: { isDemoSeed: true } } });
  await prisma.payment.deleteMany({ where: { ride: { isDemoSeed: true } } });
  await prisma.ride.deleteMany({ where: { isDemoSeed: true } });

  // Helper to compute a simple fare snapshot for seeded rides.
  function fareFor(category: VehicleCategoryKey, distanceKm: number, durationMin: number) {
    const r = DEFAULT_FARE_RULES[category];
    const subtotal = r.baseFare + r.perKmRate * distanceKm + r.perMinuteRate * durationMin;
    return { total: Math.round(Math.max(subtotal, r.minimumFare)), rule: r };
  }

  // --- Sample completed rides ---
  const completedSamples = [
    { customerId: customer.id, driverPhone: '9820000001', category: 'BIKE' as const, from: PLACES.sector17, to: PLACES.pgi, dist: 4.2, dur: 12, daysAgo: 1 },
    { customerId: customer.id, driverPhone: '9820000003', category: 'CAB' as const, from: PLACES.elante, to: PLACES.sukhna, dist: 7.8, dur: 22, daysAgo: 2 },
    { customerId: customer2.id, driverPhone: '9820000002', category: 'AUTO' as const, from: PLACES.isbt43, to: PLACES.rockGarden, dist: 6.1, dur: 18, daysAgo: 3 },
  ];

  for (const s of completedSamples) {
    const { total, rule } = fareFor(s.category, s.dist, s.dur);
    const completedAt = new Date(Date.now() - s.daysAgo * 86400000);
    const ride = await prisma.ride.create({
      data: {
        customerId: s.customerId,
        driverId: driverIds[s.driverPhone],
        vehicleCategory: s.category,
        pickupAddress: s.from.address,
        pickupLat: s.from.latitude,
        pickupLng: s.from.longitude,
        destinationAddress: s.to.address,
        destinationLat: s.to.latitude,
        destinationLng: s.to.longitude,
        estimatedDistanceKm: s.dist,
        estimatedDurationMinutes: s.dur,
        estimatedFare: total,
        finalFare: total,
        snapshotBaseFare: rule.baseFare,
        snapshotPerKmRate: rule.perKmRate,
        snapshotPerMinuteRate: rule.perMinuteRate,
        snapshotMinimumFare: rule.minimumFare,
        estimatedWithoutRouting: true,
        status: 'COMPLETED',
        isDemoSeed: true,
        requestedAt: new Date(completedAt.getTime() - (s.dur + 5) * 60000),
        acceptedAt: new Date(completedAt.getTime() - (s.dur + 3) * 60000),
        startedAt: new Date(completedAt.getTime() - s.dur * 60000),
        completedAt,
        payment: { create: { amount: total, method: 'CASH', status: 'COLLECTED' } },
        rating: {
          create: {
            customerId: s.customerId,
            driverId: driverIds[s.driverPhone],
            score: 5,
            comment: 'Smooth ride, polite driver.',
          },
        },
      },
    });
    void ride;
  }

  // --- Sample cancelled ride ---
  {
    const { total, rule } = fareFor('BIKE', 3.0, 9);
    await prisma.ride.create({
      data: {
        customerId: customer.id,
        vehicleCategory: 'BIKE',
        pickupAddress: PLACES.sector17.address,
        pickupLat: PLACES.sector17.latitude,
        pickupLng: PLACES.sector17.longitude,
        destinationAddress: PLACES.isbt43.address,
        destinationLat: PLACES.isbt43.latitude,
        destinationLng: PLACES.isbt43.longitude,
        estimatedDistanceKm: 3.0,
        estimatedDurationMinutes: 9,
        estimatedFare: total,
        snapshotBaseFare: rule.baseFare,
        snapshotPerKmRate: rule.perKmRate,
        snapshotPerMinuteRate: rule.perMinuteRate,
        snapshotMinimumFare: rule.minimumFare,
        status: 'CANCELLED',
        cancellationReason: 'Customer changed plans',
        cancelledBy: 'CUSTOMER',
        isDemoSeed: true,
        requestedAt: new Date(Date.now() - 4 * 86400000),
        payment: { create: { amount: total, method: 'CASH', status: 'FAILED' } },
      },
    });
  }

  // Keep driver trip counts aligned with seeded completed rides.
  for (const phone of Object.keys(driverIds)) {
    const count = await prisma.ride.count({
      where: { driverId: driverIds[phone], status: 'COMPLETED' },
    });
    await prisma.driver.update({ where: { id: driverIds[phone] }, data: { totalTrips: count } });
  }

  console.log('Seed complete.');
  console.log('Demo accounts:');
  console.log('  Customer: 9810000001 (Aarav Sharma)');
  console.log('  Driver (BIKE, online): 9820000001');
  console.log('  Driver (AUTO, online): 9820000002');
  console.log('  Driver (CAB, online):  9820000003');
  console.log('  Driver (pending):      9820000004');
  console.log('  Admin: 9800000000');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
