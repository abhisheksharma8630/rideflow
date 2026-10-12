import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { SimulationService } from './simulation.service';

@Module({
  providers: [DispatchService, SimulationService],
  exports: [DispatchService, SimulationService],
})
export class DispatchModule {}
