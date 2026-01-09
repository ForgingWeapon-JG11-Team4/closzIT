import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface ParsedQuery {
  locationKeyword: string;
  keepCategories: string[];
  replaceCategories: string[];
  rawQuery: string;
}

@Injectable()
export class ConversationalRagService {
  private readonly logger = new Logger(ConversationalRagService.name);
  private readonly bedrockClient: BedrockRuntimeClient;

  constructor() {
    // AWS Bedrock 클라이언트 초기화
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not found. Bedrock client will not work.');
    }

    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
    });
  }

  /**
   * 자연어 쿼리를 구조화된 데이터로 파싱
   * Claude Sonnet 4.5를 사용하여 사용자의 자연어 질의를 분석
   */
  async parseNaturalLanguageQuery(userQuery: string): Promise<ParsedQuery> {
    const systemPrompt = `You are an AI assistant for a fashion recommendation service.
Your task is to parse Korean natural language queries about outfit recommendations.

Extract the following information from the user's query:
1. **locationKeyword**: The location or event mentioned (e.g., "에버랜드", "놀이동산", "학교", "데이트")
2. **keepCategories**: Which clothing categories to keep from the reference outfit (e.g., ["top"])
3. **replaceCategories**: Which clothing categories to recommend new items for (e.g., ["outer", "bottom", "shoes"])

Available categories: "outer", "top", "bottom", "shoes"

Examples:
- "놀이동산에 간 날 추천해줬던 코디에서 상의만 빼고 전부 새로 추천해 줘"
  → locationKeyword: "놀이동산", keepCategories: ["top"], replaceCategories: ["outer", "bottom", "shoes"]

- "에버랜드 갔을 때 입었던 옷에서 하의만 바꿔줘"
  → locationKeyword: "에버랜드", keepCategories: ["outer", "top", "shoes"], replaceCategories: ["bottom"]

- "데이트 갔던 날 코디에서 아우터랑 신발은 그대로 쓰고 나머지 추천해줘"
  → locationKeyword: "데이트", keepCategories: ["outer", "shoes"], replaceCategories: ["top", "bottom"]

Respond ONLY with valid JSON in this format:
{
  "locationKeyword": "string",
  "keepCategories": ["array", "of", "strings"],
  "replaceCategories": ["array", "of", "strings"]
}`;

    try {
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userQuery,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      this.logger.log('Invoking Claude Sonnet 4.5 for query parsing...');
      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      this.logger.debug(`Claude response: ${JSON.stringify(responseBody)}`);

      // Claude의 응답에서 JSON 추출
      const contentText = responseBody.content[0].text;
      const parsed = JSON.parse(contentText) as Omit<ParsedQuery, 'rawQuery'>;

      return {
        ...parsed,
        rawQuery: userQuery,
      };
    } catch (error) {
      this.logger.error(`Failed to parse query with Claude: ${error.message}`);
      this.logger.warn('Falling back to keyword-based parsing');
      return this.fallbackParse(userQuery);
    }
  }

  /**
   * Fallback 파서: Claude를 사용할 수 없을 때 키워드 기반 파싱
   */
  private fallbackParse(userQuery: string): ParsedQuery {
    const query = userQuery.toLowerCase();

    // 1. 위치 키워드 추출
    const locationKeywords = ['에버랜드', '놀이동산', '학교', '데이트', '회사', '카페', '공원', '영화관', '쇼핑'];
    const locationKeyword =
      locationKeywords.find((keyword) => query.includes(keyword)) || '알 수 없음';

    // 2. 유지할 카테고리 파악
    const keepCategories: string[] = [];
    const replaceCategories: string[] = [];

    // "상의만 빼고" 패턴
    if (query.includes('상의') && (query.includes('빼고') || query.includes('제외'))) {
      keepCategories.push('top');
      replaceCategories.push('outer', 'bottom', 'shoes');
    }
    // "하의만 바꿔" 패턴
    else if (query.includes('하의') && (query.includes('바꿔') || query.includes('변경'))) {
      keepCategories.push('outer', 'top', 'shoes');
      replaceCategories.push('bottom');
    }
    // "아우터랑 신발은 그대로" 패턴
    else if (
      (query.includes('아우터') || query.includes('겉옷')) &&
      query.includes('신발') &&
      (query.includes('그대로') || query.includes('유지'))
    ) {
      keepCategories.push('outer', 'shoes');
      replaceCategories.push('top', 'bottom');
    }
    // 기본: 전부 새로 추천
    else {
      replaceCategories.push('outer', 'top', 'bottom', 'shoes');
    }

    this.logger.log(`Fallback parsing result: location="${locationKeyword}", keep=${keepCategories.join(',')}, replace=${replaceCategories.join(',')}`);

    return {
      locationKeyword,
      keepCategories,
      replaceCategories,
      rawQuery: userQuery,
    };
  }
}
