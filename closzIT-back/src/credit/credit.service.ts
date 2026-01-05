import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export enum CreditTransactionType {
  SIGNUP = 'SIGNUP',
  CLOTHING_ADDED = 'CLOTHING_ADDED',
  VTO_USED = 'VTO_USED',
  FLATTEN_USED = 'FLATTEN_USED',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);
  private readonly MAX_RETRIES = 3;

  constructor(private prisma: PrismaService) {}

  /**
   * 크레딧 레코드 초기화 (사용자 생성 시 호출)
   */
  async initializeCredit(userId: string) {
    return this.prisma.credit.create({
      data: {
        userId,
        balance: 0,
        version: 0,
      },
    });
  }

  /**
   * 크레딧 추가 (회원가입, 옷 등록 등) - Optimistic Locking
   */
  async addCredit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description?: string,
  ) {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // 현재 크레딧 조회
          const credit = await tx.credit.findUnique({
            where: { userId },
          });

          if (!credit) {
            throw new Error('크레딧 레코드를 찾을 수 없습니다.');
          }

          const newBalance = credit.balance + amount;

          // Optimistic Locking으로 업데이트
          const updatedCredit = await tx.credit.updateMany({
            where: {
              userId,
              version: credit.version, // 버전 체크
            },
            data: {
              balance: newBalance,
              version: { increment: 1 },
            },
          });

          // 버전 충돌 감지
          if (updatedCredit.count === 0) {
            throw new Error('OPTIMISTIC_LOCK_ERROR');
          }

          // 크레딧 이력 생성
          const history = await tx.creditHistory.create({
            data: {
              userId,
              type,
              amount,
              balanceBefore: credit.balance,
              balanceAfter: newBalance,
              description,
            },
          });

          this.logger.log(
            `Credit added: userId=${userId}, amount=+${amount}, balance=${credit.balance}->${newBalance}, attempt=${attempt + 1}`,
          );

          return { newBalance, history };
        });
      } catch (error) {
        if (error.message === 'OPTIMISTIC_LOCK_ERROR' && attempt < this.MAX_RETRIES - 1) {
          this.logger.warn(
            `Optimistic lock conflict on addCredit (attempt ${attempt + 1}/${this.MAX_RETRIES}), retrying...`,
          );
          // 재시도 전 짧은 대기
          await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('크레딧 추가 실패: 최대 재시도 횟수 초과');
  }

  /**
   * 크레딧 차감 (VTO 사용 등) - Optimistic Locking
   */
  async deductCredit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description?: string,
  ) {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // 현재 크레딧 조회
          const credit = await tx.credit.findUnique({
            where: { userId },
          });

          if (!credit) {
            throw new Error('크레딧 레코드를 찾을 수 없습니다.');
          }

          if (credit.balance < amount) {
            throw new Error('크레딧이 부족합니다.');
          }

          const newBalance = credit.balance - amount;

          // Optimistic Locking으로 업데이트
          const updatedCredit = await tx.credit.updateMany({
            where: {
              userId,
              version: credit.version, // 버전 체크
            },
            data: {
              balance: newBalance,
              version: { increment: 1 },
            },
          });

          // 버전 충돌 감지
          if (updatedCredit.count === 0) {
            throw new Error('OPTIMISTIC_LOCK_ERROR');
          }

          // 크레딧 이력 생성 (음수로 기록)
          const history = await tx.creditHistory.create({
            data: {
              userId,
              type,
              amount: -amount,
              balanceBefore: credit.balance,
              balanceAfter: newBalance,
              description,
            },
          });

          this.logger.log(
            `Credit deducted: userId=${userId}, amount=-${amount}, balance=${credit.balance}->${newBalance}, attempt=${attempt + 1}`,
          );

          return { newBalance, history };
        });
      } catch (error) {
        if (error.message === 'OPTIMISTIC_LOCK_ERROR' && attempt < this.MAX_RETRIES - 1) {
          this.logger.warn(
            `Optimistic lock conflict on deductCredit (attempt ${attempt + 1}/${this.MAX_RETRIES}), retrying...`,
          );
          // 재시도 전 짧은 대기
          await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('크레딧 차감 실패: 최대 재시도 횟수 초과');
  }

  /**
   * 사용자의 크레딧 조회
   */
  async getCredit(userId: string) {
    const credit = await this.prisma.credit.findUnique({
      where: { userId },
      select: { balance: true },
    });

    if (!credit) {
      throw new Error('크레딧 레코드를 찾을 수 없습니다.');
    }

    return credit.balance;
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
  async grantSignupCredit(userId: string) {
    return this.addCredit(
      userId,
      100,
      CreditTransactionType.SIGNUP,
      '회원가입 축하 크레딧',
    );
  }

  /**
   * 옷 등록 시 크레딧 지급 (10 크레딧)
   */
  async grantClothingAddedCredit(userId: string) {
    return this.addCredit(
      userId,
      10,
      CreditTransactionType.CLOTHING_ADDED,
      '의류 등록 보상',
    );
  }

  /**
   * VTO 사용 시 크레딧 차감 (3 크레딧)
   */
  async deductVtoCredit(userId: string) {
    return this.deductCredit(
      userId,
      3,
      CreditTransactionType.VTO_USED,
      'VTO 서비스 사용',
    );
  }

  /**
   * 옷 펴기(Flatten) 사용 시 크레딧 차감 (1 크레딧)
   */
  async deductFlattenCredit(userId: string) {
    return this.deductCredit(
      userId,
      1,
      CreditTransactionType.FLATTEN_USED,
      '옷 펴기 서비스 사용',
    );
  }
}
