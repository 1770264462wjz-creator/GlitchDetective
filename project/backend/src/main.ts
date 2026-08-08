import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 统一前缀 /api/v1（docs/08 §1）
  app.setGlobalPrefix('api/v1');

  // 全局管道：参数校验 + 类型转换（whitelist 丢弃未声明字段）
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // 全局异常过滤 + 响应包装：所有接口返回 { code, message, data }
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = config.get<number>('PORT', 2010);
  await app.listen(port);
  console.log(`[glitch-detective] backend listening on http://localhost:${port}`);
}

void bootstrap();
