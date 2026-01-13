import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { AnalysisService } from '../../analysis/analysis.service';

interface FlattenJobData {
    userId: string;
    imageBase64: string;
    category?: string;
    subCategory?: string;
    labelInfo?: {
        colors?: string[];
        pattern?: string[];
        detail?: string[];
        style_mood?: string[];
    };
}

@Injectable()
@Processor('flatten-queue', {
    concurrency: 3, // 동시에 3개 작업 처리 (대기 시간 단축)
})
export class FlattenProcessor extends WorkerHost {
    private readonly logger = new Logger(FlattenProcessor.name);

    constructor(
        @Inject(forwardRef(() => AnalysisService))
        private readonly analysisService: AnalysisService,
    ) {
        super();
    }

    async process(job: Job<FlattenJobData>): Promise<any> {
        const { userId, imageBase64, category, subCategory, labelInfo } = job.data;

        this.logger.log(`[Flatten Worker] Processing job ${job.id} for user ${userId}`);

        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                await job.updateProgress(10 + (attempt - 1) * 10);

                this.logger.log(`[Flatten Worker] Job ${job.id} attempt ${attempt}/${MAX_RETRIES}`);

                // 실제 옷펴기 작업 수행 (기존 로직 호출)
                const result = await this.analysisService.flattenClothing(
                    userId,
                    imageBase64,
                    category,
                    subCategory,
                    labelInfo,
                );

                await job.updateProgress(100);

                this.logger.log(`[Flatten Worker] Job ${job.id} completed successfully on attempt ${attempt}`);

                return result;
            } catch (error) {
                lastError = error;
                const errorMsg = error.message || '';
                const isRetryableError =
                    errorMsg.includes('Invalid response structure') ||
                    errorMsg.includes('No content parts') ||
                    errorMsg.includes('did not generate any candidates') ||
                    errorMsg.includes('No image data') ||
                    errorMsg.includes('옷펴기') ||  // HttpException 메시지
                    errorMsg.includes('flat') ||
                    error.status === 429 ||
                    error.status === 503 ||
                    error.status === 500;  // 500 에러도 재시도

                if (isRetryableError && attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 1000; // 2초, 4초, 8초
                    this.logger.warn(`[Flatten Worker] Job ${job.id} attempt ${attempt} failed (retryable), waiting ${delay}ms: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                this.logger.error(`[Flatten Worker] Job ${job.id} failed after ${attempt} attempts: ${error.message}`);
                throw error;
            }
        }

        throw lastError || new Error('Flatten processing failed after max retries');
    }
}
