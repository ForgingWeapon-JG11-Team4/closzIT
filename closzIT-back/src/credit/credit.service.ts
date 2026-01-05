import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum CreditTransactionType {
  SIGNUP = 'SIGNUP',
  CLOTHING_ADDED = 'CLOTHING_ADDED',
  VTO_USED = 'VTO_USED',
  FLATTEN_USED = 'FLATTEN_USED',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  /**
   * 크레딧 추가 (회원가입, 옷 등록 등)
   */
  async addCredit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 사용자의 현재 크레딧 조회
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credit: true },
      });

      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const newBalance = user.credit + amount;

      // 사용자의 크레딧 업데이트
      await tx.user.update({
        where: { id: userId },
        data: { credit: newBalance },
      });

      // 크레딧 이력 생성
      const history = await tx.creditHistory.create({
        data: {
          userId,
          type,
          amount,
          balanceAfter: newBalance,
          description,
        },
      });

      return { newBalance, history };
    });
  }

  /**
   * 크레딧 차감 (VTO 사용 등)
   */
  async deductCredit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 사용자의 현재 크레딧 조회
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credit: true },
      });

      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      if (user.credit < amount) {
        throw new Error('크레딧이 부족합니다.');
      }

      const newBalance = user.credit - amount;

      // 사용자의 크레딧 업데이트
      await tx.user.update({
        where: { id: userId },
        data: { credit: newBalance },
      });

      // 크레딧 이력 생성 (음수로 기록)
      const history = await tx.creditHistory.create({
        data: {
          userId,
          type,
          amount: -amount,
          balanceAfter: newBalance,
          description,
        },
      });

      return { newBalance, history };
    });
  }

  /**
   * 사용자의 크레딧 조회
   */
  async getCredit(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credit: true },
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
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
