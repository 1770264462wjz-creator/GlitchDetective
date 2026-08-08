import { Injectable } from '@nestjs/common';
import { CodeExchangeResult, CodeExchanger } from '../interfaces/code-exchanger.interface';

/**
 * 本地联调 code 交换器：code → 确定性 openid（mock_{code}），isMinor 恒 false。
 * 用途：前端联调与自动化测试（无真实抖音凭据），生产由 DouyinCodeExchanger 替换。
 */
@Injectable()
export class MockCodeExchanger implements CodeExchanger {
  async exchange(code: string): Promise<CodeExchangeResult> {
    if (!code || code.length < 1) {
      throw new Error('code 为空');
    }
    return { openid: `mock_${code}`, isMinor: false };
  }
}