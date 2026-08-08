/** 频控计数器抽象（docs/09 §2.3：单日/点位/单关/间隔，M3 迁移 Redis 后替换 provider） */
export interface RateLimitStore {
  /** 计数器 +1，返回自增后的值 */
  incr(key: string): number;
  /** 读取当前计数值 */
  get(key: string): number;
  /** 记录最近一次动作时间戳（冷却校验） */
  setLastTime(key: string, ts: number): void;
  /** 读取最近一次动作时间戳 */
  getLastTime(key: string): number | undefined;
}

export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';
