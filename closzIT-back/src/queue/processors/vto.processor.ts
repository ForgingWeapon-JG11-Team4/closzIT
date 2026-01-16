import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { FittingService } from '../../fitting/fitting.service';

interface VtoJobData {
    userId: string;
    personImageUrl: string;
    clothingUrls: {
        outer?: string;
        top?: string;
        bottom?: string;
        shoes?: string;
    };
    type?: string; // 'partial-try-on-by-ids' | 'sns-virtual-try-on'
    postId?: string; // SNS VTO인 경우
}

@Injectable()
@Processor('vto-queue', {
    concurrency: 3, // 동시에 3개 작업 처리
})
export class VtoProcessor extends WorkerHost {
    private readonly logger = new Logger(VtoProcessor.name);

    constructor(
        @Inject(forwardRef(() => FittingService))
        private readonly fittingService: FittingService,
    ) {
        super();
    }

    async process(job: Job<VtoJobData>): Promise<any> {
        const { userId, personImageUrl, clothingUrls, type, postId } = job.data;

        this.logger.log(`[VTO Worker] Processing job ${job.id} for user ${userId}, type: ${type || 'unknown'}`);

        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                await job.updateProgress(10 + (attempt - 1) * 10);

                this.logger.log(`[VTO Worker] Job ${job.id} attempt ${attempt}/${MAX_RETRIES}`);

                // 실제 VTO 작업 수행 (기존 로직 호출)
                const result = await this.fittingService.processVirtualFittingFromUrls(
                    personImageUrl,
                    clothingUrls,
                    userId,
                );

                await job.updateProgress(100);

                this.logger.log(`[VTO Worker] Job ${job.id} completed successfully on attempt ${attempt}`);

                // SNS VTO인 경우 postId 포함
                if (postId) {
                    return { ...result, postId };
                }

                return result;
            } catch (error) {
                lastError = error;
                const errorMsg = error.message || '';
                const isRetryableError =
                    errorMsg.includes('Invalid response structure') ||
                    errorMsg.includes('No content parts') ||
                    errorMsg.includes('did not generate any candidates') ||
                    errorMsg.includes('No image data') ||
                    errorMsg.includes('가상 피팅 처리 중 오류') ||
                    errorMsg.includes('가상 착장') ||
                    error.status === 429 ||
                    error.status === 503 ||
                    error.status === 500;

                if (isRetryableError && attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 1000;
                    this.logger.warn(`[VTO Worker] Job ${job.id} attempt ${attempt} failed (retryable), waiting ${delay}ms: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                this.logger.error(`[VTO Worker] Job ${job.id} failed after ${attempt} attempts: ${error.message}`);

                // 에러 코드를 포함한 상세 메시지 생성
                const errorCode = error.status || error.statusCode || '';
                const errorCodeStr = errorCode ? ` [${errorCode}]` : '';
                const detailedError = new Error(`${error.message}${errorCodeStr}`);
                throw detailedError;
            }
        }

        throw lastError || new Error('VTO processing failed after max retries');
    }
}
