/** 鉴权与用户模块共享类型（docs/08 §3.1 / §3.2） */

/** 请求上下文的登录用户（guard 挂载到 req.user） */
export interface AuthUser {
  userId: string;
  platform: string;
}

/** 对外用户信息（docs/08 §3.1 user 出参） */
export interface UserInfo {
  user_id: string;
  nickname: string;
  avatar_url: string;
  platform: string;
  is_member: boolean;
  member_expire_at: string | null;
  last_login_at: string;
}

/** POST /auth/login 响应（docs/08 §3.1） */
export interface LoginResult {
  token: string;
  expires_in: number;
  is_new: boolean;
  is_minor: boolean;
  user: UserInfo;
}

/** GET /user/profile 响应（docs/08 §3.2） */
export interface UserProfileResult {
  user: UserInfo;
  stats: {
    max_level: number;
    finished_count: number;
    stars_total: number;
  };
  /** 一期无皮肤系统返回 null */
  equipped_skin: null;
}

/** token 有效期（秒）：7 天（docs/06 §4.2） */
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** 对外 user_id 前缀（docs/08 示例 gd_u_102488） */
export function toPublicUserId(id: number): string {
  return `gd_u_${id}`;
}