import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, ParseFilePipeBuilder, HttpStatus, Logger, UseGuards, Req, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { S3Service } from '../s3/s3.service';

@Controller('analysis')
export class AnalysisController {
    private readonly logger = new Logger(AnalysisController.name);

    constructor(
        private readonly analysisService: AnalysisService,
        private readonly s3Service: S3Service,
        @InjectQueue('flatten-queue') private flattenQueue: Queue,
    ) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async analyzeImage(
        @UploadedFile() file: Express.Multer.File,
    ) {
        this.logger.log(`[analyzeImage] Received file: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`);

        try {
            const result = await this.analysisService.analyzeImage(file);
            this.logger.log(`[analyzeImage] Analysis complete, returning ${result.results?.length || 0} items`);
            return result;
        } catch (error) {
            this.logger.error(`[analyzeImage] Error:`, error.message || error);
            throw error;
        }
    }

    @Post('save')
    @UseGuards(JwtAuthGuard)
    async saveItems(@Req() req, @Body() body: { items: any[] }) {
        const userId = req.user.id;
        this.logger.log(`[saveItems] Request for userId: ${userId}, items: ${body.items?.length}`);
        return this.analysisService.saveItems(userId, body.items);
    }

    @Patch(':id/confirm')
    async confirmItem(@Param('id') id: string, @Body() data: any) {
        return this.analysisService.confirmItem(parseInt(id), data);
    }

    @Delete(':id')
    async deleteItem(@Param('id') id: string) {
        return this.analysisService.deleteItem(parseInt(id));
    }

    @Post('flatten')
    @UseGuards(JwtAuthGuard)
    async flattenClothing(@Req() req, @Body() body: {
        image_base64: string;
        category?: string;
        sub_category?: string;
        colors?: string[];
        pattern?: string[];
        detail?: string[];
        style_mood?: string[];
    }) {
        const userId = req.user.id;
        this.logger.log(`[flattenClothing] Queuing request for category: ${body.category}/${body.sub_category}, userId: ${userId}`);

        try {
            // 큐에 작업 추가 (즉시 반환)
            const job = await this.flattenQueue.add('flatten', {
                userId,
                imageBase64: body.image_base64,
                category: body.category,
                subCategory: body.sub_category,
                labelInfo: {
                    colors: body.colors || [],
                    pattern: body.pattern || [],
                    detail: body.detail || [],
                    style_mood: body.style_mood || [],
                },
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: { age: 300, count: 100 }, // 5분간 또는 100개까지 보존
                removeOnFail: { age: 3600 }, // 실패는 1시간 보존
            });

            this.logger.log(`[flattenClothing] Job ${job.id} queued for userId: ${userId}`);

            return {
                success: true,
                jobId: job.id,
                status: 'queued',
                message: '옷펴기 작업이 대기열에 추가되었습니다.',
            };
        } catch (error) {
            this.logger.error(`[flattenClothing] Error queuing job:`, error.message || error);
            throw error;
        }
    }

    @Post('similar')
    @UseGuards(JwtAuthGuard)
    async findSimilarClothing(
        @Req() req: any,
        @Body() body: {
            image_base64?: string;
            embedding?: number[];
            category?: string;
            sub_category?: string;
        }
    ) {
        const userId = req.user.id;
        this.logger.log(`[findSimilar] Request for user: ${userId}, category: ${body.category}/${body.sub_category}`);

        try {
            const result = await this.analysisService.findSimilarItems(
                userId,
                body.embedding,
                body.category,
                body.sub_category,
            );
            return result;
        } catch (error) {
            this.logger.error(`[findSimilar] Error:`, error.message || error);
            throw error;
        }
    }
    @Get('demo-image')
    async getDemoImage(
        @Query('setId') setId: string,
        @Query('category') category: string,
        @Res() res: Response,
    ) {
        if (!setId || !category) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing setId or category' });
        }

        const key = `demo/${setId}/${category}.png`;
        this.logger.log(`[getDemoImage] Fetching demo image: ${key}`);

        try {
            const stream = await this.s3Service.getDemoImage(key, 'closzit-ai-results');
            res.setHeader('Content-Type', 'image/png');
            // Cache control for performance (optional but good)
            res.setHeader('Cache-Control', 'public, max-age=3600');
            stream.pipe(res);
        } catch (error) {
            this.logger.error(`[getDemoImage] Failed to get demo image: ${key}`, error);
            res.status(HttpStatus.NOT_FOUND).json({ message: 'Demo image not found' });
        }
    }
}
