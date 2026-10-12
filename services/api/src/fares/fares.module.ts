import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FaresController } from './fares.controller';

@Module({
  controllers: [FaresController],
  providers: [FareService],
  exports: [FareService],
})
export class FaresModule {}
