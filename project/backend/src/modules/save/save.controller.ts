import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ReportProgressDto } from './dto/save.dto';
import { SaveService } from './save.service';
import { ProgressSnapshot, ReportProgressResult } from './save.types';

/**
 * 进度存档接口（docs/08 §3.5 POST /progress、§3.6 GET /progress）。
 * 用户来源：M 阶段使用 `x-user-id` 请求头（可选，缺省走访客占位符），
 * user/鉴权模块落地后替换为真实用户上下文。
 */
@Controller('progress')
export class SaveController {
  constructor(private readonly saveService: SaveService) {}

  @Post()
  report(
    @Body() body: ReportProgressDto,
    @Headers('x-user-id') userId?: string,
  ): ReportProgressResult {
    return this.saveService.reportProgress(
      userId ?? SaveService.DEFAULT_USER_ID,
      {
        levelId: body.level_id,
        stars: body.stars,
        timeMs: body.time_ms,
        finished: body.finished,
        hintUsed: body.hint_used,
        bugUnlocked: body.bug_unlocked,
        clientVersion: body.client_version,
      },
    );
  }

  @Get()
  get(
    @Headers('x-user-id') userId?: string,
  ): ProgressSnapshot {
    return this.saveService.getProgress(
      userId ?? SaveService.DEFAULT_USER_ID,
    );
  }
}