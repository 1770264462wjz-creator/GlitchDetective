import { StoredEvent } from './analytics.types';

/** analytics 存储层依赖注入 token（M3 迁移 MySQL 时替换 provider） */
export const EVENT_STORE = 'EVENT_STORE';

/**
 * 埋点存储接口（对齐 gd_event 表语义）。
 * 幂等键：按 (user_id, event_id) 去重（docs/10 §5.1）；匿名用户 user_id 为空，用 event_id 区分。
 */
export interface EventStore {
  /** 判断事件是否已入库（幂等去重前置检查） */
  exists(userId: string | null, eventId: string): boolean;
  /** 保存事件 */
  save(event: StoredEvent): void;
}
