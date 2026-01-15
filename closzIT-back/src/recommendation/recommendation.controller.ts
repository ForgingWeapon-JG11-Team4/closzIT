// src/recommendation/recommendation.controller.ts

import {
  Controller,
  Post,
  Delete,
  Body,
  Headers,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RagSearchService, OutfitSearchResults } from './services/rag-search.service';
import { FeedbackService } from './services/feedback.service';
import { CalendarService } from '../calendar/calendar.service';
import { SearchRequestDto } from './dto/search-request.dto';
import { FeedbackRequestDto, CancelFeedbackRequestDto } from './dto/feedback-request.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { SearchContext, TPO } from './types/clothing.types';
import { BedrockService } from '../ai/bedrock.service';
import { WeatherService } from '../weather/weather.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('recommendation')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly ragSearchService: RagSearchService,
    private readonly feedbackService: FeedbackService,
    private readonly calendarService: CalendarService,
    private readonly bedrockService: BedrockService,
    private readonly weatherService: WeatherService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 캘린더 기반 코디 추천
   * POST /recommendation/search
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Req() req: any,
    @Body() dto: SearchRequestDto,
  ): Promise<SearchResponseDto> {
    const userId = req.user.id;

    // 날짜 결정
    let targetDate: Date;
    if (dto.date) {
      targetDate = new Date(dto.date);
    } else if (dto.isToday === false) {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      targetDate = new Date();
    }

    let tpo: TPO = 'Daily';
    let weather: any = null;

    // 1순위: 직접 선택한 TPO
    if (dto.tpo) {
      const mappedTpo = this.mapTpoKeyword(dto.tpo);
      if (mappedTpo) {
        tpo = mappedTpo;
      }
    }
    // 2순위: 사용자 쿼리에서 TPO 추출 (AI)
    else if (dto.query) {
      const extractedTpo = await this.bedrockService.extractTPO({
        summary: dto.query,
      });
      tpo = this.validateTPO(extractedTpo);
    }
    // 3순위: 캘린더 이벤트에서 추출
    else if (dto.calendarEvent) {
      try {
        const events = await this.calendarService.getEventsWithWeather(
          userId,
          targetDate,
        );

        const matchedEvent = events.find((e) => e.summary === dto.calendarEvent);

        if (matchedEvent) {
          tpo = matchedEvent.tpo as TPO;
          weather = matchedEvent.weather;
        } else if (events.length > 0) {
          tpo = events[0].tpo as TPO;
          weather = events[0].weather;
        }
      } catch (error) {
        console.error('[Recommendation] 캘린더 조회 실패:', error.message);
      }
    }

    // 날씨 정보가 없으면 유저 위치 기반으로 조회
    if (!weather) {
      weather = await this.getWeatherForUser(userId, targetDate);
    }

    const context: SearchContext = {
      tpo,
      weather: weather
        ? {
            temp: weather.temperature,
            condition: weather.condition,
            rain_probability: weather.rainProbability,
          }
        : null,
      date: targetDate,
      query: dto.query || null,
      style: dto.style || null,
    };

    // console.log('[Recommendation] Context:', {
    //   tpo: context.tpo,
    //   temp: context.weather?.temp,
    //   style: context.style,
    //   query: context.query,
    // });

    const results: OutfitSearchResults = await this.ragSearchService.search(
      userId,
      context,
    );

    return {
      success: true,
      context,
      outfits: results.outfits,
      candidates: results.candidates,
      meta: results.meta,
    };
  }

  /**
   * 피드백 기록
   * POST /recommendation/feedback
   */
  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async feedback(
    @Req() req: any,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: FeedbackRequestDto,
  ) {
    if (idempotencyKey && !this.isValidUUID(idempotencyKey)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: '멱등키는 UUID v4 형식이어야 합니다.',
      });
    }

    return this.feedbackService.recordOutfitFeedback(
      req.user.id,
      {
        outer: dto.outer_id,
        top: dto.top_id,
        bottom: dto.bottom_id,
        shoes: dto.shoes_id,
      },
      dto.feedback_type,
      idempotencyKey,
    );
  }

  /**
   * 피드백 취소
   * DELETE /recommendation/feedback
   */
  @Delete('feedback')
  @HttpCode(HttpStatus.OK)
  async cancelFeedback(
    @Req() req: any,
    @Body() dto: CancelFeedbackRequestDto,
  ) {
    return this.feedbackService.cancelFeedback(req.user.id, {
      outer: dto.outer_id,
      top: dto.top_id,
      bottom: dto.bottom_id,
      shoes: dto.shoes_id,
    });
  }

  private isValidUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private mapTpoKeyword(keyword: string): TPO | null {
    const mapping: Record<string, TPO> = {
      '데일리': 'Daily',
      '학교': 'School',
      '일': 'Commute',
      '여행': 'Travel',
      '파티': 'Party',
      '데이트': 'Date',
      '결혼식': 'Wedding',
      '쇼핑': 'Daily',
      '산책': 'Daily',
      '운동': 'Sports',
      '교회': 'Other',
      '모임': 'Daily',
      '외식': 'Date',
      '면접': 'Commute',
      '콘서트': 'Party',
    };
    return mapping[keyword] || null;
  }

  private async getWeatherForUser(userId: string, targetDate: Date): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { province: true, city: true },
      });

      if (!user?.province || !user?.city) {
        // console.log('[Recommendation] 유저 위치 정보 없음, 기본 날씨 사용');
        return null;
      }

      const location = `${user.province} ${user.city}`;
      const weather = await this.weatherService.getWeatherForLocation(
        location,
        targetDate,
      );

      // console.log(`[Recommendation] 날씨 조회: ${location} → ${weather.temperature}°C, ${weather.condition}`);
      return weather;
    } catch (error) {
      console.error('[Recommendation] 날씨 조회 실패:', error.message);
      return null;
    }
  }

  private validateTPO(tpo: string): TPO {
    const validTPOs: TPO[] = [
      'Date', 'Daily', 'Commute', 'Sports', 'Travel',
      'Wedding', 'Party', 'Home', 'School', 'Other'
    ];
    return validTPOs.includes(tpo as TPO) ? (tpo as TPO) : 'Daily';
  }
}