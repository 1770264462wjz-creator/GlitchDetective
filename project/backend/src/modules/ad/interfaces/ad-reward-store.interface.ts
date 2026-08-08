import { StoredAdReward } from '../ad.types';

/** 广告奖励审计存储（对齐 gd_ad_reward 表，docs/09 §3.3） */
export interface AdRewardStore {
  /** 按 platform_order_id 查记录（幂等键） */
  findByOrderId(platformOrderId: string): StoredAdReward | undefined;
  /** 保存/更新记录 */
  save(reward: StoredAdReward): void;
  /** 按用户 + 关卡 + 点位统计已验证通过次数（单关频控校验用） */
  countPassed(userId: string, levelId: string, adType: string): number;
}

export const AD_REWARD_STORE = 'AD_REWARD_STORE';
