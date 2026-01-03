// src/recommendation/dto/search-response.dto.ts

import { SearchContext, CategorySearchResults } from '../types/clothing.types';

export class SearchResponseDto {
  success: boolean;
  context: SearchContext;
  results: CategorySearchResults;
}