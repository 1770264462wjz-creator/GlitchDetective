import { Injectable } from '@nestjs/common';
import { CreateUserInput, StoredUser, USER_STATUS_ACTIVE, UserStore } from '../interfaces/user-store.interface';

/**
 * 内存用户存储（M2 占位，对齐 gd_user 表语义）。
 * 注册即登录：openid 唯一，自增 id，生成对外 user_id gd_u_{id}。
 * M3 迁移 MySQL 时替换 USER_STORE provider。
 */
@Injectable()
export class MemoryUserStore implements UserStore {
  private readonly byOpenid = new Map<string, StoredUser>();
  private readonly byId = new Map<number, StoredUser>();
  private nextId = 100001;

  findByOpenid(openid: string): StoredUser | undefined {
    return this.byOpenid.get(openid);
  }

  findById(id: number): StoredUser | undefined {
    return this.byId.get(id);
  }

  create(input: CreateUserInput): StoredUser {
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: this.nextId++,
      openid: input.openid,
      nickname: input.nickname ?? '',
      avatarUrl: input.avatarUrl ?? '',
      platform: input.platform,
      status: USER_STATUS_ACTIVE,
      isMinor: input.isMinor,
      isMember: false,
      memberExpireAt: null,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.byOpenid.set(user.openid, user);
    this.byId.set(user.id, user);
    return user;
  }

  updateLastLogin(id: number, at: string): void {
    const user = this.byId.get(id);
    if (user) {
      user.lastLoginAt = at;
      user.updatedAt = at;
    }
  }
}