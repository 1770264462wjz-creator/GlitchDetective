-- ============================================================
-- 《Bug哥：别相信你的第一眼》 建库建表脚本
-- 引擎：MySQL 8.0 | 字符集：utf8mb4 / utf8mb4_unicode_ci
-- 依据：docs/07-数据模型设计.md（唯一依据，字段级一致）
-- 用途：本地开发环境初始化
-- ============================================================

CREATE DATABASE IF NOT EXISTS `glitch_detective`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `glitch_detective`;

-- 本地开发账号（生产环境严禁使用，须以环境变量注入）
CREATE USER IF NOT EXISTS 'gd_app'@'localhost' IDENTIFIED BY 'Gd@Bug2026';
CREATE USER IF NOT EXISTS 'gd_app'@'127.0.0.1' IDENTIFIED BY 'Gd@Bug2026';
GRANT ALL PRIVILEGES ON `glitch_detective`.* TO 'gd_app'@'localhost';
GRANT ALL PRIVILEGES ON `glitch_detective`.* TO 'gd_app'@'127.0.0.1';
FLUSH PRIVILEGES;

-- ============================================================
-- 1. gd_user 用户主表
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_user` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid`        VARCHAR(64)  NOT NULL COMMENT '抖音 openid',
  `unionid`       VARCHAR(64)  NULL COMMENT '跨端 unionid（预留）',
  `nickname`      VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar_url`    VARCHAR(255) NOT NULL DEFAULT '' COMMENT '头像',
  `platform`      VARCHAR(16)  NOT NULL DEFAULT 'douyin' COMMENT '平台 douyin/weixin/h5',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 2封禁',
  `is_minor`      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '未成年人标识（来自抖音is_minor）',
  `is_member`     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否会员（冗余）',
  `last_login_at` DATETIME     NULL COMMENT '最后登录',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户主表';

-- ============================================================
-- 2. gd_user_progress 用户进度存档
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_user_progress` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL COMMENT '关联 gd_user.id',
  `level_id`      BIGINT UNSIGNED NULL COMMENT '当前关卡',
  `max_level`     INT          NOT NULL DEFAULT 1 COMMENT '已解锁最大关',
  `stars_total`   INT          NOT NULL DEFAULT 0 COMMENT '累计星星',
  `finished_count` INT         NOT NULL DEFAULT 0 COMMENT '通关数',
  `best_time_ms`  JSON         NULL COMMENT '单关最佳（{levelNo:ms}）',
  `extra`         JSON         NULL COMMENT '扩展存档（皮肤/设置）',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_max_level` (`max_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户进度存档';

-- ============================================================
-- 3. gd_level 关卡定义
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_level` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `level_no`      INT          NOT NULL COMMENT '关卡序号',
  `chapter_id`    INT          NOT NULL DEFAULT 1 COMMENT '章节',
  `title`         VARCHAR(128) NOT NULL DEFAULT '' COMMENT '关卡标题',
  `puzzle_type`   VARCHAR(32)  NOT NULL DEFAULT 'visual' COMMENT '谜题类型 visual/reverse/target/language/detail',
  `difficulty`    TINYINT      NOT NULL DEFAULT 1 COMMENT '难度1-5',
  `schema_version` VARCHAR(16) NOT NULL DEFAULT '1.0' COMMENT '内容Schema版本',
  `content`       JSON         NOT NULL COMMENT '关卡内容（见04文档）',
  `hint_ids`      JSON         NULL COMMENT '提示内容ID列表',
  `reward_stars`  TINYINT      NOT NULL DEFAULT 1 COMMENT '通关基础星星',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1草稿 2审核 3发布 4下线',
  `is_hidden`     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '隐藏关',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_level_no` (`level_no`),
  KEY `idx_status` (`status`),
  KEY `idx_chapter` (`chapter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关卡定义';

-- ============================================================
-- 4. gd_level_version 关卡版本
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_level_version` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `level_id`      BIGINT UNSIGNED NOT NULL COMMENT '关联 gd_level.id',
  `version`       INT          NOT NULL DEFAULT 1 COMMENT '版本号',
  `content_md5`   CHAR(32)     NOT NULL DEFAULT '' COMMENT '内容校验',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '版本状态',
  `published_at`  DATETIME     NULL COMMENT '发布时间',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_level_version` (`level_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关卡版本';

-- ============================================================
-- 5. gd_bug_log 玩家 Bug 日志收藏
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_bug_log` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `level_id`      BIGINT UNSIGNED NOT NULL,
  `bug_no`        VARCHAR(16)  NOT NULL DEFAULT '' COMMENT 'Bug编号 Bug001',
  `content`       VARCHAR(512) NOT NULL DEFAULT '' COMMENT '错误记录文案',
  `unlocked_at`   DATETIME     NULL COMMENT '解锁时间',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_level` (`user_id`, `level_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bug日志收藏';

-- ============================================================
-- 6. gd_skill 能力定义
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_skill` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `skill_key`     VARCHAR(32)  NOT NULL COMMENT 'observe/investigate/hint',
  `name`          VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '观察/调查/提示',
  `max_level`     TINYINT      NOT NULL DEFAULT 5 COMMENT '最大等级',
  `description`   VARCHAR(255) NOT NULL DEFAULT '' COMMENT '描述',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skill_key` (`skill_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='能力定义';

-- ============================================================
-- 7. gd_user_skill 玩家能力
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_user_skill` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `skill_id`      BIGINT UNSIGNED NOT NULL,
  `level`         TINYINT      NOT NULL DEFAULT 1 COMMENT '当前等级',
  `exp`           INT          NOT NULL DEFAULT 0 COMMENT '经验',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_skill` (`user_id`, `skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家能力';

-- ============================================================
-- 8. gd_ad_reward 广告奖励审计
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_ad_reward` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `ad_type`          VARCHAR(16)  NOT NULL COMMENT 'hint/revive/double/clue',
  `scene`            VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '场景',
  `level_id`         BIGINT UNSIGNED NULL COMMENT '关联关卡',
  `platform_order_id` VARCHAR(64) NOT NULL COMMENT '抖音广告回调ID',
  `verify_status`    TINYINT      NOT NULL DEFAULT 1 COMMENT '1待验 2通过 3拒绝',
  `reward`           VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '奖励内容',
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_order` (`platform_order_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广告奖励审计';

-- ============================================================
-- 9. gd_daily_challenge 每日挑战
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_daily_challenge` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `challenge_date` DATE         NOT NULL COMMENT '日期',
  `level_ids`      JSON         NOT NULL COMMENT '当日关卡列表',
  `reward`         JSON         NULL COMMENT '奖励配置',
  `status`         TINYINT      NOT NULL DEFAULT 1 COMMENT '1生效 2结束',
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_challenge_date` (`challenge_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日挑战';

-- ============================================================
-- 10. gd_user_daily 玩家每日记录
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_user_daily` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `challenge_id`   BIGINT UNSIGNED NOT NULL,
  `score`          INT          NOT NULL DEFAULT 0 COMMENT '得分',
  `completed`      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否完成',
  `reward_claimed` TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '奖励已领',
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_challenge` (`user_id`, `challenge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家每日记录';

-- ============================================================
-- 11. gd_rank 排行榜快照
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_rank` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `rank_type`     VARCHAR(16)  NOT NULL COMMENT 'daily/weekly/level',
  `period`        VARCHAR(16)  NOT NULL COMMENT '周期标识 2026-08-07',
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `score`         INT          NOT NULL DEFAULT 0 COMMENT '分数',
  `rank`          INT          NOT NULL DEFAULT 0 COMMENT '名次',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rank_period_user` (`rank_type`, `period`, `user_id`),
  KEY `idx_rank_period` (`rank_type`, `period`, `rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排行榜快照';

-- ============================================================
-- 12. gd_event 埋点事件
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_event` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NULL,
  `event_id`      VARCHAR(64)  NOT NULL COMMENT '客户端事件幂等ID（UUID，见10文档5.1）',
  `event_name`    VARCHAR(64)  NOT NULL COMMENT '事件名',
  `properties`    JSON         NULL COMMENT '属性',
  `platform`      VARCHAR(16)  NOT NULL DEFAULT 'douyin',
  `app_version`   VARCHAR(16)  NOT NULL DEFAULT '',
  `ts`            DATETIME     NOT NULL COMMENT '事件时间',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_event` (`user_id`, `event_id`),
  KEY `idx_user_ts` (`user_id`, `ts`),
  KEY `idx_event_ts` (`event_name`, `ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='埋点事件';

-- ============================================================
-- 13. gd_member 会员/去广告权益
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_member` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `member_type`   VARCHAR(16)  NOT NULL DEFAULT 'vip_member' COMMENT '会员类型',
  `expire_at`     DATETIME     NOT NULL COMMENT '到期时间',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1生效 2过期',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员';

-- ============================================================
-- 14. gd_skin 皮肤
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_skin` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `skin_key`      VARCHAR(32)  NOT NULL COMMENT 'programmer/detective/chef/ancient',
  `name`          VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '程序员Bug哥等',
  `price`         INT          NOT NULL DEFAULT 0 COMMENT '价格（分）',
  `unlock_type`   VARCHAR(16)  NOT NULL DEFAULT 'ad' COMMENT 'ad/iap/event/member',
  `asset_url`     VARCHAR(255) NOT NULL DEFAULT '' COMMENT '资源地址',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1上架 2下架',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skin_key` (`skin_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='皮肤';

-- ============================================================
-- 15. gd_user_skin 玩家皮肤
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_user_skin` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `skin_id`       BIGINT UNSIGNED NOT NULL,
  `equipped`      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否穿戴',
  `source`        VARCHAR(16)  NOT NULL DEFAULT '' COMMENT '获取来源',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_skin` (`user_id`, `skin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家皮肤';

-- ============================================================
-- 16. gd_payment 订单（预留，一期不接支付）
-- ============================================================
CREATE TABLE IF NOT EXISTS `gd_payment` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`      VARCHAR(64)  NOT NULL COMMENT '订单号',
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `product_key`   VARCHAR(32)  NOT NULL COMMENT '商品标识',
  `amount`        INT          NOT NULL DEFAULT 0 COMMENT '金额（分）',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1待支付 2已支付 3已退款',
  `platform`      VARCHAR(16)  NOT NULL DEFAULT '' COMMENT '支付渠道',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单（预留）';

-- ============================================================
-- 种子数据
-- ============================================================

-- 能力定义（观察/调查/提示）
INSERT INTO `gd_skill` (`skill_key`, `name`, `max_level`, `description`) VALUES
  ('observe',      '观察能力', 5, '提高发现场景异常细节的能力'),
  ('investigate',  '调查能力', 5, '提高多线索组合推理的能力'),
  ('hint',         '提示能力', 5, '提高获取高质量提示的能力')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 初始皮肤（程序员Bug哥免费，其余预留）
INSERT INTO `gd_skin` (`skin_key`, `name`, `price`, `unlock_type`, `asset_url`, `status`) VALUES
  ('programmer', '程序员Bug哥', 0,    'event', 'skins/programmer', 1),
  ('detective',  '侦探Bug哥',   1500, 'ad',    'skins/detective',  1),
  ('chef',       '厨师Bug哥',   1500, 'ad',    'skins/chef',       1),
  ('ancient',    '古代Bug哥',   2000, 'iap',   'skins/ancient',    1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
