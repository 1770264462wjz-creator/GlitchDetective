import { AdScene, AdType } from './ad-dictionary';

/** 广告模块共享类型（docs/08 §3.7~3.9、docs/09 §3） */

/** 存储层广告会话（ad_token 登记，docs/06 §5.1） */
export interface AdSession {
  token: string;
  userId: string;
  adType: AdType;
  scene: AdScene;
  levelId: string | null;
  createdAt: number;
}

/** 存储层广告奖励审计记录（对齐 gd_ad_reward 表） */
export interface StoredAdReward {
  id: string;
  userId: string;
  adType: AdType;
  scene: AdScene;
  levelId: string | null;
  platformOrderId: string;
  verifyStatus: number;
  reward: RewardDetail | null;
  createdAt: string;
}

/** /ad/start 响应（docs/08 §3.7） */
export interface StartResult {
  ad_token: string;
}

/** 发奖明细（docs/08 §3.8 reward 对象） */
export interface RewardDetail {
  type: string;
  stars_gained?: number;
  platform_order_id: string;
  /** hint 档位 / clue 线索编号等扩展信息 */
  extra?: Record<string, unknown>;
}

/** /ad/verify 与 /ad/reward-claim 响应（docs/08 §3.8/3.9） */
export interface AdVerifyResult {
  rewarded: boolean;
  reward: RewardDetail;
}

/** /ad/reward-claim 响应（docs/08 §3.9） */
export interface RewardClaimResult {
  claimed: boolean;
  reward: RewardDetail;
}
