import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

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
        wearCount: true,
        lastWorn: true,
        createdAt: true,
      },
    });

    return items.map(item => ({
      id: item.id,
      name: item.subCategory,
      image: item.imageUrl,
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
      wearCount: item.wearCount,
      lastWorn: item.lastWorn,
      createdAt: item.createdAt,
    }));
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
}
