# Credit 시스템 정합성 강화 마이그레이션 가이드

## 변경 사항 요약

### 1. 스키마 변경
- **새로운 `Credit` 테이블 추가**: User와 1:1 관계, Optimistic Locking용 `version` 컬럼 포함
- **`CreditHistory` 테이블 업데이트**: `balanceBefore` 컬럼 추가로 거래 전/후 잔액 모두 기록
- **`User` 테이블**: `credit` 컬럼 제거 (별도 테이블로 분리)

### 2. 정합성 강화 메커니즘
- **Optimistic Locking**: 동시 요청 처리 시 버전 충돌 감지 및 자동 재시도 (최대 3회)
- **트랜잭션 보장**: 모든 크레딧 변경은 트랜잭션 내에서 처리
- **완벽한 감사 추적**: 거래 전/후 잔액, 타입, 설명 모두 기록

## 마이그레이션 실행

### 1. 데이터베이스 백업 (필수!)
```bash
# PostgreSQL 백업
pg_dump -h localhost -p 5433 -U your_user -d closzit_service > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 마이그레이션 적용
```bash
cd closzIT-back
npx prisma migrate deploy
```

### 3. 기존 사용자 데이터 확인
마이그레이션 SQL이 자동으로 처리:
- 기존 users 테이블의 credit 값을 새 credits 테이블로 마이그레이션
- 기존 credit_history의 balanceBefore 자동 계산 및 설정

## 테스트

### 1. 단일 요청 테스트
```bash
# 크레딧 조회
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/credit

# VTO 사용 (3 크레딧 차감)
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -F "person=@person.jpg" \
  -F "outer=@outer.jpg" \
  -F "top=@top.jpg" \
  -F "bottom=@bottom.jpg" \
  -F "shoes=@shoes.jpg" \
  http://localhost:3000/api/fitting/virtual-try-on

# 크레딧 이력 조회
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/credit/history
```

### 2. 동시성 테스트 (Optimistic Locking 검증)
```bash
# Node.js 테스트 스크립트 생성
cat > test-concurrent-credit.js << 'EOF'
const fetch = require('node-fetch');

const TOKEN = 'YOUR_JWT_TOKEN';
const API_URL = 'http://localhost:3000/api/fitting/virtual-try-on';

async function sendVTORequest(id) {
  const FormData = require('form-data');
  const fs = require('fs');

  const form = new FormData();
  form.append('person', fs.createReadStream('person.jpg'));
  form.append('outer', fs.createReadStream('outer.jpg'));
  form.append('top', fs.createReadStream('top.jpg'));
  form.append('bottom', fs.createReadStream('bottom.jpg'));
  form.append('shoes', fs.createReadStream('shoes.jpg'));

  const start = Date.now();
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: form
    });
    const result = await response.json();
    console.log(`Request ${id}: ${response.status} - ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`Request ${id} failed:`, error.message);
  }
}

// 5개의 동시 요청 (race condition 테스트)
async function test() {
  console.log('Starting concurrent VTO requests...');
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(sendVTORequest(i));
  }
  await Promise.all(promises);
  console.log('All requests completed');
}

test();
EOF

# 실행
node test-concurrent-credit.js
```

**예상 결과**:
- 5개 요청 모두 성공적으로 처리
- 총 15 크레딧 차감 (5 × 3)
- 로그에 Optimistic Lock 충돌 및 재시도 메시지 확인 가능

### 3. 데이터 정합성 검증
```sql
-- PostgreSQL 콘솔에서 실행
psql -h localhost -p 5433 -U your_user -d closzit_service

-- 1. Credit 잔액과 History 합계 일치 확인
SELECT
  c.user_id,
  c.balance as current_balance,
  COALESCE(SUM(h.amount), 0) as history_sum
FROM credits c
LEFT JOIN credit_history h ON c.user_id = h.user_id
GROUP BY c.user_id, c.balance
HAVING c.balance != COALESCE(SUM(h.amount), 0);
-- 결과가 0개여야 정합성 OK

-- 2. 각 이력의 잔액 변화 검증
SELECT
  user_id,
  created_at,
  type,
  amount,
  balance_before,
  balance_after,
  (balance_before + amount) as expected_balance_after,
  CASE
    WHEN (balance_before + amount) = balance_after THEN 'OK'
    ELSE 'MISMATCH'
  END as status
FROM credit_history
ORDER BY user_id, created_at;
-- 모든 status가 'OK'여야 함
```

## 로그 확인

서버 로그에서 다음과 같은 메시지를 확인할 수 있습니다:

```
[CreditService] Credit deducted: userId=xxx, amount=-3, balance=100->97, attempt=1
[CreditService] Optimistic lock conflict on deductCredit (attempt 1/3), retrying...
[CreditService] Credit deducted: userId=xxx, amount=-3, balance=97->94, attempt=2
```

## 롤백 (문제 발생 시)

```bash
# 마지막 마이그레이션 전으로 롤백
cd closzIT-back
npx prisma migrate resolve --rolled-back 20260105170541_refactor_credit_optimistic_locking

# 백업 복구
psql -h localhost -p 5433 -U your_user -d closzit_service < backup_YYYYMMDD_HHMMSS.sql
```

## 성능 고려사항

### Optimistic Locking 재시도
- 최대 3회 재시도, 각 재시도 사이 10ms × attempt 대기
- 대부분의 경우 1-2회 시도로 성공
- 3회 실패 시 명시적 에러 반환

### 인덱스
- `credits.user_id`: UNIQUE 인덱스 (1:1 관계)
- `credit_history.user_id`: 조회 최적화
- `credit_history.created_at`: 시간순 조회 최적화

## 주요 개선 사항

1. **동시성 안전**: 여러 요청이 동시에 들어와도 크레딧 정확하게 차감
2. **완벽한 감사 추적**: 모든 거래의 전/후 상태 기록
3. **복구 가능**: 이력 기반으로 특정 시점의 잔액 재계산 가능
4. **확장 가능**: Credit 테이블 분리로 향후 기능 추가 용이

## 문제 해결

### "크레딧 레코드를 찾을 수 없습니다" 에러
- 기존 사용자의 Credit 레코드가 없는 경우
- 해결: 수동으로 Credit 레코드 생성
```sql
INSERT INTO credits (id, user_id, balance, version, created_at, updated_at)
SELECT gen_random_uuid(), id, COALESCE(credit, 0), 0, NOW(), NOW()
FROM users
WHERE id NOT IN (SELECT user_id FROM credits);
```

### 마이그레이션 실패
- Prisma 클라이언트 재생성: `npx prisma generate`
- 서버 재시작
