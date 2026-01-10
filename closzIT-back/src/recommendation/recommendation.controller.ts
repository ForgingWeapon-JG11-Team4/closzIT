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
}