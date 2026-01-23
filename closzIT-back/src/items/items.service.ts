import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

// DB 값 (하이픈 포함) → Prisma enum 이름 매핑
const ENUM_MAPPINGS: Record<string, string> = {
  // Color
  'Sky-blue': 'SkyBlue',
  // SubCategory
  'Hoodie-zipup': 'HoodieZipup',
  'Short-sleeve-T': 'ShortSleeveT',
  'Long-sleeve-T': 'LongSleeveT',
  'Polo-shirt': 'PoloShirt',
  'Cotton-pants': 'CottonPants',
  'Dress-shoes': 'DressShoes',
  // Detail
  'Knit-rib': 'KnitRib',
};

// 역방향 매핑 (Prisma enum 이름 → DB 값)
const REVERSE_ENUM_MAPPINGS: Record<string, string> = Object.fromEntries(
  Object.entries(ENUM_MAPPINGS).map(([db, prisma]) => [prisma, db])
);

// 단일 값 변환 (DB → Prisma)
const toPrismaEnum = (value: string): string => ENUM_MAPPINGS[value] || value;

// 단일 값 변환 (Prisma → DB)
const toDbEnum = (value: string): string => REVERSE_ENUM_MAPPINGS[value] || value;

// 배열 값 변환 (DB → Prisma)
const toPrismaEnumArray = (values: string[] | undefined): string[] | undefined =>
  values?.map(toPrismaEnum);

// 배열 값 변환 (Prisma → DB)
const toDbEnumArray = (values: string[] | undefined): string[] | undefined =>
  values?.map(toDbEnum);

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) { }

  async getItemsByUser(userId: string, category?: string, page: number = 1, limit: number = 20) {
    const where: any = { userId };
    const skip = (page - 1) * limit;

    if (category) {
      where.category = category;
    }

    // 전체 아이템 수 조회 (페이지네이션 메타데이터용)
    const totalCount = await this.prisma.clothing.count({ where });

    const items = await this.prisma.clothing.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      select: {
        id: true,
        imageUrl: true,
        flattenImageUrl: true,
        category: true,
        subCategory: true,
        colors: true,
        patterns: true,
        details: true,
        styleMoods: true,
        tpos: true,
        seasons: true,
        userRating: true,
        note: true,
        isPublic: true,
        wearCount: true,
        lastWorn: true,
        createdAt: true,
      },
    });

    // 모든 이미지 URL을 Pre-signed URL로 변환
    const itemsWithPresignedUrls = await Promise.all(
      items.map(async (item) => {
        const [imageUrl, flattenImageUrl] = await Promise.all([
          this.s3Service.convertToPresignedUrl(item.imageUrl),
          this.s3Service.convertToPresignedUrl(item.flattenImageUrl),
        ]);

        return {
          id: item.id,
          name: toDbEnum(item.subCategory),
          // 펼쳐진 이미지가 있으면 우선 사용, 없으면 원본 이미지
          image: flattenImageUrl || imageUrl,
          originalImage: imageUrl,
          flattenImage: flattenImageUrl,
          category: toDbEnum(item.category),
          subCategory: toDbEnum(item.subCategory),
          colors: toDbEnumArray(item.colors as string[]),
          patterns: toDbEnumArray(item.patterns as string[]),
          details: toDbEnumArray(item.details as string[]),
          styleMoods: toDbEnumArray(item.styleMoods as string[]),
          tpos: toDbEnumArray(item.tpos as string[]),
          seasons: toDbEnumArray(item.seasons as string[]),
          userRating: item.userRating,
          note: item.note,
          isPublic: item.isPublic,
          wearCount: item.wearCount,
          lastWorn: item.lastWorn,
          createdAt: item.createdAt,
        };
      })
    );

    return {
      items: itemsWithPresignedUrls,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getItemsGroupedByCategory(userId: string, page: number = 1, limit: number = 20) {
    // 카테고리별 그룹화는 페이지네이션을 적용하기 어려우므로 (각 카테고리별로 몇 개씩 가져올지 애매함)
    // 일단 전체를 가져와서 프론트에서 처리하거나, 각 카테고리별로 별도 호출이 필요함.
    // 하지만 현재 요구사항은 "초기 로딩 개선"이므로, 일단 최근 등록순으로 limit만큼 가져오고
    // 프론트엔드에서 카테고리별로 분류해서 보여주되, "더보기"가 필요할 수 있음을 인지해야 함.

    // 수정 제안: getItemsGroupedByCategory는 "모든 카테고리의 최근 항목"을 가져오는 용도로 사용하고,
    // 실제 전체 목록은 별도 API로 처리하는게 좋지만, 기존 로직 유지를 위해 다음과 같이 처리:
    // "최근 N개의 아이템을 가져와서 분류" -> 이 경우 특정 카테고리 아이템이 아예 없을 수도 있음.

    // 여기서는 getItemsByUser를 재사용하여 페이지네이션된 결과를 받아오고, 그것을 그룹화하여 반환.
    // 프론트엔드에서는 이 결과를 "누적"하여 보여줘야 함.

    // 1. 카테고리별 전체 개수 (통계용)
    const counts = await this.prisma.clothing.groupBy({
      by: ['category'],
      where: { userId },
      _count: { id: true },
    });

    const itemCounts = {
      outerwear: 0,
      tops: 0,
      bottoms: 0,
      shoes: 0,
    };

    counts.forEach(c => {
      const cat = toDbEnum(c.category);
      if (cat === 'Outer') itemCounts.outerwear = c._count.id;
      else if (cat === 'Top') itemCounts.tops = c._count.id;
      else if (cat === 'Bottom') itemCounts.bottoms = c._count.id;
      else if (cat === 'Shoes') itemCounts.shoes = c._count.id;
    });

    // 2. 페이지네이션된 최근 아이템 (MainPage display & FittingRoom initial load)
    const result = await this.getItemsByUser(userId, undefined, page, limit);
    const items = result.items;

    const grouped = {
      outerwear: items.filter(item => item.category === 'Outer'),
      tops: items.filter(item => item.category === 'Top'),
      bottoms: items.filter(item => item.category === 'Bottom'),
      shoes: items.filter(item => item.category === 'Shoes'),
    };

    return { ...grouped, meta: result.meta, stats: itemCounts };
  }

  async getPublicItemsGroupedByCategory(userId: string) {
    console.log('[getPublicItemsGroupedByCategory] 시작, userId:', userId);

    // 공개된 아이템만 가져오기
    const items = await this.prisma.clothing.findMany({
      where: {
        userId,
        isPublic: true, // 공개된 아이템만 필터링
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        imageUrl: true,
        flattenImageUrl: true,
        category: true,
        subCategory: true,
        colors: true,
        patterns: true,
        details: true,
        styleMoods: true,
        tpos: true,
        seasons: true,
        userRating: true,
        note: true,
        isPublic: true,
        wearCount: true,
        lastWorn: true,
        createdAt: true,
      },
    });

    console.log('[getPublicItemsGroupedByCategory] DB에서 가져온 공개 아이템 수:', items.length);
    console.log('[getPublicItemsGroupedByCategory] 아이템 카테고리 분포:', {
      categories: items.map(item => item.category),
      uniqueCategories: [...new Set(items.map(item => item.category))]
    });

    // 모든 이미지 URL을 Pre-signed URL로 변환
    const itemsWithPresignedUrls = await Promise.all(
      items.map(async (item) => {
        const [imageUrl, flattenImageUrl] = await Promise.all([
          this.s3Service.convertToPresignedUrl(item.imageUrl),
          this.s3Service.convertToPresignedUrl(item.flattenImageUrl),
        ]);

        return {
          id: item.id,
          name: toDbEnum(item.subCategory),
          image: flattenImageUrl || imageUrl,
          originalImage: imageUrl,
          flattenImage: flattenImageUrl,
          category: toDbEnum(item.category),
          subCategory: toDbEnum(item.subCategory),
          colors: toDbEnumArray(item.colors as string[]),
          patterns: toDbEnumArray(item.patterns as string[]),
          details: toDbEnumArray(item.details as string[]),
          styleMoods: toDbEnumArray(item.styleMoods as string[]),
          tpos: toDbEnumArray(item.tpos as string[]),
          seasons: toDbEnumArray(item.seasons as string[]),
          userRating: item.userRating,
          note: item.note,
          isPublic: item.isPublic,
          wearCount: item.wearCount,
          lastWorn: item.lastWorn,
          createdAt: item.createdAt,
        };
      })
    );

    // 카테고리별로 그룹화
    const grouped = {
      outerwear: itemsWithPresignedUrls.filter(item => item.category === 'Outer'),
      tops: itemsWithPresignedUrls.filter(item => item.category === 'Top'),
      bottoms: itemsWithPresignedUrls.filter(item => item.category === 'Bottom'),
      shoes: itemsWithPresignedUrls.filter(item => item.category === 'Shoes'),
    };

    console.log('[getPublicItemsGroupedByCategory] 그룹화 결과:', {
      outerwear: grouped.outerwear.length,
      tops: grouped.tops.length,
      bottoms: grouped.bottoms.length,
      shoes: grouped.shoes.length
    });

    return grouped;
  }

  async getItemById(userId: string, itemId: string) {
    // 해당 아이템이 사용자의 것인지 확인
    const item = await this.prisma.clothing.findFirst({
      where: { id: itemId, userId },
      select: {
        id: true,
        imageUrl: true,
        flattenImageUrl: true,
        category: true,
        subCategory: true,
        colors: true,
        patterns: true,
        details: true,
        styleMoods: true,
        tpos: true,
        seasons: true,
        userRating: true,
        note: true,
        isPublic: true,
        wearCount: true,
        lastWorn: true,
        createdAt: true,
      },
    });

    if (!item) {
      throw new Error('아이템을 찾을 수 없습니다.');
    }

    // 이미지 URL을 Pre-signed URL로 변환
    const [imageUrl, flattenImageUrl] = await Promise.all([
      this.s3Service.convertToPresignedUrl(item.imageUrl),
      this.s3Service.convertToPresignedUrl(item.flattenImageUrl),
    ]);

    return {
      id: item.id,
      name: toDbEnum(item.subCategory),
      image: flattenImageUrl || imageUrl,
      originalImage: imageUrl,
      flattenImage: flattenImageUrl,
      category: toDbEnum(item.category),
      subCategory: toDbEnum(item.subCategory),
      colors: toDbEnumArray(item.colors as string[]),
      patterns: toDbEnumArray(item.patterns as string[]),
      details: toDbEnumArray(item.details as string[]),
      styleMoods: toDbEnumArray(item.styleMoods as string[]),
      tpos: toDbEnumArray(item.tpos as string[]),
      seasons: toDbEnumArray(item.seasons as string[]),
      userRating: item.userRating,
      note: item.note,
      isPublic: item.isPublic,
      wearCount: item.wearCount,
      lastWorn: item.lastWorn,
      createdAt: item.createdAt,
    };
  }

  async updateItem(userId: string, itemId: string, data: {
    category?: any;
    subCategory?: string;
    colors?: string[];
    patterns?: string[];
    details?: string[];
    styleMoods?: string[];
    tpos?: string[];
    seasons?: string[];
    note?: string;
  }) {
    // 해당 아이템이 사용자의 것인지 확인
    const item = await this.prisma.clothing.findFirst({
      where: { id: itemId, userId }
    });

    if (!item) {
      throw new Error('아이템을 찾을 수 없습니다.');
    }

    return this.prisma.clothing.update({
      where: { id: itemId },
      data: {
        category: data.category ? toPrismaEnum(data.category) as any : undefined,
        subCategory: data.subCategory ? toPrismaEnum(data.subCategory) : undefined,
        colors: toPrismaEnumArray(data.colors) as any,
        patterns: toPrismaEnumArray(data.patterns) as any,
        details: toPrismaEnumArray(data.details) as any,
        styleMoods: toPrismaEnumArray(data.styleMoods) as any,
        tpos: toPrismaEnumArray(data.tpos) as any,
        seasons: toPrismaEnumArray(data.seasons) as any,
        note: data.note,
      },
    });
  }

  async updateItemVisibility(userId: string, itemId: string, isPublic: boolean) {
    // 해당 아이템이 사용자의 것인지 확인
    const item = await this.prisma.clothing.findFirst({
      where: { id: itemId, userId }
    });

    if (!item) {
      throw new Error('아이템을 찾을 수 없습니다.');
    }

    return this.prisma.clothing.update({
      where: { id: itemId },
      data: { isPublic },
    });
  }

  async deleteItem(userId: string, itemId: string) {
    // 해당 아이템이 사용자의 것인지 확인
    const item = await this.prisma.clothing.findFirst({
      where: { id: itemId, userId }
    });

    if (!item) {
      throw new Error('아이템을 찾을 수 없습니다.');
    }

    return this.prisma.clothing.delete({
      where: { id: itemId }
    });
  }
}
