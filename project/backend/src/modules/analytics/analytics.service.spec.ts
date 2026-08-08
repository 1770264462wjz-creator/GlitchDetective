import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { AnalyticsService } from './analytics.service';
import { MemoryEventStore } from './stores/memory-event.store';
import type { EventInput, RequestContext } from './analytics.types';

describe('AnalyticsService', () => {
  const store = new MemoryEventStore();
  const service = new AnalyticsService(store);

  const loginCtx: RequestContext = { userId: 'u1', platform: 'douyin', appVersion: '1.0.0' };
  const anonCtx: RequestContext = { userId: null, platform: 'douyin', appVersion: '1.0.0' };

  function event(overrides: Partial<EventInput> = {}): EventInput {
    return {
      eventId: `evt_${Math.random().toString(36).slice(2, 10)}`,
      eventName: 'level_start',
      properties: { level_id: '1' },
      ts: '2026-08-08T10:00:00.000Z',
      ...overrides,
    };
  }

  it('登录态批量上报：接受全部事件', () => {
    const result = service.reportBatch([event(), event({ eventName: 'level_finish' })], loginCtx);
    expect(result).toEqual({ accepted: 2, dropped: 0 });
  });

  it('匿名白名单事件可上报（user_id 为空）', () => {
    const result = service.reportBatch(
      [event({ eventName: 'app_launch' }), event({ eventName: 'privacy_agree' })],
      anonCtx,
    );
    expect(result).toEqual({ accepted: 2, dropped: 0 });
  });

  it('匿名上报非白名单事件返回 2001', () => {
    try {
      service.reportBatch([event({ eventName: 'level_start' })], anonCtx);
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.UNAUTHORIZED);
    }
  });

  it('非法事件名整批拒绝返回 1001', () => {
    try {
      service.reportBatch([event({ eventName: 'not_a_real_event' })], loginCtx);
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.PARAM_INVALID);
    }
  });

  it('单批超过 50 条返回 1001', () => {
    const many = Array.from({ length: 51 }, () => event());
    try {
      service.reportBatch(many, loginCtx);
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.PARAM_INVALID);
    }
  });

  it('幂等去重：相同 (user_id, event_id) 重复上报计 dropped', () => {
    const dup = event();
    const first = service.reportBatch([dup], loginCtx);
    expect(first).toEqual({ accepted: 1, dropped: 0 });
    const second = service.reportBatch([dup], loginCtx);
    expect(second).toEqual({ accepted: 0, dropped: 1 });
  });

  it('幂等按用户隔离：不同用户相同 event_id 不冲突', () => {
    const evt = event();
    service.reportBatch([evt], loginCtx);
    const other = service.reportBatch([evt], { ...loginCtx, userId: 'u2' });
    expect(other).toEqual({ accepted: 1, dropped: 0 });
  });

  it('服务端代报：事件入库且合法', () => {
    service.reportServer({
      userId: 'u1',
      eventName: 'ad_reward_grant',
      properties: { ad_type: 'hint', level_no: 1 },
    });
    // 不抛异常即通过；幂等键 srv_* 与客户端事件不冲突
    expect(() =>
      service.reportServer({ userId: 'u1', eventName: 'ad_reward_grant' }),
    ).not.toThrow();
  });

  it('服务端代报非法事件名抛 1001', () => {
    try {
      service.reportServer({ userId: 'u1', eventName: 'bad_event' });
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.PARAM_INVALID);
    }
  });
});
