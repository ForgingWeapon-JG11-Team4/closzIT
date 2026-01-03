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
    // 1. DB에서 Access Token과 Refresh Token을 함께 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, googleRefreshToken: true },
    });

    if (!user?.googleAccessToken) {
      console.log('[Calendar] 구글 액세스 토큰이 없습니다.');
      return [];
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 구글 API 호출을 위한 내부 헬퍼 함수
    const fetchFromGoogle = async (token: string) => {
      return await firstValueFrom(
        this.httpService.get<GoogleCalendarResponse>(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timeMin: startOfDay.toISOString(),
              timeMax: endOfDay.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
            },
          },
        ),
      );
    };

    try {
      // 2. 일차적으로 현재 토큰으로 요청 시도
      const response = await fetchFromGoogle(user.googleAccessToken);
      return this.mapGoogleEventsToCalendarEvents(response.data.items);
    } catch (error) {
      // 3. 401 Unauthorized 에러 발생 시 토큰 갱신 로직 진입
      if (error.response?.status === 401 && user.googleRefreshToken) {
        console.log('[Calendar] 토큰 만료 감지, 갱신 시도 중...');
        
        const newToken = await this.refreshGoogleToken(userId, user.googleRefreshToken);
        
        if (newToken) {
          try {
            // 4. 새 토큰으로 재시도
            console.log('[Calendar] 갱신된 토큰으로 재요청합니다.');
            const retryResponse = await fetchFromGoogle(newToken);
            return this.mapGoogleEventsToCalendarEvents(retryResponse.data.items);
          } catch (retryError) {
            console.error('[Calendar] 토큰 갱신 후에도 요청 실패:', retryError.message);
          }
        }
      }

      console.error('[Calendar] Google Calendar API 최종 오류:', error.message);
      return [];
    }
  }

  /**
   * 구글 토큰을 갱신하고 DB를 업데이트하는 헬퍼 메서드
   */
  private async refreshGoogleToken(userId: string, refreshToken: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          client_id: this.configService.get('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        })
      );

      const newAccessToken = response.data.access_token;

      // DB 업데이트
      await this.prisma.user.update({
        where: { id: userId },
        data: { googleAccessToken: newAccessToken },
      });

      return newAccessToken;
    } catch (error) {
      console.error('[Calendar] Refresh Token을 이용한 갱신 실패:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 구글 응답 데이터를 내부 인터페이스로 매핑하는 헬퍼 메서드
   */
  private mapGoogleEventsToCalendarEvents(items: GoogleCalendarEvent[]): CalendarEvent[] {
    const events = items || [];
    return events.map((event) => ({
      id: event.id,
      summary: event.summary || '(제목 없음)',
      location: event.location,
      description: event.description,
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
    }));
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