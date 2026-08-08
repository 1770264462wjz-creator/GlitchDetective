import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { AnalyticsService } from '../analytics/analytics.service';
import { LevelService } from '../level/level.service';
import { SaveService } from '../save/save.service';
import {
  AD_TYPES,
  AD_SCENES,
  AdScene,
  AdType,
  RATE_LIMIT_CONFIG,
  RATE_KEY_DAILY,
  RATE_KEY_LAST,
  RATE_KEY_LEVEL,
  RATE_KEY_TYPE,
  VERIFY_STATUS_PASSED,
  VERIFY_STATUS_PENDING,
  VERIFY_STATUS_REJECTED,
  requiresLevelId,
} from './ad-dictionary';
import { AD_TOKEN_STORE, AdTokenStore } from './interfaces/ad-token-store.interface';
import { AD_REWARD_STORE, AdRewardStore } from './interfaces/ad-reward-store.interface';
import { RATE_LIMIT_STORE, RateLimitStore } from './interfaces/rate-limit-store.interface';
import { AD_VERIFIER, AdVerifier } from './interfaces/ad-verifier.interface';
import {
  AdVerifyResult,
  AdSession,
  RewardClaimResult,
  RewardDetail,
  StartResult,
  StoredAdReward,
} from './ad.types';

/** 会话 TTL（毫秒）：验证会话 10 分钟内有效（docs/06 §5.1） */
const SESSION_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AdService {
  constructor(
    @Inject(AD_TOKEN_STORE) private readonly tokenStore: AdTokenStore,
    @Inject(AD_REWARD_STORE) private readonly rewardStore: AdRewardStore,
    @Inject(RATE_LIMIT_STORE) private readonly rateStore: RateLimitStore,
    @Inject(AD_VERIFIER) private readonly verifier: AdVerifier,
    private readonly levelService: LevelService,
    private readonly saveService: SaveService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * 开启广告会话（docs/08 §3.7）。
   * 频控前置校验（单日总控/点位级/单关级/冷却），通过后登记会话返回 ad_token。
   */
  start(userId: string, adType: AdType, scene: AdScene, levelId?: string): StartResult {
    this.validateAdType(adType);
    this.validateScene(scene);
    this.checkLevelId(adType, levelId);
    if (levelId) this.checkLevelUnlocked(userId, levelId);

    this.checkRateLimit(userId, adType, levelId);

    const token = `ad_${Date.now()}_${userId}_${Math.random().toString(36).slice(2, 10)}`;
    const session: AdSession = {
      token,
      userId,
      adType,
      scene,
      levelId: levelId ?? null,
      createdAt: Date.now(),
    };
    this.tokenStore.save(session);
    return { ad_token: token };
  }

  /**
   * 广告奖励验证（docs/08 §3.8，docs/06 §5.3）。
   * 链路：幂等查询 → 会话校验 → 频控 → 服务端验证 → 发奖（记审计 + 代报埋点）。
   */
  async verifyAndReward(
    userId: string,
    input: {
      adToken: string;
      adType: AdType;
      scene: AdScene;
      levelId?: string;
      platformOrderId: string;
      adUnitId: string;
    },
  ): Promise<AdVerifyResult> {
    this.validateAdType(input.adType);
    this.validateScene(input.scene);
    this.checkLevelId(input.adType, input.levelId);

    // ① 幂等：platform_order_id 已处理直接返回（4022 语义由调用方/补偿路径处理）
    const exist = this.rewardStore.findByOrderId(input.platformOrderId);
    if (exist) {
      if (exist.verifyStatus === VERIFY_STATUS_PASSED) {
        return this.toVerifyResult(exist);
      }
      throw new BusinessException(ErrorCode.AD_TOKEN_INVALID, '该广告凭证已处理但未通过验证');
    }

    // ② 会话校验：ad_token 必须来自 /ad/start（防自造请求）
    const session = this.tokenStore.findByToken(input.adToken);
    if (
      !session ||
      session.userId !== userId ||
      session.adType !== input.adType ||
      session.scene !== input.scene ||
      session.levelId !== (input.levelId ?? null) ||
      Date.now() - session.createdAt > SESSION_TTL_MS
    ) {
      throw new BusinessException(ErrorCode.AD_TOKEN_INVALID, '广告会话无效或已过期');
    }

    // ③ 服务端验证（防伪造，docs/06 §5.3）
    //    优先于冷却/频控：伪造凭证必须明确暴露 4021，且不消耗频控计数
    const verify = await this.verifier.verify(input.adUnitId, input.platformOrderId);
    if (!verify.valid) {
      this.rewardStore.save(this.buildRecord(userId, input, VERIFY_STATUS_REJECTED, null));
      throw new BusinessException(ErrorCode.AD_TOKEN_INVALID, '广告凭证验证失败');
    }

    // ④ 冷却：两次广告完成间隔 ≥ 90s（docs/09 §2.3，校验"完成时刻"间隔）
    this.checkCooldown(userId);

    // ⑤ 频控（verify 侧再次校验，防绕过 start 后直调）
    this.checkRateLimit(userId, input.adType, input.levelId);

    // ⑥ 发奖：写审计（verify_status=2）+ 服务端代报埋点 + 消费会话 + 更新冷却时间戳
    const reward = this.buildReward(userId, input.adType, input.platformOrderId, input.levelId);
    const record = this.buildRecord(userId, input, VERIFY_STATUS_PASSED, reward);
    this.rewardStore.save(record);
    this.tokenStore.consume(input.adToken);
    this.rateStore.setLastTime(RATE_KEY_LAST(userId), Date.now());

    // 服务端代报（docs/10 §2.3：ad_verify / ad_reward_grant 由后端直报）
    this.analyticsService.reportServer({
      userId,
      eventName: 'ad_verify',
      properties: { ad_type: input.adType, verify_status: 'pass', platform_order_id: input.platformOrderId },
    });
    this.analyticsService.reportServer({
      userId,
      eventName: 'ad_reward_grant',
      properties: { ad_type: input.adType, reward_content: reward.type, level_no: input.levelId },
    });

    return { rewarded: true, reward };
  }

  /**
   * 补偿领取（docs/08 §3.9）：仅对 verify_status=2 的已通过记录补发。
   * 未通过验证的记录不补发（4021）；奖励已领取过（幂等返回已发放结果）。
   */
  claimReward(userId: string, platformOrderId: string): RewardClaimResult {
    const record = this.rewardStore.findByOrderId(platformOrderId);
    if (!record) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '无对应广告验证记录');
    }
    if (record.userId !== userId) {
      throw new BusinessException(ErrorCode.AD_TOKEN_INVALID, '凭证不属于当前用户');
    }
    if (record.verifyStatus !== VERIFY_STATUS_PASSED) {
      throw new BusinessException(ErrorCode.AD_TOKEN_INVALID, '广告凭证未通过验证，不可补发');
    }
    // 幂等：已发放记录重复领取返回 same（claimed=true 且带原奖励）
    return { claimed: true, reward: record.reward as RewardDetail };
  }

  // ---------- private ----------

  private validateAdType(adType: string): void {
    if (!AD_TYPES.includes(adType as AdType)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, `非法 ad_type：${adType}`);
    }
  }

  private validateScene(scene: string): void {
    if (!AD_SCENES.includes(scene as AdScene)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, `非法 scene：${scene}`);
    }
  }

  private checkLevelId(adType: AdType, levelId?: string): void {
    if (requiresLevelId(adType) && !levelId) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, `${adType} 广告必须携带 level_id`);
    }
  }

  private checkLevelUnlocked(userId: string, levelId: string): void {
    // 复用 save 链路：未解锁关卡上报会被拒（4031），此处用 LevelService 校验关卡存在
    this.levelService.getDetail(levelId); // 不存在抛 1003
    const progress = this.saveService.getProgress(userId);
    if (Number(levelId) > progress.progress.max_level) {
      throw new BusinessException(ErrorCode.LEVEL_LOCKED, '关联关卡未解锁');
    }
  }

  private checkRateLimit(userId: string, adType: AdType, levelId?: string): void {
    // 单日总控
    if (this.rateStore.incr(RATE_KEY_DAILY(userId)) > RATE_LIMIT_CONFIG.dailyTotal) {
      throw new BusinessException(ErrorCode.RATE_LIMITED, '今日广告次数已达上限');
    }
    // 点位级
    if (this.rateStore.incr(RATE_KEY_TYPE(userId, adType)) > RATE_LIMIT_CONFIG.perTypeDaily[adType]) {
      throw new BusinessException(ErrorCode.RATE_LIMITED, `广告点位 ${adType} 单日次数已达上限`);
    }
    // 单关级（经 gd_ad_reward 已通过记录计数）
    if (levelId) {
      const passed = this.rewardStore.countPassed(userId, levelId, adType);
      if (passed >= RATE_LIMIT_CONFIG.perLevel[adType]) {
        throw new BusinessException(ErrorCode.RATE_LIMITED, `广告点位 ${adType} 本关次数已达上限`);
      }
    }
  }

  /** 冷却校验：两次广告完成（verify）间隔 ≥ 90s（docs/09 §2.3） */
  private checkCooldown(userId: string): void {
    const last = this.rateStore.getLastTime(RATE_KEY_LAST(userId));
    const now = Date.now();
    if (last != null && now - last < RATE_LIMIT_CONFIG.minIntervalMs) {
      throw new BusinessException(ErrorCode.AD_REWARD_COOLDOWN, '广告观看过于频繁，请稍后再试');
    }
    // 注意：不在此处设置时间戳，仅在发奖成功后更新（start 不参与冷却）
  }

  private buildRecord(
    userId: string,
    input: {
      adType: AdType;
      scene: AdScene;
      levelId?: string;
      platformOrderId: string;
    },
    status: number,
    reward: RewardDetail | null,
  ): StoredAdReward {
    return {
      id: `adr_${userId}_${input.platformOrderId}`,
      userId,
      adType: input.adType,
      scene: input.scene,
      levelId: input.levelId ?? null,
      platformOrderId: input.platformOrderId,
      verifyStatus: status,
      reward,
      createdAt: new Date().toISOString(),
    };
  }

  /** 生成奖励明细（docs/09 §2.1 奖励内容） */
  private buildReward(
    userId: string,
    adType: AdType,
    platformOrderId: string,
    levelId?: string,
  ): RewardDetail {
    switch (adType) {
      case 'double':
        return {
          type: 'double_stars',
          stars_gained: 3, // 基础星级翻倍（3★ × 2 = 6 → 补 3 星），结算侧 M4 联调兑现
          platform_order_id: platformOrderId,
          extra: { level_id: levelId ?? null, base_stars: 3 },
        };
      case 'hint':
        return {
          type: 'hint_unlock',
          platform_order_id: platformOrderId,
          extra: { level_id: levelId ?? null },
        };
      case 'revive':
        return {
          type: 'level_revive',
          platform_order_id: platformOrderId,
          extra: { level_id: levelId ?? null },
        };
      case 'clue':
        return {
          type: 'clue_unlock',
          platform_order_id: platformOrderId,
          extra: { level_id: levelId ?? null },
        };
    }
  }

  private toVerifyResult(record: StoredAdReward): AdVerifyResult {
    return {
      rewarded: true,
      reward:
        record.reward ??
        ({ type: 'unknown', platform_order_id: record.platformOrderId } satisfies RewardDetail),
    };
  }
}
