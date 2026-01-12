// src/calendar/calendar.service.ts

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

export interface UpcomingEvent {
  date: string;
  time: string;
  title: string;
  isToday: boolean;
}

export interface CreateEventDto {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  province?: string;
  city?: string;
  description?: string;
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
      const response = await fetchFromGoogle(user.googleAccessToken);
      return this.mapGoogleEventsToCalendarEvents(response.data.items);
    } catch (error) {
      if (error.response?.status === 401 && user.googleRefreshToken) {
        console.log('[Calendar] 토큰 만료 감지, 갱신 시도 중...');
        
        const newToken = await this.refreshGoogleToken(userId, user.googleRefreshToken);
        
        if (newToken) {
          try {
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

  async getUpcomingEvents(userId: string): Promise<UpcomingEvent[]> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayEvents, tomorrowEvents] = await Promise.all([
      this.getEvents(userId, today),
      this.getEvents(userId, tomorrow),
    ]);

    const formattedTodayEvents = todayEvents.map(event => ({
      ...this.formatEventForFrontend(event, true),
      _isAllDay: !event.start.includes('T'),
      _startTime: event.start,
    }));

    const formattedTomorrowEvents = tomorrowEvents.map(event => ({
      ...this.formatEventForFrontend(event, false),
      _isAllDay: !event.start.includes('T'),
      _startTime: event.start,
    }));

    const sortByTime = (a: any, b: any) => {
      if (a._isAllDay && !b._isAllDay) return -1;
      if (!a._isAllDay && b._isAllDay) return 1;
      return new Date(a._startTime).getTime() - new Date(b._startTime).getTime();
    };

    formattedTodayEvents.sort(sortByTime);
    formattedTomorrowEvents.sort(sortByTime);

    const combined = [...formattedTodayEvents, ...formattedTomorrowEvents]
      .slice(0, 5)
      .map(({ _isAllDay, _startTime, ...event }) => event);

    return combined;
  }

  async createEvent(userId: string, dto: CreateEventDto): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, googleRefreshToken: true },
    });

    if (!user?.googleAccessToken) {
      return { success: false, error: 'Google 계정 연동이 필요합니다.' };
    }

    const eventBody = this.buildEventBody(dto);

    const postToGoogle = async (token: string) => {
      return await firstValueFrom(
        this.httpService.post(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          eventBody,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
    };

    try {
      const response = await postToGoogle(user.googleAccessToken);
      return {
        success: true,
        event: this.toCalendarEvent(response.data),
      };
    } catch (error) {
      if (error.response?.status === 401 && user.googleRefreshToken) {
        console.log('[Calendar] 토큰 만료 감지, 갱신 시도 중...');
        
        const newToken = await this.refreshGoogleToken(userId, user.googleRefreshToken);
        
        if (newToken) {
          try {
            const retryResponse = await postToGoogle(newToken);
            return {
              success: true,
              event: this.toCalendarEvent(retryResponse.data),
            };
          } catch (retryError) {
            console.error('[Calendar] 토큰 갱신 후에도 요청 실패:', retryError.message);
            return { success: false, error: '일정 추가에 실패했습니다.' };
          }
        }
      }

      console.error('[Calendar] 일정 추가 실패:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || '일정 추가에 실패했습니다.' };
    }
  }

  private buildEventBody(dto: CreateEventDto): any {
    const eventBody: any = {
      summary: dto.title,
    };

    // location: 시/도 + 시/군/구
    if (dto.province || dto.city) {
      eventBody.location = [dto.province, dto.city].filter(Boolean).join(' ');
    }

    // description: 상세 정보
    if (dto.description) {
      eventBody.description = dto.description;
    }

    if (dto.startTime) {
      // 특정 시간 일정
      const startDateTime = `${dto.date}T${dto.startTime}:00+09:00`;
      const endDateTime = dto.endTime
        ? `${dto.date}T${dto.endTime}:00+09:00`
        : `${dto.date}T${this.addHour(dto.startTime)}:00+09:00`;

      eventBody.start = { dateTime: startDateTime, timeZone: 'Asia/Seoul' };
      eventBody.end = { dateTime: endDateTime, timeZone: 'Asia/Seoul' };
    } else {
      // 종일 일정
      const nextDay = new Date(dto.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDate = nextDay.toISOString().split('T')[0];

      eventBody.start = { date: dto.date };
      eventBody.end = { date: endDate };
    }

    return eventBody;
  }

  private addHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private formatEventForFrontend(event: CalendarEvent, isToday: boolean): UpcomingEvent {
    const startDate = new Date(event.start);
    
    const month = startDate.getMonth() + 1;
    const day = startDate.getDate();
    const date = `${month}/${day}`;

    let time: string;
    if (event.start.includes('T')) {
      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      time = `${hours}:${minutes}`;
    } else {
      time = '';
    }

    return {
      date,
      time,
      title: event.summary,
      isToday,
    };
  }

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

  private toCalendarEvent(event: GoogleCalendarEvent): CalendarEvent {
    return {
      id: event.id,
      summary: event.summary || '(제목 없음)',
      location: event.location,
      description: event.description,
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
    };
  }

  private mapGoogleEventsToCalendarEvents(items: GoogleCalendarEvent[]): CalendarEvent[] {
    return (items || []).map(event => this.toCalendarEvent(event));
  }

  async extractTPOFromEvent(event: CalendarEvent): Promise<string> {
    return this.bedrockService.extractTPOFromCalendar(event);
  }

  async getEventsWithWeather(userId: string, targetDate: Date) {
    const events = await this.getEvents(userId, targetDate);
    
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
    
    const match = location.match(/([가-힣]+(?:시|도))\s*([가-힣]+(?:시|군|구))/);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
    
    return null;
  }
}