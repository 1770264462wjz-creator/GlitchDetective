import { Injectable } from '@nestjs/common';
import { AdVerifyResult, AdVerifier } from '../interfaces/ad-verifier.interface';

/**
 * 本地联调广告验证器（M2）：确定性规则。
 * - platform_order_id 以 `dyad_` 开头视为合法（模拟抖音回调通过）
 * - 其余视为伪造（拒绝）
 * 生产由 DouyinAdVerifier 替换（M4 调抖音服务端验证接口）。
 */
@Injectable()
export class MockAdVerifier implements AdVerifier {
  async verify(adUnitId: string, platformOrderId: string): Promise<AdVerifyResult> {
    if (platformOrderId.startsWith('dyad_')) {
      return { valid: true };
    }
    return { valid: false, reason: `mock verify reject: unit=${adUnitId} order=${platformOrderId}` };
  }
}
