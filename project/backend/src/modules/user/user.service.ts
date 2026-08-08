import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { USER_STORE, UserStore } from '../auth/interfaces/user-store.interface';
import { AuthUser, UserProfileResult, toPublicUserId } from '../auth/auth.types';
import { SaveService } from '../save/save.service';

/**
 * 用户资料模块（docs/08 §3.2 GET /user/profile）。
 * 统计来自 SaveService（gd_user_progress），皮肤系统一期返回 null。
 */
@Injectable()
export class UserService {
  constructor(
    @Inject(USER_STORE) private readonly userStore: UserStore,
    private readonly saveService: SaveService,
  ) {}

  getProfile(user: AuthUser): UserProfileResult {
    const id = Number(user.userId);
    const stored = this.userStore.findById(id);
    if (!stored) {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '用户不存在');
    }

    const progress = this.saveService.getProgress(user.userId);

    return {
      user: {
        user_id: toPublicUserId(stored.id),
        nickname: stored.nickname,
        avatar_url: stored.avatarUrl,
        platform: stored.platform,
        is_member: stored.isMember,
        member_expire_at: stored.memberExpireAt,
        last_login_at: stored.lastLoginAt,
      },
      stats: {
        max_level: progress.progress.max_level,
        finished_count: progress.progress.finished_count,
        stars_total: progress.progress.stars_total,
      },
      equipped_skin: null, // 一期无皮肤系统
    };
  }
}