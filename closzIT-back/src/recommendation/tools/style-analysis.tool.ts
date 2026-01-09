// src/recommendation/tools/style-analysis.tool.ts

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 스타일 분석 도구
 * 주어진 outfit의 색상, 스타일 무드, TPO 등을 분석
 */
export function createStyleAnalysisTool() {
  return new DynamicStructuredTool({
    name: 'analyze_outfit_style',
    description: `Analyze outfit style features including color combinations, style moods (casual/formal/street), and TPO. Use this tool to extract style characteristics that can be used to find similar items.`,
    schema: z.object({
      outfit: z.object({
        outer: z.object({
          colors: z.array(z.string()),
          styleMood: z.array(z.string()),
        }).optional().nullable(),
        top: z.object({
          colors: z.array(z.string()),
          styleMood: z.array(z.string()),
        }),
        bottom: z.object({
          colors: z.array(z.string()),
          styleMood: z.array(z.string()),
        }),
        shoes: z.object({
          colors: z.array(z.string()),
          styleMood: z.array(z.string()),
        }),
        tpo: z.string(),
      }).describe('Outfit information to analyze'),
    }),
    func: async ({ outfit }) => {
      try {
        // 모든 아이템의 색상 수집
        const allColors = new Set<string>();
        const allStyleMoods = new Set<string>();

        if (outfit.outer) {
          outfit.outer.colors.forEach(c => allColors.add(c));
          outfit.outer.styleMood.forEach(s => allStyleMoods.add(s));
        }
        outfit.top.colors.forEach(c => allColors.add(c));
        outfit.top.styleMood.forEach(s => allStyleMoods.add(s));
        outfit.bottom.colors.forEach(c => allColors.add(c));
        outfit.bottom.styleMood.forEach(s => allStyleMoods.add(s));
        outfit.shoes.colors.forEach(c => allColors.add(c));
        outfit.shoes.styleMood.forEach(s => allStyleMoods.add(s));

        // 주요 스타일 결정 (가장 많이 나타나는 스타일)
        const styleMoodCounts = Array.from(allStyleMoods).map(mood => ({
          mood,
          count: [outfit.outer, outfit.top, outfit.bottom, outfit.shoes]
            .filter(item => item)
            .filter(item => item && item.styleMood.includes(mood))
            .length,
        }));
        styleMoodCounts.sort((a, b) => b.count - a.count);
        const dominantStyle = styleMoodCounts[0]?.mood || 'Casual';

        return JSON.stringify({
          success: true,
          styleFeatures: {
            colors: Array.from(allColors),
            dominantStyle,
            allStyleMoods: Array.from(allStyleMoods),
            tpo: outfit.tpo,
            colorCount: allColors.size,
            isMonochrome: allColors.size <= 2,
          },
          recommendation: `이 코디는 ${dominantStyle} 스타일로, ${Array.from(allColors).join(', ')} 색상을 사용했습니다.`,
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
