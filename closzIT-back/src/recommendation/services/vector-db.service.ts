// src/recommendation/services/vector-db.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoredClothing } from '../types/clothing.types';
import { Clothing } from '@prisma/client';
import { S3Service } from '../../s3/s3.service';

@Injectable()
export class VectorDBService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) { }

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('pgvector extension enabled');
    } catch (error) {
      console.error('Failed to initialize pgvector:', error);
    }
  }

  async upsertClothing(
    clothingData: Partial<Clothing>,
    embedding: number[],
  ): Promise<Clothing> {
    const saved = await this.prisma.clothing.create({
      data: clothingData as any,
    });

    const vectorStr = `[${embedding.join(',')}]`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE clothes SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      saved.id,
    );

    return saved;
  }

  async updateEmbedding(clothingId: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE clothes SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      clothingId,
    );
  }

  async searchSimilar(
    userId: string,
    queryEmbedding: number[],
    options: {
      category?: string;
      tpo?: string;
      season?: string;
      styleMood?: string;
      limit?: number;
    } = {},
  ): Promise<ScoredClothing[]> {
    const { category, tpo, season, styleMood, limit = 10 } = options;
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    let query = `
      SELECT 
        id,
        image_url,
        flatten_image_url,
        category,
        sub_category,
        colors,
        style_mood,
        wear_count,
        last_worn,
        accept_count,
        reject_count,
        1 - (text_embedding <=> $1::vector) as score
      FROM clothes
      WHERE user_id = $2
        AND text_embedding IS NOT NULL
    `;

    const params: any[] = [vectorStr, userId];
    let paramIndex = 3;

    if (category) {
      query += ` AND category = $${paramIndex}::"Category"`;
      params.push(category);
      paramIndex++;
    }

    if (tpo) {
      query += ` AND $${paramIndex}::"TPO" = ANY(tpos)`;
      params.push(tpo);
      paramIndex++;
    }

    if (season) {
      query += ` AND $${paramIndex}::"Season" = ANY(seasons)`;
      params.push(season);
      paramIndex++;
    }

    if (styleMood) {
      query += ` AND style_mood = $${paramIndex}::"StyleMood"`;
      params.push(styleMood);
      paramIndex++;
    }

    query += ` ORDER BY text_embedding <=> $1::vector LIMIT $${paramIndex}`;
    params.push(limit);

    const results = await this.prisma.$queryRawUnsafe(query, ...params);

    // 이미지 URL을 Pre-signed URL로 변환
    return Promise.all(
      (results as any[]).map(async (row) => ({
        id: row.id,
        score: parseFloat(row.score),
        image_url: (await this.s3Service.convertToPresignedUrl(row.image_url)) || '',
        flatten_image_url: (await this.s3Service.convertToPresignedUrl(row.flatten_image_url)) || null,
        category: row.category,
        sub_category: row.sub_category,
        colors: row.colors,
        style_mood: row.style_mood,
        wear_count: row.wear_count,
        last_worn: row.last_worn,
        accept_count: row.accept_count,
        reject_count: row.reject_count,
      }))
    );
  }

  async getClothingByUser(userId: string): Promise<Clothing[]> {
    return this.prisma.clothing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClothingByCategory(userId: string, category: string): Promise<Clothing[]> {
    return this.prisma.clothing.findMany({
      where: { userId, category: category as any },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClothingById(clothingId: string): Promise<Clothing | null> {
    return this.prisma.clothing.findUnique({
      where: { id: clothingId },
    });
  }

  async updatePersonalization(
    clothingId: string,
    updates: {
      wearCount?: number;
      lastWorn?: Date;
      acceptCount?: number;
      rejectCount?: number;
    },
  ): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: updates,
    });
  }

  async incrementWearCount(clothingId: string): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: {
        wearCount: { increment: 1 },
        lastWorn: new Date(),
      },
    });
  }

  async incrementAcceptCount(clothingId: string): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: { acceptCount: { increment: 1 } },
    });
  }

  async incrementRejectCount(clothingId: string): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: { rejectCount: { increment: 1 } },
    });
  }

  async decrementWearCount(clothingId: string): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: {
        wearCount: { decrement: 1 },
      },
    });
  }

  async decrementAcceptCount(clothingId: string): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: {
        acceptCount: { decrement: 1 },
      },
    });
  }

  async decrementRejectCount(clothingId: string): Promise<void> {
    await this.prisma.clothing.update({
      where: { id: clothingId },
      data: {
        rejectCount: { decrement: 1 },
      },
    });
  }

  async deleteClothing(clothingId: string): Promise<void> {
    await this.prisma.clothing.delete({
      where: { id: clothingId },
    });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.clothing.deleteMany({
      where: { userId },
    });
  }
}