// src/credit/credit.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditTransactionType } from '@prisma/client';

describe('CreditService', () => {
  let service: CreditService;
  let prisma: PrismaService;

  // 테스트용 사용자 ID (실제 DB에 있는 ID 사용)
  const testUserId = 'test-user-credit-' + Date.now();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditService, PrismaService],
    }).compile();

    service = module.get<CreditService>(CreditService);
    prisma = module.get<PrismaService>(PrismaService);

    // 테스트 사용자 생성
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${Date.now()}@test.com`,
        credit: 100,
      },
    });
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.creditHistory.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('멱등성 테스트', () => {
    it('같은 멱등키로 중복 추가 요청 시 한 번만 처리', async () => {
      const idempotencyKey = `add-test-${Date.now()}`;
      const initialCredit = await service.getCredit(testUserId);

      // 첫 번째 요청
      const result1 = await service.addCredit(
        testUserId,
        50,
        CreditTransactionType.CLOTHING_ADDED,
        '테스트 추가',
        idempotencyKey,
      );

      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBe(false);
      expect(result1.newBalance).toBe(initialCredit + 50);

      // 같은 멱등키로 두 번째 요청
      const result2 = await service.addCredit(
        testUserId,
        50,
        CreditTransactionType.CLOTHING_ADDED,
        '테스트 추가',
        idempotencyKey,
      );

      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);
      expect(result2.newBalance).toBe(initialCredit + 50); // 변화 없음

      // 실제 잔액 확인
      const finalCredit = await service.getCredit(testUserId);
      expect(finalCredit).toBe(initialCredit + 50);
    });

    it('같은 멱등키로 중복 차감 요청 시 한 번만 처리', async () => {
      const idempotencyKey = `deduct-test-${Date.now()}`;
      const initialCredit = await service.getCredit(testUserId);

      // 첫 번째 요청
      const result1 = await service.deductCredit(
        testUserId,
        10,
        CreditTransactionType.VTO_USED,
        '테스트 차감',
        idempotencyKey,
      );

      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBe(false);

      // 같은 멱등키로 두 번째 요청
      const result2 = await service.deductCredit(
        testUserId,
        10,
        CreditTransactionType.VTO_USED,
        '테스트 차감',
        idempotencyKey,
      );

      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);

      // 실제 잔액 확인 (한 번만 차감됨)
      const finalCredit = await service.getCredit(testUserId);
      expect(finalCredit).toBe(initialCredit - 10);
    });

    it('회원가입 크레딧 중복 지급 방지', async () => {
      const newUserId = `signup-test-${Date.now()}`;
      
      await prisma.user.create({
        data: {
          id: newUserId,
          email: `signup-${Date.now()}@test.com`,
          credit: 0,
        },
      });

      // 첫 번째 지급
      const result1 = await service.grantSignupCredit(newUserId);
      expect(result1.duplicate).toBe(false);
      expect(result1.newBalance).toBe(100);

      // 두 번째 지급 시도 (같은 멱등키 사용)
      const result2 = await service.grantSignupCredit(newUserId);
      expect(result2.duplicate).toBe(true);
      expect(result2.newBalance).toBe(100);

      // 정리
      await prisma.creditHistory.deleteMany({ where: { userId: newUserId } });
      await prisma.user.delete({ where: { id: newUserId } });
    });
  });

  describe('동시성 테스트', () => {
    it('동시에 같은 차감 요청 시 하나만 처리', async () => {
      // 초기 잔액 설정
      await prisma.user.update({
        where: { id: testUserId },
        data: { credit: 100 },
      });

      const idempotencyKey = `concurrent-deduct-${Date.now()}`;

      // 동시에 10개 요청
      const requests = Array(10).fill(null).map(() =>
        service.deductCredit(
          testUserId,
          10,
          CreditTransactionType.VTO_USED,
          '동시성 테스트',
          idempotencyKey,
        )
      );

      const results = await Promise.allSettled(requests);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const duplicates = fulfilled.filter(
        r => (r as PromiseFulfilledResult<any>).value.duplicate === true
      );

      console.log(`성공: ${fulfilled.length}, 중복: ${duplicates.length}`);

      // 잔액 확인 (한 번만 차감)
      const finalCredit = await service.getCredit(testUserId);
      expect(finalCredit).toBe(90);
    });

    it('동시에 다른 차감 요청 시 모두 순차 처리', async () => {
      // 초기 잔액 설정
      await prisma.user.update({
        where: { id: testUserId },
        data: { credit: 100 },
      });

      // 동시에 5개 다른 요청
      const requests = Array(5).fill(null).map((_, i) =>
        service.deductCredit(
          testUserId,
          10,
          CreditTransactionType.VTO_USED,
          `동시성 테스트 ${i}`,
          `concurrent-diff-${Date.now()}-${i}`,
        )
      );

      const results = await Promise.allSettled(requests);
      const fulfilled = results.filter(r => r.status === 'fulfilled');

      console.log(`성공: ${fulfilled.length}/5`);

      // 잔액 확인 (5번 차감 = 50)
      const finalCredit = await service.getCredit(testUserId);
      expect(finalCredit).toBe(50);
    });

    it('잔액 부족 시 원자적 거부', async () => {
      // 초기 잔액 설정
      await prisma.user.update({
        where: { id: testUserId },
        data: { credit: 20 },
      });

      // 동시에 5개 요청 (각 10크레딧, 총 50 필요하지만 20만 있음)
      const requests = Array(5).fill(null).map((_, i) =>
        service.deductCredit(
          testUserId,
          10,
          CreditTransactionType.VTO_USED,
          `부족 테스트 ${i}`,
          `insufficient-${Date.now()}-${i}`,
        ).catch(e => ({ error: e.message }))
      );

      const results = await Promise.all(requests);
      const success = results.filter(r => !('error' in r)).length;
      const failed = results.filter(r => 'error' in r).length;

      console.log(`성공: ${success}, 실패(잔액부족): ${failed}`);

      // 최대 2번만 성공해야 함 (20 크레딧 / 10 = 2)
      expect(success).toBeLessThanOrEqual(2);

      // 잔액이 음수가 되면 안 됨
      const finalCredit = await service.getCredit(testUserId);
      expect(finalCredit).toBeGreaterThanOrEqual(0);
    });
  });

  describe('정합성 테스트', () => {
    it('캐시된 잔액과 이력 합계가 일치', async () => {
      const result = await service.verifyIntegrity(testUserId);
      
      console.log(`캐시 잔액: ${result.cachedCredit}`);
      console.log(`계산 잔액: ${result.calculatedCredit}`);
      console.log(`차이: ${result.diff}`);

      expect(result.isValid).toBe(true);
      expect(result.diff).toBe(0);
    });
  });
});