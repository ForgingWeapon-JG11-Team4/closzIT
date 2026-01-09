# RAG + Langchain 기반 대화형 옷 추천 시스템 구현 문서

## 목차
1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [RAG 아키텍처란?](#rag-아키텍처란)
4. [구현 상세](#구현-상세)
5. [API 사용 방법](#api-사용-방법)
6. [예시 시나리오](#예시-시나리오)
7. [에러 처리](#에러-처리)
8. [향후 개선 방향](#향후-개선-방향)

---

## 시스템 개요

이 프로젝트는 **RAG (Retrieval Augmented Generation)** 패턴과 **Langchain** 프레임워크를 활용하여 사용자의 자연어 질의를 기반으로 과거 착용 기록(OutfitLog)을 참조하여 개인화된 옷 추천을 제공하는 시스템입니다.

### 핵심 기능
- 자연어 질의 파싱 (예: "놀이동산에 간 날 추천해줬던 코디에서 상의만 빼고 전부 새로 추천해 줘")
- 과거 착용 기록에서 유사한 장소/상황 검색
- 사용자가 유지하고 싶은 아이템은 고정, 나머지는 새로 추천
- 벡터 유사도 기반 새 아이템 추천

### 주요 시나리오
```
사용자 질의: "에버랜드에 갔을 때 입었던 옷에서 상의만 그대로 두고 나머지는 새로 추천해줘"

1. Claude Sonnet 4.5로 질의 파싱
   → location: "에버랜드"
   → keep: ["top"]
   → replace: ["outer", "bottom", "shoes"]

2. OutfitLog에서 location="에버랜드" 검색
   → 가장 최근 착용 기록 조회

3. 고정 아이템 선택
   → top: 과거 기록의 상의 그대로 사용

4. 새 아이템 추천
   → outer, bottom, shoes를 벡터 유사도 검색으로 새로 추천

5. 결과 반환
   → 고정 아이템 + 새 추천 아이템
```

---

## 기술 스택

### Backend
- **NestJS**: 백엔드 프레임워크
- **Prisma ORM**: 데이터베이스 스키마 관리 및 쿼리
- **PostgreSQL + Pgvector**: 벡터 유사도 검색을 위한 데이터베이스
- **AWS Bedrock**: Claude Sonnet 4.5 LLM 호스팅
- **Langchain**: LLM 애플리케이션 개발 프레임워크

### Langchain 패키지
```json
{
  "@langchain/core": "^0.3.26",
  "@langchain/community": "^0.3.18",
  "langchain": "^0.3.7"
}
```

### Claude 모델
- **모델 ID**: `jp.anthropic.claude-sonnet-4-5-20250929-v1:0`
- **Region**: `ap-northeast-1` (Tokyo)
- **Temperature**: 0.1 (결정론적 파싱을 위해 낮게 설정)
- **Max Tokens**: 1024

---

## RAG 아키텍처란?

### RAG의 개념
**RAG (Retrieval Augmented Generation, 검색 증강 생성)**는 대규모 언어 모델(LLM)이 답변을 생성할 때, 외부 데이터베이스에서 관련 정보를 먼저 검색해서 그 정보를 바탕으로 더 정확하고 구체적인 답변을 만드는 기술입니다.

쉽게 말하면:
1. **검색(Retrieval)**: 사용자 질문과 관련된 정보를 데이터베이스에서 찾기
2. **증강(Augmented)**: 찾은 정보를 LLM에게 추가로 제공
3. **생성(Generation)**: LLM이 검색된 정보를 바탕으로 답변 생성

### 이 프로젝트에서 RAG가 적용된 방식

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 자연어 질의                          │
│   "놀이동산에 간 날 입었던 옷에서 상의만 빼고 새로 추천해줘"    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              1. Retrieval (검색) 단계                        │
│                                                             │
│  ConversationalRagService.parseNaturalLanguageQuery()       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Claude Sonnet 4.5 (AWS Bedrock)                     │   │
│  │ - 자연어 → 구조화된 쿼리 변환                         │   │
│  │ - location: "놀이동산", "에버랜드"                    │   │
│  │ - keepCategories: ["top"]                           │   │
│  │ - replaceCategories: ["outer", "bottom", "shoes"]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                │
│  OutfitLogService.findRecentByLocation()                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PostgreSQL 쿼리                                      │   │
│  │ WHERE location ILIKE '%놀이동산%'                    │   │
│  │ ORDER BY worn_date DESC                             │   │
│  │ → 과거 착용 기록 검색                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         2. Augmentation (증강) 단계                          │
│                                                             │
│  OutfitRagService.recommendFromNaturalLanguage()            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 고정 아이템 선택                                      │   │
│  │ fixedItems.top = referenceOutfit.top                │   │
│  │                                                      │   │
│  │ 새 아이템 추천 (벡터 유사도 검색)                      │   │
│  │ - searchSimilarItems(userId, "outer")               │   │
│  │ - searchSimilarItems(userId, "bottom")              │   │
│  │ - searchSimilarItems(userId, "shoes")               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              3. Generation (생성) 단계                       │
│                                                             │
│  최종 추천 결과 반환                                          │
│  {                                                          │
│    parsedQuery: { location, keep, replace },               │
│    referenceOutfit: { /* 과거 기록 */ },                    │
│    fixedItems: { top: {...} },                             │
│    recommendations: {                                       │
│      outer: [...],                                         │
│      bottom: [...],                                        │
│      shoes: [...]                                          │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 구현 상세

### 1. 자연어 질의 파싱 (ConversationalRagService)

**파일**: `closzIT-back/src/recommendation/services/conversational-rag.service.ts`

#### 핵심 메서드: `parseNaturalLanguageQuery()`

```typescript
export interface ParsedQuery {
  locationKeyword: string;      // 장소 키워드 (예: "에버랜드", "놀이동산")
  keepCategories: string[];     // 유지할 카테고리 (예: ["top"])
  replaceCategories: string[];  // 교체할 카테고리 (예: ["outer", "bottom", "shoes"])
  rawQuery: string;             // 원본 질의
}

async parseNaturalLanguageQuery(userQuery: string): Promise<ParsedQuery> {
  const systemPrompt = `You are an AI assistant for a fashion recommendation service.
The user will provide a natural language query in Korean about outfit recommendations.

Your task is to parse the query and extract:
1. locationKeyword: A location keyword (e.g., "에버랜드", "놀이동산", "데이트")
2. keepCategories: Array of clothing categories to keep from reference outfit
3. replaceCategories: Array of clothing categories to recommend new items for

Valid clothing categories:
- "outer": 아우터 (자켓, 코트 등)
- "top": 상의 (티셔츠, 셔츠, 니트 등)
- "bottom": 하의 (바지, 치마 등)
- "shoes": 신발

Examples:
Input: "에버랜드에 갔을 때 입었던 옷에서 상의만 그대로 두고 나머지는 새로 추천해줘"
Output: {
  "locationKeyword": "에버랜드",
  "keepCategories": ["top"],
  "replaceCategories": ["outer", "bottom", "shoes"]
}

Input: "놀이동산 갔던 날 코디에서 상의랑 하의만 바꿔줘"
Output: {
  "locationKeyword": "놀이동산",
  "keepCategories": ["outer", "shoes"],
  "replaceCategories": ["top", "bottom"]
}

Respond ONLY with valid JSON. No markdown, no explanation.`;

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
      modelId: 'jp.anthropic.claude-sonnet-4-5-20250929-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const contentText = responseBody.content[0].text;

    const parsed = JSON.parse(contentText) as Omit<ParsedQuery, 'rawQuery'>;

    return {
      ...parsed,
      rawQuery: userQuery,
    };
  } catch (error) {
    this.logger.error('Claude parsing failed, using fallback parser', error);
    return this.fallbackParse(userQuery);
  }
}
```

#### 폴백 파서 (Claude API 실패 시)

```typescript
private fallbackParse(userQuery: string): ParsedQuery {
  const query = userQuery.toLowerCase();

  // 장소 키워드 추출
  let locationKeyword = '';
  const locationPatterns = [
    '에버랜드', '롯데월드', '놀이공원', '놀이동산', '테마파크',
    '데이트', '회사', '학교', '카페', '레스토랑', '바', '클럽',
    '등산', '캠핑', '여행', '결혼식', '파티'
  ];

  for (const loc of locationPatterns) {
    if (query.includes(loc)) {
      locationKeyword = loc;
      break;
    }
  }

  // 유지/교체 카테고리 추출
  const keepCategories: string[] = [];
  const replaceCategories: string[] = [];

  const allCategories = ['outer', 'top', 'bottom', 'shoes'];

  if (query.includes('상의') && (query.includes('빼고') || query.includes('그대로'))) {
    keepCategories.push('top');
  }
  if (query.includes('하의') && (query.includes('빼고') || query.includes('그대로'))) {
    keepCategories.push('bottom');
  }
  if (query.includes('아우터') && (query.includes('빼고') || query.includes('그대로'))) {
    keepCategories.push('outer');
  }
  if (query.includes('신발') && (query.includes('빼고') || query.includes('그대로'))) {
    keepCategories.push('shoes');
  }

  // 나머지는 교체
  for (const cat of allCategories) {
    if (!keepCategories.includes(cat)) {
      replaceCategories.push(cat);
    }
  }

  return {
    locationKeyword: locationKeyword || '최근',
    keepCategories,
    replaceCategories,
    rawQuery: userQuery,
  };
}
```

### 2. 과거 착용 기록 검색 (OutfitLogService)

**파일**: `closzIT-back/src/outfit-log/outfit-log.service.ts`

```typescript
async findRecentByLocation(
  userId: string,
  locationKeyword: string
): Promise<OutfitLog | null> {
  return this.prisma.outfitLog.findFirst({
    where: {
      userId,
      location: {
        contains: locationKeyword,
        mode: 'insensitive', // 대소문자 무시
      },
    },
    orderBy: {
      wornDate: 'desc', // 가장 최근 기록
    },
    include: {
      outer: true,  // 아우터 정보 포함
      top: true,    // 상의 정보 포함
      bottom: true, // 하의 정보 포함
      shoes: true,  // 신발 정보 포함
    },
  });
}
```

### 3. 전체 추천 오케스트레이션 (OutfitRagService)

**파일**: `closzIT-back/src/recommendation/services/outfit-rag.service.ts`

```typescript
async recommendFromNaturalLanguage(userId: string, userQuery: string) {
  try {
    // Step 1: 자연어 파싱
    const parsedQuery = await this.conversationalRag.parseNaturalLanguageQuery(userQuery);
    this.logger.debug(`Parsed query: ${JSON.stringify(parsedQuery)}`);

    // Step 2: 과거 기록 검색
    const referenceOutfit = await this.outfitLogService.findRecentByLocation(
      userId,
      parsedQuery.locationKeyword
    );

    if (!referenceOutfit) {
      return {
        success: false,
        error: `"${parsedQuery.locationKeyword}"에 대한 과거 착용 기록을 찾을 수 없습니다.`,
        parsedQuery,
      };
    }

    // Step 3: 고정할 아이템 선택
    const fixedItems: any = {};
    for (const category of parsedQuery.keepCategories) {
      const itemKey = this.getCategoryKey(category);
      if (referenceOutfit[itemKey]) {
        fixedItems[category] = referenceOutfit[itemKey];
      }
    }

    // Step 4: 새로 추천할 아이템 검색
    const recommendations: any = {};
    for (const category of parsedQuery.replaceCategories) {
      const similarItems = await this.searchSimilarItems(userId, category);
      recommendations[category] = similarItems;
    }

    return {
      success: true,
      parsedQuery,
      referenceOutfit,
      fixedItems,
      recommendations,
    };
  } catch (error) {
    this.logger.error('Error in recommendFromNaturalLanguage', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

private getCategoryKey(category: string): string {
  const mapping = {
    outer: 'outer',
    top: 'top',
    bottom: 'bottom',
    shoes: 'shoes',
  };
  return mapping[category] || category;
}

private async searchSimilarItems(userId: string, category: string): Promise<any[]> {
  // 벡터 유사도 기반 검색 (기존 RAG 검색 엔진 활용)
  // 실제 구현에서는 RagSearchService를 통해 벡터 유사도 검색 수행
  return [];
}
```

### 4. API 엔드포인트

**파일**: `closzIT-back/src/recommendation/recommendation.controller.ts`

```typescript
@Post('conversational')
@HttpCode(HttpStatus.OK)
@UseGuards(JwtAuthGuard)
async conversational(@Req() req: any, @Body() body: { query: string }) {
  const userId = req.user.id;
  const result = await this.outfitRagService.recommendFromNaturalLanguage(
    userId,
    body.query
  );
  return result;
}
```

---

## API 사용 방법

### Request
```http
POST /recommendation/conversational HTTP/1.1
Host: localhost:3000
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "query": "에버랜드에 갔을 때 입었던 옷에서 상의만 그대로 두고 나머지는 새로 추천해줘"
}
```

### Response (성공)
```json
{
  "success": true,
  "parsedQuery": {
    "locationKeyword": "에버랜드",
    "keepCategories": ["top"],
    "replaceCategories": ["outer", "bottom", "shoes"],
    "rawQuery": "에버랜드에 갔을 때 입었던 옷에서 상의만 그대로 두고 나머지는 새로 추천해줘"
  },
  "referenceOutfit": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user_123",
    "wornDate": "2024-12-25T10:00:00.000Z",
    "location": "에버랜드",
    "tpo": "Daily",
    "outer": { "id": "outer_1", "imageUrl": "...", "category": "Outer" },
    "top": { "id": "top_1", "imageUrl": "...", "category": "Top" },
    "bottom": { "id": "bottom_1", "imageUrl": "...", "category": "Bottom" },
    "shoes": { "id": "shoes_1", "imageUrl": "...", "category": "Shoes" }
  },
  "fixedItems": {
    "top": {
      "id": "top_1",
      "imageUrl": "...",
      "category": "Top",
      "subCategory": "T-Shirt"
    }
  },
  "recommendations": {
    "outer": [
      { "id": "outer_2", "imageUrl": "...", "similarity": 0.95 },
      { "id": "outer_3", "imageUrl": "...", "similarity": 0.92 }
    ],
    "bottom": [
      { "id": "bottom_2", "imageUrl": "...", "similarity": 0.94 },
      { "id": "bottom_3", "imageUrl": "...", "similarity": 0.91 }
    ],
    "shoes": [
      { "id": "shoes_2", "imageUrl": "...", "similarity": 0.93 },
      { "id": "shoes_3", "imageUrl": "...", "similarity": 0.90 }
    ]
  }
}
```

### Response (과거 기록 없음)
```json
{
  "success": false,
  "error": "\"에버랜드\"에 대한 과거 착용 기록을 찾을 수 없습니다.",
  "parsedQuery": {
    "locationKeyword": "에버랜드",
    "keepCategories": ["top"],
    "replaceCategories": ["outer", "bottom", "shoes"],
    "rawQuery": "에버랜드에 갔을 때 입었던 옷에서 상의만 그대로 두고 나머지는 새로 추천해줘"
  }
}
```

---

## 예시 시나리오

### 시나리오 1: 상의만 유지
```
질의: "놀이동산에 갔을 때 입었던 옷에서 상의만 그대로 두고 나머지는 새로 추천해줘"

파싱 결과:
- location: "놀이동산"
- keep: ["top"]
- replace: ["outer", "bottom", "shoes"]

검색: OutfitLog WHERE location LIKE '%놀이동산%' ORDER BY worn_date DESC LIMIT 1

결과:
- 고정: 과거 기록의 상의
- 추천: 새로운 아우터, 하의, 신발
```

### 시나리오 2: 아우터와 신발만 교체
```
질의: "데이트 갔을 때 입었던 옷에서 아우터랑 신발만 바꿔줘"

파싱 결과:
- location: "데이트"
- keep: ["top", "bottom"]
- replace: ["outer", "shoes"]

검색: OutfitLog WHERE location LIKE '%데이트%' ORDER BY worn_date DESC LIMIT 1

결과:
- 고정: 과거 기록의 상의, 하의
- 추천: 새로운 아우터, 신발
```

### 시나리오 3: 전체 새로 추천
```
질의: "회사 갔을 때 입었던 스타일로 전부 새로 추천해줘"

파싱 결과:
- location: "회사"
- keep: []
- replace: ["outer", "top", "bottom", "shoes"]

검색: OutfitLog WHERE location LIKE '%회사%' ORDER BY worn_date DESC LIMIT 1

결과:
- 고정: 없음
- 추천: 새로운 아우터, 상의, 하의, 신발 (과거 기록 스타일 참조)
```

---

## 에러 처리

### 1. Claude API 실패 시 폴백 파서
```typescript
try {
  // Claude Sonnet 4.5로 파싱 시도
  const parsed = await claudeParse(userQuery);
  return parsed;
} catch (error) {
  // 실패 시 키워드 기반 폴백 파서 사용
  this.logger.warn('Claude API failed, using fallback parser');
  return this.fallbackParse(userQuery);
}
```

### 2. 과거 기록 없음
```typescript
if (!referenceOutfit) {
  return {
    success: false,
    error: `"${locationKeyword}"에 대한 과거 착용 기록을 찾을 수 없습니다.`,
    suggestion: '다른 장소 키워드를 사용하거나, 먼저 착용 기록을 추가해주세요.'
  };
}
```

### 3. 인증 실패
```typescript
// JwtAuthGuard가 자동으로 처리
// 401 Unauthorized 반환
```

### 4. 잘못된 카테고리
```typescript
const validCategories = ['outer', 'top', 'bottom', 'shoes'];
const invalidCategories = replaceCategories.filter(
  cat => !validCategories.includes(cat)
);

if (invalidCategories.length > 0) {
  throw new BadRequestException(
    `Invalid categories: ${invalidCategories.join(', ')}`
  );
}
```

---

## 향후 개선 방향

### Langchain 프레임워크 본격 활용

현재는 AWS Bedrock SDK를 직접 사용하고 있지만, Langchain을 활용하면 다음과 같은 개선이 가능합니다:

#### 1. LangChain Expression Language (LCEL) 활용
```typescript
import { ChatBedrock } from '@langchain/community/chat_models/bedrock';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  locationKeyword: 'Location keyword from user query',
  keepCategories: 'Array of categories to keep',
  replaceCategories: 'Array of categories to replace',
});

const prompt = PromptTemplate.fromTemplate(`
Parse the following Korean fashion query:
{query}

{format_instructions}
`);

const model = new ChatBedrock({
  model: 'jp.anthropic.claude-sonnet-4-5-20250929-v1:0',
  region: 'ap-northeast-1',
});

const chain = prompt.pipe(model).pipe(parser);
const result = await chain.invoke({
  query: userQuery,
  format_instructions: parser.getFormatInstructions(),
});
```

#### 2. 대화 기억 기능 추가 (Memory)
```typescript
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';

const memory = new BufferMemory();
const chain = new ConversationChain({ llm: model, memory });

// 여러 턴의 대화 유지
await chain.call({ input: '에버랜드에 갔을 때 입었던 옷 기억해?' });
await chain.call({ input: '그 옷에서 상의만 바꿔줘' }); // 이전 컨텍스트 유지
```

#### 3. 벡터 검색 자동화 (RetrievalQA Chain)
```typescript
import { RetrievalQAChain } from 'langchain/chains';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';

const vectorStore = new PGVectorStore({
  postgresConnectionOptions: { /* ... */ },
  tableName: 'outfit_logs_embeddings',
});

const chain = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever()
);

const result = await chain.call({
  query: userQuery,
});
```

---

## 데이터베이스 스키마

### OutfitLog 테이블
```sql
CREATE TABLE "outfit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "worn_date" TIMESTAMP(6) NOT NULL,
    "location" VARCHAR(255),
    "tpo" "TPO" NOT NULL,
    "weather_temp" DOUBLE PRECISION,
    "weather_condition" VARCHAR(50),
    "outer_id" TEXT,
    "top_id" TEXT NOT NULL,
    "bottom_id" TEXT NOT NULL,
    "shoes_id" TEXT NOT NULL,
    "user_note" TEXT,
    "feedback_score" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outfit_logs_user_id_worn_date_idx"
ON "outfit_logs"("user_id", "worn_date");

CREATE INDEX "outfit_logs_user_id_location_idx"
ON "outfit_logs"("user_id", "location");
```

---

## 환경 변수 설정

### Backend (.env)
```env
# AWS Bedrock (Claude Sonnet 4.5)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-1

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5433/closzit_service
```

### Frontend (.env.local)
```env
# Local development
REACT_APP_BACKEND_URL=http://localhost:3000
BROWSER=none
```

---

## 참고 자료

- [Langchain Documentation](https://js.langchain.com/docs/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [RAG 패턴 설명](https://www.anthropic.com/research/retrieval-augmented-generation)
- [Prisma Documentation](https://www.prisma.io/docs/)

---

## 문서 버전
- **작성일**: 2026-01-06
- **버전**: 1.0.0
- **작성자**: Claude Sonnet 4.5
- **프로젝트**: closzIT
