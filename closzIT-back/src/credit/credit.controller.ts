// src/credit/credit.controller.ts

import { Controller, Get, Post, Body, Headers, UseGuards, Request } from '@nestjs/common';
import { CreditService } from './credit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreditTransactionType } from '@prisma/client';

// 크레딧 패키지 정의
const CREDIT_PACKAGES = [
  { id: 1, credits: 10, price: 500 },
  { id: 2, credits: 30, price: 1400 },
  { id: 3, credits: 50, price: 2200 },
  { id: 4, credits: 100, price: 4000 },
  { id: 5, credits: 200, price: 7600 },
  { id: 6, credits: 300, price: 10500 },
];

@Controller('credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  /**
   * 현재 사용자의 크레딧 조회
   */
  @Get()
  async getMyCredit(@Request() req) {
    const userId = req.user.id;
    const credit = await this.creditService.getCredit(userId);
    return { credit };
  }

  /**
   * 현재 사용자의 크레딧 이력 조회
   */
  @Get('history')
  async getMyCreditHistory(@Request() req) {
    const userId = req.user.id;
    const history = await this.creditService.getCreditHistory(userId);
    return { history };
  }

  /**
   * 크레딧 정합성 검증
   */
  @Get('verify')
  async verifyMyCredit(@Request() req) {
    const userId = req.user.id;
    return this.creditService.verifyIntegrity(userId);
  }

  /**
   * 크레딧 패키지 목록 조회
   */
  @Get('packages')
  async getCreditPackages() {
    return { packages: CREDIT_PACKAGES };
  }

  /**
   * [데모용] 크레딧 구매 (실제 결제 없음)
   */
  @Post('purchase')
  async purchaseCredit(
    @Request() req,
    @Body() body: { packageId: number },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = req.user.id;
    const { packageId } = body;

    // 패키지 찾기
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return {
        success: false,
        message: '유효하지 않은 패키지입니다.',
      };
    }

    // 멱등키 생성 (제공되지 않은 경우)
    const key = idempotencyKey || `demo-purchase-${userId}-${Date.now()}`;

    // 크레딧 추가
    const result = await this.creditService.addCredit(
      userId,
      pkg.credits,
      CreditTransactionType.PURCHASE,
      `[데모] ${pkg.credits} 크레딧 구매 (${pkg.price.toLocaleString()}원)`,
      key,
    );

    return {
      success: result.success,
      duplicate: result.duplicate,
      newBalance: result.newBalance,
      purchasedCredits: pkg.credits,
      message: result.duplicate
        ? '이미 처리된 요청입니다.'
        : `${pkg.credits} 크레딧이 충전되었습니다!`,
    };
  }

  /**
   * [데모용] PIN 코드로 크레딧 충전
   */
  @Post('redeem')
  async redeemPinCode(
    @Request() req,
    @Body() body: { pinCode: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = req.user.id;
    const { pinCode } = body;

    // 데모용 PIN 코드 (실제로는 DB에서 검증)
    const DEMO_PIN_CODES: Record<string, number> = {
      'DEMO10': 10,
      'DEMO50': 50,
      'DEMO100': 100,
    };

    const credits = DEMO_PIN_CODES[pinCode.toUpperCase()];
    if (!credits) {
      return {
        success: false,
        message: '유효하지 않은 PIN 코드입니다.',
      };
    }

    // 멱등키 생성 (PIN 코드 기반 - 같은 PIN은 한 번만 사용 가능)
    const key = idempotencyKey || `pin-redeem-${userId}-${pinCode.toUpperCase()}`;

    const result = await this.creditService.addCredit(
      userId,
      credits,
      CreditTransactionType.PIN_REDEEM,
      `PIN 코드 사용: ${pinCode.toUpperCase()}`,
      key,
    );

    return {
      success: result.success,
      duplicate: result.duplicate,
      newBalance: result.newBalance,
      redeemedCredits: credits,
      message: result.duplicate
        ? '이미 사용된 PIN 코드입니다.'
        : `${credits} 크레딧이 충전되었습니다!`,
    };
  }
}