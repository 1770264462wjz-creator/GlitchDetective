import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import { LEVEL_STATUS } from '../level-store.interface';

/** POST /api/v1/admin/levels 创建关卡请求体（content = 关卡 JSON，服务端 R01-R20 校验） */
export class CreateLevelDto {
  @IsObject({ message: 'content 必填且为关卡 JSON 对象' })
  content!: Record<string, unknown>;

  @Type(() => Number)
  @IsInt({ message: 'chapter_id 必须为整数' })
  @Min(1, { message: 'chapter_id 最小 1' })
  chapter_id!: number;
}

/** PUT /api/v1/admin/levels/:id 更新关卡请求体 */
export class UpdateLevelDto {
  @IsObject({ message: 'content 必填且为关卡 JSON 对象' })
  content!: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'chapter_id 必须为整数' })
  @Min(1, { message: 'chapter_id 最小 1' })
  chapter_id?: number;
}

/** GET /api/v1/admin/levels 查询参数（status 过滤） */
export class AdminListDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([LEVEL_STATUS.DRAFT, LEVEL_STATUS.REVIEWING, LEVEL_STATUS.PUBLISHED, LEVEL_STATUS.OFFLINE], {
    message: 'status 非法（1草稿/2审核中/3已发布/4已下线）',
  })
  status?: number;
}

/** POST /api/v1/admin/levels/:id/:action 状态流转动作 */
export const STATUS_ACTIONS = ['submit', 'reject', 'approve', 'offline'] as const;
export type StatusAction = (typeof STATUS_ACTIONS)[number];
