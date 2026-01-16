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

  async getItemsByUser(userId: string, category?: string) {
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    const items = await this.prisma.clothing.findMany({
      where,
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

    return itemsWithPresignedUrls;
  }

  async getItemsGroupedByCategory(userId: string) {
    const items = await this.getItemsByUser(userId);

    const grouped = {
      outerwear: items.filter(item => item.category === 'Outer'),
      tops: items.filter(item => item.category === 'Top'),
      bottoms: items.filter(item => item.category === 'Bottom'),
      shoes: items.filter(item => item.category === 'Shoes'),
    };

    return grouped;
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
