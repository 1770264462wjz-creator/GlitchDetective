import { AdSession } from '../ad.types';

/** 广告会话存储（ad_token 登记与一次性消费，docs/06 §5.1） */
export interface AdTokenStore {
  save(session: AdSession): void;
  /** 按 token 取会话（不存在返回 undefined） */
  findByToken(token: string): AdSession | undefined;
  /** 消费会话（verify 成功后失效，防重用） */
  consume(token: string): void;
}

export const AD_TOKEN_STORE = 'AD_TOKEN_STORE';
