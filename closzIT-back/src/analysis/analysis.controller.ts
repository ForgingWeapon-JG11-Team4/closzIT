import { Controller, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, ParseFilePipeBuilder, HttpStatus, Logger, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analysis')
export class AnalysisController {
    private readonly logger = new Logger(AnalysisController.name);

    constructor(private readonly analysisService: AnalysisService) { }

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
    async flattenClothing(@Body() body: {
        image_base64: string;
        category?: string;
        sub_category?: string;
        colors?: string[];
        pattern?: string[];
        detail?: string[];
        style_mood?: string[];
    }) {
        this.logger.log(`[flattenClothing] Request received for category: ${body.category}/${body.sub_category}`);

        try {
            const result = await this.analysisService.flattenClothing(
                body.image_base64,
                body.category,
                body.sub_category,
                {
                    colors: body.colors || [],
                    pattern: body.pattern || [],
                    detail: body.detail || [],
                    style_mood: body.style_mood || [],
                }
            );
            return result;
        } catch (error) {
            this.logger.error(`[flattenClothing] Error:`, error.message || error);
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
}
