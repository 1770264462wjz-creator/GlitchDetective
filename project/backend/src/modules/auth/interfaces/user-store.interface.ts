/** 用户状态（gd_user.status）：1 正常 2 封禁 */
export const USER_STATUS_ACTIVE = 1;
export const USER_STATUS_BANNED = 2;

/** 存储层用户记录（对齐 gd_user 表，docs/07 §3.1） */
export interface StoredUser {
  id: number;
  openid: string;
  nickname: string;
  avatarUrl: string;
  platform: string;
  status: number;
  isMinor: boolean;
  isMember: boolean;
  memberExpireAt: string | null;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

/** 创建用户入参（注册即登录） */
export interface CreateUserInput {
  openid: string;
  nickname?: string;
  avatarUrl?: string;
  platform: string;
  isMinor: boolean;
}

export interface UserStore {
  findByOpenid(openid: string): StoredUser | undefined;
  findById(id: number): StoredUser | undefined;
  create(input: CreateUserInput): StoredUser;
  updateLastLogin(id: number, at: string): void;
}

export const USER_STORE = 'USER_STORE';