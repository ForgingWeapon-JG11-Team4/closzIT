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
}

export interface UserPreference {
  preferred_styles: string[];
}

export interface ScoredClothing {
  id: string;
  score: number;
  //   image_url: string;
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