import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import {
  ANONYMOUS_ALLOWLIST,
  EVENT_ID_PATTERN,
  EVENT_NAMES,
  MAX_BATCH_SIZE,
} from './event-dictionary';
import { EventStore, EVENT_STORE } from './event-store.interface';
import {
  EventInput,
  ReportEventsResult,
  RequestContext,
  StoredEvent,
} from './analytics.types';

/** 服务端代报事件（docs/10 §5.3：广告类必达，不走批量降级，后续由 ad 模块调用） */
export interface ServerReportInput {
  userId: string;
  eventName: string;
  properties?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(EVENT_STORE) private readonly store: EventStore) {}

  /**
   * 批量上报（docs/08 §3.13 / docs/10 §5.1）。
   * 规则：
   * - 单批 ≤ 50 条（超限 1001）
   * - 事件名必须命中字典（否则 1001）
   * - 未登录（userId 为空）只允许匿名白名单事件（否则 2001）
   * - 按 (user_id, event_id) 幂等去重，重复事件计入 dropped
   */
  reportBatch(inputs: EventInput[], ctx: RequestContext): ReportEventsResult {
    if (inputs.length > MAX_BATCH_SIZE) {
      throw new BusinessException(
        ErrorCode.PARAM_INVALID,
        `单批最多 ${MAX_BATCH_SIZE} 条`,
      );
    }

    let accepted = 0;
    let dropped = 0;
    const now = new Date().toISOString();

    for (const input of inputs) {
      // 事件名非法 → 整批拒绝（docs/08 §3.13：1001）
      if (!EVENT_NAMES.includes(input.eventName)) {
        throw new BusinessException(
          ErrorCode.PARAM_INVALID,
          `非法事件名：${input.eventName}`,
        );
      }
      // 幂等键必填
      if (!EVENT_ID_PATTERN.test(input.eventId)) {
        throw new BusinessException(
          ErrorCode.PARAM_INVALID,
          'event_id 非法（1-64 位字母数字或 -_）',
        );
      }
      // 匿名白名单检查
      if (ctx.userId == null && !ANONYMOUS_ALLOWLIST.has(input.eventName)) {
        throw new BusinessException(
          ErrorCode.UNAUTHORIZED,
          `事件 ${input.eventName} 需要登录态`,
        );
      }
      // 幂等去重
      if (this.store.exists(ctx.userId, input.eventId)) {
        dropped++;
        continue;
      }

      const event: StoredEvent = {
        userId: ctx.userId,
        eventId: input.eventId,
        eventName: input.eventName,
        properties: input.properties ?? null,
        platform: ctx.platform,
        appVersion: ctx.appVersion,
        ts: input.ts,
        createdAt: now,
      };
      this.store.save(event);
      accepted++;
    }

    return { accepted, dropped };
  }

  /**
   * 服务端代报（docs/10 §5.3：ad_watch / ad_verify / ad_reward_grant 必达，
   * 由后端在发奖事务成功后直报）。事件名须在字典内，未命中抛 1001。
   */
  reportServer(input: ServerReportInput): void {
    if (!EVENT_NAMES.includes(input.eventName)) {
      throw new BusinessException(
        ErrorCode.PARAM_INVALID,
        `非法事件名：${input.eventName}`,
      );
    }
    const now = new Date().toISOString();
    const event: StoredEvent = {
      userId: input.userId,
      eventId: `srv_${input.userId}_${input.eventName}_${Date.now()}`,
      eventName: input.eventName,
      properties: input.properties ?? null,
      platform: 'douyin',
      appVersion: 'server',
      ts: now,
      createdAt: now,
    };
    this.store.save(event);
  }
}
