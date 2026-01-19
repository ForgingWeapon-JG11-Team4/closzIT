# 💳 크레딧 & 결제 시스템 기술 문서

> CloszIT 크레딧 관리 및 카카오페이 결제 시스템의 기술적 구현 상세 문서

## 📌 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [크레딧 시스템](#2-크레딧-시스템)
3. [카카오페이 결제 시스템](#3-카카오페이-결제-시스템)
4. [아웃박스 패턴 (Transactional Outbox)](#4-아웃박스-패턴-transactional-outbox)
5. [정합성 검증 및 복구](#5-정합성-검증-및-복구)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [API 설계](#7-api-설계)
8. [에러 핸들링](#8-에러-핸들링)
9. [테스트 전략](#9-테스트-전략)
10. [면접 예상 질문](#10-면접-예상-질문)

---

## 1. 전체 아키텍처

### 1.1 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌─────────────────────┐    │
│  │   CreditStore        │  │ PaymentModal     │  │ History Component   │    │
│  │   - credit balance   │  │ - package select │  │ - credit history    │    │
│  │   - purchase flow    │  │ - kakaopay popup │  │ - payment history   │    │
│  └──────────────────────┘  └──────────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Backend API (NestJS - Port 3000)                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         CreditModule                                  │   │
│  │  ┌─────────────────┐  ┌──────────────────┐                           │   │
│  │  │ CreditController│  │  CreditService   │                           │   │
│  │  │ - GET /credit   │  │  - addCredit()   │  ← 멱등성 + 원자적 처리   │   │
│  │  │ - GET /history  │  │  - deductCredit()│                           │   │
│  │  └─────────────────┘  └──────────────────┘                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        KakaoPayModule                                 │   │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │   │
│  │  │KakaoPayController│ │ KakaoPayService  │  │OutboxProcessor     │  │   │
│  │  │ - POST /ready   │  │ - ready()        │  │ - @Cron(EVERY_MIN) │  │   │
│  │  │ - GET /approve  │  │ - approveWithOutbox() │ - processEvents()│  │   │
│  │  │ - POST /refund  │  │ - refund()       │  └─────────────────────┘  │   │
│  │  └─────────────────┘  └──────────────────┘                           │   │
│  │                        ┌──────────────────────────────────────────┐  │   │
│  │                        │     PaymentReconciliationService         │  │   │
│  │                        │     - @Cron(EVERY_HOUR)                  │  │   │
│  │                        │     - reconcile()                        │  │   │
│  │                        └──────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   PostgreSQL    │  │   카카오페이 API  │  │      Redis           │
│ - User.credit   │  │ - /ready         │  │ (Future: 분산 락)    │
│ - CreditHistory │  │ - /approve       │  │                      │
│ - KakaoPayment  │  │ - /cancel        │  │                      │
│ - PaymentOutbox │  └──────────────────┘  └──────────────────────┘
│ - AuditLog      │
└─────────────────┘
```

### 1.2 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| Backend | NestJS, Prisma | REST API, ORM |
| Database | PostgreSQL | 크레딧/결제 데이터 |
| Scheduler | @nestjs/schedule | Cron 작업 |
| Payment | 카카오페이 API | 실결제 처리 |
| Testing | Jest | 단위/통합 테스트 |

### 1.3 주요 파일 구조

```
closzIT-back/
└── src/
    ├── credit/
    │   ├── credit.module.ts        # 모듈 정의
    │   ├── credit.controller.ts    # API 엔드포인트
    │   ├── credit.service.ts       # 핵심 비즈니스 로직
    │   └── credit.service.spec.ts  # 테스트 코드
    │
    ├── payment/
    │   ├── kakaopay.module.ts      # 결제 모듈
    │   ├── kakaopay.controller.ts  # 결제 API
    │   ├── kakaopay.service.ts     # 카카오페이 연동
    │   ├── outbox-processor.service.ts      # 아웃박스 처리
    │   └── payment-reconciliation.service.ts # 정합성 검증
    │
    └── prisma/
        └── schema/
            ├── credit.prisma       # 크레딧 스키마
            └── kakaopay.prisma     # 결제 스키마
```

---

## 2. 크레딧 시스템

### 2.1 핵심 설계 원칙

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          크레딧 시스템 핵심 원칙                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1️⃣ 멱등성 (Idempotency)                                                   │
│     └─ 같은 요청이 여러 번 와도 한 번만 처리                                 │
│     └─ idempotencyKey를 DB에 unique 제약으로 저장                            │
│                                                                              │
│  2️⃣ 원자성 (Atomicity)                                                     │
│     └─ 잔액 변경 + 이력 생성이 하나의 트랜잭션                               │
│     └─ 실패 시 전체 롤백                                                     │
│                                                                              │
│  3️⃣ 일관성 (Consistency)                                                   │
│     └─ User.credit = SUM(CreditHistory.amount)                              │
│     └─ verifyIntegrity()로 검증 가능                                        │
│                                                                              │
│  4️⃣ 음수 방지 (Non-negative)                                               │
│     └─ Raw SQL로 WHERE credit >= amount 조건 체크                           │
│     └─ Race Condition에서도 음수 불가                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 크레딧 추가 플로우

```typescript
async addCredit(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description?: string,
  idempotencyKey?: string,
): Promise<CreditResult> {

  // 1. 멱등키 중복 확인
  if (idempotencyKey) {
    const existing = await this.prisma.creditHistory.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return { success: true, duplicate: true, newBalance: existing.balanceAfter };
    }
  }

  // 2. 트랜잭션으로 원자적 처리
  const result = await this.prisma.$transaction(async (tx) => {
    // 2-1. 원자적 증가
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { credit: { increment: amount } },
    });

    // 2-2. 이력 생성 (idempotencyKey unique 제약)
    const history = await tx.creditHistory.create({
      data: { userId, type, amount, balanceAfter: updatedUser.credit, idempotencyKey },
    });

    return { newBalance: updatedUser.credit, historyId: history.id };
  });

  return { success: true, duplicate: false, ...result };
}
```

### 2.3 크레딧 차감 플로우 (Race Condition 방지)

```typescript
async deductCredit(...): Promise<CreditResult> {
  // 1. 멱등키 확인 (위와 동일)

  // 2. 원자적 차감 - Raw SQL 사용
  const result = await this.prisma.$transaction(async (tx) => {
    
    // ⭐ 핵심: 조건부 업데이트로 Race Condition 방지
    const affected = await tx.$executeRaw`
      UPDATE "users" 
      SET credit = credit - ${amount}, updated_at = NOW()
      WHERE id = ${userId} AND credit >= ${amount}
    `;

    if (affected === 0) {
      // 잔액 부족 또는 사용자 없음
      const user = await tx.user.findUnique({ where: { id: userId } });
      throw new BadRequestException(`크레딧이 부족합니다. (현재: ${user?.credit})`);
    }

    // 업데이트된 잔액 조회 + 이력 생성
    const updatedUser = await tx.user.findUnique({ where: { id: userId } });
    const history = await tx.creditHistory.create({
      data: { userId, type, amount: -amount, balanceAfter: updatedUser!.credit, idempotencyKey },
    });

    return { newBalance: updatedUser!.credit, historyId: history.id };
  });

  return { success: true, duplicate: false, ...result };
}
```

### 2.4 Race Condition 시나리오

```
시나리오: 잔액 20, 동시에 5개 요청 (각 10 크레딧 차감)

❌ 잘못된 구현 (읽고 → 비교 → 쓰기)
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Req 1   │ Req 2   │ Req 3   │ Req 4   │ Req 5   │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ READ 20 │ READ 20 │ READ 20 │ READ 20 │ READ 20 │  ← 모두 20으로 읽음
│ 20≥10 ✓│ 20≥10 ✓│ 20≥10 ✓│ 20≥10 ✓│ 20≥10 ✓│  ← 모두 통과
│ SET 10  │ SET 10  │ SET 10  │ SET 10  │ SET 10  │  ← 결과: -30 크레딧 손실!
└─────────┴─────────┴─────────┴─────────┴─────────┘

✅ 올바른 구현 (조건부 UPDATE)
┌─────────────────────────────────────────────────┐
│ UPDATE users SET credit = credit - 10           │
│ WHERE id = ? AND credit >= 10                   │
└─────────────────────────────────────────────────┘
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Req 1   │ Req 2   │ Req 3   │ Req 4   │ Req 5   │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 20→10 ✓│  WAIT   │  WAIT   │  WAIT   │  WAIT   │
│         │ 10→0  ✓│  WAIT   │  WAIT   │  WAIT   │
│         │         │ 0≥10 ✗ │  WAIT   │  WAIT   │  ← 실패
│         │         │         │ 0≥10 ✗ │  WAIT   │  ← 실패
│         │         │         │         │ 0≥10 ✗ │  ← 실패
└─────────┴─────────┴─────────┴─────────┴─────────┘
결과: 정확히 2번만 성공, 잔액 0
```

### 2.5 크레딧 트랜잭션 타입

| 타입 | 설명 | 금액 |
|------|------|------|
| `SIGNUP` | 회원가입 보상 | +10 |
| `CLOTHING_ADDED` | 의류 등록 보상 | +1 |
| `PURCHASE` | 크레딧 구매 | +N |
| `PIN_REDEEM` | PIN 코드 사용 | +N |
| `VTO_USED` | VTO 서비스 사용 | -3 |
| `FLATTEN_USED` | 옷 펴기 사용 | -1 |
| `REFUND` | 환불 | -N |

---

## 3. 카카오페이 결제 시스템

### 3.1 결제 플로우 개요

```
┌────────┐      ┌────────┐      ┌───────────┐      ┌──────────┐
│ Client │      │ Server │      │ KakaoPay  │      │ Outbox   │
└───┬────┘      └───┬────┘      └─────┬─────┘      └────┬─────┘
    │               │                 │                 │
    │ 1. POST /ready│                 │                 │
    │──────────────>│                 │                 │
    │               │ 2. Create Payment (READY)         │
    │               │─────────────────────────────────> │ (DB)
    │               │                 │                 │
    │               │ 3. POST /ready  │                 │
    │               │────────────────>│                 │
    │               │    tid, redirect_url              │
    │               │<────────────────│                 │
    │   redirect_url│                 │                 │
    │<──────────────│                 │                 │
    │               │                 │                 │
    │ 4. 사용자 결제│                 │                 │
    │──────────────────────────────-->│                 │
    │               │                 │                 │
    │               │ 5. GET /approve?pg_token          │
    │               │<────────────────│ (콜백)          │
    │               │                 │                 │
    │               │ 6. POST /approve│                 │
    │               │────────────────>│                 │
    │               │      승인 완료  │                 │
    │               │<────────────────│                 │
    │               │                 │                 │
    │               │ 7. ⭐ 원자적 트랜잭션              │
    │               │   - Payment → APPROVED            │
    │               │   - Outbox 이벤트 생성            │
    │               │─────────────────────────────────> │ (DB)
    │               │                 │                 │
    │               │ 8. 즉시 크레딧 지급 시도          │
    │               │─────────────────────────────────> │
    │               │        (실패해도 OK)              │
    │ redirect      │                 │                 │
    │<──────────────│                 │                 │
    │               │                 │                 │
    │               │      9. Cron: Outbox 재처리       │
    │               │         (1분마다)                 │
    │               │<─────────────────────────────────>│
```

### 3.2 결제 준비 (ready)

```typescript
async ready(userId: string, packageId: number) {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  const orderId = `credit-${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // 1. 트랜잭션으로 결제 레코드 + 감사 로그 생성
  const payment = await this.prisma.$transaction(async (tx) => {
    const payment = await tx.kakaoPayment.create({
      data: {
        orderId,
        userId,
        packageId,
        credits: pkg.credits,
        amount: pkg.price,
        status: PaymentStatus.READY,
        creditGranted: false,
      },
    });

    await tx.paymentAuditLog.create({
      data: { paymentId: payment.id, action: 'CREATE', status: 'SUCCESS', details: {...} },
    });

    return payment;
  });

  // 2. 카카오페이 API 호출
  const result = await this.callKakaoPayReady({...});

  // 3. tid 저장
  await this.prisma.kakaoPayment.update({
    where: { id: payment.id },
    data: { tid: result.tid },
  });

  return { success: true, tid: result.tid, orderId, redirectUrl: result.next_redirect_pc_url };
}
```

### 3.3 결제 승인 (approveWithOutbox)

```typescript
async approveWithOutbox(orderId: string, pgToken: string) {
  const payment = await this.prisma.kakaoPayment.findUnique({ where: { orderId } });

  // 멱등성: 이미 승인된 결제
  if (payment.status === PaymentStatus.APPROVED) {
    return { success: true, payment, duplicate: true };
  }

  // 카카오페이 승인 API 호출
  const approveResult = await this.callKakaoPayApprove(payment.tid, orderId, userId, pgToken);

  // ⭐ 핵심 트랜잭션: 상태 변경 + 아웃박스 이벤트 원자적 저장
  const updatedPayment = await this.prisma.$transaction(async (tx) => {
    // 낙관적 락: 상태 재확인
    const current = await tx.kakaoPayment.findUnique({ where: { id: payment.id } });
    if (current?.status !== PaymentStatus.READY) {
      throw new Error('동시 처리 충돌');
    }

    // 결제 상태 업데이트
    const updated = await tx.kakaoPayment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.APPROVED, approvedAt: new Date() },
    });

    // 아웃박스 이벤트 생성 (크레딧 지급 예약)
    await tx.paymentOutbox.create({
      data: {
        eventType: OutboxEventType.GRANT_CREDIT,
        payload: {
          paymentId: payment.id,
          userId: payment.userId,
          credits: payment.credits,
          orderId: payment.orderId,
          idempotencyKey: `kakaopay-${payment.orderId}`,
        },
        status: OutboxStatus.PENDING,
        paymentId: payment.id,
        nextRetryAt: new Date(),
      },
    });

    return updated;
  });

  // 즉시 크레딧 지급 시도 (실패해도 아웃박스가 재시도)
  try {
    await this.processGrantCreditEvent(payment.id);
  } catch (error) {
    this.logger.warn(`[즉시 지급 실패, 아웃박스 재시도 예정] ${error.message}`);
  }

  return { success: true, payment: updatedPayment };
}
```

---

## 4. 아웃박스 패턴 (Transactional Outbox)

### 4.1 왜 아웃박스 패턴인가?

```
❌ 문제 상황: 2PC 없이 분산 트랜잭션 불가

┌──────────────────────────────────────────────────────────────┐
│  1. 카카오페이 승인 API 성공                                  │
│  2. DB에 APPROVED 저장                                       │
│  3. 크레딧 지급 중 서버 다운! 💥                              │
│     → 결제는 완료, 크레딧은 미지급                            │
└──────────────────────────────────────────────────────────────┘

✅ 해결: Transactional Outbox Pattern

┌──────────────────────────────────────────────────────────────┐
│  1. 카카오페이 승인 API 성공                                  │
│  2. 단일 트랜잭션으로:                                        │
│     - Payment → APPROVED                                      │
│     - Outbox 이벤트 생성 (GRANT_CREDIT)                       │
│  3. 서버 다운되어도 Outbox에 이벤트가 남아있음                │
│  4. 재시작 후 Cron이 Outbox 처리 → 크레딧 지급               │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 아웃박스 프로세서

```typescript
@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private isProcessing = false;

  /**
   * 매분 실행 - 대기 중인 아웃박스 이벤트 처리
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processOutboxEvents() {
    if (this.isProcessing) return;  // 중복 실행 방지
    this.isProcessing = true;

    try {
      const pendingEvents = await this.prisma.paymentOutbox.findMany({
        where: {
          status: OutboxStatus.PENDING,
          nextRetryAt: { lte: new Date() },  // 재시도 시간 도래
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      for (const event of pendingEvents) {
        await this.processEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: any) {
    switch (event.eventType) {
      case OutboxEventType.GRANT_CREDIT:
        await this.kakaoPayService.processGrantCreditEvent(event.paymentId);
        break;
    }
  }
}
```

### 4.3 아웃박스 상태 흐름

```
                    ┌─────────────────────────┐
                    │        PENDING          │
                    │    (생성 시 초기 상태)    │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │       PROCESSING        │
                    │      (처리 중)           │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼─────────┐      │       ┌─────────▼─────────┐
    │     COMPLETED     │      │       │      FAILED       │
    │    (처리 완료)     │      │       │  (최종 실패)       │
    └───────────────────┘      │       │  (재시도 소진)     │
                               │       └───────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PENDING (재시도)   │
                    │  retryCount++       │
                    │  nextRetryAt 갱신   │
                    └─────────────────────┘
```

### 4.4 지수 백오프 재시도

```typescript
private getRetryDelay(retryCount: number): number {
  const delays = [
    60000,     // 1차: 1분 후
    300000,    // 2차: 5분 후
    900000,    // 3차: 15분 후
    1800000,   // 4차: 30분 후
    3600000,   // 5차: 1시간 후 (maxRetries 도달)
  ];
  return delays[Math.min(retryCount - 1, delays.length - 1)];
}
```

---

## 5. 정합성 검증 및 복구

### 5.1 정합성 검증 서비스

```typescript
@Injectable()
export class PaymentReconciliationService {
  /**
   * 매시간 자동 정합성 검증
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledReconciliation() {
    const result = await this.reconcile();
    this.logger.log(`검사: ${result.checked}, 문제: ${result.issues}, 수정: ${result.fixed}`);
  }

  async reconcile(): Promise<{ checked: number; issues: number; fixed: number }> {
    // 1. APPROVED인데 크레딧 미지급 건 (5분 이상 경과)
    const ungrantedPayments = await this.prisma.kakaoPayment.findMany({
      where: {
        status: PaymentStatus.APPROVED,
        creditGranted: false,
        approvedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    for (const payment of ungrantedPayments) {
      // 아웃박스 이벤트 없으면 생성
      // 실패 상태면 재시도
    }

    // 2. 장시간 PENDING 상태 아웃박스 이벤트 (1시간 이상)
    const stuckEvents = await this.prisma.paymentOutbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    return { checked, issues, fixed };
  }
}
```

### 5.2 크레딧 정합성 검증

```typescript
/**
 * User.credit == SUM(CreditHistory.amount) 검증
 */
async verifyIntegrity(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { credit: true },
  });

  const historySum = await this.prisma.creditHistory.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  const cachedCredit = user?.credit ?? 0;
  const calculatedCredit = historySum._sum.amount ?? 0;
  const diff = cachedCredit - calculatedCredit;

  return {
    isValid: diff === 0,
    cachedCredit,
    calculatedCredit,
    diff,
  };
}
```

### 5.3 사용자별 결제-크레딧 정합성

```typescript
async verifyUser(userId: string) {
  // 승인+지급 완료된 결제의 크레딧 합
  const payments = await this.prisma.kakaoPayment.findMany({
    where: { userId, status: PaymentStatus.APPROVED, creditGranted: true },
  });
  const totalFromPayments = payments.reduce((sum, p) => sum + p.credits, 0);

  // CreditHistory에서 PURCHASE 타입 합
  const purchaseHistory = await this.prisma.creditHistory.aggregate({
    where: { userId, type: CreditTransactionType.PURCHASE },
    _sum: { amount: true },
  });
  const totalFromHistory = purchaseHistory._sum.amount || 0;

  return {
    totalCreditsFromPayments: totalFromPayments,
    totalCreditsFromHistory: totalFromHistory,
    isValid: totalFromPayments === totalFromHistory,
    discrepancy: totalFromPayments - totalFromHistory,
  };
}
```

---

## 6. 데이터베이스 설계

### 6.1 CreditHistory 스키마

```prisma
model CreditHistory {
  id              String                @id @default(uuid())
  userId          String                @map("user_id")
  type            CreditTransactionType
  amount          Int                   // 양수: 추가, 음수: 차감
  balanceAfter    Int                   @map("balance_after")
  description     String?
  idempotencyKey  String?               @unique @map("idempotency_key")  // ⭐ 멱등성 핵심
  createdAt       DateTime              @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([type])
  @@map("credit_history")
}
```

### 6.2 KakaoPayment 스키마

```prisma
model KakaoPayment {
  id                String        @id @default(cuid())
  orderId           String        @unique @map("order_id")
  tid               String?       // 카카오페이 결제 고유번호
  userId            String        @map("user_id")
  
  // 상품 정보
  packageId         Int           @map("package_id")
  credits           Int
  amount            Int           // 결제 금액 (원)
  
  // 상태 관리
  status            PaymentStatus @default(READY)
  creditGranted     Boolean       @default(false)  // ⭐ 정합성 보장용
  creditHistoryId   String?       // CreditHistory.id 참조
  
  // 환불 정보
  refundedAmount    Int?
  refundHistoryId   String?
  
  // 시간 정보
  createdAt         DateTime      @default(now())
  approvedAt        DateTime?
  refundedAt        DateTime?
  
  // 관계
  outboxEvents      PaymentOutbox[]
  auditLogs         PaymentAuditLog[]

  @@index([userId])
  @@index([status])
  @@index([creditGranted, status])  // ⭐ 정합성 검증용 인덱스
  @@map("kakao_payments")
}
```

### 6.3 PaymentOutbox 스키마

```prisma
model PaymentOutbox {
  id            String          @id @default(cuid())
  eventType     OutboxEventType
  payload       Json
  
  // 처리 상태
  status        OutboxStatus    @default(PENDING)
  retryCount    Int             @default(0)
  maxRetries    Int             @default(5)
  lastError     String?
  
  // 연관 결제
  paymentId     String
  payment       KakaoPayment    @relation(...)
  
  // 시간 정보
  createdAt     DateTime        @default(now())
  processedAt   DateTime?
  nextRetryAt   DateTime?       // ⭐ 재시도 시간

  @@index([status, nextRetryAt])  // 프로세서 쿼리 최적화
  @@index([paymentId])
  @@map("payment_outbox")
}
```

### 6.4 PaymentAuditLog 스키마

```prisma
model PaymentAuditLog {
  id          String       @id @default(cuid())
  paymentId   String
  payment     KakaoPayment @relation(...)
  
  action      String       // CREATE, APPROVE, GRANT_CREDIT, REFUND, RECONCILE
  status      String       // SUCCESS, FAILURE
  details     Json?        // 상세 정보 (에러 메시지, 금액 등)
  
  createdAt   DateTime     @default(now())

  @@index([paymentId])
  @@index([action, status])
  @@map("payment_audit_logs")
}
```

---

## 7. API 설계

### 7.1 크레딧 API

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/credit` | GET | 내 크레딧 조회 | ✅ |
| `/credit/history` | GET | 크레딧 이력 조회 | ✅ |
| `/credit/verify` | GET | 정합성 검증 | ✅ |
| `/credit/packages` | GET | 크레딧 패키지 목록 | ✅ |
| `/credit/purchase` | POST | [데모] 크레딧 구매 | ✅ |
| `/credit/redeem` | POST | [데모] PIN 코드 사용 | ✅ |

### 7.2 카카오페이 API

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/payment/kakaopay/packages` | GET | 패키지 목록 | ❌ |
| `/payment/kakaopay/ready` | POST | 결제 준비 | ✅ |
| `/payment/kakaopay/approve` | GET | 승인 콜백 (카카오→서버) | ❌ |
| `/payment/kakaopay/cancel` | GET | 취소 콜백 | ❌ |
| `/payment/kakaopay/fail` | GET | 실패 콜백 | ❌ |
| `/payment/kakaopay/refund` | POST | 환불 요청 | ✅ |
| `/payment/kakaopay/history` | GET | 결제 내역 | ✅ |
| `/payment/kakaopay/verify` | GET | 특정 결제 검증 | ✅ |
| `/payment/kakaopay/verify/all` | GET | 전체 결제 검증 | ✅ |

### 7.3 관리자 API

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/payment/kakaopay/admin/reconcile` | POST | 수동 정합성 검증 |
| `/payment/kakaopay/admin/outbox/stats` | GET | 아웃박스 통계 |
| `/payment/kakaopay/admin/outbox/failed` | GET | 실패 이벤트 목록 |
| `/payment/kakaopay/admin/outbox/retry` | POST | 실패 이벤트 재시도 |

---

## 8. 에러 핸들링

### 8.1 멱등키 충돌 (동시 요청)

```typescript
try {
  const result = await this.prisma.$transaction(async (tx) => {
    // ...
    const history = await tx.creditHistory.create({
      data: { ..., idempotencyKey },  // unique 제약
    });
  });
} catch (error) {
  // P2002: Unique constraint failed
  if (error.code === 'P2002' && idempotencyKey) {
    // 이미 처리된 요청 - 기존 결과 반환
    const existing = await this.prisma.creditHistory.findUnique({
      where: { idempotencyKey },
    });
    return { success: true, duplicate: true, newBalance: existing?.balanceAfter };
  }
  throw error;
}
```

### 8.2 환불 시 크레딧 차감 실패

```typescript
async refund(orderId: string, userId: string) {
  // 1. 카카오페이 취소 API 호출 (성공)
  const cancelResult = await this.callKakaoPayCancel(payment.tid, payment.amount);

  // 2. 크레딧 차감 시도
  try {
    const deductResult = await this.creditService.deductCredit(...);
    // ... 성공 처리
  } catch (error) {
    // ⚠️ 카카오페이는 취소됐는데 크레딧 차감 실패
    // 수동 처리 필요 플래그
    await this.prisma.paymentAuditLog.create({
      data: {
        paymentId: payment.id,
        action: 'REFUND_CREDIT_DEDUCT',
        status: 'FAILURE',
        details: {
          error: error.message,
          kakaoCancelSuccess: true,
          needsManualFix: true,  // ⭐ 관리자 개입 필요
        },
      },
    });

    throw new BadRequestException('환불 처리 중 오류. 고객센터 문의 필요');
  }
}
```

### 8.3 아웃박스 재시도 실패

```typescript
async processGrantCreditEvent(paymentId: string) {
  try {
    const creditResult = await this.creditService.addCredit(...);
    // 성공 처리
  } catch (error) {
    const newRetryCount = outboxEvent.retryCount + 1;
    const shouldRetry = newRetryCount < outboxEvent.maxRetries;

    await this.prisma.paymentOutbox.update({
      where: { id: outboxEvent.id },
      data: {
        status: shouldRetry ? OutboxStatus.PENDING : OutboxStatus.FAILED,
        retryCount: newRetryCount,
        lastError: error.message,
        nextRetryAt: shouldRetry 
          ? new Date(Date.now() + this.getRetryDelay(newRetryCount)) 
          : null,
      },
    });

    throw error;
  }
}
```

---

## 9. 테스트 전략

### 9.1 멱등성 테스트

```typescript
it('같은 멱등키로 중복 추가 요청 시 한 번만 처리', async () => {
  const idempotencyKey = `add-test-${Date.now()}`;
  const initialCredit = await service.getCredit(testUserId);

  // 첫 번째 요청
  const result1 = await service.addCredit(testUserId, 50, type, '테스트', idempotencyKey);
  expect(result1.duplicate).toBe(false);
  expect(result1.newBalance).toBe(initialCredit + 50);

  // 같은 멱등키로 두 번째 요청
  const result2 = await service.addCredit(testUserId, 50, type, '테스트', idempotencyKey);
  expect(result2.duplicate).toBe(true);
  expect(result2.newBalance).toBe(initialCredit + 50);  // 변화 없음

  // 실제 잔액 확인
  const finalCredit = await service.getCredit(testUserId);
  expect(finalCredit).toBe(initialCredit + 50);
});
```

### 9.2 동시성 테스트

```typescript
it('동시에 같은 차감 요청 시 하나만 처리', async () => {
  await prisma.user.update({
    where: { id: testUserId },
    data: { credit: 100 },
  });

  const idempotencyKey = `concurrent-deduct-${Date.now()}`;

  // 동시에 10개 요청
  const requests = Array(10).fill(null).map(() =>
    service.deductCredit(testUserId, 10, type, '동시성 테스트', idempotencyKey)
  );

  const results = await Promise.allSettled(requests);
  const duplicates = results.filter(
    r => r.status === 'fulfilled' && r.value.duplicate === true
  ).length;

  // 잔액 확인 (한 번만 차감)
  const finalCredit = await service.getCredit(testUserId);
  expect(finalCredit).toBe(90);
});
```

### 9.3 잔액 부족 테스트

```typescript
it('잔액 부족 시 원자적 거부', async () => {
  await prisma.user.update({
    where: { id: testUserId },
    data: { credit: 20 },
  });

  // 동시에 5개 요청 (각 10, 총 50 필요하지만 20만 있음)
  const requests = Array(5).fill(null).map((_, i) =>
    service.deductCredit(testUserId, 10, type, `부족 테스트 ${i}`, `key-${i}`)
      .catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(requests);
  const success = results.filter(r => !('error' in r)).length;

  // 최대 2번만 성공해야 함
  expect(success).toBeLessThanOrEqual(2);

  // 잔액이 음수가 되면 안 됨
  const finalCredit = await service.getCredit(testUserId);
  expect(finalCredit).toBeGreaterThanOrEqual(0);
});
```

### 9.4 정합성 테스트

```typescript
it('캐시된 잔액과 이력 합계가 일치', async () => {
  const result = await service.verifyIntegrity(testUserId);
  
  expect(result.isValid).toBe(true);
  expect(result.diff).toBe(0);
});
```

---

## 10. 면접 예상 질문

### Q1. 멱등성을 어떻게 보장하나요?

**A:** `CreditHistory.idempotencyKey`에 unique 제약을 걸어 보장합니다.
1. 요청 시 먼저 해당 키로 기존 레코드 조회
2. 있으면 기존 결과 반환 (duplicate: true)
3. 없으면 트랜잭션 내에서 처리
4. 동시 요청 시 unique 제약 위반(P2002) → 기존 결과 반환

### Q2. Race Condition을 어떻게 방지하나요?

**A:** 조건부 UPDATE를 사용합니다.
```sql
UPDATE users SET credit = credit - 10 WHERE id = ? AND credit >= 10
```
- `affected = 0`이면 잔액 부족
- DB 레벨에서 원자적으로 확인 + 차감
- 읽기 → 비교 → 쓰기 분리 시 발생하는 문제 방지

### Q3. 왜 아웃박스 패턴을 사용하나요?

**A:** 분산 트랜잭션 문제를 해결하기 위해서입니다.
- 카카오페이 승인 + 크레딧 지급은 서로 다른 시스템
- 2PC 없이는 원자성 보장 불가
- 아웃박스 패턴으로 "최소 한 번 실행" 보장
- 멱등키로 "정확히 한 번 효과" 달성

### Q4. 정합성 검증은 어떻게 하나요?

**A:** 두 가지 레벨에서 검증합니다.
1. **크레딧 레벨**: `User.credit == SUM(CreditHistory.amount)`
2. **결제 레벨**: `SUM(승인+지급완료 결제.credits) == SUM(PURCHASE 이력.amount)`

매시간 Cron으로 자동 검증 + 문제 발견 시 아웃박스 이벤트 재생성

### Q5. 환불 시 크레딧 차감 실패하면?

**A:** 수동 처리 플래그를 남깁니다.
- 카카오페이 취소는 이미 완료된 상태
- AuditLog에 `needsManualFix: true` 기록
- 관리자가 확인 후 수동 처리
- 고객에게는 "고객센터 문의" 안내

### Q6. 서버가 다운되면 어떻게 되나요?

**A:** 아웃박스 패턴 덕분에 데이터 손실이 없습니다.
- 결제 승인 + 아웃박스 이벤트는 같은 트랜잭션
- 서버 재시작 후 Cron이 PENDING 이벤트 처리
- 멱등키로 중복 지급 방지

---

## 성능 벤치마크

| 작업 | 시간 | 비고 |
|------|------|------|
| 크레딧 조회 | ~5ms | 단순 조회 |
| 크레딧 추가/차감 | ~50ms | 트랜잭션 포함 |
| 결제 준비 | ~500ms | 카카오페이 API |
| 결제 승인 | ~800ms | 카카오페이 API + 아웃박스 |
| 정합성 검증 (단일) | ~20ms | 집계 쿼리 |
| 정합성 검증 (전체) | ~500ms | 100건 기준 |

---

## 참고 문서

- [카카오페이 단건결제 API](https://developers.kakaopay.com/docs/payment/online/single-payment)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)