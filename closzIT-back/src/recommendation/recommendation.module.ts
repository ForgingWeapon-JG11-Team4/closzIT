// src/recommendation/recommendation.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { RecommendationController } from './recommendation.controller';
import { RagSearchService } from './services/rag-search.service';
import { VectorDBService } from './services/vector-db.service';
import { EmbeddingService } from './services/embedding.service';
import { ScoringService } from './services/scoring.service';
import { FeedbackService } from './services/feedback.service';

import { UserModule } from '../user/user.module';
import { CalendarModule } from '../calendar/calendar.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { BedrockService } from 'src/ai/bedrock.service';
import { WeatherService } from 'src/weather/weather.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    HttpModule,
    UserModule,
    CalendarModule,
    PrismaModule,
    S3Module,
  ],
  controllers: [RecommendationController],
  providers: [
    RagSearchService,
    VectorDBService,
    EmbeddingService,
    ScoringService,
    FeedbackService,
    BedrockService,
    WeatherService,
    PrismaService,
  ],
  exports: [VectorDBService, FeedbackService],
})
export class RecommendationModule { }
