// src/recommendation/tools/outfit-search.tool.ts

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { OutfitLogService } from '../../outfit-log/outfit-log.service';

/**
 * OutfitLog 검색 도구
 * 사용자의 과거 착용 기록을 장소 키워드로 검색
 */
export function createOutfitSearchTool(outfitLogService: OutfitLogService, userId: string) {
  return new DynamicStructuredTool({
    name: 'search_past_outfits',
    description: `Search user's past outfit records by location or event keyword. Use this tool when user asks about what they wore at a specific place or event.`,
    schema: z.object({
      locationKeyword: z.string().describe('Location or event keyword to search (e.g., "에버랜드", "데이트", "놀이동산")'),
    }),
    func: async ({ locationKeyword }) => {
      try {
        const outfit = await outfitLogService.findRecentByLocation(userId, locationKeyword);

        if (!outfit) {
          return JSON.stringify({
            success: false,
            message: `"${locationKeyword}"에 대한 과거 착용 기록을 찾을 수 없습니다.`,
          });
        }

        return JSON.stringify({
          success: true,
          outfit: {
            id: outfit.id,
            location: outfit.location,
            wornDate: outfit.wornDate,
            tpo: outfit.tpo,
            outer: outfit.outer ? {
              id: outfit.outer.id,
              category: outfit.outer.category,
              subCategory: outfit.outer.subCategory,
              colors: outfit.outer.colors,
              styleMood: outfit.outer.styleMoods,
            } : null,
            top: {
              id: outfit.top.id,
              category: outfit.top.category,
              subCategory: outfit.top.subCategory,
              colors: outfit.top.colors,
              styleMood: outfit.top.styleMoods,
            },
            bottom: {
              id: outfit.bottom.id,
              category: outfit.bottom.category,
              subCategory: outfit.bottom.subCategory,
              colors: outfit.bottom.colors,
              styleMood: outfit.bottom.styleMoods,
            },
            shoes: {
              id: outfit.shoes.id,
              category: outfit.shoes.category,
              subCategory: outfit.shoes.subCategory,
              colors: outfit.shoes.colors,
              styleMood: outfit.shoes.styleMoods,
            },
          },
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
