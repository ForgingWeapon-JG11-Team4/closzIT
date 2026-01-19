// src/payment/kakaopay.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { KakaoPayController } from './kakaopay.controller';
import { KakaoPayService } from './kakaopay.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { CreditModule } from '../credit/credit.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // Cron 스케줄러
    CreditModule,
    PrismaModule,
  ],
  controllers: [KakaoPayController],
  providers: [
    KakaoPayService,
    OutboxProcessorService,
    PaymentReconciliationService,
  ],
  exports: [KakaoPayService],
})
export class KakaoPayModule {}