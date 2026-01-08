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

    parts.push(context.tpo);

    const season = this.getSeasonFromTemp(context.weather?.temp ?? null);
    parts.push(season);

    if (context.weather && context.weather.rain_probability > 50) {
      parts.push('비');
    }

    if (preference.preferred_styles?.length > 0) {
      parts.push(...preference.preferred_styles);
    }

    return parts.join(' ');
  }

  private getSeasonFromTemp(temp: number | null): Season {
    if (temp === null) return 'Spring';

    if (temp < 5) return 'Winter';
    if (temp < 15) return 'Autumn';
    if (temp < 23) return 'Spring';
    return 'Summer';
  }
}