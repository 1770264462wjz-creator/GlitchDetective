import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/constants/error-code';
import { AdVerifyResult, AdVerifier } from '../interfaces/ad-verifier.interface';

/**
 * 抖音广告服务端验证实现（docs/06 §5、docs/09 §3）。
 * 需配置 DOUYIN_AD_VERIFY_URL 与广告位凭据。
 * M4 阶段接入真实 HTTP 调用；未配置时明确抛 3004，避免静默降级。
 */
@Injectable()
export class DouyinAdVerifier implements AdVerifier {
  constructor(private readonly config: ConfigService) {}

  async verify(_adUnitId: string, _platformOrderId: string): Promise<AdVerifyResult> {
    const url = this.config.get<string>('DOUYIN_AD_VERIFY_URL');
    if (!url) {
      throw new BusinessException(
        ErrorCode.THIRD_PARTY_ERROR,
        '抖音广告验证未配置（DOUYIN_AD_VERIFY_URL）',
      );
    }
    // TODO(M4): 调抖音 /api/apps/v2/verify_order，见 docs/06 §5 / docs/12
    throw new BusinessException(ErrorCode.THIRD_PARTY_ERROR, '抖音广告验证尚未接入');
  }
}
