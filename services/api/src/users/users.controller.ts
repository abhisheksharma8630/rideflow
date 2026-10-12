import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';
import { CurrentUser, JwtUser } from '../common/decorators';
import { RidesService } from '../rides/rides.service';
import { RideListQuery } from '../rides/dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly rides: RidesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current profile' })
  me(@CurrentUser() user: JwtUser) {
    return this.users.me(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current profile' })
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.users.update(user.userId, dto);
  }

  @Get('me/rides')
  @ApiOperation({ summary: 'List current user ride history' })
  rideHistory(@CurrentUser() user: JwtUser, @Query() query: RideListQuery) {
    return this.rides.listForUser(user, query);
  }
}
