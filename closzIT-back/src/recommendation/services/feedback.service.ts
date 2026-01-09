// src/recommendation/services/feedback.service.ts

import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VectorDBService } from './vector-db.service';
import { FeedbackType } from '@prisma/client';
import * as crypto from 'crypto';

interface OutfitItems {
  outer?: string;
  top: string;
  bottom: string;
  shoes: string;
}

export interface FeedbackResult {
  success: boolean;
  duplicate: boolean;
  feedbackId?: string;
  message?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorDBService: VectorDBService,
  ) {}

  /**
   * 코디 조합을 해시로 변환
   */
  private hashOutfit(itemIds: string[]): string {
    const sorted = [...itemIds].sort().join(':');
    return crypto
      .createHash('sha256')
      .update(sorted)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * 코디 피드백 기록 (멱등성 + 중복 방지)
   */
  async recordOutfitFeedback(
    userId: string,
    outfitItemIds: OutfitItems,
    feedbackType: FeedbackType,
    idempotencyKey?: string,
  ): Promise<FeedbackResult> {
    const itemIds = Object.values(outfitItemIds).filter(Boolean) as string[];
    const outfitHash = this.hashOutfit(itemIds);

    this.logger.log(`[피드백 요청] userId: ${userId}, type: ${feedbackType}, items: ${itemIds.length}개, hash: ${outfitHash}`);

    // 1. 멱등키로 기존 요청 확인 (네트워크 재시도 방지)
    if (idempotencyKey) {
      const existingByKey = await this.prisma.outfitFeedback.findUnique({
        where: { idempotencyKey },
      });

      if (existingByKey) {
        // 같은 멱등키인데 다른 요청이면 에러
        if (
          existingByKey.userId !== userId ||
          existingByKey.outfitHash !== outfitHash
        ) {
          this.logger.warn(`[멱등키 불일치] key: ${idempotencyKey}, userId: ${userId}`);
          throw new UnprocessableEntityException({
            code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
            message: '동일한 멱등키로 다른 요청을 보낼 수 없습니다.',
          });
        }
        // 같은 요청이면 기존 결과 반환
        this.logger.log(`[중복 요청 - 멱등키] userId: ${userId}, feedbackId: ${existingByKey.id}`);
        return {
          success: true,
          duplicate: true,
          feedbackId: existingByKey.id,
          message: '이미 처리된 요청입니다.',
        };
      }
    }

    // 2. 같은 코디에 이미 피드백했는지 확인
    const existingFeedback = await this.prisma.outfitFeedback.findUnique({
      where: {
        userId_outfitHash: { userId, outfitHash },
      },
    });

    if (existingFeedback) {
      // 같은 피드백이면 중복으로 처리
      if (existingFeedback.feedbackType === feedbackType) {
        this.logger.log(`[중복 피드백] userId: ${userId}, type: ${feedbackType}, feedbackId: ${existingFeedback.id}`);
        return {
          success: true,
          duplicate: true,
          feedbackId: existingFeedback.id,
          message: '이미 동일한 피드백을 하셨습니다.',
        };
      }

      // 다른 피드백이면 업데이트
      this.logger.log(`[피드백 변경] userId: ${userId}, ${existingFeedback.feedbackType} → ${feedbackType}`);
      return this.updateFeedback(
        existingFeedback,
        feedbackType,
        itemIds,
        idempotencyKey,
      );
    }

    // 3. 새 피드백 생성
    try {
      const feedback = await this.prisma.outfitFeedback.create({
        data: {
          userId,
          outfitHash,
          feedbackType,
          idempotencyKey,
        },
      });

      // 벡터 DB 업데이트
      await this.incrementCounts(itemIds, feedbackType);

      this.logger.log(`[피드백 생성 완료] userId: ${userId}, type: ${feedbackType}, feedbackId: ${feedback.id}`);

      return {
        success: true,
        duplicate: false,
        feedbackId: feedback.id,
      };
    } catch (error) {
      // 동시 요청으로 인한 unique 제약 위반
      if (error.code === 'P2002') {
        this.logger.warn(`[동시 요청 충돌] userId: ${userId}, hash: ${outfitHash}`);
        return {
          success: true,
          duplicate: true,
          message: '이미 처리된 요청입니다.',
        };
      }
      this.logger.error(`[피드백 생성 실패] userId: ${userId}, error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 피드백 변경 (ACCEPT → REJECT 등)
   */
  private async updateFeedback(
    existing: { id: string; feedbackType: FeedbackType },
    newType: FeedbackType,
    itemIds: string[],
    idempotencyKey?: string,
  ): Promise<FeedbackResult> {
    const oldType = existing.feedbackType;

    // 트랜잭션으로 업데이트 + 버전 체크
    const updated = await this.prisma.outfitFeedback.updateMany({
      where: {
        id: existing.id,
        feedbackType: oldType,  // 현재 상태가 예상과 같을 때만 업데이트
      },
      data: {
        feedbackType: newType,
        idempotencyKey,
      },
    });

    // 이미 다른 요청이 변경했으면 스킵
    if (updated.count === 0) {
      this.logger.log(`[피드백 변경 스킵] 이미 변경됨, feedbackId: ${existing.id}`);
      return {
        success: true,
        duplicate: true,
        feedbackId: existing.id,
        message: '이미 처리된 요청입니다.',
      };
    }

    // 카운트 조정 (한 번만 실행됨)
    await this.decrementCounts(itemIds, oldType);
    await this.incrementCounts(itemIds, newType);

    this.logger.log(`[피드백 변경 완료] feedbackId: ${existing.id}, ${oldType} → ${newType}`);

    return {
      success: true,
      duplicate: false,
      feedbackId: existing.id,
      message: `피드백이 ${oldType}에서 ${newType}으로 변경되었습니다.`,
    };
  }

  /**
   * 피드백 취소
   */
  async cancelFeedback(
    userId: string,
    outfitItemIds: OutfitItems,
  ): Promise<{ success: boolean; message: string }> {
    const itemIds = Object.values(outfitItemIds).filter(Boolean) as string[];
    const outfitHash = this.hashOutfit(itemIds);

    this.logger.log(`[피드백 취소 요청] userId: ${userId}, hash: ${outfitHash}`);

    const existing = await this.prisma.outfitFeedback.findUnique({
      where: {
        userId_outfitHash: { userId, outfitHash },
      },
    });

    if (!existing) {
      this.logger.warn(`[피드백 취소 실패] userId: ${userId}, 취소할 피드백 없음`);
      return { success: false, message: '취소할 피드백이 없습니다.' };
    }

    await this.prisma.outfitFeedback.delete({
      where: { id: existing.id },
    });

    await this.decrementCounts(itemIds, existing.feedbackType);

    this.logger.log(`[피드백 취소 완료] userId: ${userId}, type: ${existing.feedbackType}, feedbackId: ${existing.id}`);

    return { success: true, message: '피드백이 취소되었습니다.' };
  }

  /**
   * 사용자의 피드백 이력 조회
   */
  async getUserFeedbacks(userId: string, limit = 20) {
    return this.prisma.outfitFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async incrementCounts(itemIds: string[], type: FeedbackType) {
    this.logger.debug(`[카운트 증가] type: ${type}, items: ${itemIds.join(', ')}`);
    for (const itemId of itemIds) {
      switch (type) {
        case 'ACCEPT':
          await this.vectorDBService.incrementAcceptCount(itemId);
          break;
        case 'REJECT':
          await this.vectorDBService.incrementRejectCount(itemId);
          break;
        case 'WORN':
          await this.vectorDBService.incrementWearCount(itemId);
          break;
      }
    }
  }

  private async decrementCounts(itemIds: string[], type: FeedbackType) {
    this.logger.debug(`[카운트 감소] type: ${type}, items: ${itemIds.join(', ')}`);
    for (const itemId of itemIds) {
      switch (type) {
        case 'ACCEPT':
          await this.vectorDBService.decrementAcceptCount(itemId);
          break;
        case 'REJECT':
          await this.vectorDBService.decrementRejectCount(itemId);
          break;
        case 'WORN':
          await this.vectorDBService.decrementWearCount(itemId);
          break;
      }
    }
  }
}
