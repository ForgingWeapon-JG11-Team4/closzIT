import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

import axios from 'axios';

export interface ExtractedImage {
    src: string;
    alt: string;
    width: number;
    height: number;
}

@Injectable()
export class CrawlService {
    private readonly logger = new Logger(CrawlService.name);

    /**
     * URL에서 의상 이미지들을 추출합니다.
     */
    async extractImages(url: string): Promise<ExtractedImage[]> {
        this.logger.log(`[CRAWL] Starting image extraction from: ${url}`);

        let browser: puppeteer.Browser | null = null;

        try {
            // Puppeteer 브라우저 실행
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ],
            });

            const page = await browser.newPage();

            // User-Agent 설정 (일반 브라우저처럼 보이도록)
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            );

            // 뷰포트 설정
            await page.setViewport({ width: 1920, height: 1080 });

            // 페이지 로드
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // 스크롤하여 레이지 로딩 이미지 로드
            await this.autoScroll(page);

            // 이미지 추출 - 상품 이미지 특정
            const images = await page.evaluate(() => {
                const imgElements = document.querySelectorAll('img');
                const result: {
                    src: string;
                    alt: string;
                    width: number;
                    height: number;
                    score: number;
                }[] = [];

                // 광고/배너 제외 패턴
                const excludePatterns = [
                    /banner/i, /ad\d*\./i, /advertisement/i, /popup/i,
                    /logo/i, /icon/i, /sprite/i, /button/i,
                    /loading/i, /placeholder/i, /blank/i,
                    /social/i, /share/i, /facebook/i, /instagram/i, /twitter/i,
                    /kakao/i, /naver/i, /payment/i, /card/i,
                    /arrow/i, /close/i, /menu/i, /search/i
                ];

                // 상품 관련 키워드 (우선순위 증가)
                const productPatterns = [
                    /goods/i, /product/i, /item/i, /detail/i,
                    /thumbnail/i, /main/i, /img_\d/i,
                    /clothing/i, /fashion/i, /wear/i
                ];

                imgElements.forEach((img) => {
                    const naturalWidth = img.naturalWidth || img.width;
                    const naturalHeight = img.naturalHeight || img.height;
                    let src = img.src || '';

                    // data: URL 제외
                    if (src.startsWith('data:')) return;

                    // 너무 작은 이미지 제외 (300px 미만)
                    if (naturalWidth < 300 || naturalHeight < 300) return;

                    // 1:1에 가까운 정사각형이나 세로형 이미지 우선 (배너는 보통 가로가 김)
                    const aspectRatio = naturalWidth / naturalHeight;
                    if (aspectRatio > 2.5) return; // 너무 가로로 긴 이미지 제외 (배너)

                    // 절대 URL로 변환
                    if (src.startsWith('//')) {
                        src = 'https:' + src;
                    } else if (src.startsWith('/')) {
                        src = new URL(src, window.location.origin).href;
                    }

                    // 광고/배너 URL 제외
                    const isExcluded = excludePatterns.some(pattern =>
                        pattern.test(src) || pattern.test(img.alt || '') ||
                        pattern.test(img.className || '')
                    );
                    if (isExcluded) return;

                    // 점수 계산
                    let score = 0;

                    // 크기 점수 (클수록 높음)
                    score += Math.min(naturalWidth, 1000) / 100;
                    score += Math.min(naturalHeight, 1000) / 100;

                    // 세로형 이미지 보너스 (의상은 보통 세로)
                    if (aspectRatio < 1) score += 5;
                    if (aspectRatio >= 0.6 && aspectRatio <= 0.9) score += 3; // 3:4 비율 근처

                    // 상품 관련 키워드 보너스
                    const isProduct = productPatterns.some(pattern =>
                        pattern.test(src) || pattern.test(img.alt || '')
                    );
                    if (isProduct) score += 10;

                    // alt 텍스트에 의상 관련 키워드
                    const alt = img.alt || '';
                    if (/티셔츠|셔츠|바지|자켓|코트|원피스|스커트|니트|후드|맨투맨/i.test(alt)) {
                        score += 15;
                    }

                    // 중복 방지
                    if (!result.some((existing) => existing.src === src)) {
                        result.push({
                            src,
                            alt: img.alt || '',
                            width: naturalWidth,
                            height: naturalHeight,
                            score,
                        });
                    }
                });

                // 점수 순으로 정렬하고 상위 20개만 반환
                return result
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 20)
                    .map(({ score, ...rest }) => rest); // score 필드 제거
            });

            this.logger.log(`[CRAWL] Extracted ${images.length} images from ${url}`);
            return images;
        } catch (error) {
            this.logger.error(`[CRAWL] Error extracting images: ${error.message}`);
            throw new HttpException(
                `Failed to crawl page: ${error.message}`,
                HttpStatus.BAD_REQUEST,
            );
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }



    /**
     * 페이지 스크린샷 캡처
     */
    async captureScreenshot(url: string): Promise<string> {
        this.logger.log(`[CAPTURE] Taking screenshot of: ${url}`);

        let browser: puppeteer.Browser | null = null;

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1080, height: 1920, isMobile: true });
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            const screenshot = await page.screenshot({
                encoding: 'base64',
                fullPage: false,
            });

            return `data:image/png;base64,${screenshot}`;
        } catch (error) {
            this.logger.error(`[CAPTURE] Error taking screenshot: ${error.message}`);
            throw new HttpException(
                `Failed to capture screenshot: ${error.message}`,
                HttpStatus.BAD_REQUEST,
            );
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * 자동 스크롤 (레이지 로딩 이미지 로드)
     */
    private async autoScroll(page: puppeteer.Page): Promise<void> {
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight || totalHeight > 10000) {
                        clearInterval(timer);
                        // 스크롤 후 잠시 대기 (이미지 로딩 시간)
                        setTimeout(resolve, 1000);
                    }
                }, 200);
            });
        });
    }

    /**
     * 상대 URL을 절대 URL로 변환
     */
    private resolveUrl(url: string, baseUrl: URL): string | null {
        if (!url) return null;

        try {
            if (url.startsWith('data:') || url.startsWith('javascript:')) {
                return url;
            }
            if (url.startsWith('//')) {
                return 'https:' + url;
            }
            if (url.startsWith('http')) {
                return url;
            }
            return new URL(url, baseUrl.origin).href;
        } catch {
            return null;
        }
    }

    /**
     * 외부 이미지를 다운로드하여 Base64로 반환
     */
    async downloadImageAsBase64(
        imageUrl: string,
    ): Promise<{ base64: string; mimeType: string }> {
        this.logger.log(`[DOWNLOAD] Downloading image: ${imageUrl}`);

        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'image/*,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    Referer: new URL(imageUrl).origin,
                },
                timeout: 30000,
            });

            const buffer = Buffer.from(response.data);
            const base64 = buffer.toString('base64');
            const mimeType =
                response.headers['content-type'] || 'image/jpeg';

            this.logger.log(
                `[DOWNLOAD] Downloaded ${buffer.length} bytes, mimeType: ${mimeType}`,
            );

            return { base64, mimeType };
        } catch (error) {
            this.logger.error(`[DOWNLOAD] Error downloading image: ${error.message}`);
            throw new HttpException(
                `Failed to download image: ${error.message}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}

