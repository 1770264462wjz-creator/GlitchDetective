import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/constants/error-code';
import { TokenService } from '../token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 全局 JWT 守卫（docs/06 §4.3）：
 * - @Public() 放行（如 /auth/login）
 * - token 缺失 → 2001；验签失败 → 2003；会话失效 → 2002（由 TokenService 抛 BusinessException）
 * - 校验通过挂载 req.user = { userId, platform }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearer(req.headers.authorization);
    if (!token) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '未登录');
    }

    const user = this.tokenService.verify(token);
    (req as Request & { user: unknown }).user = user;
    return true;
  }

  private extractBearer(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
}