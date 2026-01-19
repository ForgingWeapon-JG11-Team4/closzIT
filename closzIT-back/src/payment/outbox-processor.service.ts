// src/payment/outbox-processor.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { KakaoPayService } from './kakaopay.service';
import { OutboxEventType, OutboxStatus } from '@prisma/client';

@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kakaoPayService: KakaoPayService,
  ) {}

  onModuleInit() {
    this.logger.log('아웃박스 프로세서 초기화');
  }

  /**
   * 매분 실행 - 대기 중인 아웃박스 이벤트 처리
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processOutboxEvents() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingEvents = await this.prisma.paymentOutbox.findMany({
        where: {
          status: OutboxStatus.PENDING,
          nextRetryAt: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      if (pendingEvents.length > 0) {
        this.logger.log(`[아웃박스] ${pendingEvents.length}개 이벤트 처리`);
      }

      for (const event of pendingEvents) {
        try {
          await this.processEvent(event);
        } catch (error) {
          this.logger.error(`[아웃박스] 처리 실패 id=${event.id}: ${error.message}`);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: any) {
    switch (event.eventType) {
      case OutboxEventType.GRANT_CREDIT:
        await this.kakaoPayService.processGrantCreditEvent(event.paymentId);
        break;

      case OutboxEventType.DEDUCT_CREDIT:
        // 환불 시 크레딧 차감 (필요 시 구현)
        break;

      default:
        this.logger.warn(`알 수 없는 이벤트 타입: ${event.eventType}`);
    }
  }

  /**
   * 실패한 이벤트 수동 재시도
   */
  async retryFailedEvent(eventId: string): Promise<void> {
    await this.prisma.paymentOutbox.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        nextRetryAt: new Date(),
        lastError: null,
      },
    });
    this.logger.log(`[아웃박스] 재시도 예약: ${eventId}`);
  }

  /**
   * 통계 조회
   */
  async getStats() {
    const [pending, processing, completed, failed] = await Promise.all([
      this.prisma.paymentOutbox.count({ where: { status: OutboxStatus.PENDING } }),
      this.prisma.paymentOutbox.count({ where: { status: OutboxStatus.PROCESSING } }),
      this.prisma.paymentOutbox.count({ where: { status: OutboxStatus.COMPLETED } }),
      this.prisma.paymentOutbox.count({ where: { status: OutboxStatus.FAILED } }),
    ]);

    return { pending, processing, completed, failed };
  }

  /**
   * 실패 이벤트 목록
   */
  async getFailedEvents(limit = 20) {
    return this.prisma.paymentOutbox.findMany({
      where: { status: OutboxStatus.FAILED },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        payment: {
          select: { orderId: true, userId: true, credits: true, amount: true },
        },
      },
    });
  }
}