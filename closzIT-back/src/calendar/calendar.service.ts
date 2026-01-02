// src/calendar/services/calendar.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BedrockService } from '../ai/bedrock.service';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from 'src/weather/weather.service';

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
    private readonly weatherService: WeatherService,
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
      // console.log('캘린더 조회 성공, 일정 수:', events.length);
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

  async getEventsWithWeather(userId: string, targetDate: Date) {
    const events = await this.getEvents(userId, targetDate);
    
    // 사용자 기본 위치 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { province: true, city: true },
    });

    const defaultLocation = user?.province && user?.city
      ? `${user.province} ${user.city}`
      : null;
    
    const results = await Promise.all(
      events.map(async (event) => {
        let weather: any = null;
        
        // 장소에서 주소 부분만 추출
        const location = this.extractAddress(event.location) || defaultLocation;
        const eventTime = event.start.includes('T') 
          ? new Date(event.start)
          : new Date();

        if (location) {
          weather = await this.weatherService.getWeatherForLocation(
            location,
            eventTime,
          );
        }
        
        return {
          ...event,
          tpo: await this.extractTPOFromEvent(event),
          weather,
        };
      })
    );
    
    return results;
  }

  private extractAddress(location?: string): string | null {
    if (!location) return null;
    
    // 시/도 + 시/군/구 패턴 추출
    const match = location.match(/([가-힣]+(?:시|도))\s*([가-힣]+(?:시|군|구))/);
    if (match) {
      return `${match[1]} ${match[2]}`;  // "경기도 광주시"
    }
    
    return null;
  }
}