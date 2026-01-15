// src/recommendation/dto/search-request.dto.ts

import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class SearchRequestDto {
  @IsOptional()
  @IsString()
  calendarEvent?: string;  // 캘린더 일정 제목

  @IsOptional()
  @IsBoolean()
  isToday?: boolean;  // 오늘 일정 여부

  @IsOptional()
  @IsString()
  date?: string;  // 날짜 (YYYY-MM-DD)

  @IsOptional()
  @IsString()
  query?: string;  // 사용자 자연어 검색어

  @IsOptional()
  @IsString()
  tpo?: string;  // TPO 선택 (데일리, 데이트, 면접 등)

  @IsOptional()
  @IsString()
  style?: string;  // 스타일 선택 (캐주얼, 미니멀 등)
}