// src/recommendation/dto/feedback-request.dto.ts

import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FeedbackType } from '@prisma/client';

export class FeedbackRequestDto {
  @IsOptional()
  @IsString()
  outer_id?: string;

  @IsString()
  top_id: string;

  @IsString()
  bottom_id: string;

  @IsString()
  shoes_id: string;

  @IsEnum(FeedbackType)
  feedback_type: FeedbackType;
}

export class CancelFeedbackRequestDto {
  @IsOptional()
  @IsString()
  outer_id?: string;

  @IsString()
  top_id: string;

  @IsString()
  bottom_id: string;

  @IsString()
  shoes_id: string;
}