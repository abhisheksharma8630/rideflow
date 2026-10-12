import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { FaresModule } from '../fares/fares.module';
import { DispatchModule } from '../dispatch/dispatch.module';

@Module({
  imports: [FaresModule, DispatchModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
