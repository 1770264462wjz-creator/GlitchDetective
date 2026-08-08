/**
 * 全局错误码（docs/06 §9、docs/08 §2.3）。
 * 4 位码：10xx 参数 / 20xx 鉴权 / 30xx 服务端 / 40xx 业务。
 * 客户端一律以 code 为准，HTTP 状态码仅作语义参考。
 */
export const ErrorCode = {
  SUCCESS: 0,
  // 10xx 参数类
  PARAM_INVALID: 1001,
  BODY_PARSE_FAILED: 1002,
  RESOURCE_NOT_FOUND: 1003,
  CLIENT_VERSION_TOO_LOW: 1004,
  // 20xx 鉴权类
  UNAUTHORIZED: 2001,
  TOKEN_EXPIRED: 2002,
  TOKEN_INVALID: 2003,
  ACCOUNT_BANNED: 2004,
  // 30xx 服务端类
  INTERNAL_ERROR: 3001,
  DB_ERROR: 3002,
  CACHE_UNAVAILABLE: 3003,
  THIRD_PARTY_ERROR: 3004,
  // 40xx 业务类
  RATE_LIMITED: 4001,
  CALLBACK_SIGN_INVALID: 4011,
  AD_TOKEN_INVALID: 4021,
  AD_REWARD_ALREADY_GRANTED: 4022,
  AD_REWARD_COOLDOWN: 4023,
  LEVEL_LOCKED: 4031,
  LEVEL_DATA_INVALID: 4032,
  DAILY_NOT_FOUND: 4041,
  DAILY_DUPLICATE_SUBMIT: 4042,
  SKIN_NOT_FOUND: 4051,
  SKIN_NOT_UNLOCKED: 4052,
  SAVE_VERSION_CONFLICT: 4091,
  DUPLICATE_OPERATION: 4092,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorMessage: Record<ErrorCodeValue, string> = {
  0: 'ok',
  1001: '参数校验失败',
  1002: '请求体解析失败',
  1003: '资源不存在',
  1004: '客户端版本过低',
  2001: '未登录',
  2002: '登录已过期',
  2003: '登录凭证无效',
  2004: '账号已被封禁',
  3001: '服务器内部错误',
  3002: '数据访问异常',
  3003: '缓存服务不可用',
  3004: '第三方服务异常',
  4001: '请求过于频繁',
  4011: '回调签名校验失败',
  4021: '广告凭证无效',
  4022: '广告奖励已发放',
  4023: '广告奖励冷却中',
  4031: '关卡未解锁',
  4032: '关卡数据异常',
  4041: '每日挑战不存在或已结束',
  4042: '每日挑战重复提交',
  4051: '皮肤不存在',
  4052: '皮肤未解锁',
  4091: '存档版本冲突',
  4092: '重复操作',
};

/** code → HTTP 状态码（docs/08 §2.3 语义） */
export function codeToHttpStatus(code: ErrorCodeValue): number {
  if (code === 1003) return 404; // 资源不存在，特判需在 10xx 区间前
  if (code >= 1001 && code <= 1002) return 400;
  if (code === 1004) return 426;
  if (code >= 2001 && code <= 2003) return 401;
  if (code === 2004) return 403;
  if (code === 3001 || code === 3002 || code === 4032) return 500;
  if (code === 3003) return 503;
  if (code === 3004) return 502;
  if (code === 4001 || code === 4023) return 429;
  if (code === 4011 || code === 4021 || code === 4031 || code === 4052) return 403;
  if (code === 4022 || code === 4042 || code === 4091 || code === 4092) return 409;
  if (code === 4041 || code === 4051) return 404;
  return 500;
}
