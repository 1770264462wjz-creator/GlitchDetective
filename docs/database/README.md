# 建库建表脚本说明

## 用途

本脚本创建《Bug哥：别相信你的第一眼》游戏项目的数据库与全部表结构。

## 唯一依据

本脚本是 `docs/07-数据模型设计.md` 的唯一实现。若表结构有调整，**先改文档 07，再同步本脚本**，保持字段级一致。

## 执行方式

```bash
# 方式一：root 用户
mysql -u root -p < docs/database/init-schema.sql

# 方式二：进入 mysql 后执行
mysql -u root -p
source docs/database/init-schema.sql;
```

## 涉及对象

- 数据库：`glitch_detective`（utf8mb4）
- 业务账号：`gd_app`（本地开发用，密码 `Gd@Bug2026`）
- 表：16 张（gd_user、gd_user_progress、gd_level、gd_level_version、gd_bug_log、gd_skill、gd_user_skill、gd_ad_reward、gd_daily_challenge、gd_user_daily、gd_rank、gd_event、gd_member、gd_skin、gd_user_skin、gd_payment）
- 种子数据：能力定义（观察/调查/提示）、初始皮肤

## 安全提示

- `gd_app` 账号密码仅限本地开发环境；生产环境必须使用环境变量注入不同凭据
- 本脚本不包含任何真实业务数据，仅含静态种子数据
- 重复执行会报"已存在"错误，属正常现象（脚本带 `IF NOT EXISTS` 保护）

## 验证

```bash
# 验证表数量（应输出 16）
mysql -u gd_app -p glitch_detective -e "SHOW TABLES;" | wc -l
```
