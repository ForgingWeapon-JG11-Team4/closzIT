// src/recommendation/dto/search-response.dto.ts

import {
  SearchContext,
  CategorySearchResults,
  ScoredOutfit,
} from '../types/clothing.types';

export class SearchResponseDto {
  success: boolean;
  context: SearchContext;

  /** 상위 5개 추천 조합 */
  outfits: ScoredOutfit[];

  /** 카테고리별 후보 (사용자 커스텀용) */
  candidates: CategorySearchResults;
}