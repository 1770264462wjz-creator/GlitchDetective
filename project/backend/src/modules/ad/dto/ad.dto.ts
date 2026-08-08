import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AD_SCENES, AD_TYPES } from '../ad-dictionary';

/** POST /ad/start 请求体（docs/08 §3.7） */
export class AdStartDto {
  @IsIn(AD_TYPES, { message: 'ad_type 非法（hint/revive/double/clue）' })
  ad_type!: string;

  @IsIn(AD_SCENES, { message: 'scene 非法（level/settle）' })
  scene!: string;

  @IsOptional()
  @IsString({ message: 'level_id 必须为字符串' })
  level_id?: string;
}

/** POST /ad/verify 请求体（docs/08 §3.8） */
export class AdVerifyDto {
  @IsString({ message: 'ad_token 必填' })
  @MinLength(1, { message: 'ad_token 不能为空' })
  ad_token!: string;

  @IsIn(AD_TYPES, { message: 'ad_type 非法' })
  ad_type!: string;

  @IsIn(AD_SCENES, { message: 'scene 非法' })
  scene!: string;

  @IsOptional()
  @IsString({ message: 'level_id 必须为字符串' })
  level_id?: string;

  @IsString({ message: 'platform_order_id 必填' })
  @MinLength(1, { message: 'platform_order_id 不能为空' })
  platform_order_id!: string;

  @IsString({ message: 'ad_unit_id 必填' })
  @MinLength(1, { message: 'ad_unit_id 不能为空' })
  ad_unit_id!: string;
}

/** POST /ad/reward-claim 请求体（docs/08 §3.9） */
export class AdRewardClaimDto {
  @IsString({ message: 'platform_order_id 必填' })
  @MinLength(1, { message: 'platform_order_id 不能为空' })
  platform_order_id!: string;
}
