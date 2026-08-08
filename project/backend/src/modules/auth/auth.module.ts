import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CODE_EXCHANGER } from './interfaces/code-exchanger.interface';
import { MockCodeExchanger } from './exchangers/mock-code.exchanger';
import { USER_STORE } from './interfaces/user-store.interface';
import { MemoryUserStore } from './stores/memory-user.store';
import { SESSION_STORE } from './interfaces/session-store.interface';
import { MemorySessionStore } from './stores/memory-session.store';

/**
 * 鉴权模块（docs/06 §4）。
 * M2 使用 MockCodeExchanger（本地联调）+ 内存 user/session；M4 替换抖音真实实现 / Redis。
 * 声明为 @Global 以向全局注册 JwtAuthGuard（main.ts 启用后保护全部接口）。
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      // M2 本地默认密钥；生产通过 JWT_SECRET 环境变量注入（TokenService 读取）
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
      signOptions: { expiresIn: 7 * 24 * 60 * 60 },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: CODE_EXCHANGER, useClass: MockCodeExchanger },
    { provide: USER_STORE, useClass: MemoryUserStore },
    { provide: SESSION_STORE, useClass: MemorySessionStore },
    AuthService,
    TokenService,
    JwtAuthGuard,
  ],
  exports: [USER_STORE, SESSION_STORE, TokenService, AuthService, JwtAuthGuard],
})
export class AuthModule {}
