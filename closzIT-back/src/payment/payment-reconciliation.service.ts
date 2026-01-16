// src/payment/payment-reconciliation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { 
  PaymentStatus, 
  OutboxEventType, 
  OutboxStatus,
  CreditTransactionType 
} from '@prisma/client';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매시간 정합성 검증
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledReconciliation() {
    this.logger.log('[정합성 검증] 시작');
    const result = await this.reconcile();
    this.logger.log(`[정합성 검증] 완료 - 검사: ${result.checked}, 문제: ${result.issues}, 수정: ${result.fixed}`);
  }

  /**
   * 결제-크레딧 정합성 검증 및 복구
   */
  async reconcile(): Promise<{ checked: number; issues: number; fixed: number }> {
    let checked = 0;
    let issues = 0;
    let fixed = 0;

    // 1. APPROVED인데 크레딧 미지급 건 (5분 이상 경과)
    const ungrantedPayments = await this.prisma.kakaoPayment.findMany({
      where: {
        status: PaymentStatus.APPROVED,
        creditGranted: false,
        approvedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      include: {
        outboxEvents: { where: { eventType: OutboxEventType.GRANT_CREDIT } },
      },
    });

    checked += ungrantedPayments.length;

    for (const payment of ungrantedPayments) {
      issues++;
      const outboxEvent = payment.outboxEvents[0];

      try {
        if (!outboxEvent) {
          // 아웃박스 이벤트 누락 - 생성
          await this.prisma.paymentOutbox.create({
            data: {
              eventType: OutboxEventType.GRANT_CREDIT,
              payload: {
                paymentId: payment.id,
                userId: payment.userId,
                credits: payment.credits,
                orderId: payment.orderId,
                idempotencyKey: `kakaopay-${payment.orderId}`,
                createdByReconciliation: true,
              },
              status: OutboxStatus.PENDING,
              paymentId: payment.id,
              nextRetryAt: new Date(),
            },
          });
          fixed++;
        } else if (outboxEvent.status === OutboxStatus.FAILED) {
          // 실패 상태 - 재시도
          await this.prisma.paymentOutbox.update({
            where: { id: outboxEvent.id },
            data: {
              status: OutboxStatus.PENDING,
              retryCount: 0,
              nextRetryAt: new Date(),
            },
          });
          fixed++;
        }

        await this.prisma.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            action: 'RECONCILE',
            status: 'SUCCESS',
            details: { issue: 'CREDIT_NOT_GRANTED', hasOutbox: !!outboxEvent },
          },
        });
      } catch (error) {
        this.logger.error(`[정합성] 복구 실패 payment=${payment.id}: ${error.message}`);
      }
    }

    // 2. 장시간 PENDING 상태 아웃박스 이벤트 (1시간 이상)
    const stuckEvents = await this.prisma.paymentOutbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    for (const event of stuckEvents) {
      checked++;
      issues++;

      await this.prisma.paymentOutbox.update({
        where: { id: event.id },
        data: { nextRetryAt: new Date() },
      });
      fixed++;
    }

    return { checked, issues, fixed };
  }

  /**
   * 특정 결제 정합성 검증
   */
  async verifyPayment(orderId: string) {
    const payment = await this.prisma.kakaoPayment.findUnique({
      where: { orderId },
      include: { outboxEvents: true },
    });

    if (!payment) {
      throw new Error('결제 없음');
    }

    const issues: string[] = [];

    // 검증 1: APPROVED인데 미지급
    if (payment.status === PaymentStatus.APPROVED && !payment.creditGranted) {
      issues.push('결제 승인됨, 크레딧 미지급');
    }

    // 검증 2: creditHistoryId 검증
    if (payment.creditGranted && payment.creditHistoryId) {
      const history = await this.prisma.creditHistory.findUnique({
        where: { id: payment.creditHistoryId },
      });
      if (!history) {
        issues.push('크레딧 이력 ID 있으나 실제 이력 없음');
      }
    }

    // 검증 3: 아웃박스 이벤트 상태
    const failedOutbox = payment.outboxEvents.find((e) => e.status === OutboxStatus.FAILED);
    if (failedOutbox) {
      issues.push(`아웃박스 실패: ${failedOutbox.lastError}`);
    }

    return {
      isValid: issues.length === 0,
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        creditGranted: payment.creditGranted,
        credits: payment.credits,
        amount: payment.amount,
      },
      issues,
    };
  }

  /**
   * 사용자 전체 결제-크레딧 정합성
   */
  async verifyUser(userId: string) {
    // 승인+지급 완료된 결제의 크레딧 합
    const payments = await this.prisma.kakaoPayment.findMany({
      where: { userId, status: PaymentStatus.APPROVED, creditGranted: true },
    });
    const totalFromPayments = payments.reduce((sum, p) => sum + p.credits, 0);

    // CreditHistory에서 PURCHASE 타입 합
    const purchaseHistory = await this.prisma.creditHistory.aggregate({
      where: { userId, type: CreditTransactionType.PURCHASE },
      _sum: { amount: true },
    });
    const totalFromHistory = purchaseHistory._sum.amount || 0;

    return {
      totalPayments: payments.length,
      totalCreditsFromPayments: totalFromPayments,
      totalCreditsFromHistory: totalFromHistory,
      isValid: totalFromPayments === totalFromHistory,
      discrepancy: totalFromPayments - totalFromHistory,
    };
  }
}