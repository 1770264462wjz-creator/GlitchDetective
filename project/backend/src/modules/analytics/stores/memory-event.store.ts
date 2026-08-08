import { Injectable } from '@nestjs/common';
import { StoredEvent } from '../analytics.types';
import { EventStore } from '../event-store.interface';

/**
 * 内存埋点存储（M2 占位，对齐 gd_event 表语义）。
 * 幂等去重键：(user_id ?? '') + ':' + event_id（MySQL 版由 UK(user_id, event_id) 兜底）。
 * M3 迁移 MySQL 后替换 EVENT_STORE provider；重启丢失为已知约束（开发期可接受）。
 */
@Injectable()
export class MemoryEventStore implements EventStore {
  private readonly events = new Map<string, StoredEvent>();

  private key(userId: string | null, eventId: string): string {
    return `${userId ?? ''}:${eventId}`;
  }

  exists(userId: string | null, eventId: string): boolean {
    return this.events.has(this.key(userId, eventId));
  }

  save(event: StoredEvent): void {
    this.events.set(this.key(event.userId, event.eventId), event);
  }
}
