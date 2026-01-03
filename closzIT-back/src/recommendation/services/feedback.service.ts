// src/recommendation/services/feedback.service.ts

import { Injectable } from '@nestjs/common';
import { VectorDBService } from './vector-db.service';

export type FeedbackType = 'accept' | 'reject' | 'worn';

@Injectable()
export class FeedbackService {
  constructor(private readonly vectorDBService: VectorDBService) {}

  /**
   * 사용자 피드백 기록
   */
  async recordFeedback(
    itemIds: string[],
    feedbackType: FeedbackType
  ): Promise<void> {
    for (const itemId of itemIds) {
      switch (feedbackType) {
        case 'accept':
          await this.vectorDBService.incrementAcceptCount(itemId);
          break;

        case 'reject':
          await this.vectorDBService.incrementRejectCount(itemId);
          break;

        case 'worn':
          await this.vectorDBService.incrementWearCount(itemId);
          break;
      }
    }
  }

  /**
   * 코디 전체에 피드백 기록 (outfit = 여러 아이템)
   */
  async recordOutfitFeedback(
    outfitItemIds: {
      outer?: string;
      top: string;
      bottom: string;
      shoes: string;
    },
    feedbackType: FeedbackType
  ): Promise<void> {
    const itemIds = Object.values(outfitItemIds).filter(Boolean) as string[];
    await this.recordFeedback(itemIds, feedbackType);
  }
}