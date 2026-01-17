import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class OutfitLogService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * 의류 아이템의 이미지 URL을 Presigned URL로 변환
   */
  private async convertClothingImageUrl(item: any) {
    if (!item) return null;
    
    const [imageUrl, flattenImageUrl] = await Promise.all([
      this.s3Service.convertToPresignedUrl(item.imageUrl),
      this.s3Service.convertToPresignedUrl(item.flattenImageUrl),
    ]);
    
    return {
      ...item,
      imageUrl: flattenImageUrl || imageUrl,
      image: flattenImageUrl || imageUrl,
      originalImage: imageUrl,
      flattenImage: flattenImageUrl,
    };
  }

  /**
   * 착장 기록 생성
   */
  async createOutfitLog(
    userId: string,
    data: {
      outerId?: string;
      topId: string;
      bottomId: string;
      shoesId: string;
      tpo?: string;
      location?: string;
      weatherTemp?: number;
      weatherCondition?: string;
      userNote?: string;
    },
  ) {
    // 필수 항목 검증
    if (!data.topId || !data.bottomId || !data.shoesId) {
      throw new BadRequestException('상의, 하의, 신발은 필수입니다.');
    }

    // TPO 기본값 설정
    const tpo = data.tpo || 'Daily';

    return this.prisma.outfitLog.create({
      data: {
        userId,
        outerId: data.outerId || null,
        topId: data.topId,
        bottomId: data.bottomId,
        shoesId: data.shoesId,
        tpo: tpo as any,
        wornDate: new Date(),
        location: data.location,
        weatherTemp: data.weatherTemp,
        weatherCondition: data.weatherCondition,
        userNote: data.userNote,
      },
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });
  }

  /**
   * 사용자의 착장 기록 목록 조회
   */
  async getOutfitLogs(userId: string, limit: number = 20, offset: number = 0) {
    const logs = await this.prisma.outfitLog.findMany({
      where: { userId },
      orderBy: { wornDate: 'desc' },
      take: limit,
      skip: offset,
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });

    // 각 로그의 의류 아이템 이미지 URL을 Presigned URL로 변환
    const logsWithPresignedUrls = await Promise.all(
      logs.map(async (log) => {
        const [outer, top, bottom, shoes] = await Promise.all([
          this.convertClothingImageUrl(log.outer),
          this.convertClothingImageUrl(log.top),
          this.convertClothingImageUrl(log.bottom),
          this.convertClothingImageUrl(log.shoes),
        ]);

        return {
          ...log,
          outer,
          top,
          bottom,
          shoes,
        };
      })
    );

    return logsWithPresignedUrls;
  }

  /**
   * 특정 착장 기록 조회
   */
  async getOutfitLogById(userId: string, id: string) {
    return this.prisma.outfitLog.findFirst({
      where: { id, userId },
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });
  }

  /**
   * 착장 기록 삭제
   */
  async deleteOutfitLog(userId: string, id: string) {
    const log = await this.prisma.outfitLog.findFirst({
      where: { id, userId },
    });

    if (!log) {
      throw new BadRequestException('착장 기록을 찾을 수 없습니다.');
    }

    return this.prisma.outfitLog.delete({
      where: { id },
    });
  }

  /**
   * 오늘의 착장 기록 조회
   */
  async getTodayOutfitLog(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.outfitLog.findFirst({
      where: {
        userId,
        wornDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });
  }
}
