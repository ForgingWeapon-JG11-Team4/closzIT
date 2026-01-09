import { Module, forwardRef } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { HttpModule } from '@nestjs/axios';
import { BedrockModule } from '../ai/bedrock.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [
        HttpModule,
        PrismaModule,
        BedrockModule,
        forwardRef(() => CreditModule),
        S3Module,
    ],
    controllers: [AnalysisController],
    providers: [AnalysisService],
})
export class AnalysisModule { }

