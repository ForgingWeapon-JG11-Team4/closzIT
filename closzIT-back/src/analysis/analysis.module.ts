import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { HttpModule } from '@nestjs/axios';
import { BedrockModule } from '../ai/bedrock.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        HttpModule,
        PrismaModule,
        BedrockModule,
    ],
    controllers: [AnalysisController],
    providers: [AnalysisService],
})
export class AnalysisModule { }
