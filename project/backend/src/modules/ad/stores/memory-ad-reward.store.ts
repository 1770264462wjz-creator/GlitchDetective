import { Injectable } from '@nestjs/common';
import { StoredAdReward } from '../ad.types';
import { AdRewardStore } from '../interfaces/ad-reward-store.interface';
import { VERIFY_STATUS_PASSED } from '../ad-dictionary';

/**
 * 内存广告奖励审计存储（M2 占位，对齐 gd_ad_reward 表）。
 * 幂等键：platform_order_id 唯一（MySQL 版由 UK(platform_order_id) 兜底）。
 * M3 迁移 MySQL 时替换 provider。
 */
@Injectable()
export class MemoryAdRewardStore implements AdRewardStore {
  private readonly byOrderId = new Map<string, StoredAdReward>();

  findByOrderId(platformOrderId: string): StoredAdReward | undefined {
    return this.byOrderId.get(platformOrderId);
  }

  save(reward: StoredAdReward): void {
    this.byOrderId.set(reward.platformOrderId, reward);
  }

  countPassed(userId: string, levelId: string, adType: string): number {
    let count = 0;
    for (const r of this.byOrderId.values()) {
      if (
        r.userId === userId &&
        r.levelId === levelId &&
        r.adType === adType &&
        r.verifyStatus === VERIFY_STATUS_PASSED
      ) {
        count++;
      }
    }
    return count;
  }
}
