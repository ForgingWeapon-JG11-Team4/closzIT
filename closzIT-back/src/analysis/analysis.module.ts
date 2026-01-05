import { Module, forwardRef } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { HttpModule } from '@nestjs/axios';
import { BedrockModule } from '../ai/bedrock.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';

@Module({
    imports: [
        HttpModule,
        PrismaModule,
        BedrockModule,
        forwardRef(() => CreditModule),
    ],
    controllers: [AnalysisController],
    providers: [AnalysisService],
})
export class AnalysisModule { }
