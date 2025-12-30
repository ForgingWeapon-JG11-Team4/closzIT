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

        // 1. Call FastAPI /analyze-all
        const formData = new FormData();
        formData.append('file', file.buffer, file.originalname);

        try {
            const fastApiStartTime = Date.now();
            const response = await firstValueFrom(
                this.httpService.post(`${this.fastApiUrl}/analyze-all`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                }),
            );
            this.logger.log(`[TIMING] FastAPI call took ${Date.now() - fastApiStartTime}ms`);

            const items = response.data; // List of { image_base64, embedding, label }
            this.logger.log(`[TIMING] FastAPI returned ${items.length} items.`);

            // 2. Process each item in parallel using Promise.all
            const processingStartTime = Date.now();
            const results = await Promise.all(
                items.map(async (item: any, index: number) => {
                    const itemStartTime = Date.now();

                    // Prepare vector string for pgvector.
                    const embeddingString = `[${item.embedding.join(',')}]`;

                    // Convert base64 to Data URL for direct frontend usage
                    const imageDataUrl = `data:image/png;base64,${item.image_base64}`;
                    this.logger.log(`[TIMING] Item ${index}: image_url length = ${imageDataUrl.length} chars`);

                    // Run Bedrock and DB Insert in PARALLEL
                    const bedrockStartTime = Date.now();
                    const [labelData, savedItem] = await Promise.all([
                        // Task A: Bedrock Analysis (use image_base64 from FastAPI)
                        (async () => {
                            const result = await this.bedrockService.extractClothingSpec('', item.image_base64);
                            this.logger.log(`[TIMING] Item ${index}: Bedrock took ${Date.now() - bedrockStartTime}ms`);
                            return result;
                        })(),

                        // Task B: DB Insert (Embedding + Image as Data URL)
                        (async () => {
                            const dbStartTime = Date.now();
                            const result = await (this.prismaService as any).$queryRaw`
                                INSERT INTO "Item" (category, sub_category, metadata, image_url, tpo, season, status, embedding)
                                VALUES (
                                  '', 
                                  '', 
                                  ${null}::jsonb, 
                                  ${imageDataUrl}, 
                                  ARRAY[]::text[], 
                                  ARRAY[]::text[], 
                                  'PENDING', 
                                  ${embeddingString}::vector
                                )
                                RETURNING id, image_url;
                            `;
                            this.logger.log(`[TIMING] Item ${index}: DB INSERT took ${Date.now() - dbStartTime}ms`);
                            return result;
                        })()
                    ]);

                    const savedRecord = savedItem[0];
                    this.logger.log(`[TIMING] Item ${index}: Saved with id=${savedRecord.id}, image_url saved=${!!savedRecord.image_url}`);

                    return {
                        id: savedRecord.id, // DB ID from Task B
                        label: labelData,   // AI Result from Task A
                        image: item.image_base64,  // Use image_base64 from FastAPI
                    };
                }),
            );
            this.logger.log(`[TIMING] All items processing took ${Date.now() - processingStartTime}ms`);

            this.logger.log(`[TIMING] Total analysis took ${Date.now() - startTime}ms`);
            return {
                message: 'Analysis completed',
                results: results,
            };

        } catch (error) {
            this.logger.error('Analysis failed', error);
            throw error;
        }
    }

    async confirmItem(id: number, data: any) {
        // 3. Confirm (Update) Item
        // Data should contain final labels.
        // We update metadata and specific fields, and set status to COMPLETED.

        const { category, sub_category, tpo, season, ...otherMetadata } = data;

        // Merge existing metadata? Or just overwrite. For now overwrite metadata with full confirmed structure.

        return (this.prismaService as any).item.update({
            where: { id },
            data: {
                category,
                sub_category,
                tpo: tpo,
                season: season,
                metadata: data, // Save full data to metadata as well
                status: 'COMPLETED',
            },
        });
    }
}
