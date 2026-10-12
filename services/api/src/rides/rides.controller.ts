import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RidesService } from './rides.service';
import { CancelRideDto, CreateRideDto, RateRideDto, RideListQuery } from './dto';
import { CurrentUser, JwtUser, Roles } from '../common/decorators';

@ApiTags('rides')
@ApiBearerAuth()
@Controller('rides')
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Create a ride booking (customer)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRideDto) {
    return this.rides.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rides for the current user (customer or driver)' })
  list(@CurrentUser() user: JwtUser, @Query() query: RideListQuery) {
    return this.rides.listForUser(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ride (ownership-checked)' })
  getOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rides.getOne(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a ride (customer or assigned driver)' })
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: CancelRideDto) {
    return this.rides.cancel(user, id, dto);
  }

  @Post(':id/rate')
  @HttpCode(200)
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Rate a completed ride (customer)' })
  rate(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: RateRideDto) {
    return this.rides.rate(user.userId, id, dto);
  }

  // --- Driver lifecycle intents ---
  @Post(':id/accept')
  @HttpCode(200)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver accepts a ride offer (concurrency-safe)' })
  accept(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rides.accept(user.driverId as string, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver rejects a ride offer' })
  reject(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rides.reject(user.driverId as string, id);
  }

  @Post(':id/arrive')
  @HttpCode(200)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver arrived at pickup' })
  arrive(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rides.arrive(user.driverId as string, id);
  }

  @Post(':id/start')
  @HttpCode(200)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver starts the trip (begins simulated movement)' })
  start(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rides.start(user.driverId as string, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver completes the trip (final fare computed on server)' })
  complete(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rides.complete(user.driverId as string, id);
  }
}
