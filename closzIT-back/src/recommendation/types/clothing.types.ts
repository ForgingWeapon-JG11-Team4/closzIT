// src/recommendation/types/clothing.types.ts

import {
  Category,
  Color,
  Pattern,
  Detail,
  StyleMood,
  TPO,
  Season,
} from '@prisma/client';

export {
  Category,
  Color,
  Pattern,
  Detail,
  StyleMood,
  TPO,
  Season,
};

export type SubCategoryOuter =
  | 'Cardigan' | 'Jacket' | 'Blazer' | 'Jumper' | 'Padding'
  | 'Coat' | 'Vest' | 'Hoodie-zipup' | 'Windbreaker' | 'Other';

export type SubCategoryTop =
  | 'Short-sleeve-T' | 'Long-sleeve-T' | 'Hoodie' | 'Sweatshirt'
  | 'Knit' | 'Shirt' | 'Sleeveless' | 'Polo-shirt' | 'Other';

export type SubCategoryBottom =
  | 'Denim' | 'Slacks' | 'Cotton-pants' | 'Sweatpants'
  | 'Shorts' | 'Skirt' | 'Leggings' | 'Other';

export type SubCategoryShoes =
  | 'Sneakers' | 'Loafers' | 'Dress-shoes' | 'Boots'
  | 'Sandals' | 'Slippers' | 'Other';

export interface SearchContext {
  tpo: TPO;
  weather: {
    temp: number | null;
    condition: string;
    rain_probability: number;
  } | null;
  date: Date;
  query?: string | null;
  style?: string | null;
}

export interface UserPreference {
  preferred_styles: string[];
}

export interface ScoredClothing {
  id: string;
  score: number;
  image_url: string;
  flatten_image_url: string | null;
  category: Category;
  sub_category: string;
  colors: Color[];
  style_mood: StyleMood[];
  wear_count: number;
  last_worn: Date | null;
  accept_count: number;
  reject_count: number;
}

export interface CategorySearchResults {
  outer: ScoredClothing[];
  top: ScoredClothing[];
  bottom: ScoredClothing[];
  shoes: ScoredClothing[];
}

// ===== 조합 스코어링 타입 =====

export interface OutfitScores {
  itemScore: number;        // 개별 아이템 점수 합 (정규화)
  rankScore: number;        // 순위 기반 점수
  colorHarmony: number;     // 색상 조화 점수
  styleConsistency: number; // 스타일 일관성 점수
}

export interface ScoredOutfit {
  outer: ScoredClothing | null;
  top: ScoredClothing;
  bottom: ScoredClothing;
  shoes: ScoredClothing;
  scores: OutfitScores;
  finalScore: number;       // 다양성 페널티 적용된 점수 (정렬용)
  displayScore: number;     // 다양성 페널티 미적용 점수 (프론트 표시용)
}

// ===== 검색 메타 정보 =====

export interface SearchMeta {
  totalCandidates: {
    outer: number;
    top: number;
    bottom: number;
    shoes: number;
  };
  appliedFilters: {
    tpo: TPO;
    season: Season;
    style?: string | null;
  };
}