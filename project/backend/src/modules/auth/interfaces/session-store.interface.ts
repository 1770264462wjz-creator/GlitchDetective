/**
 * 登录会话存储抽象（docs/06 §4.2 双通道校验：JWT 验签 + 会话存在性）。
 * Redis 实现 M 阶段替换 SESSION_STORE provider（键 gd:session:{token}，TTL 7d）。
 */
export interface SessionStore {
  set(token: string, userId: string, ttlSeconds: number): void;
  /** 返回会话绑定的 userId；不存在/已过期返回 undefined */
  get(token: string): string | undefined;
  del(token: string): void;
}

export const SESSION_STORE = 'SESSION_STORE';