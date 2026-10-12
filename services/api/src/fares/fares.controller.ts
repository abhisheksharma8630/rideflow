import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FareService } from './fare.service';
import { FareEstimateDto } from './dto';
import { Public } from '../common/decorators';

@ApiTags('fares')
@Controller('fares')
export class FaresController {
  constructor(private readonly fares: FareService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List fare rules per vehicle category' })
  list() {
    return this.fares.listRules();
  }

  @Post('estimate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Estimate fare for a trip (haversine distance, no routing provider)' })
  estimate(@Body() dto: FareEstimateDto) {
    return this.fares.estimate(dto.vehicleCategory, dto.pickup, dto.destination);
  }
}
