/** analytics 模块共享类型（docs/08 §3.13 / docs/10 §5.1） */

/** 单条事件入参（客户端上报） */
export interface EventInput {
  eventId: string;
  eventName: string;
  properties?: Record<string, unknown>;
  /** 客户端事件时间（ISO8601） */
  ts: string;
}

/** 存储层事件记录（对齐 gd_event 表） */
export interface StoredEvent {
  userId: string | null;
  eventId: string;
  eventName: string;
  properties: Record<string, unknown> | null;
  platform: string;
  appVersion: string;
  ts: string;
  createdAt: string;
}

/** 上报响应（docs/08 §3.13） */
export interface ReportEventsResult {
  accepted: number;
  dropped: number;
}

/** 请求头携带的公共上下文（docs/10 §5.1） */
export interface RequestContext {
  userId: string | null;
  platform: string;
  appVersion: string;
}
