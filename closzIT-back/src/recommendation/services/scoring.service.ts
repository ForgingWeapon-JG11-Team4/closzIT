// src/recommendation/services/scoring.service.ts

import { Injectable } from '@nestjs/common';
import { Color, StyleMood } from '@prisma/client';
import { ScoredClothing, ScoredOutfit } from '../types/clothing.types';

// 색상 조화 규칙 (Prisma Color enum 기준)
const COLOR_HARMONY_RULES: Record<Color, Color[]> = {
  Black: ['White', 'Gray', 'Beige', 'Navy', 'Khaki', 'Brown', 'Black'],
  White: ['Black', 'Navy', 'Beige', 'Gray', 'Blue', 'Brown', 'White'],
  Gray: ['Black', 'White', 'Navy', 'Blue', 'Pink', 'Purple', 'Gray'],
  Beige: ['Black', 'White', 'Navy', 'Brown', 'Khaki', 'Green', 'Beige'],
  Brown: ['Beige', 'White', 'Navy', 'Khaki', 'Green', 'Brown'],
  Navy: ['White', 'Beige', 'Gray', 'Khaki', 'Brown', 'Navy'],
  Blue: ['White', 'Gray', 'Beige', 'Navy', 'Blue'],
  SkyBlue: ['White', 'Gray', 'Navy', 'Beige', 'SkyBlue'],
  Red: ['Black', 'White', 'Navy', 'Gray', 'Red'],
  Pink: ['Gray', 'White', 'Navy', 'Black', 'Beige', 'Pink'],
  Orange: ['White', 'Navy', 'Beige', 'Brown', 'Orange'],
  Yellow: ['Gray', 'Navy', 'White', 'Black', 'Yellow'],
  Green: ['White', 'Beige', 'Brown', 'Navy', 'Khaki', 'Green'],
  Mint: ['White', 'Gray', 'Navy', 'Beige', 'Mint'],
  Purple: ['Gray', 'White', 'Black', 'Navy', 'Purple'],
  Khaki: ['Black', 'White', 'Beige', 'Brown', 'Navy', 'Khaki'],
  Silver: ['Black', 'White', 'Gray', 'Navy', 'Silver'],
  Gold: ['Black', 'White', 'Navy', 'Brown', 'Beige', 'Gold'],
  Other: ['Black', 'White', 'Gray', 'Beige', 'Navy'],
};

// 스타일 호환성 규칙 (Prisma StyleMood enum 기준)
const STYLE_COMPATIBILITY: Record<StyleMood, StyleMood[]> = {
  Casual: ['Casual', 'Street', 'Sporty', 'Minimal'],
  Street: ['Street', 'Casual', 'Sporty', 'Gorpcore'],
  Minimal: ['Minimal', 'Formal', 'Casual'],
  Formal: ['Formal', 'Minimal'],
  Sporty: ['Sporty', 'Casual', 'Street', 'Gorpcore'],
  Vintage: ['Vintage', 'Casual', 'Street'],
  Gorpcore: ['Gorpcore', 'Street', 'Sporty', 'Casual'],
  Other: ['Casual', 'Minimal', 'Other'],
};

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
          score -= 0.3;
        } else if (daysSince < 7) {
          score -= 0.1;
        }
      }

      // 3. 추천 수락률 가중치 (+0 ~ +0.3)
      const totalFeedback = item.accept_count + item.reject_count;
      if (totalFeedback > 0) {
        const acceptRate = item.accept_count / totalFeedback;
        score += acceptRate * 0.3;
      }

      // 4. 사용자 평점 가중치
      const DEFAULT_RATING = 5.0;
      score += (DEFAULT_RATING / 5.0) * 0.2;

      return { ...item, score };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * 조합 스코어링 (혼합 전략)
   * 상위 N개 다양한 코디 조합 반환
   */
  scoreOutfitCombinations(
    outer: ScoredClothing[],
    top: ScoredClothing[],
    bottom: ScoredClothing[],
    shoes: ScoredClothing[],
    targetCount: number = 5
  ): ScoredOutfit[] {
    // 1단계: 순위 기반 조합 생성 (상위 5개씩, 최대 625개)
    const combinations = this.generateRankBasedCombinations(outer, top, bottom, shoes);

    // 2단계: 각 조합에 색상 조화 + 스타일 일관성 점수 부여
    const scoredCombinations = combinations.map((combo) => {
      const colorHarmony = this.calculateColorHarmony(combo);
      const styleConsistency = this.calculateStyleConsistency(combo);

      // 최종 점수 = 아이템점수(40%) + 순위점수(20%) + 색상조화(20%) + 스타일일관성(20%)
      const finalScore =
        combo.scores.itemScore * 0.4 +
        combo.scores.rankScore * 0.2 +
        colorHarmony * 0.2 +
        styleConsistency * 0.2;

      return {
        ...combo,
        scores: {
          ...combo.scores,
          colorHarmony,
          styleConsistency,
        },
        finalScore,
        displayScore: finalScore,  // 원본 점수 저장
      };
    });

    // 3단계: 다양성 보장하며 상위 N개 선택
    return this.selectDiverseCombinations(scoredCombinations, targetCount);
  }

  /**
   * 순위 기반 조합 생성
   */
  private generateRankBasedCombinations(
    outer: ScoredClothing[],
    top: ScoredClothing[],
    bottom: ScoredClothing[],
    shoes: ScoredClothing[]
  ): ScoredOutfit[] {
    const results: ScoredOutfit[] = [];
    const poolSize = 5;

    const outerPool = outer.slice(0, poolSize);
    const topPool = top.slice(0, poolSize);
    const bottomPool = bottom.slice(0, poolSize);
    const shoesPool = shoes.slice(0, poolSize);

    // 필수 카테고리 체크
    if (topPool.length === 0 || bottomPool.length === 0 || shoesPool.length === 0) {
      console.warn('[Scoring] 필수 카테고리(Top/Bottom/Shoes) 후보 부족');
      return [];
    }

    const outerIterations = outerPool.length > 0 ? outerPool.length : 1;

    for (let o = 0; o < outerIterations; o++) {
      for (let t = 0; t < topPool.length; t++) {
        for (let b = 0; b < bottomPool.length; b++) {
          for (let s = 0; s < shoesPool.length; s++) {
            const currentOuter = outerPool.length > 0 ? outerPool[o] : null;

            const rankSum = (currentOuter ? o : 0) + t + b + s;
            const maxRank = poolSize * 4;

            const itemScoreSum =
              (currentOuter?.score || 0) +
              topPool[t].score +
              bottomPool[b].score +
              shoesPool[s].score;
            const itemCount = currentOuter ? 4 : 3;
            const normalizedItemScore = itemScoreSum / itemCount;

            const rankScore = (maxRank - rankSum) / maxRank;

            results.push({
              outer: currentOuter,
              top: topPool[t],
              bottom: bottomPool[b],
              shoes: shoesPool[s],
              scores: {
                itemScore: normalizedItemScore,
                rankScore,
                colorHarmony: 0,
                styleConsistency: 0,
              },
              finalScore: 0,
              displayScore: 0,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * 색상 조화 점수 계산 (0~1)
   */
  private calculateColorHarmony(outfit: ScoredOutfit): number {
    const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes].filter(
      Boolean
    ) as ScoredClothing[];

    if (items.length < 2) return 1.0;

    let harmonyScore = 0;
    let comparisons = 0;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const colors1 = items[i].colors || [];
        const colors2 = items[j].colors || [];

        const pairScore = this.getColorPairScore(colors1, colors2);
        harmonyScore += pairScore;
        comparisons++;
      }
    }

    return comparisons > 0 ? harmonyScore / comparisons : 0.5;
  }

  /**
   * 두 아이템의 색상 조화 점수
   */
  private getColorPairScore(colors1: Color[], colors2: Color[]): number {
    if (colors1.length === 0 || colors2.length === 0) return 0.5;

    let maxScore = 0;

    for (const c1 of colors1) {
      for (const c2 of colors2) {
        // 동일 색상
        if (c1 === c2) {
          maxScore = Math.max(maxScore, 0.8);
          continue;
        }

        // 조화 규칙 확인
        const harmonyList = COLOR_HARMONY_RULES[c1] || [];
        if (harmonyList.includes(c2)) {
          maxScore = Math.max(maxScore, 1.0);
        } else {
          maxScore = Math.max(maxScore, 0.4);
        }
      }
    }

    return maxScore;
  }

  /**
   * 스타일 일관성 점수 계산 (0~1)
   */
  private calculateStyleConsistency(outfit: ScoredOutfit): number {
    const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes].filter(
      Boolean
    ) as ScoredClothing[];

    if (items.length < 2) return 1.0;

    // 모든 스타일 수집
    const allStyles: StyleMood[] = [];
    items.forEach((item) => {
      if (item.style_mood) {
        allStyles.push(...item.style_mood);
      }
    });

    if (allStyles.length === 0) return 0.5;

    // 스타일 빈도 계산
    const styleCount = new Map<StyleMood, number>();
    allStyles.forEach((style) => {
      styleCount.set(style, (styleCount.get(style) || 0) + 1);
    });

    // 가장 많이 등장한 스타일
    const dominantStyle = [...styleCount.entries()].sort((a, b) => b[1] - a[1])[0];

    if (!dominantStyle) return 0.5;

    // 각 아이템이 지배적 스타일과 호환되는지 확인
    let compatibilityScore = 0;
    const compatibleStyles = STYLE_COMPATIBILITY[dominantStyle[0]] || [dominantStyle[0]];

    items.forEach((item) => {
      const itemStyles = item.style_mood || [];
      const isCompatible = itemStyles.some((s) => compatibleStyles.includes(s));
      compatibilityScore += isCompatible ? 1 : 0.3;
    });

    return compatibilityScore / items.length;
  }

  /**
   * 다양성 보장하며 상위 N개 선택
   */
  private selectDiverseCombinations(
    combinations: ScoredOutfit[],
    targetCount: number
  ): ScoredOutfit[] {
    const sorted = [...combinations].sort((a, b) => b.finalScore - a.finalScore);

    const selected: ScoredOutfit[] = [];
    const itemAppearance = new Map<string, number>();
    const maxAppearance = 2;

    for (const combo of sorted) {
      if (selected.length >= targetCount) break;

      const itemIds = this.getItemIds(combo);

      const canInclude = itemIds.every(
        (id) => (itemAppearance.get(id) || 0) < maxAppearance
      );

      const diversityPenalty = itemIds.reduce((penalty, id) => {
        const count = itemAppearance.get(id) || 0;
        // 로그 스케일 적용: 중복 횟수가 늘어도 페널티 증가폭 감소
        // count=1 → 0.03, count=2 → 0.047, count=3 → 0.057, count=4 → 0.064
        return penalty + (count > 0 ? Math.log(count + 1) * 0.03 : 0);
      }, 0);

      // 페널티 상한선: 최대 15점(0.15)까지만
      const cappedPenalty = Math.min(diversityPenalty, 0.15);

      const adjustedScore = combo.finalScore - cappedPenalty;

      const minScoreThreshold =
        selected.length > 0 ? selected[0].finalScore * 0.6 : 0;

      if (canInclude && adjustedScore >= minScoreThreshold) {
        selected.push({
          ...combo,
          finalScore: adjustedScore,
          displayScore: combo.displayScore,  // 원본 점수 유지
        });

        itemIds.forEach((id) => {
          itemAppearance.set(id, (itemAppearance.get(id) || 0) + 1);
        });
      }
    }

    // 목표 개수 미달 시 제한 완화
    if (selected.length < targetCount) {
      for (const combo of sorted) {
        if (selected.length >= targetCount) break;

        const isAlreadySelected = selected.some(
          (s) =>
            s.top.id === combo.top.id &&
            s.bottom.id === combo.bottom.id &&
            s.shoes.id === combo.shoes.id &&
            s.outer?.id === combo.outer?.id
        );

        if (!isAlreadySelected) {
          selected.push(combo);
        }
      }
    }

    return selected;
  }

  /**
   * 조합에서 아이템 ID 추출
   */
  private getItemIds(combo: ScoredOutfit): string[] {
    return [combo.outer?.id, combo.top.id, combo.bottom.id, combo.shoes.id].filter(
      Boolean
    ) as string[];
  }

  /**
   * 두 날짜 사이 일수 계산
   */
  private getDaysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}