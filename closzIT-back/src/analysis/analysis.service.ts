import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BedrockService } from '../ai/bedrock.service';
import { PrismaService } from '../prisma/prisma.service';
import FormData = require('form-data');

@Injectable()
export class AnalysisService {
    private readonly logger = new Logger(AnalysisService.name);
    private readonly fastApiUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly bedrockService: BedrockService,
        private readonly prismaService: PrismaService,
    ) {
        this.fastApiUrl = this.configService.get<string>('FASTAPI_URL', 'http://localhost:8000');
    }

    async analyzeImage(file: Express.Multer.File) {
        const startTime = Date.now();
        this.logger.log(`[TIMING] Starting analysis for file: ${file.originalname}`);

        const formData = new FormData();
        formData.append('file', file.buffer, file.originalname);

        try {
            // 1. Call FastAPI
            const fastApiStartTime = Date.now();
            const response = await firstValueFrom(
                this.httpService.post(`${this.fastApiUrl}/analyze-all`, formData, {
                    headers: { ...formData.getHeaders() },
                }),
            );
            this.logger.log(`[TIMING] FastAPI call took ${Date.now() - fastApiStartTime}ms`);

            const items = response.data; // List of { label, confidence, image_base64, embedding }
            this.logger.log(`[TIMING] FastAPI returned ${items.length} items.`);

            // 2. Parallel Bedrock Analysis (NO DB HERE)
            const processingStartTime = Date.now();
            const results = await Promise.all(
                items.map(async (item: any, index: number) => {
                    const bedrockStartTime = Date.now();

                    // Log YOLO detection confidence
                    this.logger.log(`[Item ${index}] YOLO Label: ${item.label}, Confidence: ${(item.confidence * 100).toFixed(1)}%`);

                    // Task: Bedrock Analysis
                    const labelData = await this.bedrockService.extractClothingSpec('', item.image_base64);
                    this.logger.log(`[TIMING] Item ${index}: Bedrock took ${Date.now() - bedrockStartTime}ms`);

                    return {
                        tempId: index, // Temporary ID for frontend key
                        label: labelData,
                        image: item.image_base64,
                        embedding: item.embedding, // Pass embedding to frontend (to send back later)
                    };
                }),
            );
            this.logger.log(`[TIMING] All items processing took ${Date.now() - processingStartTime}ms`);

            return {
                message: 'Analysis completed (No DB saved)',
                results: results,
            };

        } catch (error) {
            this.logger.error('Analysis failed', error);
            throw error;
        }
    }

    async saveItems(userId: string, items: any[]) {
        this.logger.log(`[saveItems] Saving ${items.length} items for userId: ${userId}`);

        const validItems = items.filter(item => item && item.image_base64); // Basic validation

        try {
            // 각 아이템의 라벨 텍스트 생성 (영문, 공백으로 연결)
            const textsToEmbed = validItems.map(item => {
                const { colors, pattern, detail, style_mood, tpo } = item.label || {};
                const parts = [
                    ...(colors || []),
                    ...(pattern || []),
                    ...(detail || []),
                    ...(style_mood || []),
                    ...(tpo || []),
                ];
                return parts.join(' ');
            });

            // FastAPI 텍스트 임베딩 API 호출
            let textEmbeddings: number[][] = [];
            try {
                const embedResponse = await firstValueFrom(
                    this.httpService.post(`${this.fastApiUrl}/embed-text`, {
                        texts: textsToEmbed,
                    }),
                );
                textEmbeddings = embedResponse.data.embeddings;
                this.logger.log(`[saveItems] Text embeddings generated: ${textEmbeddings.length}`);
            } catch (embedError) {
                this.logger.warn(`[saveItems] Text embedding failed, using zero vectors: ${embedError.message}`);
                textEmbeddings = textsToEmbed.map(() => new Array(512).fill(0));
            }

            const results = await Promise.all(validItems.map(async (item, index) => {
                const { category, sub_category, colors, pattern, detail, style_mood, tpo, season } = item.label || {};
                const imageBase64 = item.image_base64;
                const embedding = item.embedding;

                const imageDataUrl = `data:image/png;base64,${imageBase64}`;
                const embeddingString = `[${embedding.join(',')}]`;
                const textEmbeddingString = `[${textEmbeddings[index].join(',')}]`;

                const result = await (this.prismaService as any).$queryRaw`
                    INSERT INTO "clothes" (
                        user_id, 
                        category, 
                        sub_category, 
                        colors,
                        patterns,
                        details,
                        style_mood,
                        tpos,
                        seasons,
                        image_url, 
                        image_embedding,
                        text_embedding
                    )
                    VALUES (
                        ${userId},
                        ${category || 'Other'}::"Category",
                        ${sub_category || ''},
                        ${colors || []}::"Color"[],
                        ${pattern || []}::"Pattern"[],
                        ${detail || []}::"Detail"[],
                        ${style_mood || []}::"StyleMood"[],
                        ${tpo || []}::"TPO"[],
                        ${season || []}::"Season"[],
                        ${imageDataUrl},
                        ${embeddingString}::vector,
                        ${textEmbeddingString}::vector
                    )
                    RETURNING id;
                `;
                return result[0];
            }));

            this.logger.log(`[saveItems] Successfully saved ${results.length} items.`);
            return { savedCount: results.length, ids: results.map(r => r.id) };

        } catch (error) {
            this.logger.error('[saveItems] Error saving items', error);
            throw error;
        }
    }

    async confirmItem(id: number, data: any) {
        // Legacy support or single item update if needed
        return (this.prismaService as any).item.update({
            // ... existing logic ...
            where: { id },
            data: { metadata: data }
        });
    }

    async deleteItem(id: number) {
        return (this.prismaService as any).item.delete({
            where: { id },
        });
    }
}
