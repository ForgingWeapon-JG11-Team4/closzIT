// src/calendar/services/calendar.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface CalendarEvent {
  id: string;
  summary: string;         // 일정 제목
  location?: string;       // 장소
  description?: string;    // 설명
  start: string;           // 시작 시간
  end: string;             // 종료 시간
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly bedrockService: BedrockService,
  ) {}

  /**
   * 사용자의 Google Calendar 일정 조회
   */
  async getEvents(
    userId: string,
    targetDate: Date,
    accessToken?: string
  ): Promise<CalendarEvent[]> {
    // accessToken이 없으면 DB에서 조회 (UserService 연동 필요)
    if (!accessToken) {
      console.log('Access token not provided, returning empty events');
      return [];
    }

    try {
      // 해당 날짜의 시작과 끝
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await firstValueFrom(
        this.httpService.get<GoogleCalendarResponse>(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              timeMin: startOfDay.toISOString(),
              timeMax: endOfDay.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
            },
          }
        )
      );

      const events = response.data.items || [];

      return events.map((event) => ({
        id: event.id,
        summary: event.summary || '(제목 없음)',
        location: event.location,
        description: event.description,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
      }));
    } catch (error) {
      console.error('Google Calendar API 오류:', error);
      return [];
    }
  }

  async extractTPOFromEvent(event: CalendarEvent): Promise<string> {
    return this.bedrockService.extractTPOFromCalendar(event);
  }
}