import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Max, Min } from 'class-validator';
import { DriverAvailabilityStatus } from '@rideflow/shared-types';

export class AvailabilityDto {
  @ApiProperty({ enum: ['OFFLINE', 'ONLINE'] })
  @IsEnum(['OFFLINE', 'ONLINE'])
  availabilityStatus!: Extract<DriverAvailabilityStatus, 'OFFLINE' | 'ONLINE'>;
}

export class LocationDto {
  @ApiProperty({ example: 30.7333 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 76.7794 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
