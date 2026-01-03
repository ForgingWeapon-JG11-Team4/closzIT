// src/recommendation/services/scoring.service.ts

import { Injectable } from '@nestjs/common';
import { ScoredClothing } from '../types/clothing.types';

@Injectable()
export class ScoringService {
  /**
   * 개인화 점수 적용
   */
  applyPersonalization(results: ScoredClothing[]): ScoredClothing[] {
    const today = new Date();

    const scored = results.map((item) => {
      let score = item.score;

      // 1. 착용 빈도 가중치 (+0 ~ +0.2)
      const wearWeight = Math.min(item.wear_count / 20, 1.0) * 0.2;
      score += wearWeight;

      // 2. 최근 착용 페널티 (-0.3 ~ 0)
      if (item.last_worn) {
        const lastWornDate = new Date(item.last_worn);
        const daysSince = this.getDaysBetween(lastWornDate, today);

        if (daysSince < 3) {
          score -= 0.3; // 3일 이내 착용 → 큰 감점
        } else if (daysSince < 7) {
          score -= 0.1; // 7일 이내 착용 → 작은 감점
        }
      }

      // 3. 추천 수락률 가중치 (+0 ~ +0.3)
      const totalFeedback = item.accept_count + item.reject_count;
      if (totalFeedback > 0) {
        const acceptRate = item.accept_count / totalFeedback;
        score += acceptRate * 0.3;
      }

      // 4. 사용자 평점 가중치 (임시 5점 고정 = +0.2)
      // TODO: user_rating 활성화 시 아래 코드로 교체
      // if (item.user_rating) {
      //   score += (item.user_rating / 5.0) * 0.2;
      // }
      const DEFAULT_RATING = 5.0;
      score += (DEFAULT_RATING / 5.0) * 0.2;

      return { ...item, score };
    });

    // 점수 기준 내림차순 정렬
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * 조합 스코어링 (나중에 구현)
   * 1만 개 조합 → 색상 조화, 스타일 일관성 점수 → 상위 100개
   */
  scoreOutfitCombinations(
    outer: ScoredClothing[],
    top: ScoredClothing[],
    bottom: ScoredClothing[],
    shoes: ScoredClothing[]
  ): any[] {
    // TODO: 조합 스코어링 로직 구현
    // - 색상 조화 점수
    // - 스타일 일관성 점수
    // - TPO 적합성 점수
    return [];
  }

  /**
   * 두 날짜 사이 일수 계산
   */
  private getDaysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}