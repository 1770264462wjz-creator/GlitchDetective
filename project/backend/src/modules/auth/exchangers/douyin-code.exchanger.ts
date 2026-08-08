import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/constants/error-code';
import { CodeExchangeResult, CodeExchanger } from '../interfaces/code-exchanger.interface';

/**
 * 抖音 code2Session 实现（docs/06 §4.1、docs/12 §1）。
 * 需配置 DOUYIN_APPID / DOUYIN_SECRET / DOUYIN_CODE2SESSION_URL。
 * M4 阶段接入真实 HTTP 调用；当前未配置凭据时明确抛 3004，避免静默降级。
 */
@Injectable()
export class DouyinCodeExchanger implements CodeExchanger {
  constructor(private readonly config: ConfigService) {}

  async exchange(_code: string): Promise<CodeExchangeResult> {
    const appid = this.config.get<string>('DOUYIN_APPID');
    const secret = this.config.get<string>('DOUYIN_SECRET');
    if (!appid || !secret) {
      throw new BusinessException(
        ErrorCode.THIRD_PARTY_ERROR,
        '抖音 code2Session 未配置凭据（DOUYIN_APPID/DOUYIN_SECRET）',
      );
    }
    // TODO(M4): 调用 DOUYIN_CODE2SESSION_URL 换取 openid / is_minor，参考 docs/12
    throw new BusinessException(ErrorCode.THIRD_PARTY_ERROR, '抖音 code2Session 尚未接入');
  }
}