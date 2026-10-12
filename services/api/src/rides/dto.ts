import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, RideStatus, VehicleCategory } from '@rideflow/shared-types';
import { GeoPointDto } from '../fares/dto';

export class CreateRideDto {
  @ApiProperty({ enum: ['BIKE', 'AUTO', 'CAB'] })
  @IsEnum(['BIKE', 'AUTO', 'CAB'])
  vehicleCategory!: VehicleCategory;

  @ApiProperty({ example: 'Sector 17 Plaza, Chandigarh' })
  @IsString()
  @MaxLength(200)
  pickupAddress!: string;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup!: GeoPointDto;

  @ApiProperty({ example: 'Elante Mall, Industrial Area Phase 1' })
  @IsString()
  @MaxLength(200)
  destinationAddress!: string;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  destination!: GeoPointDto;

  @ApiPropertyOptional({ enum: ['CASH', 'ONLINE_DEMO'], default: 'CASH' })
  @IsOptional()
  @IsEnum(['CASH', 'ONLINE_DEMO'])
  paymentMethod?: PaymentMethod;
}

export class CancelRideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class RateRideDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}

export class RideListQuery {
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

  @ApiPropertyOptional({ enum: ['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVERS'] })
  @IsOptional()
  @IsEnum(['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVERS'])
  status?: RideStatus;
}
