import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { FittingService } from '../../fitting/fitting.service';
import { S3Service } from '../../s3/s3.service';
import { PrismaService } from '../../prisma/prisma.service';

interface VtoJobData {
    userId: string;
    personImageUrl: string;
    clothingUrls: {
        outer?: string;
        top?: string;
        bottom?: string;
        shoes?: string;
    };
    type?: string; // 'partial-try-on-by-ids' | 'sns-virtual-try-on' | 'sns-full-try-on'
    postId?: string; // SNS VTO인 경우
    hashKey?: string; // 캐시 저장용 (sns-full-try-on)
    clothingIds?: string[]; // 캐시 저장용 (sns-full-try-on)
}

@Injectable()
@Processor(process.env.VTO_QUEUE_NAME || 'vto-queue', {
    concurrency: 3, // 동시에 3개 작업 처리
})
export class VtoProcessor extends WorkerHost implements OnModuleInit {
    private readonly logger = new Logger(VtoProcessor.name);

    constructor(
        @Inject(forwardRef(() => FittingService))
        private readonly fittingService: FittingService,
        private readonly s3Service: S3Service,
        private readonly prisma: PrismaService,
    ) {
        super();
        this.logger.log('[VTO Worker] VtoProcessor initialized and ready to process jobs');
    }

    async onModuleInit() {
        // BullMQ 워커 이벤트 리스너 등록
        const worker = this.worker;

        if (worker) {
            worker.on('failed', (job, error) => {
                this.logger.error(`[VTO Worker] Job ${job?.id} failed: ${error.message}`);
            });

            worker.on('error', (error) => {
                this.logger.error(`[VTO Worker] Worker error: ${error.message}`);
            });
        }
    }

    async process(job: Job<VtoJobData>): Promise<any> {
        const { userId, personImageUrl, clothingUrls, type, postId, hashKey, clothingIds } = job.data;


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

                await job.updateProgress(80);

                // 디버그: 캐싱 조건 확인
                this.logger.log(`[VTO Worker] Job ${job.id} cache check - hashKey: ${hashKey ? 'exists' : 'null'}, clothingIds: ${clothingIds ? `${clothingIds.length} items` : 'null'}, type: ${type}`);

                // hashKey가 있으면 S3 업로드 + DB 저장 (sns-full-try-on, partial-try-on-by-ids 모두)
                if (hashKey && clothingIds && clothingIds.length >= 1) {
                    try {
                        // Base64 이미지를 S3에 업로드 (closzit-ai-results 버킷)
                        const imageBase64 = result.imageUrl.replace(/^data:image\/\w+;base64,/, '');
                        const s3Key = `vto/${userId}/${hashKey}.png`;
                        const s3Url = await this.s3Service.uploadBase64Image(
                            imageBase64,
                            s3Key,
                            'image/png',
                            'closzit-ai-results'
                        );

                        this.logger.log(`[VTO Worker] S3 upload complete: ${s3Key}`);

                        // DB에 캐시 저장 (upsert로 중복 hashKey 처리)
                        await this.prisma.vtoCache.upsert({
                            where: { hashKey },
                            update: {
                                s3Url,  // 새 이미지로 업데이트
                                isVisible: true,  // 다시 보이도록
                            },
                            create: {
                                hashKey,
                                userId,
                                postId: postId || 'direct-fitting',
                                clothingIds,
                                s3Url,
                                isVisible: true,
                            },
                        });

                        this.logger.log(`[VTO Worker] DB cache saved for hashKey: ${hashKey.slice(0, 16)}...`);

                        // S3 URL을 Pre-signed URL로 변환하여 반환
                        const presignedUrl = await this.s3Service.convertToPresignedUrl(s3Url);

                        await job.updateProgress(100);
                        this.logger.log(`[VTO Worker] Job ${job.id} completed successfully on attempt ${attempt}`);

                        return {
                            success: true,
                            imageUrl: presignedUrl,
                            postId,
                            appliedClothing: result.appliedClothing,
                        };
                    } catch (saveError) {
                        // 저장 실패해도 결과는 반환 (캐싱 실패만 로그)
                        this.logger.error(`[VTO Worker] Cache save failed: ${saveError.message}`);
                        await job.updateProgress(100);
                        return { ...result, postId };
                    }
                }

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
