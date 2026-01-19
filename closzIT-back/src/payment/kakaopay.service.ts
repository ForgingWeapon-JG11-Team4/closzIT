// src/payment/kakaopay.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { 
  CreditTransactionType, 
  OutboxEventType, 
  OutboxStatus, 
  PaymentStatus 
} from '@prisma/client';

// ============================================
// 타입 정의
// ============================================

export interface KakaoPayReadyResponse {
  tid: string;
  next_redirect_pc_url: string;
  next_redirect_mobile_url: string;
  next_redirect_app_url: string;
  android_app_scheme: string;
  ios_app_scheme: string;
  created_at: string;
}

export interface KakaoPayApproveResponse {
  aid: string;
  tid: string;
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  item_name: string;
  quantity: number;
  created_at: string;
  approved_at: string;
}

export interface KakaoPayCancelResponse {
  aid: string;
  tid: string;
  cid: string;
  status: string;
  approved_cancel_amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  canceled_at: string;
}

export interface CreditPackage {
  id: number;
  credits: number;
  price: number;
}

// 크레딧 패키지 정의
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 1, credits: 10, price: 500 },
  { id: 2, credits: 30, price: 1400 },
  { id: 3, credits: 50, price: 2200 },
  { id: 4, credits: 100, price: 4000 },
  { id: 5, credits: 200, price: 7600 },
  { id: 6, credits: 300, price: 10500 },
];

// ============================================
// 서비스 구현
// ============================================

@Injectable()
export class KakaoPayService {
  private readonly logger = new Logger(KakaoPayService.name);
  
  private readonly secretKey: string;
  private readonly cid: string;
  private readonly baseUrl = 'https://open-api.kakaopay.com/online/v1/payment';
  private readonly approvalUrl: string;
  private readonly cancelUrl: string;
  private readonly failUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {
    this.secretKey = this.configService.get<string>('KAKAOPAY_SECRET_KEY') || '';
    this.cid = this.configService.get<string>('KAKAOPAY_CID') || 'TC0ONETIME';
    
    const baseAppUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    this.approvalUrl = `${baseAppUrl}/payment/kakaopay/approve`;
    this.cancelUrl = `${baseAppUrl}/payment/kakaopay/cancel`;
    this.failUrl = `${baseAppUrl}/payment/kakaopay/fail`;
  }

  // ============================================
  // 결제 준비
  // ============================================

  async ready(userId: string, packageId: number): Promise<{
    success: boolean;
    tid: string;
    orderId: string;
    redirectUrl: string;
    mobileRedirectUrl: string;
  }> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      throw new BadRequestException('유효하지 않은 패키지입니다.');
    }

    const orderId = `credit-${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[결제 준비] userId: ${userId}, orderId: ${orderId}, package: ${pkg.credits}크레딧`);

    // 1. 트랜잭션으로 결제 레코드 생성
    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.kakaoPayment.create({
        data: {
          orderId,
          userId,
          packageId,
          credits: pkg.credits,
          amount: pkg.price,
          status: PaymentStatus.READY,
          creditGranted: false,
        },
      });

      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'CREATE',
          status: 'SUCCESS',
          details: { orderId, packageId, credits: pkg.credits, amount: pkg.price },
        },
      });

      return payment;
    });

    // 2. 카카오페이 API 호출
    try {
      const result = await this.callKakaoPayReady({
        partnerOrderId: orderId,
        partnerUserId: userId,
        itemName: `${pkg.credits} 크레딧`,
        quantity: 1,
        totalAmount: pkg.price,
      });

      // 3. tid 저장
      await this.prisma.kakaoPayment.update({
        where: { id: payment.id },
        data: { tid: result.tid },
      });

      this.logger.log(`[결제 준비 완료] tid: ${result.tid}`);

      return {
        success: true,
        tid: result.tid,
        orderId,
        redirectUrl: result.next_redirect_pc_url,
        mobileRedirectUrl: result.next_redirect_mobile_url,
      };
    } catch (error) {
      // 실패 시 상태 업데이트
      await this.prisma.$transaction([
        this.prisma.kakaoPayment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        }),
        this.prisma.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            action: 'KAKAOPAY_READY',
            status: 'FAILURE',
            details: { error: error.message },
          },
        }),
      ]);

      throw error;
    }
  }

  // ============================================
  // 결제 승인 (아웃박스 패턴 적용)
  // ============================================

  async approveWithOutbox(orderId: string, pgToken: string): Promise<{
    success: boolean;
    payment: any;
    duplicate?: boolean;
  }> {
    this.logger.log(`[결제 승인 시작] orderId: ${orderId}`);

    // 1. 결제 정보 조회 및 검증
    const payment = await this.prisma.kakaoPayment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
    }

    // 멱등성: 이미 승인된 결제
    if (payment.status === PaymentStatus.APPROVED) {
      this.logger.log(`[이미 승인됨] orderId: ${orderId}`);
      return { success: true, payment, duplicate: true };
    }

    if (payment.status !== PaymentStatus.READY) {
      throw new BadRequestException(`처리할 수 없는 결제 상태: ${payment.status}`);
    }

    // 2. 카카오페이 승인 API 호출
    let approveResult: KakaoPayApproveResponse;
    try {
      approveResult = await this.callKakaoPayApprove(
        payment.tid!,
        payment.orderId,
        payment.userId,
        pgToken,
      );
    } catch (error) {
      await this.prisma.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'KAKAOPAY_APPROVE',
          status: 'FAILURE',
          details: { error: error.message, pgToken },
        },
      });
      throw error;
    }

    // 3. ⭐ 핵심 트랜잭션: 승인 상태 + 아웃박스 이벤트 원자적 저장
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      // 낙관적 락: 상태 재확인
      const current = await tx.kakaoPayment.findUnique({
        where: { id: payment.id },
      });

      if (current?.status !== PaymentStatus.READY) {
        throw new Error('동시 처리 충돌');
      }

      // 결제 상태 업데이트
      const updated = await tx.kakaoPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.APPROVED,
          approvedAt: new Date(),
          paymentMethodType: approveResult.payment_method_type,
        },
      });

      // 아웃박스 이벤트 생성 (크레딧 지급 예약)
      await tx.paymentOutbox.create({
        data: {
          eventType: OutboxEventType.GRANT_CREDIT,
          payload: {
            paymentId: payment.id,
            userId: payment.userId,
            credits: payment.credits,
            amount: payment.amount,
            orderId: payment.orderId,
            idempotencyKey: `kakaopay-${payment.orderId}`,
          },
          status: OutboxStatus.PENDING,
          paymentId: payment.id,
          nextRetryAt: new Date(),
        },
      });

      // 감사 로그
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'APPROVE',
          status: 'SUCCESS',
          details: {
            tid: approveResult.tid,
            aid: approveResult.aid,
            paymentMethodType: approveResult.payment_method_type,
            amount: approveResult.amount,
          },
        },
      });

      return updated;
    });

    this.logger.log(`[결제 승인 완료] orderId: ${orderId}`);

    // 4. 즉시 크레딧 지급 시도 (실패해도 아웃박스가 재시도)
    try {
      await this.processGrantCreditEvent(payment.id);
    } catch (error) {
      this.logger.warn(`[즉시 지급 실패, 아웃박스 재시도 예정] ${error.message}`);
    }

    return { success: true, payment: updatedPayment };
  }

  // ============================================
  // 크레딧 지급 이벤트 처리
  // ============================================

  async processGrantCreditEvent(paymentId: string): Promise<void> {
    const payment = await this.prisma.kakaoPayment.findUnique({
      where: { id: paymentId },
      include: {
        outboxEvents: {
          where: {
            eventType: OutboxEventType.GRANT_CREDIT,
            status: { in: [OutboxStatus.PENDING, OutboxStatus.PROCESSING] },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('결제 정보 없음');
    }

    // 이미 지급 완료
    if (payment.creditGranted) {
      this.logger.log(`[이미 지급됨] paymentId: ${paymentId}`);
      await this.prisma.paymentOutbox.updateMany({
        where: {
          paymentId,
          eventType: OutboxEventType.GRANT_CREDIT,
          status: { in: [OutboxStatus.PENDING, OutboxStatus.PROCESSING] },
        },
        data: { status: OutboxStatus.COMPLETED, processedAt: new Date() },
      });
      return;
    }

    const outboxEvent = payment.outboxEvents[0];
    if (!outboxEvent) {
      throw new Error('아웃박스 이벤트 없음');
    }

    // PROCESSING 상태로 변경
    await this.prisma.paymentOutbox.update({
      where: { id: outboxEvent.id },
      data: { status: OutboxStatus.PROCESSING },
    });

    const payload = outboxEvent.payload as any;

    try {
      // ⭐ 기존 CreditService 사용 - PURCHASE 타입으로 크레딧 지급
      const creditResult = await this.creditService.addCredit(
        payment.userId,
        payment.credits,
        CreditTransactionType.PURCHASE,
        `카카오페이 결제: ${payment.credits} 크레딧 (${payment.amount.toLocaleString()}원)`,
        payload.idempotencyKey,
      );

      // 지급 완료 상태 업데이트 (트랜잭션)
      await this.prisma.$transaction(async (tx) => {
        await tx.kakaoPayment.update({
          where: { id: paymentId },
          data: {
            creditGranted: true,
            creditHistoryId: creditResult.historyId,
          },
        });

        await tx.paymentOutbox.update({
          where: { id: outboxEvent.id },
          data: {
            status: OutboxStatus.COMPLETED,
            processedAt: new Date(),
          },
        });

        await tx.paymentAuditLog.create({
          data: {
            paymentId,
            action: 'GRANT_CREDIT',
            status: 'SUCCESS',
            details: {
              credits: payment.credits,
              creditHistoryId: creditResult.historyId,
              newBalance: creditResult.newBalance,
              duplicate: creditResult.duplicate,
            },
          },
        });
      });

      this.logger.log(`[크레딧 지급 완료] paymentId: ${paymentId}, credits: ${payment.credits}`);
    } catch (error) {
      // 실패 시 재시도 스케줄링
      const newRetryCount = outboxEvent.retryCount + 1;
      const shouldRetry = newRetryCount < outboxEvent.maxRetries;

      await this.prisma.$transaction([
        this.prisma.paymentOutbox.update({
          where: { id: outboxEvent.id },
          data: {
            status: shouldRetry ? OutboxStatus.PENDING : OutboxStatus.FAILED,
            retryCount: newRetryCount,
            lastError: error.message,
            nextRetryAt: shouldRetry ? new Date(Date.now() + this.getRetryDelay(newRetryCount)) : null,
          },
        }),
        this.prisma.paymentAuditLog.create({
          data: {
            paymentId,
            action: 'GRANT_CREDIT',
            status: 'FAILURE',
            details: { error: error.message, retryCount: newRetryCount, willRetry: shouldRetry },
          },
        }),
      ]);

      this.logger.error(`[크레딧 지급 실패] paymentId: ${paymentId}, retry: ${newRetryCount}`);
      throw error;
    }
  }

  // ============================================
  // 환불 처리
  // ============================================

  async refund(orderId: string, userId: string): Promise<{
    success: boolean;
    refundedAmount: number;
  }> {
    this.logger.log(`[환불 요청] orderId: ${orderId}`);

    const payment = await this.prisma.kakaoPayment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('본인의 결제만 환불할 수 있습니다.');
    }

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException('환불할 수 없는 결제 상태입니다.');
    }

    if (!payment.creditGranted) {
      throw new BadRequestException('크레딧이 지급되지 않은 결제입니다.');
    }

    // 1. 카카오페이 취소 API 호출
    let cancelResult: KakaoPayCancelResponse;
    try {
      cancelResult = await this.callKakaoPayCancel(payment.tid!, payment.amount);
    } catch (error) {
      await this.prisma.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'KAKAOPAY_CANCEL',
          status: 'FAILURE',
          details: { error: error.message },
        },
      });
      throw error;
    }

    // 2. 크레딧 차감 + 상태 업데이트 (트랜잭션)
    const refundIdempotencyKey = `kakaopay-refund-${orderId}`;

    try {
      // 기존 CreditService 사용 - REFUND 타입으로 크레딧 차감
      const deductResult = await this.creditService.deductCredit(
        payment.userId,
        payment.credits,
        CreditTransactionType.REFUND,
        `카카오페이 환불: ${payment.credits} 크레딧`,
        refundIdempotencyKey,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.kakaoPayment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
            refundedAmount: cancelResult.approved_cancel_amount.total,
            refundHistoryId: deductResult.historyId,
          },
        });

        await tx.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            action: 'REFUND',
            status: 'SUCCESS',
            details: {
              refundedAmount: cancelResult.approved_cancel_amount.total,
              refundHistoryId: deductResult.historyId,
              newBalance: deductResult.newBalance,
            },
          },
        });
      });

      this.logger.log(`[환불 완료] orderId: ${orderId}`);

      return {
        success: true,
        refundedAmount: cancelResult.approved_cancel_amount.total,
      };
    } catch (error) {
      // 크레딧 차감 실패 시 - 카카오페이는 이미 취소됨, 수동 처리 필요
      await this.prisma.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'REFUND_CREDIT_DEDUCT',
          status: 'FAILURE',
          details: {
            error: error.message,
            kakaoCancelSuccess: true,
            needsManualFix: true,
          },
        },
      });

      this.logger.error(`[환불 크레딧 차감 실패] orderId: ${orderId}, 수동 처리 필요`);
      throw new BadRequestException('환불 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요.');
    }
  }

  // ============================================
  // 카카오페이 API 호출 (private)
  // ============================================

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `SECRET_KEY ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async callKakaoPayReady(params: {
    partnerOrderId: string;
    partnerUserId: string;
    itemName: string;
    quantity: number;
    totalAmount: number;
  }): Promise<KakaoPayReadyResponse> {
    
    // 콜백 URL에 orderId 포함
    const approvalUrlWithOrder = `${this.approvalUrl}?partner_order_id=${params.partnerOrderId}`;
    const cancelUrlWithOrder = `${this.cancelUrl}?partner_order_id=${params.partnerOrderId}`;
    const failUrlWithOrder = `${this.failUrl}?partner_order_id=${params.partnerOrderId}`;

    const response = await fetch(`${this.baseUrl}/ready`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        cid: this.cid,
        partner_order_id: params.partnerOrderId,
        partner_user_id: params.partnerUserId,
        item_name: params.itemName,
        quantity: params.quantity,
        total_amount: params.totalAmount,
        tax_free_amount: 0,
        approval_url: approvalUrlWithOrder,
        cancel_url: cancelUrlWithOrder,
        fail_url: failUrlWithOrder,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new BadRequestException(errorData.error_message || '카카오페이 결제 준비 실패');
    }

    return response.json();
  }

  private async callKakaoPayApprove(
    tid: string,
    partnerOrderId: string,
    partnerUserId: string,
    pgToken: string,
  ): Promise<KakaoPayApproveResponse> {
    const response = await fetch(`${this.baseUrl}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        cid: this.cid,
        tid,
        partner_order_id: partnerOrderId,
        partner_user_id: partnerUserId,
        pg_token: pgToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new BadRequestException(errorData.error_message || '카카오페이 결제 승인 실패');
    }

    return response.json();
  }

  private async callKakaoPayCancel(tid: string, cancelAmount: number): Promise<KakaoPayCancelResponse> {
    const response = await fetch(`${this.baseUrl}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        cid: this.cid,
        tid,
        cancel_amount: cancelAmount,
        cancel_tax_free_amount: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new BadRequestException(errorData.error_message || '카카오페이 결제 취소 실패');
    }

    return response.json();
  }

  // 지수 백오프 재시도 딜레이
  private getRetryDelay(retryCount: number): number {
    const delays = [60000, 300000, 900000, 1800000, 3600000]; // 1분, 5분, 15분, 30분, 1시간
    return delays[Math.min(retryCount - 1, delays.length - 1)];
  }
}