import { Injectable } from '@nestjs/common';
import { SaveStore } from '../save-store.interface';
import { StoredUserProgress } from '../save.types';

/**
 * 内存存档存储（M2 占位实现，按 user_id 隔离）。
 * M3 迁移 MySQL 时替换 SAVE_STORE provider；进程重启丢失为已知约束（demo 期可接受）。
 */
@Injectable()
export class MemorySaveStore implements SaveStore {
  private readonly users = new Map<string, StoredUserProgress>();

  /** 新用户默认存档：1 号关可玩、零进度 */
  static defaultFor(userId: string): StoredUserProgress {
    return {
      userId,
      currentLevelId: 1,
      maxLevel: 1,
      starsTotal: 0,
      finishedCount: 0,
      bestTimeMs: {},
      perLevel: {},
      bugLogs: [],
      extra: {},
    };
  }

  findByUserId(userId: string): StoredUserProgress | undefined {
    return this.users.get(userId);
  }

  upsert(progress: StoredUserProgress): void {
    this.users.set(progress.userId, progress);
  }
}