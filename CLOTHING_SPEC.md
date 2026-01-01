1. Category & Sub-Category: 반드시 단 하나의(Single String) 값만 선택해야 해.
2. Colors, Pattern, Detail, Style Mood: 해당하는 모든 값을 찾아 리스트(List/Array) 형태로 작성해.
3. 모든 값은 제공된 [허용 값 리스트] 내에서만 선택하고, 일치하는 게 없으면 'Other'를 포함해.

/**
 * 1. 기본 카테고리 정의 (Other 제외)
 */
export type Category = 'Outer' | 'Top' | 'Bottom' | 'Shoes';

/**
 * 2. 카테고리별 상세 서브 카테고리
 */
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

// 모든 서브 카테고리 유니온 타입
export type SubCategory = SubCategoryOuter | SubCategoryTop | SubCategoryBottom | SubCategoryShoes;

/**
 * 3. 공통 메타데이터 속성
 */
export type Color =
  | 'Black' | 'White' | 'Gray' | 'Beige' | 'Brown'
  | 'Navy' | 'Blue' | 'Sky-blue' | 'Red' | 'Pink'
  | 'Orange' | 'Yellow' | 'Green' | 'Mint' | 'Purple'
  | 'Khaki' | 'Silver' | 'Gold' | 'Other';

export type Pattern =
  | 'Solid' | 'Stripe' | 'Check' | 'Dot' | 'Floral'
  | 'Animal' | 'Graphic' | 'Camouflage' | 'Argyle' | 'Other';

export type Detail =
  | 'Logo' | 'Pocket' | 'Button' | 'Zipper' | 'Hood'
  | 'Embroidery' | 'Quilted' | 'Distressed' | 'Knit-rib' | 'Other';

export type StyleMood =
  | 'Casual' | 'Street' | 'Minimal' | 'Formal'
  | 'Sporty' | 'Vintage' | 'Gorpcore' | 'Other';

export type TPO = 
  | 'Date' | 'Daily' | 'Commute' | 'Sports' | 'Travel'
  | 'Wedding' | 'Party' | 'Home' | 'School' | 'Other';

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

/**
 * 4. 추천 및 검색 엔진 인터페이스
 */
export interface SearchContext {
  tpo: TPO;
  weather: {
    temp: number | null;
    condition: string;
    rain_probability: number;
  };
  date: Date;
}

export interface UserPreference {
  preferred_styles: StyleMood[];
}

/**
 * 5. 의상 데이터 구조 (라벨링 결과물)
 */
export interface ScoredClothing {
  id: string;
  score: number;
  image_url: string;
  category: Category;
  sub_category: SubCategory;
  colors: Color[];
  pattern: Pattern;
  details: Detail[];
  style_mood: StyleMood[];
  suitable_seasons: Season[];
  suitable_tpo: TPO[];
  
  // 사용자 인터랙션 데이터
  wear_count: number;
  last_worn: Date | null;
  accept_count: number;
  reject_count: number;
}

/**
 * 6. 카테고리별 검색 결과 구조
 */
export interface CategorySearchResults {
  outer: ScoredClothing[];
  top: ScoredClothing[];
  bottom: ScoredClothing[];
  shoes: ScoredClothing[];
}