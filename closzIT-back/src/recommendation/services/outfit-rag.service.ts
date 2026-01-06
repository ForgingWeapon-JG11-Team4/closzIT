import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConversationalRagService } from './conversational-rag.service';
import { OutfitLogService } from '../../outfit-log/outfit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Category } from '@prisma/client';

@Injectable()
export class OutfitRagService {
  private readonly logger = new Logger(OutfitRagService.name);

  constructor(
    private conversationalRag: ConversationalRagService,
    private outfitLogService: OutfitLogService,
    private prisma: PrismaService,
  ) {}

  /**
   * 자연어 기반 코디 추천 메인 함수
   */
  async recommendFromNaturalLanguage(userId: string, userQuery: string) {
    this.logger.log(`Processing conversational recommendation for user ${userId}: "${userQuery}"`);

    // 1. 자연어 쿼리 파싱
    const parsedQuery = await this.conversationalRag.parseNaturalLanguageQuery(userQuery);
    this.logger.log(`Parsed query: ${JSON.stringify(parsedQuery)}`);

    // 2. 참조 코디 찾기
    const referenceOutfit = await this.outfitLogService.findRecentByLocation(
      userId,
      parsedQuery.locationKeyword,
    );

    if (!referenceOutfit) {
      throw new NotFoundException(
        `"${parsedQuery.locationKeyword}"와 관련된 과거 코디를 찾을 수 없습니다.`,
      );
    }

    this.logger.log(`Found reference outfit: ${referenceOutfit.id} worn on ${referenceOutfit.wornDate}`);

    // 3. 유지할 아이템 설정
    const fixedItems: any = {};
    for (const category of parsedQuery.keepCategories) {
      const categoryMap = {
        outer: referenceOutfit.outer,
        top: referenceOutfit.top,
        bottom: referenceOutfit.bottom,
        shoes: referenceOutfit.shoes,
      };
      fixedItems[category] = categoryMap[category];
    }

    this.logger.log(`Fixed items: ${JSON.stringify(Object.keys(fixedItems))}`);

    // 4. 새로 추천할 아이템 검색
    const recommendations: any = {};
    for (const category of parsedQuery.replaceCategories) {
      const categoryEnum = this.getCategoryEnum(category);
      const items = await this.searchSimilarItems(userId, categoryEnum);
      recommendations[category] = items;
    }

    this.logger.log(`Recommendations generated for: ${parsedQuery.replaceCategories.join(', ')}`);

    return {
      success: true,
      parsedQuery,
      referenceOutfit: {
        id: referenceOutfit.id,
        wornDate: referenceOutfit.wornDate,
        location: referenceOutfit.location,
        tpo: referenceOutfit.tpo,
        outer: referenceOutfit.outer,
        top: referenceOutfit.top,
        bottom: referenceOutfit.bottom,
        shoes: referenceOutfit.shoes,
      },
      fixedItems,
      recommendations,
    };
  }

  /**
   * 카테고리별로 유사한 아이템 검색
   * (간단한 버전: 사용자의 해당 카테고리 옷 중 평점이 높은 순으로 반환)
   */
  private async searchSimilarItems(userId: string, category: Category, limit: number = 5) {
    return this.prisma.clothing.findMany({
      where: {
        userId,
        category,
      },
      orderBy: [
        { userRating: 'desc' },
        { wearCount: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * 카테고리 문자열을 Prisma Enum으로 변환
   */
  private getCategoryEnum(category: string): Category {
    const categoryMap = {
      outer: Category.Outer,
      top: Category.Top,
      bottom: Category.Bottom,
      shoes: Category.Shoes,
    };
    return categoryMap[category.toLowerCase()] || Category.Other;
  }
}
