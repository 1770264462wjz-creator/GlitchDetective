import { Injectable } from '@nestjs/common';
import { SessionStore } from '../interfaces/session-store.interface';

interface SessionEntry {
  userId: string;
  expiresAt: number; // epoch ms
}

/**
 * 内存会话存储（M2 占位，对齐 Redis gd:session:{token} 语义，惰性过期）。
 * Redis 实现接入后替换 SESSION_STORE provider 即可（键 gd:session:{token}，TTL 7d）。
 */
@Injectable()
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionEntry>();

  set(token: string, userId: string, ttlSeconds: number): void {
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get(token: string): string | undefined {
    const entry = this.sessions.get(token);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return entry.userId;
  }

  del(token: string): void {
    this.sessions.delete(token);
  }
}