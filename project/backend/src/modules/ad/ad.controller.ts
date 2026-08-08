import { Body, Controller, Post } from '@nestjs/common';
import { AdService } from './ad.service';
import { AdRewardClaimDto, AdStartDto, AdVerifyDto } from './dto/ad.dto';
import { AdVerifyResult, RewardClaimResult, StartResult } from './ad.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

/**
 * 广告接口（docs/08 §3.7~3.9）。
 * 全部需登录（全局 JwtAuthGuard），用户身份取自 req.user。
 */
@Controller('ad')
export class AdController {
  constructor(private readonly adService: AdService) {}

  /** POST /api/v1/ad/start 开启广告会话（docs/08 §3.7） */
  @Post('start')
  start(@Body() body: AdStartDto, @CurrentUser() user: AuthUser): StartResult {
    return this.adService.start(user.userId, body.ad_type as never, body.scene as never, body.level_id);
  }

  /** POST /api/v1/ad/verify 广告奖励验证（docs/08 §3.8） */
  @Post('verify')
  async verify(
    @Body() body: AdVerifyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AdVerifyResult> {
    return this.adService.verifyAndReward(user.userId, {
      adToken: body.ad_token,
      adType: body.ad_type as never,
      scene: body.scene as never,
      levelId: body.level_id,
      platformOrderId: body.platform_order_id,
      adUnitId: body.ad_unit_id,
    });
  }

  /** POST /api/v1/ad/reward-claim 补偿领取（docs/08 §3.9） */
  @Post('reward-claim')
  claim(
    @Body() body: AdRewardClaimDto,
    @CurrentUser() user: AuthUser,
  ): RewardClaimResult {
    return this.adService.claimReward(user.userId, body.platform_order_id);
  }
}
