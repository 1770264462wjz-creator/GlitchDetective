import { SetMetadata } from '@nestjs/common';

/** 标记接口为公开（跳过 JwtAuthGuard，docs/06 §4.3，如 POST /auth/login） */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);