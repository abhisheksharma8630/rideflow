import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminOverview, Paginated } from '@rideflow/shared-types';
import { PrismaService } from '../common/prisma.service';
import { paginate } from '../common/pagination';
import { rideInclude, toRideDTO } from '../rides/ride.mapper';
import {
  AdminListQuery,
  AdminRideQuery,
  ApprovalDto,
  DriverStatusDto,
  FareRuleUpdateDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverview> {
    const [
      totalCustomers,
      totalDrivers,
      approvedDrivers,
      onlineDrivers,
      activeRides,
      completedRides,
      cancelledRides,
      gbvAgg,
      seededCount,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { approvalStatus: 'APPROVED' } }),
      this.prisma.driver.count({ where: { availabilityStatus: { in: ['ONLINE', 'ON_TRIP'] } } }),
      this.prisma.ride.count({
        where: { status: { in: ['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS'] } },
      }),
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ride.count({ where: { status: 'CANCELLED' } }),
      this.prisma.ride.aggregate({ where: { status: 'COMPLETED' }, _sum: { finalFare: true } }),
      this.prisma.ride.count({ where: { isDemoSeed: true } }),
    ]);

    return {
      totalCustomers,
      totalDrivers,
      approvedDrivers,
      onlineDrivers,
      activeRides,
      completedRides,
      cancelledRides,
      grossBookingValue: Math.round(gbvAgg._sum.finalFare ?? 0),
      isDemoData: seededCount > 0,
    };
  }

  async rides(query: AdminRideQuery): Promise<Paginated<ReturnType<typeof toRideDTO>>> {
    const where: Prisma.RideWhereInput = {};
    if (query.rideId) where.id = query.rideId;
    if (query.status) where.status = query.status;
    if (query.vehicleCategory) where.vehicleCategory = query.vehicleCategory;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ride.findMany({
        where,
        include: rideInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ride.count({ where }),
    ]);
    return paginate(items.map(toRideDTO), total, query.page, query.pageSize);
  }

  async drivers(query: AdminListQuery) {
    const where: Prisma.DriverWhereInput = {};
    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ],
      };
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({
        where,
        include: { user: { select: { name: true, phone: true, email: true, status: true } }, vehicle: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.driver.count({ where }),
    ]);
    return paginate(items, total, query.page, query.pageSize);
  }

  async customers(query: AdminListQuery) {
    const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          isDemo: true,
          createdAt: true,
          _count: { select: { customerRides: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    const mapped = items.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      status: u.status,
      isDemo: u.isDemo,
      createdAt: u.createdAt,
      rideCount: u._count.customerRides,
    }));
    return paginate(mapped, total, query.page, query.pageSize);
  }

  async setApproval(driverId: string, dto: ApprovalDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        approvalStatus: dto.approvalStatus,
        // If suspended/pending, force offline.
        availabilityStatus: dto.approvalStatus === 'APPROVED' ? driver.availabilityStatus : 'OFFLINE',
      },
      include: { user: { select: { name: true, phone: true } } },
    });
  }

  async setDriverUserStatus(driverId: string, dto: DriverStatusDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    await this.prisma.user.update({ where: { id: driver.userId }, data: { status: dto.status } });
    return this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: { select: { name: true, phone: true, status: true } } },
    });
  }

  async fares() {
    return this.prisma.fareRule.findMany({ orderBy: { vehicleCategory: 'asc' } });
  }

  async updateFare(id: string, dto: FareRuleUpdateDto) {
    const rule = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Fare rule not found');
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');
    return this.prisma.fareRule.update({ where: { id }, data: dto });
  }
}
