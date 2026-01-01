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
}
