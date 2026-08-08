import { Module } from '@nestjs/common';
import { LevelModule } from '../level/level.module';
import { SaveModule } from '../save/save.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdController } from './ad.controller';
import { AdService } from './ad.service';
import { AD_TOKEN_STORE } from './interfaces/ad-token-store.interface';
import { MemoryAdTokenStore } from './stores/memory-ad-token.store';
import { AD_REWARD_STORE } from './interfaces/ad-reward-store.interface';
import { MemoryAdRewardStore } from './stores/memory-ad-reward.store';
import { RATE_LIMIT_STORE } from './interfaces/rate-limit-store.interface';
import { MemoryRateLimitStore } from './stores/memory-rate-limit.store';
import { AD_VERIFIER } from './interfaces/ad-verifier.interface';
import { MockAdVerifier } from './verifiers/mock-ad.verifier';

/**
 * 广告模块（docs/08 §3.7~3.9、docs/09、docs/06 §5）。
 * M2 使用 MockAdVerifier（本地联调）+ 内存存储；M4 接抖音真实验证 / Redis。
 */
@Module({
  imports: [LevelModule, SaveModule, AnalyticsModule],
  controllers: [AdController],
  providers: [
    { provide: AD_TOKEN_STORE, useClass: MemoryAdTokenStore },
    { provide: AD_REWARD_STORE, useClass: MemoryAdRewardStore },
    { provide: RATE_LIMIT_STORE, useClass: MemoryRateLimitStore },
    { provide: AD_VERIFIER, useClass: MockAdVerifier },
    AdService,
  ],
})
export class AdModule {}
