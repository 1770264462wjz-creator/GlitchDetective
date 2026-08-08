import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ErrorCode } from '../../../common/constants/error-code';

/**
 * GET /api/v1/levels 查询参数（docs/08 §3.3）。
 */
export class ListLevelDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须为整数' })
  @Min(1, { message: 'page 从 1 起' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page_size 必须为整数' })
  @Min(1, { message: 'page_size 最小 1' })
  @Max(50, { message: 'page_size 上限 50' })
  page_size: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'chapter_id 必须为整数' })
  chapter_id?: number;

  @IsOptional()
  @IsIn(['visual', 'reverse', 'target', 'language', 'detail'], {
    message: 'puzzle_type 非法',
  })
  puzzle_type?: string;
}

/**
 * GET /api/v1/levels/:id 路径参数（id = 全局序号十进制字符串）。
 */
export class LevelIdParamDto {
  @Type(() => Number)
  @IsInt({ message: 'id 必须为数字字符串' })
  @Min(1, { message: 'id 必须 ≥ 1' })
  @Max(9999, { message: 'id 越界' })
  id!: number;

  static readonly NOT_FOUND_CODE = ErrorCode.RESOURCE_NOT_FOUND;
}
