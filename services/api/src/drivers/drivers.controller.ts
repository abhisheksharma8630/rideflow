import { Body, Controller, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { AvailabilityDto, LocationDto } from './dto';
import { CurrentUser, JwtUser, Roles } from '../common/decorators';
import { RidesService } from '../rides/rides.service';
import { RideListQuery } from '../rides/dto';

@ApiTags('drivers')
@ApiBearerAuth()
@Roles('DRIVER')
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly drivers: DriversService,
    private readonly rides: RidesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Current driver profile' })
  me(@CurrentUser() user: JwtUser) {
    return this.drivers.me(user.driverId as string);
  }

  @Patch('me/availability')
  @ApiOperation({ summary: 'Toggle online/offline' })
  availability(@CurrentUser() user: JwtUser, @Body() dto: AvailabilityDto) {
    return this.drivers.setAvailability(user.driverId as string, dto);
  }

  @Post('me/location')
  @HttpCode(200)
  @ApiOperation({ summary: 'Report current location' })
  location(@CurrentUser() user: JwtUser, @Body() dto: LocationDto) {
    return this.drivers.updateLocation(user.driverId as string, dto);
  }

  @Get('me/rides')
  @ApiOperation({ summary: 'Driver ride history' })
  rideHistory(@CurrentUser() user: JwtUser, @Query() query: RideListQuery) {
    return this.rides.listForUser(user, query);
  }

  @Get('me/earnings')
  @ApiOperation({ summary: 'Driver earnings summary (informational)' })
  earnings(@CurrentUser() user: JwtUser) {
    return this.drivers.earnings(user.driverId as string);
  }
}
