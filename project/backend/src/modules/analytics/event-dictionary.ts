/**
 * 事件字典（docs/10 §2 唯一枚举来源，gd_event.event_name 据此约束）。
 * 命名：英文 snake_case；公共属性 user_id/platform/app_version/ts/session_id 由服务端统一注入。
 */

/** 全部合法事件名（docs/10 §2.1~2.6 共 40 个） */
export const EVENT_NAMES: readonly string[] = [
  // 2.1 生命周期与启动
  'app_launch',
  'app_hide',
  'app_show',
  'login_success',
  'login_fail',
  'session_start',
  'privacy_agree',
  'onboarding_finish',
  // 2.2 关卡玩法
  'level_start',
  'level_finish',
  'level_fail',
  'level_quit',
  'hint_unlock',
  'hint_use',
  'mistake_action',
  'aha_moment',
  'star_earn',
  'bug_log_unlock',
  // 2.3 广告
  'ad_entry_show',
  'ad_click',
  'ad_watch',
  'ad_verify',
  'ad_reward_grant',
  'ad_error',
  // 2.4 会员与皮肤
  'member_page_view',
  'member_purchase_start',
  'member_purchase_success',
  'member_expire',
  'skin_equip',
  'skin_unlock',
  'skin_purchase_success',
  // 2.5 分享与传播
  'share_click',
  'share_success',
  'share_image_generate',
  'share_image_save',
  'open_from_share',
  // 2.6 每日挑战与排行
  'daily_start',
  'daily_finish',
  'rank_view',
  'rank_click_share',
] as const;

/** 匿名事件白名单（docs/10 §5.1 / docs/08 §3.13：未登录仅允许生命周期类事件，user_id 为空） */
export const ANONYMOUS_ALLOWLIST: ReadonlySet<string> = new Set([
  'app_launch',
  'app_hide',
  'app_show',
  'login_fail',
  'session_start',
  'privacy_agree',
]);

/** 单批最大条数（docs/10 §5.1：50 条/批，超限返回 1001） */
export const MAX_BATCH_SIZE = 50;

/** event_id 建议 UUID（幂等键，docs/10 §5.1）；宽松校验：1-64 位非空字符串 */
export const EVENT_ID_PATTERN = /^[A-Za-z0-9\-_]{1,64}$/;
