import { StoredBugLog, StoredUserProgress } from './save.types';

/** save 存储层依赖注入 token（M3 迁 MySQL 时替换 provider） */
export const SAVE_STORE = 'SAVE_STORE';

/**
 * 进度存档存储接口（对齐 gd_user_progress / gd_bug_log 表语义）。
 * M2 使用内存实现；M3 迁移 MySQL 后仅需替换 provider，Service 不感知。
 */
export interface SaveStore {
  /** 按用户拉取存档；不存在返回 undefined（调用方按默认值处理） */
  findByUserId(userId: string): StoredUserProgress | undefined;
  /** 整档 upsert（单用户一行） */
  upsert(progress: StoredUserProgress): void;
}

export type { StoredBugLog };