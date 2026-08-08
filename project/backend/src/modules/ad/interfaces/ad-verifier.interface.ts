/**
 * 广告验证器抽象（docs/06 §5：服务端到服务端验证防伪造）。
 * 真实实现：DouyinAdVerifier（M4 调抖音 /api/apps/v2/verify_order）。
 * 本地联调：MockAdVerifier（确定性规则，便于测试与前端联调）。
 */
export interface AdVerifyResult {
  valid: boolean;
  /** 验证备注（拒绝原因，仅服务端日志，不返回客户端） */
  reason?: string;
}

export interface AdVerifier {
  /** 校验抖音广告回调凭证（ad_unit_id + platform_order_id）真实性 */
  verify(adUnitId: string, platformOrderId: string): Promise<AdVerifyResult>;
}

export const AD_VERIFIER = 'AD_VERIFIER';
