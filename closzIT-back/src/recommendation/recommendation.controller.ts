// src/recommendation/recommendation.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RagSearchService } from './services/rag-search.service';
import { FeedbackService } from './services/feedback.service';
import { CalendarService } from '../calendar/calendar.service';
import { SearchRequestDto } from './dto/search-request.dto';
import { FeedbackRequestDto } from './dto/feedback-request.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { SearchContext, TPO } from './types/clothing.types';

@Controller('recommendation')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly ragSearchService: RagSearchService,
    private readonly feedbackService: FeedbackService,
    private readonly calendarService: CalendarService,
  ) {}

  /**
   * 코디 추천 검색
   * POST /api/recommendation/search
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Req() req: any,
    @Body() dto: SearchRequestDto,
  ): Promise<SearchResponseDto> {
    const userId = req.user.id;
    const targetDate = dto.date ? new Date(dto.date) : new Date();

    let tpo: TPO = dto.tpo || 'Daily';
    let weather: any = null;

    // TPO가 직접 입력되지 않은 경우 캘린더에서 추출
    if (!dto.tpo) {
      try {
        const events = await this.calendarService.getEventsWithWeather(
          userId,
          targetDate,
        );

        if (events.length > 0) {
          tpo = events[0].tpo as TPO;
          weather = events[0].weather;
        }
      } catch (error) {
        console.log('캘린더 조회 실패, 기본 TPO 사용:', error.message);
      }
    }

    // 검색 컨텍스트 구성
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
    };

    // RAG 검색 실행
    const results = await this.ragSearchService.search(userId, context);

    return {
      success: true,
      context,
      results,
    };
  }

  /**
   * 피드백 기록
   * POST /api/recommendation/feedback
   */
  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async feedback(
    @Req() req: any,
    @Body() dto: FeedbackRequestDto,
  ): Promise<{ success: boolean }> {
    await this.feedbackService.recordOutfitFeedback(
      {
        outer: dto.outer_id,
        top: dto.top_id,
        bottom: dto.bottom_id,
        shoes: dto.shoes_id,
      },
      dto.feedback_type,
    );

    return { success: true };
  }
}