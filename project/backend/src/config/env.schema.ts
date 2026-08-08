import * as Joi from 'joi';

/**
 * 环境变量校验（docs/06 §3 配置管理）。
 * ConfigModule 启动时执行，校验失败直接拒绝启动。
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(2010),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  // 预留（M3 引入）：DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME / REDIS_URL
}).unknown(true);

export interface AppConfig {
  env: string;
  port: number;
  logLevel: string;
}

export function loadAppConfig(): AppConfig {
  const { error, value } = envValidationSchema.validate(process.env, {
    abortEarly: false,
  });
  if (error) {
    throw new Error(`环境变量校验失败: ${error.message}`);
  }
  return {
    env: value.NODE_ENV,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
  };
}
