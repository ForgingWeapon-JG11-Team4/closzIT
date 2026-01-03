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

@Module({
  imports: [
    HttpModule,
    UserModule,
    CalendarModule,
    PrismaModule,
  ],
  controllers: [RecommendationController],
  providers: [
    RagSearchService,
    VectorDBService,
    EmbeddingService,
    ScoringService,
    FeedbackService,
  ],
  exports: [VectorDBService, FeedbackService],
})
export class RecommendationModule {}