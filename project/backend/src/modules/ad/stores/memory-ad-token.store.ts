import { Injectable } from '@nestjs/common';
import { AdSession } from '../ad.types';
import { AdTokenStore } from '../interfaces/ad-token-store.interface';

/**
 * 内存广告会话存储（M2 占位）。
 * 会话为一次性凭证：verify 成功后 consume 失效，防重用（docs/06 §5.1）。
 * M3 迁移 Redis（gd:ad:session:{token}，TTL 10min）时替换 provider。
 */
@Injectable()
export class MemoryAdTokenStore implements AdTokenStore {
  private readonly sessions = new Map<string, AdSession>();

  save(session: AdSession): void {
    this.sessions.set(session.token, session);
  }

  findByToken(token: string): AdSession | undefined {
    return this.sessions.get(token);
  }

  consume(token: string): void {
    this.sessions.delete(token);
  }
}
