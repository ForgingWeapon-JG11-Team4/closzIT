// src/weather/weather.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  GridCoord,
  WeatherInfo,
  WeatherApiResponse,
  KakaoGeoResponse,
} from './weather.types';

// 기상청 API 에러 코드 정의
const WEATHER_API_ERROR_CODES: Record<string, string> = {
  '00': 'NORMAL_SERVICE',
  '01': 'APPLICATION_ERROR',
  '02': 'DB_ERROR',
  '03': 'NODATA_ERROR',
  '04': 'HTTP_ERROR',
  '05': 'SERVICETIME_OUT',
  '10': 'INVALID_REQUEST_PARAMETER_ERROR',
  '11': 'NO_MANDATORY_REQUEST_PARAMETERS_ERROR',
  '12': 'NO_OPENAPI_SERVICE_ERROR',
  '20': 'SERVICE_ACCESS_DENIED_ERROR',
  '21': 'TEMPORARILY_DISABLE_THE_SERVICEKEY_ERROR',
  '22': 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR',
  '30': 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR',
  '31': 'DEADLINE_HAS_EXPIRED_ERROR',
  '32': 'UNREGISTERED_IP_ERROR',
  '33': 'UNSIGNED_CALL_ERROR',
  '99': 'UNKNOWN_ERROR',
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private kakaoApiKey: string;
  private weatherApiKey: string;
  private defaultLocation = { name: '서울', x: 60, y: 127 };

  // 하늘상태 코드 (SKY)
  private readonly SKY_CODES: Record<string, string> = {
    '1': '맑음',
    '3': '구름많음',
    '4': '흐림',
  };

  // 강수형태 코드 (PTY) - 단기예보
  private readonly PTY_CODES: Record<string, string> = {
    '0': '없음',
    '1': '비',
    '2': '비/눈',
    '3': '눈',
    '4': '소나기',
  };

  // 강수형태 코드 (PTY) - 초단기예보
  private readonly PTY_ULTRA_CODES: Record<string, string> = {
    '0': '없음',
    '1': '비',
    '2': '비/눈',
    '3': '눈',
    '5': '빗방울',
    '6': '빗방울눈날림',
    '7': '눈날림',
  };

  // 단기예보 발표 시각 (Base_time)
  private readonly BASE_TIMES = [2, 5, 8, 11, 14, 17, 20, 23];

  // API 제공 시간 오프셋 (분)
  private readonly API_AVAILABLE_OFFSET = 10;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.kakaoApiKey = this.configService.get('KAKAO_API_KEY') || '';
    this.weatherApiKey = this.configService.get('WEATHER_API_KEY') || '';

    if (!this.weatherApiKey) {
      this.logger.warn('WEATHER_API_KEY가 설정되지 않았습니다.');
    }
    if (!this.kakaoApiKey) {
      this.logger.warn('KAKAO_API_KEY가 설정되지 않았습니다.');
    }
  }

  /**
   * 위경도로 날씨 조회 (메인 API)
   */
  async getForecast(
    latitude: number,
    longitude: number,
    targetDate?: Date,
  ): Promise<WeatherInfo> {
    // 유효한 위경도 범위 검증 (한반도 기준)
    if (!this.isValidCoordinate(latitude, longitude)) {
      this.logger.warn(`유효하지 않은 좌표: lat=${latitude}, lon=${longitude}`);
      return this.getDefaultWeather(targetDate);
    }

    const grid = this.latLonToGrid(latitude, longitude);
    return this.getWeather(grid, targetDate);
  }

  /**
   * 장소명으로 날씨 조회
   */
  async getWeatherForLocation(
    location: string,
    targetDatetime?: Date,
  ): Promise<WeatherInfo> {
    if (!location || location.trim() === '') {
      this.logger.warn('장소명이 비어있습니다.');
      return this.getDefaultWeather(targetDatetime, '장소 미지정');
    }

    let grid: GridCoord | null = null;
    let locationName: string | null = null;

    // 주소 형식이면 Geocoding 시도
    if (this.isValidAddress(location)) {
      try {
        grid = await this.geocodeToGrid(location);
        if (grid) {
          locationName = location;
        }
      } catch (error) {
        this.logger.error(`Geocoding 실패: ${location}`, error);
      }
    }

    // Geocoding 실패 → 기본 위치 사용
    if (!grid) {
      grid = {
        x: this.defaultLocation.x,
        y: this.defaultLocation.y,
      };
      locationName = `${this.defaultLocation.name} (기본 위치)`;
      this.logger.log(`기본 위치로 대체: ${locationName}`);
    }

    const weather = await this.getWeather(grid, targetDatetime);
    weather.locationName = locationName;

    return weather;
  }

  /**
   * 좌표 유효성 검증 (한반도 범위)
   */
  private isValidCoordinate(lat: number, lon: number): boolean {
    // 한반도 대략적 범위: 위도 33~43, 경도 124~132
    return lat >= 33 && lat <= 43 && lon >= 124 && lon <= 132;
  }

  /**
   * 주소 형식인지 판단
   */
  private isValidAddress(location: string): boolean {
    if (!location) return false;

    const addressPatterns = [
      /[가-힣]+시(?=\s|,|$|[0-9])/,
      /[가-힣]+도(?=\s|,|$|[0-9])/,
      /[가-힣]+구(?=\s|,|$|[0-9])/,
      /[가-힣]+군(?=\s|,|$|[0-9])/,
      /[가-힣]+읍(?=\s|,|$|[0-9])/,
      /[가-힣]+면(?=\s|,|$|[0-9])/,
      /[가-힣]+동(?=\s|,|$|[0-9])/,
      /[가-힣]+리(?=\s|,|$|[0-9])/,
      /[가-힣]+로(?=\s|,|$|[0-9])/,
      /[가-힣]+길(?=\s|,|$|[0-9])/,
      /[가-힣]+대로(?=\s|,|$|[0-9])/,
    ];

    return addressPatterns.some((pattern) => pattern.test(location));
  }

  /**
   * 주소 → 격자 좌표 변환 (Kakao Geocoding)
   */
  async geocodeToGrid(address: string): Promise<GridCoord | null> {
    if (!this.kakaoApiKey) {
      this.logger.error('KAKAO_API_KEY가 설정되지 않았습니다.');
      return null;
    }

    try {
      // 키워드 검색
      const response = await firstValueFrom(
        this.httpService.get<KakaoGeoResponse>(
          'https://dapi.kakao.com/v2/local/search/keyword.json',
          {
            headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` },
            params: { query: address },
            timeout: 5000,
          },
        ),
      );

      let documents = response.data.documents;

      // 키워드 검색 실패 시 주소 검색
      if (!documents || documents.length === 0) {
        const addressResponse = await firstValueFrom(
          this.httpService.get<KakaoGeoResponse>(
            'https://dapi.kakao.com/v2/local/search/address.json',
            {
              headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` },
              params: { query: address },
              timeout: 5000,
            },
          ),
        );
        documents = addressResponse.data.documents;
      }

      if (!documents || documents.length === 0) {
        this.logger.warn(`주소 검색 결과 없음: ${address}`);
        return null;
      }

      const lon = parseFloat(documents[0].x);
      const lat = parseFloat(documents[0].y);

      if (isNaN(lon) || isNaN(lat)) {
        this.logger.error(`잘못된 좌표 값: x=${documents[0].x}, y=${documents[0].y}`);
        return null;
      }

      return this.latLonToGrid(lat, lon);
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.error('Kakao API 인증 실패: API 키를 확인하세요.');
      } else if (error.code === 'ECONNABORTED') {
        this.logger.error('Kakao API 타임아웃');
      } else {
        this.logger.error('Geocoding 오류:', error.message);
      }
      return null;
    }
  }

  /**
   * 위경도 → 기상청 격자 좌표 변환
   */
  latLonToGrid(lat: number, lon: number): GridCoord {
    const RE = 6371.00877;
    const GRID = 5.0;
    const SLAT1 = 30.0;
    const SLAT2 = 60.0;
    const OLON = 126.0;
    const OLAT = 38.0;
    const XO = 43;
    const YO = 136;

    const DEGRAD = Math.PI / 180.0;

    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn =
      Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
      Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);

    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

    return { x, y };
  }

  /**
   * 단기예보 발표 시각 계산
   * - Base_time: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300 (1일 8회)
   * - API 제공 시간: 발표시각 + 10분 이후
   */
  private getBaseDatetime(): { baseDate: string; baseTime: string } {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let baseTime: number | null = null;
    let baseDate = now;

    // API 제공 시간 고려 (발표시각 + 10분 이후)
    for (let i = this.BASE_TIMES.length - 1; i >= 0; i--) {
      const bt = this.BASE_TIMES[i];
      if (
        currentHour > bt ||
        (currentHour === bt && currentMinute >= this.API_AVAILABLE_OFFSET)
      ) {
        baseTime = bt;
        break;
      }
    }

    // 자정~02:10 사이는 전날 23시 발표 데이터 사용
    if (baseTime === null) {
      baseTime = 23;
      baseDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const baseDateStr = this.formatDate(baseDate);
    const baseTimeStr = `${String(baseTime).padStart(2, '0')}00`;

    return { baseDate: baseDateStr, baseTime: baseTimeStr };
  }

  /**
   * 날짜 포맷 (YYYYMMDD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 기본 날씨 정보 반환 (에러 시)
   */
  private getDefaultWeather(targetDate?: Date, locationName?: string): WeatherInfo {
    const target = targetDate || new Date();
    return {
      date: this.formatDate(target),
      time: `${String(target.getHours()).padStart(2, '0')}00`,
      temperature: null,
      sky: null,
      precipitationType: null,
      rainProbability: 0,
      humidity: null,
      windSpeed: null,
      locationName: locationName || null,
      condition: '알 수 없음',
    };
  }

  /**
   * 기상청 API 에러 처리
   */
  private handleApiError(resultCode: string): void {
    const errorMessage = WEATHER_API_ERROR_CODES[resultCode] || 'UNKNOWN_ERROR';

    switch (resultCode) {
      case '03':
        this.logger.warn(`날씨 데이터 없음 (NODATA_ERROR)`);
        break;
      case '10':
      case '11':
        this.logger.error(`잘못된 요청 파라미터: ${errorMessage}`);
        break;
      case '20':
      case '21':
      case '30':
      case '31':
        this.logger.error(`서비스 키 오류: ${errorMessage}`);
        break;
      case '22':
        this.logger.error(`API 호출 횟수 초과: ${errorMessage}`);
        break;
      case '32':
        this.logger.error(`등록되지 않은 IP: ${errorMessage}`);
        break;
      default:
        this.logger.error(`기상청 API 오류 [${resultCode}]: ${errorMessage}`);
    }
  }

  /**
   * Missing 값 체크 (+900 이상, -900 이하)
   */
  private isMissingValue(value: number): boolean {
    return value >= 900 || value <= -900;
  }

  /**
   * 강수량 범주 해석
   */
  private parsePrecipitation(value: string): string {
    if (!value || value === '-' || value === '강수없음') {
      return '없음';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue === 0) {
      return '없음';
    }

    if (numValue < 1.0) return '1mm 미만';
    if (numValue < 30.0) return `${numValue}mm`;
    if (numValue < 50.0) return '30~50mm';
    return '50mm 이상';
  }

  /**
   * 기상청 단기예보 API 호출
   */
  async getWeather(grid: GridCoord, targetDatetime?: Date): Promise<WeatherInfo> {
    const { baseDate, baseTime } = this.getBaseDatetime();
    const target = targetDatetime || new Date();
    const targetDate = this.formatDate(target);
    const targetHour = `${String(target.getHours()).padStart(2, '0')}00`;

    const defaultWeather = this.getDefaultWeather(target);

    if (!this.weatherApiKey) {
      this.logger.error('WEATHER_API_KEY가 설정되지 않았습니다.');
      return defaultWeather;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<WeatherApiResponse>(
          'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',
          {
            params: {
              serviceKey: this.weatherApiKey,
              numOfRows: 1000,
              pageNo: 1,
              dataType: 'JSON',
              base_date: baseDate,
              base_time: baseTime,
              nx: grid.x,
              ny: grid.y,
            },
            timeout: 10000,
          },
        ),
      );

      const data = response.data;
      if (data.response?.header?.resultCode !== '00') {
        this.handleApiError(data.response?.header?.resultCode);
        return defaultWeather;
      }

      const items = data.response.body?.items?.item;
      if (!items || items.length === 0) {
        this.logger.warn(`[Weather] 응답 아이템이 없습니다. (Date: ${targetDate})`);
        return defaultWeather;
      }

      // 1. 해당 날짜(targetDate)의 데이터만 필터링
      const dailyItems = items.filter(item => item.fcstDate === targetDate);
      
      if (dailyItems.length === 0) {
        this.logger.warn(`[Weather] 해당 날짜(${targetDate})의 예보가 응답에 포함되지 않았습니다.`);
        return defaultWeather;
      }

      // 2. 정확한 시간(targetHour) 매칭 시도, 없으면 가장 가까운 시간 선택
      let targetItems = dailyItems.filter(item => item.fcstTime === targetHour);
      
      if (targetItems.length === 0) {
        // 가장 첫 번째로 나오는 시간대를 대안으로 선택
        const alternativeHour = dailyItems[0].fcstTime;
        this.logger.log(`[Weather] ${targetHour} 데이터가 없어 ${alternativeHour} 예보로 대체합니다.`);
        targetItems = dailyItems.filter(item => item.fcstTime === alternativeHour);
      }

      const weather: WeatherInfo = { ...defaultWeather };

      // 3. 선택된 시간대의 데이터들로 weather 객체 구성
      targetItems.forEach((item) => {
        const { category, fcstValue } = item;
        const numValue = parseFloat(fcstValue);

        if (!isNaN(numValue) && this.isMissingValue(numValue)) return;

        switch (category) {
          case 'TMP':
            weather.temperature = isNaN(numValue) ? null : Math.round(numValue);
            break;
          case 'SKY':
            weather.sky = this.SKY_CODES[fcstValue] || fcstValue;
            break;
          case 'PTY':
            weather.precipitationType = this.PTY_CODES[fcstValue] || fcstValue;
            break;
          case 'POP':
            weather.rainProbability = isNaN(numValue) ? 0 : numValue;
            break;
          case 'REH':
            weather.humidity = isNaN(numValue) ? null : numValue;
            break;
          case 'WSD':
            weather.windSpeed = isNaN(numValue) ? null : numValue;
            break;
        }
      });

      weather.condition = this.determineCondition(weather);
      return weather;

    } catch (error: any) {
      this.logger.error(`[Weather] API 호출 에러: ${error.message}`);
      return defaultWeather;
    }
  }

  /**
   * 종합 날씨 상태 결정
   */
  private determineCondition(weather: WeatherInfo): string {
    // 강수가 있으면 강수형태 우선
    if (weather.precipitationType && weather.precipitationType !== '없음') {
      return weather.precipitationType;
    }
    // 하늘상태
    if (weather.sky) {
      return weather.sky;
    }
    return '알 수 없음';
  }
}