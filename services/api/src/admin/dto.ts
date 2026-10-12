import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DriverApprovalStatus, RideStatus, VehicleCategory } from '@rideflow/shared-types';

export class AdminRideQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rideId?: string;

  @ApiPropertyOptional({ enum: ['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVERS'] })
  @IsOptional()
  @IsEnum(['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVERS'])
  status?: RideStatus;

  @ApiPropertyOptional({ enum: ['BIKE', 'AUTO', 'CAB'] })
  @IsOptional()
  @IsEnum(['BIKE', 'AUTO', 'CAB'])
  vehicleCategory?: VehicleCategory;

  @ApiPropertyOptional({ description: 'ISO date (from)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date (to)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class AdminListQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ApprovalDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'SUSPENDED'] })
  @IsEnum(['PENDING', 'APPROVED', 'SUSPENDED'])
  approvalStatus!: DriverApprovalStatus;
}

export class DriverStatusDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsEnum(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class FareRuleUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10000)
  baseFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  perKmRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  perMinuteRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10000)
  minimumFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
