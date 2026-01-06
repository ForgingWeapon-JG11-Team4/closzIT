import { IsString, IsOptional, IsDate, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { TPO } from '@prisma/client';

export class CreateOutfitLogDto {
  @Type(() => Date)
  @IsDate()
  wornDate: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsEnum(TPO)
  tpo: TPO;

  @IsOptional()
  @IsNumber()
  weatherTemp?: number;

  @IsOptional()
  @IsString()
  weatherCondition?: string;

  @IsOptional()
  @IsUUID()
  outerId?: string;

  @IsUUID()
  topId: string;

  @IsUUID()
  bottomId: string;

  @IsUUID()
  shoesId: string;

  @IsOptional()
  @IsString()
  userNote?: string;

  @IsOptional()
  @IsNumber()
  feedbackScore?: number;
}
