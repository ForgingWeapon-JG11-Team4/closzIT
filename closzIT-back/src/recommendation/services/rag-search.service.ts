// src/recommendation/services/rag-search.service.ts

import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorDBService } from './vector-db.service';
import { ScoringService } from './scoring.service';
import { UserService } from '../../user/user.service';
import {
  SearchContext,
  UserPreference,
  CategorySearchResults,
  Season,
  Category,
  ScoredOutfit,
  SearchMeta,
  TPO,
} from '../types/clothing.types';

export interface OutfitSearchResults {
  candidates: CategorySearchResults;
  outfits: ScoredOutfit[];
  meta: SearchMeta;
}

@Injectable()
export class RagSearchService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorDBService: VectorDBService,
    private readonly scoringService: ScoringService,
    private readonly userService: UserService,
  ) {}

  async search(
    userId: string,
    context: SearchContext,
  ): Promise<OutfitSearchResults> {
    const preference = await this.userService.getPreference(userId);

    const queryText = this.buildQueryText(context, preference);
    console.log('[RAG] Query text:', queryText);

    const queryEmbedding = await this.embeddingService.getTextEmbedding(queryText);

    const season = this.getSeasonFromTemp(context.weather?.temp ?? null);

    // 스타일 매핑 (한글 → 영문)
    const styleMood = context.style ? this.mapStyleKeyword(context.style) : null;

    const categories: Category[] = ['Outer', 'Top', 'Bottom', 'Shoes'];
    const candidates: CategorySearchResults = {
      outer: [],
      top: [],
      bottom: [],
      shoes: [],
    };

    for (const category of categories) {
      const searchResults = await this.vectorDBService.searchSimilar(
        userId,
        queryEmbedding,
        {
          category,
          tpo: context.tpo,
          season,
          styleMood: styleMood || undefined,
          limit: 15,
        },
      );

      const personalizedResults = this.scoringService.applyPersonalization(searchResults);

      const key = category.toLowerCase() as keyof CategorySearchResults;
      candidates[key] = personalizedResults.slice(0, 10);
    }

    const outfits = this.scoringService.scoreOutfitCombinations(
      candidates.outer,
      candidates.top,
      candidates.bottom,
      candidates.shoes,
      5,
    );

    // 메타 정보 구성
    const meta: SearchMeta = {
      totalCandidates: {
        outer: candidates.outer.length,
        top: candidates.top.length,
        bottom: candidates.bottom.length,
        shoes: candidates.shoes.length,
      },
      appliedFilters: {
        tpo: context.tpo,
        season,
        style: context.style || null,  // 적용된 스타일 추가
      },
    };

    console.log('[RAG] Generated outfits:', outfits.length);

    return {
      candidates,
      outfits,
      meta,
    };
  }

  private buildQueryText(
    context: SearchContext,
    preference: UserPreference,
  ): string {
    const parts: string[] = [];

    // 1. 사용자 자연어 쿼리 (있으면 추가)
    if (context.query) {
      parts.push(context.query);
    }

    // 2. 사용자가 선택한 스타일 (있으면 추가)
    if (context.style) {
      parts.push(context.style);
    }

    // 3. TPO (항상 추가 - 필터링에도 사용되지만 임베딩 유사도에도 반영)
    parts.push(context.tpo);

    // 4. 계절 (항상 추가)
    const season = this.getSeasonFromTemp(context.weather?.temp ?? null);
    parts.push(season);

    // 5. 비 올 확률
    if (context.weather && context.weather.rain_probability > 50) {
      parts.push('비');
    }

    // 6. 사용자 선호 스타일 (스타일 선택이 없을 때만)
    if (!context.style && preference.preferred_styles?.length > 0) {
      parts.push(...preference.preferred_styles);
    }

    return parts.join(' ');
  }

  // 스타일 한글 → 영문 매핑
  private mapStyleKeyword(style: string): string | null {
    const mapping: Record<string, string> = {
      '캐주얼': 'Casual',
      '힙': 'Street',
      '모던': 'Minimal',
      '스트릿': 'Street',
      '빈티지': 'Vintage',
      '미니멀': 'Minimal',
      '클래식': 'Formal',
      '스포티': 'Sporty',
      '고프코어': 'Gorpcore',
    };
    return mapping[style] || null;
  }

  private getSeasonFromTemp(temp: number | null): Season {
    if (temp === null) return 'Spring';

    if (temp < 5) return 'Winter';
    if (temp < 15) return 'Autumn';
    if (temp < 23) return 'Spring';
    return 'Summer';
  }
}