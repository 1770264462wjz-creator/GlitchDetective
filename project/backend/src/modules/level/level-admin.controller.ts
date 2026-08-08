import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { LevelService } from './level.service';
import { LevelSummary } from './level.types';
import {
  AdminListDto,
  CreateLevelDto,
  STATUS_ACTIONS,
  StatusAction,
  UpdateLevelDto,
} from './dto/level-admin.dto';

/**
 * 关卡管理接口（docs/11 §6 内容管线：创建/编辑/删除/状态流转）。
 * 与客户端查询接口（/levels）分离：管理接口返回全部状态，含服务端 Schema 强制校验。
 */
@Controller('admin/levels')
export class LevelAdminController {
  constructor(private readonly levelService: LevelService) {}

  /** GET /api/v1/admin/levels 管理列表（全部状态，可按 status 过滤） */
  @Get()
  adminList(
    @Query() query: AdminListDto,
  ): (LevelSummary & { level_status: number })[] {
    return this.levelService.adminList(query.status);
  }

  /** POST /api/v1/admin/levels 创建草稿（服务端 R01-R20 校验，失败 4032 拒绝入库） */
  @Post()
  create(@Body() body: CreateLevelDto): LevelSummary {
    return this.levelService.createDraft({
      content: body.content as never,
      chapterNo: body.chapter_id,
    });
  }

  /** PUT /api/v1/admin/levels/:id 更新关卡内容（仅草稿/已下线） */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLevelDto,
  ): LevelSummary {
    return this.levelService.updateLevel(id, {
      content: body.content as never,
      chapterNo: body.chapter_id,
    });
  }

  /** DELETE /api/v1/admin/levels/:id 删除草稿 */
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): { deleted: boolean } {
    this.levelService.deleteDraft(id);
    return { deleted: true };
  }

  /** POST /api/v1/admin/levels/:id/:action 状态流转（submit/reject/approve/offline） */
  @Post(':id/:action')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Param('action') action: string,
  ): LevelSummary {
    return this.levelService.transitionStatus(id, action as StatusAction);
  }
}
