import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FareBreakdown, GeoPoint, VehicleCategory } from '@rideflow/shared-types';
import { AVG_SPEED_KMH, CURRENCY } from '@rideflow/config';
import { PrismaService } from '../common/prisma.service';
import { haversineKm } from '../common/geo';

export interface FareRuleValues {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
}

@Injectable()
export class FareService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pure fare computation. Formula:
   *   subtotal = baseFare + (perKmRate * distanceKm) + (perMinuteRate * durationMinutes)
   *   total    = max(subtotal, minimumFare), rounded to nearest rupee.
   * Rounding: distance to 2 dp, charges to nearest rupee via Math.round on the final total.
   */
  static compute(
    category: VehicleCategory,
    distanceKm: number,
    durationMinutes: number,
    rule: FareRuleValues,
    estimatedWithoutRouting: boolean,
  ): FareBreakdown {
    const dist = Math.round(distanceKm * 100) / 100;
    const dur = Math.max(1, Math.round(durationMinutes));
    const distanceCharge = rule.perKmRate * dist;
    const timeCharge = rule.perMinuteRate * dur;
    const subtotal = rule.baseFare + distanceCharge + timeCharge;
    const total = Math.round(Math.max(subtotal, rule.minimumFare));
    return {
      vehicleCategory: category,
      baseFare: rule.baseFare,
      distanceKm: dist,
      distanceCharge: Math.round(distanceCharge),
      durationMinutes: dur,
      timeCharge: Math.round(timeCharge),
      subtotal: Math.round(subtotal),
      minimumFare: rule.minimumFare,
      total,
      currency: CURRENCY.code,
      estimatedWithoutRouting,
    };
  }

  /** Estimate duration (minutes) from distance using category average speed. */
  static estimateDurationMinutes(category: VehicleCategory, distanceKm: number): number {
    const speed = AVG_SPEED_KMH[category] ?? 25;
    return Math.max(1, Math.round((distanceKm / speed) * 60));
  }

  async getRule(category: VehicleCategory): Promise<FareRuleValues & { enabled: boolean }> {
    const rule = await this.prisma.fareRule.findUnique({ where: { vehicleCategory: category } });
    if (!rule) throw new NotFoundException(`No fare rule for ${category}`);
    return {
      baseFare: rule.baseFare,
      perKmRate: rule.perKmRate,
      perMinuteRate: rule.perMinuteRate,
      minimumFare: rule.minimumFare,
      enabled: rule.enabled,
    };
  }

  async listRules() {
    return this.prisma.fareRule.findMany({ orderBy: { vehicleCategory: 'asc' } });
  }

  /**
   * Estimate a fare for a trip. Uses haversine distance (no external routing provider),
   * so the result is flagged estimatedWithoutRouting=true.
   */
  async estimate(
    category: VehicleCategory,
    pickup: GeoPoint,
    destination: GeoPoint,
  ): Promise<FareBreakdown & { enabled: boolean }> {
    const rule = await this.getRule(category);
    if (!rule.enabled) {
      throw new BadRequestException(`${category} is currently unavailable`);
    }
    const distanceKm = haversineKm(pickup, destination);
    if (distanceKm <= 0) {
      throw new BadRequestException('Pickup and destination are the same');
    }
    const durationMinutes = FareService.estimateDurationMinutes(category, distanceKm);
    const breakdown = FareService.compute(category, distanceKm, durationMinutes, rule, true);
    return { ...breakdown, enabled: rule.enabled };
  }

  /** Estimate for all enabled categories (used by the vehicle picker). */
  async estimateAll(pickup: GeoPoint, destination: GeoPoint) {
    const rules = await this.listRules();
    const distanceKm = haversineKm(pickup, destination);
    return rules
      .filter((r) => r.enabled)
      .map((r) => {
        const durationMinutes = FareService.estimateDurationMinutes(r.vehicleCategory, distanceKm);
        return FareService.compute(
          r.vehicleCategory,
          distanceKm,
          durationMinutes,
          r,
          true,
        );
      });
  }
}
