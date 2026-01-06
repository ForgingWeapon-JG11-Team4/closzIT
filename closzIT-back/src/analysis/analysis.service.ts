import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BedrockService } from '../ai/bedrock.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { GoogleGenAI } from '@google/genai';
import FormData = require('form-data');

@Injectable()
export class AnalysisService {
    private readonly logger = new Logger(AnalysisService.name);
    private readonly fastApiUrl: string;
    private readonly ai: GoogleGenAI;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly bedrockService: BedrockService,
        private readonly prismaService: PrismaService,
        @Inject(forwardRef(() => CreditService))
        private readonly creditService: CreditService,
    ) {
        this.fastApiUrl = this.configService.get<string>('FASTAPI_URL', 'http://localhost:8000');

        // Gemini AI 초기화
        const googleApiKey = this.configService.get<string>('GOOGLE_API_KEY');
        if (googleApiKey) {
            this.ai = new GoogleGenAI({ apiKey: googleApiKey });
            this.logger.log('Gemini AI initialized for clothes flattening');
        }
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

                    // Task: Bedrock Analysis (YOLO label을 힌트로 전달)
                    const labelData = await this.bedrockService.extractClothingSpec('', item.image_base64, item.label);
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
                const flattenImageBase64 = item.flatten_image_base64;
                const embedding = item.embedding;

                const imageDataUrl = `data:image/png;base64,${imageBase64}`;
                const flattenImageDataUrl = flattenImageBase64 ? `data:image/png;base64,${flattenImageBase64}` : null;
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
                        flatten_image_url,
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
                        ${flattenImageDataUrl},
                        ${embeddingString}::vector,
                        ${textEmbeddingString}::vector
                    )
                    RETURNING id;
                `;
                return result[0];
            }));

            this.logger.log(`[saveItems] Successfully saved ${results.length} items.`);

            // 각 의류 등록마다 10크레딧 지급
            try {
                for (let i = 0; i < results.length; i++) {
                    await this.creditService.grantClothingAddedCredit(userId);
                }
                this.logger.log(`[saveItems] Granted ${results.length * 10} credits for clothing registration`);
            } catch (creditError) {
                this.logger.error('[saveItems] Failed to grant credits', creditError);
            }

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

    /**
     * Gemini API를 사용하여 의상 이미지를 펼쳐진 플랫레이 형태로 변환
     * 성공 시 1 크레딧 차감
     */
    async flattenClothing(
        userId: string,
        imageBase64: string,
        category?: string,
        subCategory?: string,
        labelInfo?: {
            colors?: string[];
            pattern?: string[];
            detail?: string[];
            style_mood?: string[];
        }
    ) {
        if (!this.ai) {
            throw new Error('Gemini AI is not initialized. Check GOOGLE_API_KEY.');
        }

        const startTime = Date.now();
        this.logger.log(`[flattenClothing] Starting flattening for category: ${category}/${subCategory}, userId: ${userId}`);

        try {
            // 상세 라벨링 정보 구성
            const categoryInfo = category && subCategory
                ? `Clothing Type: ${category} - ${subCategory}`
                : category
                    ? `Clothing Type: ${category}`
                    : 'Clothing item';

            const colorsInfo = labelInfo?.colors?.length
                ? `Colors: ${labelInfo.colors.join(', ')}`
                : '';
            const patternInfo = labelInfo?.pattern?.length
                ? `Patterns: ${labelInfo.pattern.join(', ')}`
                : '';
            const detailInfo = labelInfo?.detail?.length
                ? `Details/Features: ${labelInfo.detail.join(', ')}`
                : '';
            const styleInfo = labelInfo?.style_mood?.length
                ? `Style/Mood: ${labelInfo.style_mood.join(', ')}`
                : '';

            // 카테고리별 특화 지시사항
            let categorySpecificInstructions = '';
            if (category === 'Top' || category === 'Outer') {
                categorySpecificInstructions = `
SPECIFIC INSTRUCTIONS FOR TOPS/OUTERWEAR:
- Spread BOTH sleeves fully extended horizontally outward in a T-shape
- Front should face upward (camera perspective)
- Collar/neckline should be at the top center
- If it has buttons/zipper, show it closed but lying flat
- Maintain the natural shape of shoulders`;
            } else if (category === 'Bottom') {
                categorySpecificInstructions = `
SPECIFIC INSTRUCTIONS FOR PANTS/BOTTOMS:
- Spread BOTH legs fully extended downward
- Waistband should be at the top
- Show the front side facing upward
- Legs should be parallel and not overlapping`;
            } else if (category === 'Shoes') {
                categorySpecificInstructions = `
SPECIFIC INSTRUCTIONS FOR SHOES:
- Show both shoes side by side
- Position them symmetrically
- Show them from a top-down angle
- Maintain the exact shape and design`;
            }

            const prompt = `
You are a professional fashion product photographer. Transform this clothing item into a perfect e-commerce flat-lay product photo.

=== CLOTHING INFORMATION ===
${categoryInfo}
${colorsInfo}
${patternInfo}
${detailInfo}
${styleInfo}

=== TRANSFORMATION REQUIREMENTS ===
1. CREATE A PERFECT FLAT-LAY PHOTO: The garment should look like it's professionally laid flat on a pure white surface
2. COMPLETELY UNFOLD THE GARMENT: NO folding, NO creasing, NO overlapping parts
3. FULLY EXTEND ALL PARTS: Sleeves must spread outward horizontally, legs must spread downward
4. MAINTAIN EXACT APPEARANCE: Preserve the EXACT same colors, patterns, textures, logos, prints, and all visual details from the original image
5. PURE WHITE BACKGROUND: Clean, bright white background with no shadows
6. TOP-DOWN CAMERA ANGLE: Bird's eye view, looking straight down at the garment
7. PROFESSIONAL LIGHTING: Even, soft lighting with no harsh shadows
8. HIGH QUALITY: Sharp, clear, high-resolution output suitable for e-commerce
9. VERTICAL/PORTRAIT ORIENTATION: The garment MUST be positioned upright in portrait orientation (like online shopping thumbnails)
   - For tops: collar/neckline at TOP, hem at BOTTOM
   - For bottoms: waistband at TOP, leg hems at BOTTOM
   - NEVER place the garment sideways or horizontally rotated

${categorySpecificInstructions}

=== CRITICAL RULES ===
- DO NOT fold sleeves inward or across the body
- DO NOT add any text, watermarks, or labels
- DO NOT change the color or pattern of the clothing
- DO NOT add any accessories or items not in the original
- DO NOT rotate the garment sideways - it must be upright like a shopping site thumbnail
- The result should look like a real product photo from an online clothing store

OUTPUT: Generate ONLY the transformed flat-lay image. No text, no explanation.
`;

            // 디버깅: 이미지 크기 로깅
            this.logger.log(`[flattenClothing] Image base64 length: ${imageBase64.length} chars`);

            const response = await this.ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageBase64,
                        },
                    },
                ],
                config: {
                    responseModalities: ['image', 'text'],
                },
            });

            const processingTime = (Date.now() - startTime) / 1000;
            this.logger.log(`[flattenClothing] Gemini API took ${processingTime.toFixed(2)}s`);

            // 응답에서 이미지 추출
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error('Gemini did not generate any candidates');
            }

            const candidate = response.candidates[0];
            if (!candidate.content || !candidate.content.parts) {
                throw new Error('Invalid response structure from Gemini');
            }

            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    const flattenedImageBase64 = part.inlineData.data;
                    this.logger.log('[flattenClothing] Image flattening successful');

                    // 성공 시 1 크레딧 차감
                    try {
                        await this.creditService.deductFlattenCredit(userId);
                        this.logger.log(`[flattenClothing] Deducted 1 credit for userId: ${userId}`);
                    } catch (creditError) {
                        this.logger.error('[flattenClothing] Failed to deduct credit:', creditError.message);
                        throw creditError;
                    }

                    return {
                        success: true,
                        flattened_image_base64: flattenedImageBase64,
                        processingTime,
                    };
                }
            }

            throw new Error('No image data in Gemini response');

        } catch (error) {
            this.logger.error('[flattenClothing] Error:', error.message);
            throw error;
        }
    }
}

