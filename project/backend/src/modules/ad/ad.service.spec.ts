import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { MemoryLevelStore } from '../level/stores/memory-level.store';
import { LevelService } from '../level/level.service';
import { MemorySaveStore } from '../save/stores/memory-save.store';
import { SaveService } from '../save/save.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { MemoryEventStore } from '../analytics/stores/memory-event.store';
import { AdService } from './ad.service';
import { MemoryAdTokenStore } from './stores/memory-ad-token.store';
import { MemoryAdRewardStore } from './stores/memory-ad-reward.store';
import { MemoryRateLimitStore } from './stores/memory-rate-limit.store';
import { MockAdVerifier } from './verifiers/mock-ad.verifier';
import { RATE_KEY_LAST } from './ad-dictionary';

describe('AdService', () => {
  const levelStore = new MemoryLevelStore();
  levelStore.onModuleInit();
  const levelService = new LevelService(levelStore);
  const saveService = new SaveService(new MemorySaveStore(), levelService);
  const analyticsService = new AnalyticsService(new MemoryEventStore());
  const adTokenStore = new MemoryAdTokenStore();
  const adRewardStore = new MemoryAdRewardStore();
  const rateStore = new MemoryRateLimitStore();
  const service = new AdService(
    adTokenStore,
    adRewardStore,
    rateStore,
    new MockAdVerifier(),
    levelService,
    saveService,
    analyticsService,
  );

  const userId = 'u1';

  beforeEach(() => {
    // 隔离频控状态：避免用例间冷却/计数互相影响
    rateStore.resetAll();
  });

  async function expectBusinessCodeAsync(
    fn: () => Promise<unknown> | unknown,
    code: number,
  ) {
    try {
      await fn();
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(code);
    }
  }

  function expectBusinessCode(fn: () => unknown, code: number) {
    try {
      fn();
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(code);
    }
  }

  async function startAndVerify(adType: string, levelId = '1') {
    const start = service.start(userId, adType as never, 'level', levelId);
    return service.verifyAndReward(userId, {
      adToken: start.ad_token,
      adType: adType as never,
      scene: 'level',
      levelId,
      platformOrderId: `dyad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      adUnitId: `adunit_${adType}_01`,
    });
  }

  it('start 返回会话凭证（ad_token 格式正确）', () => {
    const result = service.start(userId, 'hint', 'level', '1');
    expect(result.ad_token).toMatch(/^ad_/);
  });

  it('hint 广告必须带 level_id（1001）', () => {
    expectBusinessCode(() => service.start(userId, 'hint', 'level'), ErrorCode.PARAM_INVALID);
  });

  it('非法 ad_type 返回 1001', () => {
    expectBusinessCode(() => service.start(userId, 'bogus' as never, 'level'), ErrorCode.PARAM_INVALID);
  });

  it('未解锁关卡返回 4031', () => {
    // 新用户 max_level=1，上报第 3 关广告 → 4031
    expectBusinessCode(() => service.start(userId, 'hint', 'level', '3'), ErrorCode.LEVEL_LOCKED);
  });

  it('verify 全链路成功：返回 double_stars 奖励并消费会话', async () => {
    const start = service.start(userId, 'double', 'settle', '1');
    const result = await service.verifyAndReward(userId, {
      adToken: start.ad_token,
      adType: 'double',
      scene: 'settle',
      levelId: '1',
      platformOrderId: 'dyad_double_001',
      adUnitId: 'adunit_double_01',
    });
    expect(result.rewarded).toBe(true);
    expect(result.reward.type).toBe('double_stars');
    expect(result.reward.platform_order_id).toBe('dyad_double_001');
    // 会话已消费：再次 verify 同 token → 4021
    await expect(
      service.verifyAndReward(userId, {
        adToken: start.ad_token,
        adType: 'double',
        scene: 'settle',
        levelId: '1',
        platformOrderId: 'dyad_double_001_dup',
        adUnitId: 'adunit_double_01',
      }),
    ).rejects.toThrow();
  });

  it('verify 幂等：相同 platform_order_id 重复调用返回既有结果（不发奖两次）', async () => {
    const start = service.start(userId, 'revive', 'level', '1');
    const input = {
      adToken: start.ad_token,
      adType: 'revive' as const,
      scene: 'level' as const,
      levelId: '1',
      platformOrderId: 'dyad_revive_dup_001',
      adUnitId: 'adunit_revive_01',
    };
    const first = await service.verifyAndReward(userId, input);
    expect(first.rewarded).toBe(true);
    const second = await service.verifyAndReward(userId, input);
    expect(second.reward.platform_order_id).toBe('dyad_revive_dup_001');
  });

  it('伪造 platform_order_id 验证拒绝 → 4021', async () => {
    const start = service.start(userId, 'hint', 'level', '1');
    try {
      await service.verifyAndReward(userId, {
        adToken: start.ad_token,
        adType: 'hint',
        scene: 'level',
        levelId: '1',
        platformOrderId: 'fake_order_001',
        adUnitId: 'adunit_hint_01',
      });
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.AD_TOKEN_INVALID);
    }
  });

  it('无会话直接 verify（无 ad_token）→ 4021', async () => {
    try {
      await service.verifyAndReward(userId, {
        adToken: 'ad_never_started',
        adType: 'hint',
        scene: 'level',
        levelId: '1',
        platformOrderId: 'dyad_nosession_001',
        adUnitId: 'adunit_hint_01',
      });
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.AD_TOKEN_INVALID);
    }
  });

  it('reward-claim 补偿领取：verify_status=2 可补发', async () => {
    const start = service.start(userId, 'clue', 'level', '1');
    await service.verifyAndReward(userId, {
      adToken: start.ad_token,
      adType: 'clue',
      scene: 'level',
      levelId: '1',
      platformOrderId: 'dyad_clue_claim_001',
      adUnitId: 'adunit_clue_01',
    });
    const claim = service.claimReward(userId, 'dyad_clue_claim_001');
    expect(claim.claimed).toBe(true);
    expect(claim.reward.type).toBe('clue_unlock');
  });

  it('reward-claim 未验证记录不可补发（4021）', async () => {
    const start = service.start(userId, 'hint', 'level', '1');
    try {
      await service.verifyAndReward(userId, {
        adToken: start.ad_token,
        adType: 'hint',
        scene: 'level',
        levelId: '1',
        platformOrderId: 'fake_claim_001',
        adUnitId: 'adunit_hint_01',
      });
      fail('伪造凭证应当被拒');
    } catch {
      // 伪造被拒，verify_status=3 已写审计
    }
    expectBusinessCode(() => service.claimReward(userId, 'fake_claim_001'), ErrorCode.AD_TOKEN_INVALID);
  });

  it('reward-claim 不存在的记录返回 1003', () => {
    expectBusinessCode(() => service.claimReward(userId, 'nonexistent_order'), ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('单关频控：hint 每关最多 3 次（第 4 次 start 被拒）', async () => {
    const rateUser = 'u_rate';

    for (let i = 0; i < 3; i++) {
      // 每次 verify 后冷却时间戳会更新，重置 lastTime 避免冷却干扰频控断言
      rateStore.setLastTime(RATE_KEY_LAST(rateUser), 0);
      const start = service.start(rateUser, 'hint', 'level', '1');
      await service.verifyAndReward(rateUser, {
        adToken: start.ad_token,
        adType: 'hint',
        scene: 'level',
        levelId: '1',
        platformOrderId: `dyad_rate_${i}`,
        adUnitId: 'adunit_hint_01',
      });
    }
    // 单关 hint 已满 3 次 → 第 4 次 start 被单关频控拦截（4001）
    expectBusinessCode(
      () => service.start(rateUser, 'hint', 'level', '1'),
      ErrorCode.RATE_LIMITED,
    );
  });

  it('冷却：90 秒内连续完成两次广告被拒（4023）', async () => {
    const coolUser = 'u_cool';
    rateStore.setLastTime(RATE_KEY_LAST(coolUser), 0);
    const first = service.start(coolUser, 'clue', 'level', '1');
    await service.verifyAndReward(coolUser, {
      adToken: first.ad_token,
      adType: 'clue',
      scene: 'level',
      levelId: '1',
      platformOrderId: 'dyad_cool_1',
      adUnitId: 'adunit_clue_01',
    });
    // 第一次 verify 成功已更新冷却时间戳 → 第二次 verify 应在冷却内被拒
    const second = service.start(coolUser, 'clue', 'level', '1');
    await expectBusinessCodeAsync(
      () =>
        service.verifyAndReward(coolUser, {
          adToken: second.ad_token,
          adType: 'clue',
          scene: 'level',
          levelId: '1',
          platformOrderId: 'dyad_cool_2',
          adUnitId: 'adunit_clue_01',
        }),
      ErrorCode.AD_REWARD_COOLDOWN,
    );
  });
});
