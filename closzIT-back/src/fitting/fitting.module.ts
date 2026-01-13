import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FittingController } from './fitting.controller';
import { FittingService } from './fitting.service';
import { CreditModule } from '../credit/credit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { VtonCacheModule } from '../vton-cache/vton-cache.module';

@Module({
  imports: [
    forwardRef(() => CreditModule),
    PrismaModule,
    S3Module,
    forwardRef(() => VtonCacheModule),
    BullModule.registerQueue({ name: 'vto-queue' }),
  ],
  controllers: [FittingController],
  providers: [FittingService],
  exports: [FittingService],
})
export class FittingModule { }
