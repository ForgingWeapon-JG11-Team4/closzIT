import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

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
          name: item.subCategory,
          // 펼쳐진 이미지가 있으면 우선 사용, 없으면 원본 이미지
          image: flattenImageUrl || imageUrl,
          originalImage: imageUrl,
          flattenImage: flattenImageUrl,
          category: item.category,
          subCategory: item.subCategory,
          colors: item.colors,
          patterns: item.patterns,
          details: item.details,
          styleMoods: item.styleMoods,
          tpos: item.tpos,
          seasons: item.seasons,
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

  async updateItem(userId: string, itemId: string, data: {
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
        colors: data.colors as any,
        patterns: data.patterns as any,
        details: data.details as any,
        styleMoods: data.styleMoods as any,
        tpos: data.tpos as any,
        seasons: data.seasons as any,
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
