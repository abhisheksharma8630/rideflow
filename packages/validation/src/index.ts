import { z } from 'zod';

/** Indian phone: optional +91 then 10 digits starting 6-9. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const vehicleCategorySchema = z.enum(['BIKE', 'AUTO', 'CAB']);

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const demoLoginSchema = z.object({
  phone: phoneSchema,
  role: z.enum(['CUSTOMER', 'DRIVER', 'ADMIN']),
});
export type DemoLoginInput = z.infer<typeof demoLoginSchema>;

export const fareEstimateSchema = z.object({
  vehicleCategory: vehicleCategorySchema,
  pickup: geoPointSchema,
  destination: geoPointSchema,
});
export type FareEstimateInput = z.infer<typeof fareEstimateSchema>;

export const createRideSchema = z.object({
  vehicleCategory: vehicleCategorySchema,
  pickupAddress: z.string().trim().min(2, 'Pickup address required').max(200),
  pickup: geoPointSchema,
  destinationAddress: z.string().trim().min(2, 'Destination address required').max(200),
  destination: geoPointSchema,
  paymentMethod: z.enum(['CASH', 'ONLINE_DEMO']).default('CASH'),
});
export type CreateRideInput = z.infer<typeof createRideSchema>;

export const cancelRideSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export const rateRideSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
});

export const availabilitySchema = z.object({
  availabilityStatus: z.enum(['OFFLINE', 'ONLINE']),
});

export const locationUpdateSchema = geoPointSchema;

export const fareRuleUpdateSchema = z.object({
  baseFare: z.number().min(0).max(10000).optional(),
  perKmRate: z.number().min(0).max(1000).optional(),
  perMinuteRate: z.number().min(0).max(1000).optional(),
  minimumFare: z.number().min(0).max(10000).optional(),
  enabled: z.boolean().optional(),
});
