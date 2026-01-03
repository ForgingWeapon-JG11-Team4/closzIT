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
} from '../types/clothing.types';

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
  ): Promise<CategorySearchResults> {
    const preference = await this.userService.getPreference(userId);

    const queryText = this.buildQueryText(context, preference);
    console.log('[RAG] Query text:', queryText);

    const queryEmbedding = await this.embeddingService.getTextEmbedding(queryText);

    const season = this.getSeasonFromTemp(context.weather?.temp ?? null);

    const categories: Category[] = ['Outer', 'Top', 'Bottom', 'Shoes'];
    const results: CategorySearchResults = {
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
      results[key] = personalizedResults.slice(0, 10);
    }

    return results;
  }

  private buildQueryText(
    context: SearchContext,
    preference: UserPreference,
  ): string {
    const parts: string[] = [];

    parts.push(context.tpo);

    const season = this.getSeasonFromTemp(context.weather?.temp ?? null);
    parts.push(season);

    // weather가 있을 때만 강수확률 체크
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