import { Body, Controller, Get, Post } from '@nestjs/common';
import { ReportProgressDto } from './dto/save.dto';
import { SaveService } from './save.service';
import { ProgressSnapshot, ReportProgressResult } from './save.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

/**
 * 进度存档接口（docs/08 §3.5 POST /progress、§3.6 GET /progress）。
 * 需登录：用户身份取自全局 JwtAuthGuard 挂载的 req.user（token），
 * 与 user/profile 同源，保证存档与资料统计一致。
 */
@Controller('progress')
export class SaveController {
  constructor(private readonly saveService: SaveService) {}

  @Post()
  report(
    @Body() body: ReportProgressDto,
    @CurrentUser() user: AuthUser,
  ): ReportProgressResult {
    return this.saveService.reportProgress(user.userId, {
      levelId: body.level_id,
      stars: body.stars,
      timeMs: body.time_ms,
      finished: body.finished,
      hintUsed: body.hint_used,
      bugUnlocked: body.bug_unlocked,
      clientVersion: body.client_version,
    });
  }

  @Get()
  get(@CurrentUser() user: AuthUser): ProgressSnapshot {
    return this.saveService.getProgress(user.userId);
  }
}