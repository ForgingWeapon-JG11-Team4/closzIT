import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ImageResult {
  url: string;
  title: string;
  thumbnail?: string;
  base64?: string; // 이미지 데이터 (CORS 우회용)
}

@Injectable()
export class BarcodeService {
  private readonly serpApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.serpApiKey = this.configService.get<string>('SERPAPI_KEY') || '';
  }

  async searchImagesByBarcode(barcode: string): Promise<ImageResult[]> {
    // SerpApi를 사용하여 바코드로 Google 이미지 검색
    const searchQuery = `${barcode} clothing`;

    let results: ImageResult[] = [];

    // SerpApi 키가 있으면 SerpApi 사용
    if (this.serpApiKey) {
      try {
        results = await this.searchWithSerpApi(searchQuery);
      } catch (error) {
        console.error('SerpApi search error:', error);
      }
    }

    // SerpApi 없거나 실패 시 바코드 DB에서 제품 정보 검색
    if (results.length === 0) {
      results = await this.searchFromBarcodeDatabase(barcode);
    }

    // 각 이미지를 base64로 변환 (CORS 우회)
    const resultsWithBase64 = await Promise.all(
      results.map(async (img) => {
        const base64 = await this.fetchImageAsBase64(img.url);
        console.log(`Image ${img.url.substring(0, 50)}... base64: ${base64 ? 'SUCCESS' : 'FAILED'}`);
        return { ...img, base64 };
      }),
    );

    // base64 변환 성공한 이미지만 반환 (null, undefined, 빈 문자열 모두 제외)
    const validImages = resultsWithBase64
      .filter((img): img is typeof img & { base64: string } => !!img.base64 && img.base64.length > 0)
      .map((img) => ({ ...img, base64: img.base64 })); // 타입 명시적 변환
    console.log(`Total images: ${results.length}, Valid with base64: ${validImages.length}`);
    return validImages;
  }

  // 공개 메서드 - 이미지 URL을 base64로 변환
  async fetchImageAsBase64Public(imageUrl: string): Promise<string | null> {
    return this.fetchImageAsBase64(imageUrl);
  }

  // 이미지 URL을 base64로 변환
  private async fetchImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/*,*/*',
          Referer: new URL(imageUrl).origin,
        },
      });

      if (!response.ok) {
        console.log(`Failed to fetch image: ${imageUrl} - ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

      return base64;
    } catch (error) {
      console.log(`Error fetching image: ${imageUrl}`, error);
      return null;
    }
  }

  // SerpApi를 통한 Google 이미지 검색
  private async searchWithSerpApi(query: string): Promise<ImageResult[]> {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('api_key', this.serpApiKey);
    url.searchParams.append('engine', 'google_images');
    url.searchParams.append('q', query);
    url.searchParams.append('num', '8');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('SerpApi error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.images_results || data.images_results.length === 0) {
      return [];
    }

    return data.images_results.slice(0, 8).map((item: any) => ({
      url: item.original || item.link,
      title: item.title || '',
      thumbnail: item.thumbnail || item.original,
    }));
  }

  // 바코드 데이터베이스에서 제품 정보 검색
  private async searchFromBarcodeDatabase(barcode: string): Promise<ImageResult[]> {
    const results: ImageResult[] = [];

    // 1. UPCitemdb API 시도 (무료 100회/일)
    try {
      const upcResults = await this.searchUPCitemdb(barcode);
      if (upcResults.length > 0) {
        return upcResults;
      }
    } catch (e) {
      console.error('UPCitemdb lookup failed:', e);
    }

    // 2. Open Food Facts API 시도 (무료, 주로 식품이지만 일부 의류도 있음)
    try {
      const offResults = await this.searchOpenFoodFacts(barcode);
      if (offResults.length > 0) {
        return offResults;
      }
    } catch (e) {
      console.error('Open Food Facts lookup failed:', e);
    }

    return results;
  }

  // UPCitemdb API 검색
  private async searchUPCitemdb(barcode: string): Promise<ImageResult[]> {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    const item = data.items[0];
    const images: ImageResult[] = [];

    // 제품 이미지가 있으면 추가
    if (item.images && item.images.length > 0) {
      item.images.slice(0, 8).forEach((imageUrl: string) => {
        images.push({
          url: imageUrl,
          title: item.title || item.brand || 'Product Image',
          thumbnail: imageUrl,
        });
      });
    }

    return images;
  }

  // Open Food Facts API 검색
  private async searchOpenFoodFacts(barcode: string): Promise<ImageResult[]> {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return [];
    }

    const product = data.product;
    const images: ImageResult[] = [];

    // 제품 이미지가 있으면 추가
    if (product.image_url) {
      images.push({
        url: product.image_url,
        title: product.product_name || 'Product',
        thumbnail: product.image_small_url || product.image_url,
      });
    }

    if (product.image_front_url) {
      images.push({
        url: product.image_front_url,
        title: product.product_name || 'Product Front',
        thumbnail: product.image_front_small_url || product.image_front_url,
      });
    }

    return images;
  }
}
