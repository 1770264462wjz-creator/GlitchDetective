import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ReportEventsDto } from './dto/analytics.dto';
import { ReportEventsResult } from './analytics.types';
import { Public } from '../auth/decorators/public.decorator';
import { TokenService } from '../auth/token.service';

/**
 * 埋点上报（docs/08 §3.13 POST /events）。
 * 鉴权策略（docs/10 §5.1）：
 * - 接口标记 @Public() 以允许匿名白名单事件（app_launch/login_fail/privacy_agree 等）
 * - 带 token：解析登录用户（解析失败抛 2003），所有合法事件可上报
 * - 无 token：仅白名单事件可上报（service 层拦截其余 → 2001）
 */
@Controller('events')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  @Public()
  @Post()
  report(
    @Body() body: ReportEventsDto,
    @Headers('authorization') authorization?: string,
    @Headers('app_version') appVersion?: string,
    @Headers('platform') platform?: string,
  ): ReportEventsResult {
    // 有 token 则解析登录用户（无效 token 不静默：抛 2003）
    let userId: string | null = null;
    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice(7);
      const user = this.tokenService.verify(token);
      userId = user.userId;
    }

    return this.analyticsService.reportBatch(
      body.events.map((e) => ({
        eventId: e.event_id,
        eventName: e.event_name,
        properties: e.properties,
        ts: e.ts,
      })),
      {
        userId,
        platform: platform || 'douyin',
        appVersion: appVersion || '',
      },
    );
  }
}
