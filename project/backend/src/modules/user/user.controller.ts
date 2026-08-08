import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserProfileResult } from '../auth/auth.types';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/v1/user/profile（需登录，docs/08 §3.2） */
  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser): UserProfileResult {
    return this.userService.getProfile(user);
  }
}