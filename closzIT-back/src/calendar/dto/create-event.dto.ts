// src/calendar/dto/create-event.dto.ts

import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식은 YYYY-MM-DD입니다.' })
  date: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: '시간 형식은 HH:MM입니다.' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: '시간 형식은 HH:MM입니다.' })
  endTime?: string;

  @IsOptional()
  @IsString()
  province?: string;  // 시/도 (드롭다운)

  @IsOptional()
  @IsString()
  city?: string;      // 시/군/구 (드롭다운)

  @IsOptional()
  @IsString()
  description?: string;  // 상세 정보
}