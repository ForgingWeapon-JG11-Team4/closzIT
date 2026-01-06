import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOutfitLogDto } from './dto/create-outfit-log.dto';

@Injectable()
export class OutfitLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * 새로운 코디 로그 생성
   */
  async create(userId: string, createDto: CreateOutfitLogDto) {
    return this.prisma.outfitLog.create({
      data: {
        userId,
        wornDate: createDto.wornDate,
        location: createDto.location,
        tpo: createDto.tpo,
        weatherTemp: createDto.weatherTemp,
        weatherCondition: createDto.weatherCondition,
        outerId: createDto.outerId,
        topId: createDto.topId,
        bottomId: createDto.bottomId,
        shoesId: createDto.shoesId,
        userNote: createDto.userNote,
        feedbackScore: createDto.feedbackScore,
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
   * 사용자의 모든 코디 로그 조회 (최신순)
   */
  async findAllByUser(userId: string) {
    return this.prisma.outfitLog.findMany({
      where: { userId },
      orderBy: { wornDate: 'desc' },
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });
  }

  /**
   * 특정 위치 키워드로 코디 로그 검색 (가장 최근 1개)
   * 예: "에버랜드", "놀이동산" 등
   */
  async findRecentByLocation(userId: string, locationKeyword: string) {
    return this.prisma.outfitLog.findFirst({
      where: {
        userId,
        location: {
          contains: locationKeyword,
          mode: 'insensitive',
        },
      },
      orderBy: { wornDate: 'desc' },
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });
  }

  /**
   * 특정 날짜 범위 내 코디 로그 조회
   */
  async findByDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.outfitLog.findMany({
      where: {
        userId,
        wornDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { wornDate: 'desc' },
      include: {
        outer: true,
        top: true,
        bottom: true,
        shoes: true,
      },
    });
  }

  /**
   * 특정 코디 로그 ID로 조회
   */
  async findOne(id: string, userId: string) {
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
   * 코디 로그 피드백 점수 업데이트
   */
  async updateFeedback(id: string, userId: string, feedbackScore: number) {
    return this.prisma.outfitLog.updateMany({
      where: { id, userId },
      data: { feedbackScore },
    });
  }

  /**
   * 코디 로그 삭제
   */
  async remove(id: string, userId: string) {
    return this.prisma.outfitLog.deleteMany({
      where: { id, userId },
    });
  }
}
