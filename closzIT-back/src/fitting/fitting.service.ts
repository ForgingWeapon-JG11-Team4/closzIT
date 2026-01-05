import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { CreditService } from '../credit/credit.service';

@Injectable()
export class FittingService {
  private readonly ai: GoogleGenAI;

  constructor(
    @Inject(forwardRef(() => CreditService))
    private readonly creditService: CreditService,
  ) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in environment variables');
    }
    this.ai = new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  async processVirtualFitting(images: {
    person: Express.Multer.File;
    outer: Express.Multer.File;
    top: Express.Multer.File;
    bottom: Express.Multer.File;
    shoes: Express.Multer.File;
  }, userId?: string) {
    const startTime = Date.now();

    try {
      // VTO 사용 전 크레딧 차감 (userId가 제공된 경우)
      if (userId) {
        try {
          await this.creditService.deductVtoCredit(userId);
          console.log(`Deducted 3 credits from user ${userId} for VTO usage`);
        } catch (creditError) {
          console.error('Failed to deduct credits:', creditError);
          throw new HttpException(
            {
              success: false,
              message: creditError.message || '크레딧이 부족합니다.',
            },
            HttpStatus.BAD_REQUEST
          );
        }
      }

      console.log('Starting virtual fitting with Gemini...');

      // 모든 이미지를 base64로 변환
      const personBase64 = images.person.buffer.toString('base64');
      const outerBase64 = images.outer.buffer.toString('base64');
      const topBase64 = images.top.buffer.toString('base64');
      const bottomBase64 = images.bottom.buffer.toString('base64');
      const shoesBase64 = images.shoes.buffer.toString('base64');

      // 개선된 프롬프트로 한 번에 모든 의류를 입히기
      const prompt = `
Rules:
1. SINGLE SUBJECT CONSTRAINT: 
   - There is ONLY ONE PERSON in the final output, who must be the exact person from Image 1.
   - Images 2–5 are for CLOTHING REFERENCE ONLY. Do not add extra people or create a collage.

2. PERFECT PRESERVATION: 
   - Maintain the identical face, expression, hair, body, and pose of the person in Image 1. 
   - The background, lighting, and framing must remain 100% unchanged.

3. CLOTHING ADAPTATION:
   - Replace the original clothes with the garments from Images 2–5.
   - Outerwear MUST be fully open at the front. Inner top MUST be visible.
   - Adjust the fabric's wrinkles and fit to match the person's specific pose and body shape in Image 1 naturally.

Output ONLY the final image. No text or explanations.
`;

      const apiCallStartTime = Date.now();
      const response = await (this.ai.models as any).generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: personBase64,
                },
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: outerBase64,
                },
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: topBase64,
                },
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: bottomBase64,
                },
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: shoesBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1
        },
      });
      const apiCallTime = (Date.now() - apiCallStartTime) / 1000;
      const totalTime = (Date.now() - startTime) / 1000;

      console.log(`API call time: ${apiCallTime.toFixed(2)}s`);
      console.log(`Total processing time: ${totalTime.toFixed(2)}s`);

      // 응답 구조 확인
      // console.log('Response:', JSON.stringify(response, null, 2));

      // 생성된 이미지 추출
      if (!response.candidates || response.candidates.length === 0) {
        console.error('No candidates in response');
        throw new Error('Gemini did not generate any candidates. Response: ' + JSON.stringify(response));
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts) {
        console.error('No content parts in candidate');
        throw new Error('Invalid response structure from Gemini');
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const dataUrl = `data:image/png;base64,${imageData}`;
          console.log('Image generated successfully');

          return {
            success: true,
            imageUrl: dataUrl,
            message: '가상 피팅이 완료되었습니다',
            processingTime: {
              total: totalTime,
              apiCall: apiCallTime,
            },
          };
        }
      }

      throw new Error('No image data in Gemini response. Response: ' + JSON.stringify(response));
    } catch (error) {
      console.error('Virtual fitting error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new HttpException(
        {
          success: false,
          message: '가상 피팅 처리 중 오류가 발생했습니다',
          error: error.message,
          details: error.response?.data || error.toString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async checkJobStatus(_jobId: string) {
    // Gemini API는 동기적으로 작동하므로 job status 체크가 불필요
    throw new HttpException(
      {
        success: false,
        message: 'Job status checking is not supported with Gemini API',
      },
      HttpStatus.NOT_IMPLEMENTED
    );
  }
}
