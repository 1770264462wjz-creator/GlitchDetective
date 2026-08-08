import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { loadAppConfig } from './config/env.schema';
import { LevelModule } from './modules/level/level.module';
import { SaveModule } from './modules/save/save.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadAppConfig],
      // 校验失败时直接抛错拒绝启动（docs/06 §3）
      validationOptions: { abortEarly: false },
    }),
    AuthModule,
    LevelModule,
    SaveModule,
    UserModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
