// src/credit/credit.service.ts

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditTransactionType } from '@prisma/client';

export interface CreditResult {
  success: boolean;
  duplicate: boolean;
  newBalance: number;
  historyId?: string;
  message?: string;
}

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 크레딧 추가 (멱등성 지원)
   */
  async addCredit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description?: string,
    idempotencyKey?: string,
  ): Promise<CreditResult> {
    this.logger.log(`[크레딧 추가 요청] userId: ${userId}, amount: ${amount}, type: ${type}`);

    // 1. 멱등키 확인
    if (idempotencyKey) {
      const existing = await this.prisma.creditHistory.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        this.logger.log(`[중복 요청 - 멱등키] userId: ${userId}, historyId: ${existing.id}`);
        return {
          success: true,
          duplicate: true,
          newBalance: existing.balanceAfter,
          historyId: existing.id,
          message: '이미 처리된 요청입니다.',
        };
      }
    }

    // 2. 트랜잭션으로 원자적 처리
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 원자적 증가
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { credit: { increment: amount } },
          select: { credit: true },
        });

        // 이력 생성
        const history = await tx.creditHistory.create({
          data: {
            userId,
            type,
            amount,
            balanceAfter: updatedUser.credit,
            description,
            idempotencyKey,
          },
        });

        return { newBalance: updatedUser.credit, historyId: history.id };
      });

      this.logger.log(`[크레딧 추가 완료] userId: ${userId}, newBalance: ${result.newBalance}`);

      return {
        success: true,
        duplicate: false,
        newBalance: result.newBalance,
        historyId: result.historyId,
      };
    } catch (error) {
      // 멱등키 중복 (동시 요청)
      if (error.code === 'P2002' && idempotencyKey) {
        this.logger.warn(`[동시 요청 충돌] userId: ${userId}, key: ${idempotencyKey}`);
        const existing = await this.prisma.creditHistory.findUnique({
          where: { idempotencyKey },
        });
        return {
          success: true,
          duplicate: true,
          newBalance: existing?.balanceAfter ?? 0,
          historyId: existing?.id,
          message: '이미 처리된 요청입니다.',
        };
      }

      this.logger.error(`[크레딧 추가 실패] userId: ${userId}, error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 크레딧 차감 (멱등성 + 원자적 처리)
   */
  async deductCredit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description?: string,
    idempotencyKey?: string,
  ): Promise<CreditResult> {
    this.logger.log(`[크레딧 차감 요청] userId: ${userId}, amount: ${amount}, type: ${type}`);

    // 1. 멱등키 확인
    if (idempotencyKey) {
      const existing = await this.prisma.creditHistory.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        this.logger.log(`[중복 요청 - 멱등키] userId: ${userId}, historyId: ${existing.id}`);
        return {
          success: true,
          duplicate: true,
          newBalance: existing.balanceAfter,
          historyId: existing.id,
          message: '이미 처리된 요청입니다.',
        };
      }
    }

    // 2. 원자적 차감 (잔액 체크 포함)
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 원자적 차감 - 잔액 >= amount 일 때만 성공
        const affected = await tx.$executeRaw`
          UPDATE "users" 
          SET credit = credit - ${amount}, updated_at = NOW()
          WHERE id = ${userId} AND credit >= ${amount}
        `;

        if (affected === 0) {
          // 잔액 부족 또는 사용자 없음
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { credit: true },
          });

          if (!user) {
            throw new BadRequestException('사용자를 찾을 수 없습니다.');
          }
          throw new BadRequestException(`크레딧이 부족합니다. (현재: ${user.credit}, 필요: ${amount})`);
        }

        // 업데이트된 잔액 조회
        const updatedUser = await tx.user.findUnique({
          where: { id: userId },
          select: { credit: true },
        });

        // 이력 생성
        const history = await tx.creditHistory.create({
          data: {
            userId,
            type,
            amount: -amount,
            balanceAfter: updatedUser!.credit,
            description,
            idempotencyKey,
          },
        });

        return { newBalance: updatedUser!.credit, historyId: history.id };
      });

      this.logger.log(`[크레딧 차감 완료] userId: ${userId}, newBalance: ${result.newBalance}`);

      return {
        success: true,
        duplicate: false,
        newBalance: result.newBalance,
        historyId: result.historyId,
      };
    } catch (error) {
      // 멱등키 중복 (동시 요청)
      if (error.code === 'P2002' && idempotencyKey) {
        this.logger.warn(`[동시 요청 충돌] userId: ${userId}, key: ${idempotencyKey}`);
        const existing = await this.prisma.creditHistory.findUnique({
          where: { idempotencyKey },
        });
        return {
          success: true,
          duplicate: true,
          newBalance: existing?.balanceAfter ?? 0,
          historyId: existing?.id,
          message: '이미 처리된 요청입니다.',
        };
      }

      if (error instanceof BadRequestException) {
        this.logger.warn(`[크레딧 차감 실패] userId: ${userId}, reason: ${error.message}`);
      } else {
        this.logger.error(`[크레딧 차감 실패] userId: ${userId}, error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 사용자의 크레딧 조회
   */
  async getCredit(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credit: true },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    return user.credit;
  }

  /**
   * 사용자의 크레딧 이력 조회
   */
  async getCreditHistory(userId: string, limit = 20) {
    return this.prisma.creditHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 회원가입 시 초기 크레딧 지급 (100 크레딧)
   */
  async grantSignupCredit(userId: string, idempotencyKey?: string) {
    return this.addCredit(
      userId,
      100,
      CreditTransactionType.SIGNUP,
      '회원가입 축하 크레딧',
      idempotencyKey ?? `signup-${userId}`,
    );
  }

  /**
   * 옷 등록 시 크레딧 지급 (10 크레딧)
   */
  async grantClothingAddedCredit(userId: string, clothingId: string) {
    return this.addCredit(
      userId,
      10,
      CreditTransactionType.CLOTHING_ADDED,
      '의류 등록 보상',
      `clothing-added-${clothingId}`,
    );
  }

  /**
   * VTO 사용 시 크레딧 차감 (3 크레딧)
   */
  async deductVtoCredit(userId: string, idempotencyKey?: string) {
    return this.deductCredit(
      userId,
      3,
      CreditTransactionType.VTO_USED,
      'VTO 서비스 사용',
      idempotencyKey,
    );
  }

  /**
   * 옷 펴기(Flatten) 사용 시 크레딧 차감 (1 크레딧)
   */
  async deductFlattenCredit(userId: string, idempotencyKey?: string) {
    return this.deductCredit(
      userId,
      1,
      CreditTransactionType.FLATTEN_USED,
      '옷 펴기 서비스 사용',
      idempotencyKey,
    );
  }

  /**
   * 크레딧 정합성 검증
   */
  async verifyIntegrity(userId: string): Promise<{
    isValid: boolean;
    cachedCredit: number;
    calculatedCredit: number;
    diff: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credit: true },
    });

    const historySum = await this.prisma.creditHistory.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const cachedCredit = user?.credit ?? 0;
    const calculatedCredit = historySum._sum.amount ?? 0;
    const diff = cachedCredit - calculatedCredit;

    return {
      isValid: diff === 0,
      cachedCredit,
      calculatedCredit,
      diff,
    };
  }
}