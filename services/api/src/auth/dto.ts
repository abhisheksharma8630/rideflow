import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { UserRole } from '@rideflow/shared-types';

export class DemoLoginDto {
  @ApiProperty({ example: '9810000001', description: 'Indian mobile number (demo accounts seeded)' })
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'DRIVER', 'ADMIN'], example: 'CUSTOMER' })
  @IsEnum(['CUSTOMER', 'DRIVER', 'ADMIN'])
  role!: UserRole;

  @ApiPropertyOptional({ description: 'Optional name used only if creating a new demo customer' })
  @IsOptional()
  name?: string;
}
