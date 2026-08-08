import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { LoginResult, UserInfo, toPublicUserId } from './auth.types';
import { TokenService } from './token.service';
import { CODE_EXCHANGER, CodeExchanger } from './interfaces/code-exchanger.interface';
import {
  USER_STORE,
  UserStore,
  USER_STATUS_BANNED,
} from './interfaces/user-store.interface';

/** 登录入参（controller 转换后的领域对象） */
export interface LoginInput {
  code: string;
  nickname?: string;
  avatarUrl?: string;
  platform: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(CODE_EXCHANGER) private readonly codeExchanger: CodeExchanger,
    @Inject(USER_STORE) private readonly userStore: UserStore,
    private readonly tokenService: TokenService,
  ) {}

  /** 登录/注册（docs/08 §3.1）：code → openid → 查/建用户 → 签发 token */
  async login(input: LoginInput): Promise<LoginResult> {
    // 1. code 换 openid（失败抛 3004，由 exchanger 处理）
    const { openid, isMinor } = await this.codeExchanger.exchange(input.code);

    // 2. 按 openid 查用户，不存在则创建（注册即登录）
    let user = this.userStore.findByOpenid(openid);
    const isNew = !user;
    if (!user) {
      user = this.userStore.create({
        openid,
        nickname: input.nickname,
        avatarUrl: input.avatarUrl,
        platform: input.platform,
        isMinor,
      });
    }

    // 3. 封禁拦截
    if (user.status === USER_STATUS_BANNED) {
      throw new BusinessException(ErrorCode.ACCOUNT_BANNED);
    }

    // 4. 更新最后登录 + 签发 token（写会话）
    const now = new Date().toISOString();
    this.userStore.updateLastLogin(user.id, now);
    const token = this.tokenService.sign(String(user.id), user.platform);

    return {
      token,
      expires_in: 7 * 24 * 60 * 60,
      is_new: isNew,
      is_minor: user.isMinor,
      user: this.toUserInfo(user),
    };
  }

  /** 按对外 user_id 取用户资料（不存在抛 2003，由 profile 链路兜底） */
  getUserInfoByPublicId(publicUserId: string): UserInfo | undefined {
    const id = Number(publicUserId.replace(/^gd_u_/, ''));
    const user = this.userStore.findById(id);
    return user ? this.toUserInfo(user) : undefined;
  }

  private toUserInfo(user: {
    id: number;
    nickname: string;
    avatarUrl: string;
    platform: string;
    isMember: boolean;
    memberExpireAt: string | null;
    lastLoginAt: string;
  }): UserInfo {
    return {
      user_id: toPublicUserId(user.id),
      nickname: user.nickname,
      avatar_url: user.avatarUrl,
      platform: user.platform,
      is_member: user.isMember,
      member_expire_at: user.memberExpireAt,
      last_login_at: user.lastLoginAt,
    };
  }
}