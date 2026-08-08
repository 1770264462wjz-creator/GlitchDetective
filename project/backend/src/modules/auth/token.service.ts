import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { AuthUser } from './auth.types';
import { SESSION_STORE, SessionStore } from './interfaces/session-store.interface';

/** JWT payload（docs/06 §4.2：userId/platform/tokenVersion，不含可变信息） */
export interface JwtPayload {
  userId: string;
  platform: string;
  tokenVersion: number;
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d，与 JWT 一致

/**
 * token 签发与校验（HS256，双通道：JWT 验签 + 会话存在性）。
 * M2 用内存会话；Redis 接入后替换 SESSION_STORE provider。
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(SESSION_STORE) private readonly sessionStore: SessionStore,
  ) {}

  /** 签发 JWT（7d）并写会话（TTL 7d） */
  sign(userId: string, platform: string): string {
    const payload: JwtPayload = { userId, platform, tokenVersion: 1 };
    const token = this.jwtService.sign(payload, {
      secret: this.getSecret(),
      expiresIn: SESSION_TTL_SECONDS,
    });
    this.sessionStore.set(token, userId, SESSION_TTL_SECONDS);
    return token;
  }

  /**
   * 校验 token：验签失败 → 2003；会话不存在/已过期 → 2002。
   * 返回登录用户身份（挂载 req.user）。
   */
  verify(token: string): AuthUser {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.getSecret(),
      });
    } catch {
      throw new BusinessException(ErrorCode.TOKEN_INVALID);
    }

    const userId = this.sessionStore.get(token);
    if (!userId || userId !== payload.userId) {
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
    }

    return { userId, platform: payload.platform };
  }

  private getSecret(): string {
    // M2 本地默认密钥（仅开发）；生产必须通过 JWT_SECRET 注入强随机值
    return process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
  }
}