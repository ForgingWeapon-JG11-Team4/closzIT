import {
    Controller,
    Post,
    Body,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { CrawlService, ExtractedImage } from './crawl.service';

@Controller('crawl')
export class CrawlController {
    constructor(private readonly crawlService: CrawlService) { }

    /**
     * URL에서 이미지 추출하기
     * POST /crawl/images
     * Body: { url: string }
     */
    @Post('images')
    async extractImages(
        @Body() body: { url: string },
    ): Promise<{ images: ExtractedImage[] }> {
        if (!body.url) {
            throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
        }

        const images = await this.crawlService.extractImages(body.url);
        return { images };
    }

    /**
     * 페이지 스크린샷 캡처
     * POST /crawl/screenshot
     * Body: { url: string }
     */
    @Post('screenshot')
    async captureScreenshot(
        @Body() body: { url: string },
    ): Promise<{ screenshot: string }> {
        if (!body.url) {
            throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
        }

        const screenshot = await this.crawlService.captureScreenshot(body.url);
        return { screenshot };
    }

    /**
     * 외부 이미지를 다운로드하여 Base64로 반환 (CORS 우회)
     * POST /crawl/download-image
     * Body: { url: string }
     */
    @Post('download-image')
    async downloadImage(
        @Body() body: { url: string },
    ): Promise<{ base64: string; mimeType: string }> {
        if (!body.url) {
            throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
        }

        const result = await this.crawlService.downloadImageAsBase64(body.url);
        return result;
    }
}
