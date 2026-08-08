/**
 * code 换 openid 抽象（docs/06 §4.1）。
 * 真实实现：DouyinCodeExchanger（M4 接抖音开放平台 code2Session）。
 * 本地联调：MockCodeExchanger（确定性映射，便于测试与前端联调）。
 */
export interface CodeExchangeResult {
  openid: string;
  /** 未成年人标识（来自抖音 is_minor） */
  isMinor: boolean;
}

export interface CodeExchanger {
  /** 用临时 code 换取平台用户身份；失败抛 BusinessException(3004) */
  exchange(code: string): Promise<CodeExchangeResult>;
}

export const CODE_EXCHANGER = 'CODE_EXCHANGER';