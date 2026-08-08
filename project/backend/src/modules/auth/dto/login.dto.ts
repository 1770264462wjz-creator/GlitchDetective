import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** POST /auth/login 请求体（docs/08 §3.1） */
export class LoginDto {
  /** tt.login 返回的临时凭证 */
  @IsString({ message: 'code 必填且为字符串' })
  @MinLength(1, { message: 'code 不能为空' })
  code!: string;

  /** 首次注册时写入 */
  @IsOptional()
  @IsString({ message: 'nickname 必须为字符串' })
  @MaxLength(64, { message: 'nickname 最长 64' })
  nickname?: string;

  /** 首次注册时写入 */
  @IsOptional()
  @IsString({ message: 'avatar_url 必须为字符串' })
  @MaxLength(255, { message: 'avatar_url 最长 255' })
  avatar_url?: string;

  /** 平台：固定 douyin（预留 weixin/h5） */
  @IsIn(['douyin', 'weixin', 'h5'], { message: 'platform 非法' })
  platform!: string;
}