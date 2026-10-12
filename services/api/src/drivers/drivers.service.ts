import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AvailabilityDto, LocationDto } from './dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async me(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: { select: { name: true, phone: true, email: true } }, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return driver;
  }

  async setAvailability(driverId: string, dto: AvailabilityDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException('Driver is not approved; cannot go online');
    }
    if (driver.availabilityStatus === 'ON_TRIP') {
      throw new BadRequestException('Cannot change availability while on an active trip');
    }
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { availabilityStatus: dto.availabilityStatus },
      include: { vehicle: true },
    });
  }

  async updateLocation(driverId: string, dto: LocationDto) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: dto.latitude,
        currentLng: dto.longitude,
        lastLocationAt: new Date(),
      },
    });
    return { ok: true };
  }

  async earnings(driverId: string) {
    const completed = await this.prisma.ride.findMany({
      where: { driverId, status: 'COMPLETED' },
      select: { finalFare: true, completedAt: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRides = completed.filter((r) => r.completedAt && r.completedAt >= today);
    const gross = completed.reduce((s, r) => s + (r.finalFare ?? 0), 0);
    const todayGross = todayRides.reduce((s, r) => s + (r.finalFare ?? 0), 0);
    const commissionRate = 0.2;
    return {
      totalTrips: completed.length,
      todayTrips: todayRides.length,
      grossEarnings: Math.round(gross),
      todayGrossEarnings: Math.round(todayGross),
      // Informational only — no money is actually transferred in this prototype.
      estimatedNetEarnings: Math.round(gross * (1 - commissionRate)),
      commissionRate,
      note: 'Earnings are informational only. No funds are transferred in this prototype.',
    };
  }
}
