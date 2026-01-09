// src/recommendation/services/conversational-agent.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ChatBedrockConverse } from '@langchain/aws';
import { AgentExecutor, createToolCallingAgent } from '@langchain/classic/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { BufferMemory } from '@langchain/classic/memory';
import { createOutfitSearchTool } from '../tools/outfit-search.tool';
import { createStyleAnalysisTool } from '../tools/style-analysis.tool';
import { createSimilarItemsTool } from '../tools/similar-items.tool';
import { OutfitLogService } from '../../outfit-log/outfit-log.service';
import { RagSearchService } from './rag-search.service';

/**
 * Langchain Agent 기반 대화형 추천 서비스
 *
 * ChatBedrockConverse를 사용하여 사용자의 자연어 질의를 이해하고,
 * 필요한 도구들을 자동으로 선택하여 과거 착용 기록 검색, 스타일 분석, 유사 아이템 추천을 수행합니다.
 */
@Injectable()
export class ConversationalAgentService {
  private readonly logger = new Logger(ConversationalAgentService.name);
  private readonly model: any;
  private readonly memories: Map<string, BufferMemory> = new Map();

  constructor(
    private readonly outfitLogService: OutfitLogService,
    private readonly ragSearchService: RagSearchService,
  ) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not found. Agent will not work properly.');
    }

    this.model = new ChatBedrockConverse({
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      region: process.env.AWS_REGION || 'ap-northeast-1',
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
      temperature: 0.3,
      maxTokens: 2048,
    });
  }

  /**
   * 사용자별 메모리 가져오기 (없으면 새로 생성)
   */
  private getMemory(userId: string): BufferMemory {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, new BufferMemory({
        returnMessages: true,
        memoryKey: 'chat_history',
      }));
    }
    return this.memories.get(userId)!;
  }

  /**
   * 대화형 추천 처리
   */
  async processConversation(userId: string, userQuery: string): Promise<any> {
    try {
      // 1. 사용자별 도구 생성
      const tools = [
        createOutfitSearchTool(this.outfitLogService, userId),
        createStyleAnalysisTool(),
        createSimilarItemsTool(this.ragSearchService, userId),
      ];

      // 2. 시스템 프롬프트 설정
      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `당신은 패션 추천 전문 AI 어시스턴트입니다.

사용자의 과거 착용 기록(OutfitLog)을 참조하여 개인화된 옷 추천을 제공합니다.

### 사용 가능한 도구들:
1. **search_past_outfits**: 장소/이벤트 키워드로 과거 착용 기록 검색
2. **analyze_outfit_style**: 코디의 스타일 특징 분석 (색상, 스타일 무드 등)
3. **search_similar_items**: 스타일 특징 기반으로 유사한 아이템 검색

### 사용자 질의 유형별 처리 방법:

**1. 명확한 아이템 교체 요청**
예: "에버랜드 갔을 때 입었던 옷에서 상의만 바꿔줘"
→ search_past_outfits("에버랜드") → 상의를 제외한 나머지는 그대로, 상의만 search_similar_items

**2. "유사하게", "비슷하게" 요청**
예: "에버랜드 갔던 날과 유사하게 추천해줘"
→ search_past_outfits("에버랜드") → analyze_outfit_style(찾은 코디) → 모든 카테고리에 대해 search_similar_items

**3. 정보 조회**
예: "에버랜드 갔을 때 뭐 입었지?"
→ search_past_outfits("에버랜드") → 결과만 보여주기

**4. 스타일 변형 요청**
예: "에버랜드 갔을 때랑 비슷한데 좀 더 포멀하게"
→ search_past_outfits("에버랜드") → analyze_outfit_style → TPO를 "Business"로 변경하여 search_similar_items

### 응답 형식:
- 친절하고 자연스러운 한국어로 응답
- 추천 결과는 카테고리별로 정리해서 제시
- 각 아이템의 색상과 스타일 특징을 간략히 설명
- 과거 기록과의 유사점/차이점 언급

### 주의사항:
- 과거 기록이 없으면 정중히 알리고 다른 방법 제안
- 카테고리는 반드시 "Outer", "Top", "Bottom", "Shoes" 중 하나 사용
- TPO는 "Daily", "Business", "Date", "Party" 등만 사용`,
        ],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]);

      // 3. Agent 생성
      const agent = await createToolCallingAgent({
        llm: this.model,
        tools,
        prompt,
      });

      // 4. Agent Executor 생성 (메모리 포함)
      const memory = this.getMemory(userId);
      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        memory,
        verbose: true,
        maxIterations: 5,
      });

      // 5. Agent 실행
      this.logger.log(`Processing query for user ${userId}: ${userQuery}`);
      const result = await agentExecutor.invoke({
        input: userQuery,
      });

      return {
        success: true,
        response: result.output,
        rawQuery: userQuery,
      };
    } catch (error) {
      this.logger.error('Error in conversational agent', error);
      return {
        success: false,
        error: error.message,
        response: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.',
      };
    }
  }

  /**
   * 사용자 대화 기록 초기화
   */
  async clearConversation(userId: string): Promise<void> {
    if (this.memories.has(userId)) {
      await this.memories.get(userId)!.clear();
      this.logger.log(`Cleared conversation history for user ${userId}`);
    }
  }
}
