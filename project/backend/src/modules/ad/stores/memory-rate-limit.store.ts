import { Injectable } from '@nestjs/common';
import { RateLimitStore } from '../interfaces/rate-limit-store.interface';

interface CounterEntry {
  count: number;
  lastTime?: number;
}

/**
 * 内存频控计数器（M2 占位，docs/09 §2.3）。
 * M3 迁移 Redis 时替换 provider（gd:rate:* 键 + TTL 至次日 0 点），
 * 内存版进程重启重置为已知约束（开发期可接受）。
 */
@Injectable()
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, CounterEntry>();

  /** 清空全部计数（测试隔离用） */
  resetAll(): void {
    this.counters.clear();
  }

  incr(key: string): number {
    const entry = this.counters.get(key) ?? { count: 0 };
    entry.count++;
    this.counters.set(key, entry);
    return entry.count;
  }

  get(key: string): number {
    return this.counters.get(key)?.count ?? 0;
  }

  setLastTime(key: string, ts: number): void {
    const entry = this.counters.get(key) ?? { count: 0 };
    entry.lastTime = ts;
    this.counters.set(key, entry);
  }

  getLastTime(key: string): number | undefined {
    return this.counters.get(key)?.lastTime;
  }
}
