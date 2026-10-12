import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  AdminListQuery,
  AdminRideQuery,
  ApprovalDto,
  DriverStatusDto,
  FareRuleUpdateDto,
} from './dto';
import { Roles } from '../common/decorators';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview metrics (from live DB)' })
  overview() {
    return this.admin.overview();
  }

  @Get('rides')
  @ApiOperation({ summary: 'List/search rides' })
  rides(@Query() query: AdminRideQuery) {
    return this.admin.rides(query);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'List/search drivers' })
  drivers(@Query() query: AdminListQuery) {
    return this.admin.drivers(query);
  }

  @Patch('drivers/:id/approval')
  @ApiOperation({ summary: 'Approve/suspend a driver' })
  approval(@Param('id') id: string, @Body() dto: ApprovalDto) {
    return this.admin.setApproval(id, dto);
  }

  @Patch('drivers/:id/status')
  @ApiOperation({ summary: 'Activate/suspend driver account' })
  status(@Param('id') id: string, @Body() dto: DriverStatusDto) {
    return this.admin.setDriverUserStatus(id, dto);
  }

  @Get('customers')
  @ApiOperation({ summary: 'List/search customers' })
  customers(@Query() query: AdminListQuery) {
    return this.admin.customers(query);
  }

  @Get('fares')
  @ApiOperation({ summary: 'List fare rules' })
  fares() {
    return this.admin.fares();
  }

  @Patch('fares/:id')
  @ApiOperation({ summary: 'Update a fare rule' })
  updateFare(@Param('id') id: string, @Body() dto: FareRuleUpdateDto) {
    return this.admin.updateFare(id, dto);
  }
}
