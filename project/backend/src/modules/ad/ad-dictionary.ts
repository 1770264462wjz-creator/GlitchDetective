/**
 * 广告模块枚举与频控配置（docs/09 §2，唯一业务依据）。
 * ad_type 与 gd_ad_reward.ad_type 严格一致；scene 对应 docs/08 §3.7。
 */

export const AD_TYPES = ['hint', 'revive', 'double', 'clue'] as const;
export type AdType = (typeof AD_TYPES)[number];

export const AD_SCENES = ['level', 'settle'] as const;
export type AdScene = (typeof AD_SCENES)[number];

/** 验证状态（gd_ad_reward.verify_status） */
export const VERIFY_STATUS_PENDING = 1;
export const VERIFY_STATUS_PASSED = 2;
export const VERIFY_STATUS_REJECTED = 3;

/** 点位合法场景（docs/08 §3.7 level_id 说明） */
export function requiresLevelId(adType: AdType): boolean {
  return adType === 'hint' || adType === 'revive';
}

/**
 * 频控配置（docs/09 §2.3）：
 * - 单日总次数 ≤ 12（4 点位合计）
 * - 点位级：hint 8 / revive 5 / double 3 / clue 3
 * - 单关级：hint ≤ 3、revive ≤ 1、double ≤ 1（clue 不限）
 * - 连续观看间隔 ≥ 90s
 */
export const RATE_LIMIT_CONFIG = {
  /** 单日总次数上限 */
  dailyTotal: 12,
  /** 点位级单日上限 */
  perTypeDaily: { hint: 8, revive: 5, double: 3, clue: 3 } as Record<AdType, number>,
  /** 单关上限（clue 不限 → Infinity） */
  perLevel: { hint: 3, revive: 1, double: 1, clue: Infinity } as Record<AdType, number>,
  /** 连续观看最小间隔（毫秒） */
  minIntervalMs: 90_000,
} as const;

/** 频控 Redis 键模板（M3 落 Redis 后使用，内存版以 userId 隔离） */
export const RATE_KEY_DAILY = (userId: string) => `gd:rate:${userId}:ad_daily`;
export const RATE_KEY_TYPE = (userId: string, adType: string) =>
  `gd:rate:${userId}:ad_${adType}`;
export const RATE_KEY_LEVEL = (userId: string, levelId: string, adType: string) =>
  `gd:rate:${userId}:ad_${adType}:level:${levelId}`;
export const RATE_KEY_LAST = (userId: string) => `gd:rate:${userId}:ad_last`;
