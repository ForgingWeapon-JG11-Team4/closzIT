// src/recommendation/tools/similar-items.tool.ts

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { RagSearchService } from '../services/rag-search.service';
import { Category, TPO } from '@prisma/client';

/**
 * 유사 아이템 검색 도구
 * 스타일 특징을 기반으로 유사한 옷을 검색
 */
export function createSimilarItemsTool(ragSearchService: RagSearchService, userId: string) {
  return new DynamicStructuredTool({
    name: 'search_similar_items',
    description: `Search for similar clothing items based on category and style features using vector similarity. Finds items with similar colors, style moods, and TPO. Category must be one of: "Outer", "Top", "Bottom", "Shoes".`,
    schema: z.object({
      category: z.enum(['Outer', 'Top', 'Bottom', 'Shoes']).describe('Clothing category to search'),
      styleFeatures: z.object({
        colors: z.array(z.string()).optional().describe('Preferred colors'),
        styleMoods: z.array(z.string()).optional().describe('Style moods'),
        tpo: z.string().describe('TPO (Daily, Business, Date, Party, etc.)'),
      }).describe('Style features to match'),
    }),
    func: async ({ category, styleFeatures }) => {
      try {
        // RAG 검색 컨텍스트 생성
        const searchContext = {
          tpo: styleFeatures.tpo as TPO,
          weather: null,
          date: new Date(),
        };

        // 카테고리별 검색
        const results = await ragSearchService.search(userId, searchContext);

        // 해당 카테고리 결과만 추출
        const categoryKey = category.toLowerCase() as keyof typeof results;
        const items = results[categoryKey] || [];

        // 스타일 특징에 맞는 아이템 필터링 (색상, 스타일 무드)
        let filteredItems = items;

        if (styleFeatures.colors && styleFeatures.colors.length > 0) {
          filteredItems = filteredItems.filter(item =>
            item.colors.some(color => styleFeatures.colors!.includes(color))
          );
        }

        if (styleFeatures.styleMoods && styleFeatures.styleMoods.length > 0) {
          filteredItems = filteredItems.filter(item =>
            item.style_mood.some(mood => styleFeatures.styleMoods!.includes(mood))
          );
        }

        // 필터링 결과가 없으면 원본 결과 사용
        const finalItems = filteredItems.length > 0 ? filteredItems : items;

        return JSON.stringify({
          success: true,
          category,
          items: finalItems.slice(0, 5).map(item => ({
            id: item.id,
            category: item.category,
            subCategory: item.sub_category,
            colors: item.colors,
            styleMood: item.style_mood,
            score: item.score,
            wearCount: item.wear_count,
          })),
          totalFound: finalItems.length,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });
}
