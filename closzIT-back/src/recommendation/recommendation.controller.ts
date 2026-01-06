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
    
    // 1. 날짜 결정: isToday 기반 또는 직접 전달된 date
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

    // 2. 캘린더에서 해당 일정 찾아서 TPO와 날씨 추출
    try {
      const events = await this.calendarService.getEventsWithWeather(
        userId,
        targetDate,
      );

      // 선택된 일정 제목과 매칭되는 이벤트 찾기
      const matchedEvent = events.find(
        (e) => e.summary === dto.calendarEvent
      );

      if (matchedEvent) {
        tpo = matchedEvent.tpo as TPO;
        weather = matchedEvent.weather;
        console.log(`[Recommendation] 일정 "${dto.calendarEvent}" → TPO: ${tpo}`);
      } else {
        if (events.length > 0) {
          tpo = events[0].tpo as TPO;
          weather = events[0].weather;
          console.log(`[Recommendation] 일정 미매칭, 첫 번째 이벤트 사용 → TPO: ${tpo}`);
        }
      }
    } catch (error) {
      console.error('[Recommendation] 캘린더 조회 실패:', error.message);
    }

    // 3. 검색 컨텍스트 구성
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

    console.log('[Recommendation] 검색 컨텍스트:', {
      calendarEvent: dto.calendarEvent,
      tpo: context.tpo,
      weather: context.weather,
      date: context.date,
    });

    // 4. RAG 검색 실행
    const results = await this.ragSearchService.search(userId, context);

    return {
      success: true,
      context,
      results,
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