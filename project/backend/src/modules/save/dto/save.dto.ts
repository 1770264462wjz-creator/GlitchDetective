import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * POST /progress 请求体（docs/08 §3.5）。
 * 字段命名与接口文档保持一致（snake_case）。
 */
export class ReportProgressDto {
  /** 关卡 ID（level_001 格式） */
  @IsString({ message: 'level_id 必填且为字符串' })
  level_id!: string;

  /** 本次星级 1~3 */
  @Type(() => Number)
  @IsInt({ message: 'stars 必须为整数' })
  @Min(1, { message: 'stars 最小为 1' })
  @Max(3, { message: 'stars 最大为 3' })
  stars!: number;

  /** 用时（毫秒） */
  @Type(() => Number)
  @IsInt({ message: 'time_ms 必须为整数' })
  @Min(0, { message: 'time_ms 不能为负' })
  time_ms!: number;

  /** 是否通关 */
  @IsBoolean({ message: 'finished 必须为布尔值' })
  finished!: boolean;

  /** 使用提示次数（影响结算，一期仅存档） */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'hint_used 必须为整数' })
  @Min(0, { message: 'hint_used 不能为负' })
  hint_used?: number;

  /** 是否解锁 Bug 日志 */
  @IsOptional()
  @IsBoolean({ message: 'bug_unlocked 必须为布尔值' })
  bug_unlocked?: boolean;

  /** 客户端版本（低于最低支持版本拒绝 1004） */
  @IsOptional()
  @IsString({ message: 'client_version 必须为字符串' })
  client_version?: string;
}