// src/calendar/services/calendar.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BedrockService } from '../ai/bedrock.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CalendarEvent {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  start: string;
  end: string;
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
    private readonly prisma: PrismaService,
  ) {}

  async getEvents(userId: string, targetDate: Date): Promise<CalendarEvent[]> {
    // DB에서 토큰 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true },
    });

    if (!user?.googleAccessToken) {
      console.log('Access token not found');
      return [];
    }

    try {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await firstValueFrom(
        this.httpService.get<GoogleCalendarResponse>(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: {
              Authorization: `Bearer ${user.googleAccessToken}`,
            },
            params: {
              timeMin: startOfDay.toISOString(),
              timeMax: endOfDay.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
            },
          },
        ),
      );

      const events = response.data.items || [];
      console.log('캘린더 조회 성공, 일정 수:', events.length);
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