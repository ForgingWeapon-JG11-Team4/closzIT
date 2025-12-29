import { Module } from '@nestjs/common';
import { FittingController } from './fitting.controller';
import { FittingService } from './fitting.service';

@Module({
  controllers: [FittingController],
  providers: [FittingService],
})
export class FittingModule {}
