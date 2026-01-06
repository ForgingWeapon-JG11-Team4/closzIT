// src/recommendation/recommendation.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { RecommendationController } from './recommendation.controller';
import { RagSearchService } from './services/rag-search.service';
import { VectorDBService } from './services/vector-db.service';
import { EmbeddingService } from './services/embedding.service';
import { ScoringService } from './services/scoring.service';
import { FeedbackService } from './services/feedback.service';
import { ConversationalRagService } from './services/conversational-rag.service';
import { OutfitRagService } from './services/outfit-rag.service';

import { UserModule } from '../user/user.module';
import { CalendarModule } from '../calendar/calendar.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OutfitLogModule } from '../outfit-log/outfit-log.module';

@Module({
  imports: [
    HttpModule,
    UserModule,
    CalendarModule,
    PrismaModule,
    OutfitLogModule,
  ],
  controllers: [RecommendationController],
  providers: [
    RagSearchService,
    VectorDBService,
    EmbeddingService,
    ScoringService,
    FeedbackService,
    ConversationalRagService,
    OutfitRagService,
  ],
  exports: [VectorDBService, FeedbackService],
})
export class RecommendationModule {}