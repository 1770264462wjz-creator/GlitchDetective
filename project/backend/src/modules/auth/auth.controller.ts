import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, LoginInput } from './auth.service';
import { LoginResult } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/v1/auth/login（匿名，docs/08 §3.1） */
  @Public()
  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResult> {
    return this.authService.login({
      code: body.code,
      nickname: body.nickname,
      avatarUrl: body.avatar_url,
      platform: body.platform,
    });
  }
}