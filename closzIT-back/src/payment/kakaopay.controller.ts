// src/payment/kakaopay.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KakaoPayService, CREDIT_PACKAGES } from './kakaopay.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Controller('payment/kakaopay')
export class KakaoPayController {
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly kakaoPayService: KakaoPayService,
    private readonly reconciliationService: PaymentReconciliationService,
    private readonly outboxProcessor: OutboxProcessorService,
    private readonly prisma: PrismaService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  /**
   * 크레딧 패키지 목록
   */
  @Get('packages')
  getPackages() {
    return { packages: CREDIT_PACKAGES };
  }

  /**
   * 결제 준비
   */
  @Post('ready')
  @UseGuards(JwtAuthGuard)
  async ready(@Request() req, @Body() body: { packageId: number }) {
    return this.kakaoPayService.ready(req.user.id, body.packageId);
  }

  /**
   * 결제 승인 콜백 (카카오페이 → 서버)
   */
  @Get('approve')
  async approve(
    @Query('pg_token') pgToken: string,
    @Query('partner_order_id') orderId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.kakaoPayService.approveWithOutbox(orderId, pgToken);
      return res.redirect(
        `${this.frontendUrl}/payment/success?orderId=${orderId}&credits=${result.payment.credits}`
      );
    } catch (error) {
      return res.redirect(
        `${this.frontendUrl}/payment/fail?reason=${encodeURIComponent(error.message)}`
      );
    }
  }

  /**
   * 결제 취소 콜백
   */
  @Get('cancel')
  async cancel(@Query('partner_order_id') orderId: string, @Res() res: Response) {
    if (orderId) {
      await this.prisma.kakaoPayment.updateMany({
        where: { orderId, status: PaymentStatus.READY },
        data: { status: PaymentStatus.CANCELLED },
      });
    }
    return res.redirect(`${this.frontendUrl}/payment/cancel`);
  }

  /**
   * 결제 실패 콜백
   */
  @Get('fail')
  async fail(@Query('partner_order_id') orderId: string, @Res() res: Response) {
    if (orderId) {
      await this.prisma.kakaoPayment.updateMany({
        where: { orderId, status: PaymentStatus.READY },
        data: { status: PaymentStatus.FAILED },
      });
    }
    return res.redirect(`${this.frontendUrl}/payment/fail`);
  }

  /**
   * 환불 요청
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard)
  async refund(@Request() req, @Body() body: { orderId: string }) {
    return this.kakaoPayService.refund(body.orderId, req.user.id);
  }

  /**
   * 내 결제 내역
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async history(@Request() req) {
    const payments = await this.prisma.kakaoPayment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        orderId: true,
        credits: true,
        amount: true,
        status: true,
        creditGranted: true,
        createdAt: true,
        approvedAt: true,
        refundedAt: true,
      },
    });
    return { payments };
  }

  /**
   * 특정 결제 정합성 검증
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@Request() req, @Query('orderId') orderId: string) {
    const payment = await this.prisma.kakaoPayment.findUnique({ where: { orderId } });
    if (!payment || payment.userId !== req.user.id) {
      throw new BadRequestException('결제 없음');
    }
    return this.reconciliationService.verifyPayment(orderId);
  }

  /**
   * 내 전체 결제 정합성 검증
   */
  @Get('verify/all')
  @UseGuards(JwtAuthGuard)
  async verifyAll(@Request() req) {
    return this.reconciliationService.verifyUser(req.user.id);
  }

  // ========== 관리자 API ==========

  @Post('admin/reconcile')
  async adminReconcile() {
    return this.reconciliationService.reconcile();
  }

  @Get('admin/outbox/stats')
  async adminOutboxStats() {
    return this.outboxProcessor.getStats();
  }

  @Get('admin/outbox/failed')
  async adminOutboxFailed() {
    return this.outboxProcessor.getFailedEvents();
  }

  @Post('admin/outbox/retry')
  async adminOutboxRetry(@Body() body: { eventId: string }) {
    await this.outboxProcessor.retryFailedEvent(body.eventId);
    return { success: true };
  }
}