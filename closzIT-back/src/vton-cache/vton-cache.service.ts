import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface HumanCacheData {
  human_img_url: string;
  mask_url: string;
  mask_gray_url: string;
  pose_img_tensor_url: string;
}

export interface GarmentCacheData {
  garm_img_url: string;
  garm_tensor_url: string;
}

export interface TextCacheData {
  prompt_embeds_url: string;
  negative_prompt_embeds_url: string;
  pooled_prompt_embeds_url: string;
  negative_pooled_prompt_embeds_url: string;
  prompt_embeds_c_url: string;
}

@Injectable()
export class VtonCacheService {
  private readonly logger = new Logger(VtonCacheService.name);
  private readonly vtonApiUrl: string;

  constructor(
    private readonly s3Service: S3Service,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // IDM-VTON 전용 서버 URL (포트 55554, conda 환경)
    this.vtonApiUrl = this.configService.get<string>('VTON_API_URL', 'http://localhost:55554');
    this.logger.log(`VTON API URL: ${this.vtonApiUrl}`);
  }

  /**
   * 사람 이미지 전처리 및 S3 캐싱 (OpenPose + Parsing + DensePose)
   * @param userId - 사용자 UUID
   * @param imageBase64 - 사람 전신 이미지 (Base64)
   * @returns S3에 저장된 캐시 데이터 URL들
   */
  async preprocessAndCacheHuman(userId: string, imageBase64: string): Promise<HumanCacheData> {
    this.logger.log(`[preprocessHuman] Starting for userId: ${userId}`);
    const startTime = Date.now();

    try {
      // IDM-VTON API 호출: OpenPose + Parsing + DensePose
      const response = await firstValueFrom(
        this.httpService.post(`${this.vtonApiUrl}/vton/preprocess-human`, {
          user_id: userId,
          image_base64: imageBase64,
        })
      );

      const { human_img, mask, mask_gray, pose_img_tensor } = response.data;

      // S3에 병렬 업로드
      const [human_img_url, mask_url, mask_gray_url, pose_img_tensor_url] = await Promise.all([
        this.s3Service.uploadBase64Image(human_img, `users/${userId}/vton-cache/human_img.png`),
        this.s3Service.uploadBase64Image(mask, `users/${userId}/vton-cache/mask.png`),
        this.s3Service.uploadBase64Image(mask_gray, `users/${userId}/vton-cache/mask_gray.png`),
        this.uploadBinaryToS3(pose_img_tensor, `users/${userId}/vton-cache/pose_tensor.pkl`),
      ]);

      const elapsed = (Date.now() - startTime) / 1000;
      this.logger.log(`[preprocessHuman] Completed in ${elapsed.toFixed(2)}s for userId: ${userId}`);

      return {
        human_img_url,
        mask_url,
        mask_gray_url,
        pose_img_tensor_url,
      };
    } catch (error) {
      this.logger.error(`[preprocessHuman] Failed for userId: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 옷 이미지 전처리 및 S3 캐싱
   * @param userId - 사용자 UUID
   * @param clothingId - 옷 UUID
   * @param imageBase64 - 옷 이미지 (Base64)
   * @returns S3에 저장된 캐시 데이터 URL들
   */
  async preprocessAndCacheGarment(
    userId: string,
    clothingId: string,
    imageBase64: string
  ): Promise<GarmentCacheData> {
    this.logger.log(`[preprocessGarment] Starting for clothingId: ${clothingId}`);
    const startTime = Date.now();

    try {
      // IDM-VTON API 호출: 옷 전처리 (리사이즈 + 텐서 변환)
      const response = await firstValueFrom(
        this.httpService.post(`${this.vtonApiUrl}/vton/preprocess-garment`, {
          user_id: userId,
          clothing_id: clothingId,
          image_base64: imageBase64,
        })
      );

      const { garm_img, garm_tensor } = response.data;

      // S3에 병렬 업로드
      const [garm_img_url, garm_tensor_url] = await Promise.all([
        this.s3Service.uploadBase64Image(garm_img, `users/${userId}/vton-cache/garments/${clothingId}_img.png`),
        this.uploadBinaryToS3(garm_tensor, `users/${userId}/vton-cache/garments/${clothingId}_tensor.pkl`),
      ]);

      const elapsed = (Date.now() - startTime) / 1000;
      this.logger.log(`[preprocessGarment] Completed in ${elapsed.toFixed(2)}s for clothingId: ${clothingId}`);

      return {
        garm_img_url,
        garm_tensor_url,
      };
    } catch (error) {
      this.logger.error(`[preprocessGarment] Failed for clothingId: ${clothingId}`, error);
      throw error;
    }
  }

  /**
   * 텍스트 설명을 임베딩으로 변환 및 S3 캐싱
   * @param userId - 사용자 UUID
   * @param clothingId - 옷 UUID
   * @param garmentDescription - 옷 설명 텍스트 (Claude 라벨링 결과)
   * @returns S3에 저장된 임베딩 데이터 URL들
   */
  async preprocessAndCacheText(
    userId: string,
    clothingId: string,
    garmentDescription: string
  ): Promise<TextCacheData> {
    this.logger.log(`[preprocessText] Starting for clothingId: ${clothingId}, text: "${garmentDescription}"`);
    const startTime = Date.now();

    try {
      // IDM-VTON API 호출: CLIP 텍스트 인코딩
      const response = await firstValueFrom(
        this.httpService.post(`${this.vtonApiUrl}/vton/preprocess-text`, {
          user_id: userId,
          clothing_id: clothingId,
          garment_description: garmentDescription,
        })
      );

      const {
        prompt_embeds,
        negative_prompt_embeds,
        pooled_prompt_embeds,
        negative_pooled_prompt_embeds,
        prompt_embeds_c,
      } = response.data;

      // S3에 병렬 업로드
      const [
        prompt_embeds_url,
        negative_prompt_embeds_url,
        pooled_prompt_embeds_url,
        negative_pooled_prompt_embeds_url,
        prompt_embeds_c_url,
      ] = await Promise.all([
        this.uploadBinaryToS3(prompt_embeds, `users/${userId}/vton-cache/text/${clothingId}_prompt_embeds.pkl`),
        this.uploadBinaryToS3(negative_prompt_embeds, `users/${userId}/vton-cache/text/${clothingId}_negative_prompt_embeds.pkl`),
        this.uploadBinaryToS3(pooled_prompt_embeds, `users/${userId}/vton-cache/text/${clothingId}_pooled_prompt_embeds.pkl`),
        this.uploadBinaryToS3(negative_pooled_prompt_embeds, `users/${userId}/vton-cache/text/${clothingId}_negative_pooled_prompt_embeds.pkl`),
        this.uploadBinaryToS3(prompt_embeds_c, `users/${userId}/vton-cache/text/${clothingId}_prompt_embeds_c.pkl`),
      ]);

      const elapsed = (Date.now() - startTime) / 1000;
      this.logger.log(`[preprocessText] Completed in ${elapsed.toFixed(2)}s for clothingId: ${clothingId}`);

      return {
        prompt_embeds_url,
        negative_prompt_embeds_url,
        pooled_prompt_embeds_url,
        negative_pooled_prompt_embeds_url,
        prompt_embeds_c_url,
      };
    } catch (error) {
      this.logger.error(`[preprocessText] Failed for clothingId: ${clothingId}`, error);
      throw error;
    }
  }


  /**
   * Base64 바이너리 데이터를 S3에 업로드
   */
  private async uploadBinaryToS3(base64Data: string, key: string): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      return await this.s3Service.uploadBuffer(buffer, key, 'application/octet-stream');
    } catch (error) {
      this.logger.error(`Failed to upload binary to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * S3에서 파일을 다운로드하여 Base64로 반환
   */
  private async downloadFromS3AsBase64(key: string): Promise<string> {
    try {
      const presignedUrl = await this.s3Service.convertToPresignedUrl(key);

      if (!presignedUrl) {
        throw new Error(`Cache not found in S3: ${key}`);
      }

      const response = await firstValueFrom(
        this.httpService.get(presignedUrl, {
          responseType: 'arraybuffer',
        })
      );

      const buffer = Buffer.from(response.data);
      return buffer.toString('base64');
    } catch (error) {
      this.logger.error(`Failed to download from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * S3에서 캐시 데이터 존재 여부 확인
   */
  async checkHumanCacheExists(userId: string): Promise<boolean> {
    try {
      const key = `users/${userId}/vton-cache/human_img.png`;
      return await this.s3Service.checkObjectExists(key);
    } catch {
      return false;
    }
  }

  async checkGarmentCacheExists(userId: string, clothingId: string): Promise<boolean> {
    try {
      const key = `users/${userId}/vton-cache/garments/${clothingId}_img.png`;
      return await this.s3Service.checkObjectExists(key);
    } catch {
      return false;
    }
  }

  async checkTextCacheExists(userId: string, clothingId: string): Promise<boolean> {
    try {
      const key = `users/${userId}/vton-cache/text/${clothingId}_prompt_embeds.pkl`;
      return await this.s3Service.checkObjectExists(key);
    } catch {
      return false;
    }
  }

  /**
   * V2: FastAPI가 S3에서 직접 다운로드 (최적화)
   */
  async generateTryOnV2(
    userId: string,
    clothingId: string,
    denoiseSteps: number = 10,
    seed: number = 42
  ): Promise<string> {
    this.logger.log(`[generateTryOnV2] Starting for userId: ${userId}, clothingId: ${clothingId}`);
    const startTime = Date.now();

    try {
      // IDM-VTON API 호출: FastAPI가 S3에서 직접 다운로드
      const response = await firstValueFrom(
        this.httpService.post(`${this.vtonApiUrl}/vton/generate-tryon`, {
          user_id: userId,
          clothing_id: clothingId,
          denoise_steps: denoiseSteps,
          seed: seed,
        })
      );

      const { result_image_base64 } = response.data;

      const elapsed = (Date.now() - startTime) / 1000;
      this.logger.log(`[generateTryOnV2] Completed in ${elapsed.toFixed(2)}s (FastAPI direct S3 download)`);

      return result_image_base64;
    } catch (error) {
      this.logger.error(`[generateTryOnV2] Failed for userId: ${userId}, clothingId: ${clothingId}`, error);
      throw error;
    }
  }

  /**
   * 배치 처리: 여러 옷을 동시에 입어보기
   */
  async generateBatchTryOn(
    userId: string,
    clothingIds: string[],
    denoiseSteps: number = 10,
    seed: number = 42
  ): Promise<any[]> {
    this.logger.log(`[generateBatchTryOn] Starting for userId: ${userId}, ${clothingIds.length} items`);
    const startTime = Date.now();

    try {
      // IDM-VTON API 호출: 배치 처리
      const response = await firstValueFrom(
        this.httpService.post(`${this.vtonApiUrl}/vton/generate-batch`, {
          user_id: userId,
          clothing_ids: clothingIds,
          denoise_steps: denoiseSteps,
          seed: seed,
        })
      );

      const { results } = response.data;

      const elapsed = (Date.now() - startTime) / 1000;
      this.logger.log(`[generateBatchTryOn] Completed in ${elapsed.toFixed(2)}s`);

      return results;
    } catch (error) {
      this.logger.error(`[generateBatchTryOn] Failed for userId: ${userId}`, error);
      throw error;
    }
  }
}
