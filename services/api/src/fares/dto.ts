import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { VehicleCategory } from '@rideflow/shared-types';

export class GeoPointDto {
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

export class FareEstimateDto {
  @ApiProperty({ enum: ['BIKE', 'AUTO', 'CAB'] })
  @IsEnum(['BIKE', 'AUTO', 'CAB'])
  vehicleCategory!: VehicleCategory;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup!: GeoPointDto;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  destination!: GeoPointDto;
}
