# 《Bug哥：别相信你的第一眼》

> 一个喜欢发现生活漏洞的小 Bug，带玩家发现现实世界中的隐藏逻辑。
> 每一关都用「合理但意想不到」的反转，让玩家获得"原来如此"的解谜爽感。

一句话定位：**现实逻辑解谜 + 固定角色 IP + 抖音广告变现** 的休闲小游戏。

---

## 一、项目简介

玩家在 Bug 哥的引导下，发现现实场景中的"小 Bug"（视觉误导、常识反转、目标误解、语言陷阱、细节推理），通过改变思考方式获得"Aha Moment"（恍然大悟）。所有谜题答案都符合现实逻辑，禁止魔法、随机答案、科幻规则与作者强行解释。

核心循环：

```
发现异常 → 按常识解决 → 思路错误 → 重新观察 → 找到隐藏逻辑 → 恍然大悟
```

## 二、技术栈（已确认）

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 游戏客户端 | Cocos Creator 3.x + TypeScript | 抖音小游戏运行时，一次开发多端（抖音/微信/H5） |
| 关卡编辑器/管理后台 | Vue 3 + Vite + TypeScript | 独立 Web 工具，维护关卡内容 |
| 后端 | Node.js + NestJS | RESTful API，模块化架构 |
| 数据库 | MySQL 8.0（utf8mb4） | 主存储：用户、存档、关卡、排行、埋点 |
| 缓存 | Redis 7 | 排行榜、会话、热点数据 |
| 文档 | Markdown | `docs/` 目录（本阶段交付） |
| 原型 | 高保真 HTML 原型 | `prototype/` 目录（后续阶段） |

## 三、端口与连接信息（开发环境约定）

> 端口由 Crow5 智能分配，已扫描 `D:\Cocos` 下全部项目 README，无冲突。

| 项目 | 端口 | 说明 |
| --- | --- | --- |
| 游戏前端（H5 预览/部署） | **1024** | `http://localhost:1024` |
| 关卡编辑器/管理后台前端 | **1025** | `http://localhost:1025` |
| 后端 API 服务 | **2010** | `http://localhost:2010` |
| MySQL | 3306 | 本机默认实例 |

数据库连接（**仅限本地开发环境**，生产环境一律使用环境变量注入，严禁硬编码）：

| 项 | 值 |
| --- | --- |
| 数据库 | `glitch_detective` |
| 账号 | `gd_app` |
| 密码 | `Gd@Bug2026` |
| 字符集 | `utf8mb4` / `utf8mb4_unicode_ci` |
| Redis | `localhost:6379`（无密码，本地） |

## 四、目录结构

```
GlitchDetective/
├── README.md                  # 本文件：总览、端口、连接信息、文档索引
├── docs/                      # 全部设计文档
│   ├── 00-项目概览与目录规范.md
│   ├── 01-总体架构设计.md
│   ├── 02-技术选型说明.md
│   ├── 03-游戏设计文档-GDD.md
│   ├── 04-关卡系统与Schema设计.md
│   ├── 05-客户端架构设计.md
│   ├── 06-后端架构设计.md
│   ├── 07-数据模型设计.md
│   ├── 08-API接口设计.md
│   ├── 09-商业化与广告系统设计.md
│   ├── 10-数据分析与埋点设计.md
│   ├── 11-关卡编辑器与内容管线.md
│   ├── 12-抖音平台集成与传播设计.md
│   ├── 13-开发路线图.md
│   ├── 14-待处理与风险清单.md
│   └── database/
│       ├── README.md              # 建库脚本说明
│       └── init-schema.sql        # 建库建表脚本（MySQL 8.0）
├── prototype/                 # 产品原型（后续阶段，高保真 HTML）
├── project/
│   ├── frontend/              # Cocos Creator 游戏源码（端口 1024，解释器已就位）
│   ├── editor/                # 关卡编辑器 Vue3 源码（端口 1025，v1 可运行）
│   └── backend/               # NestJS 后端源码（端口 2010，一期 6 模块完成）
├── database/                  # 数据库脚本副本
└── utils/                     # 项目工具包（关卡校验器等）
```

## 五、文档索引

| # | 文件 | 用途 |
| --- | --- | --- |
| 1 | `docs/00-项目概览与目录规范.md` | 背景、目标、范围、术语、目录约定 |
| 2 | `docs/01-总体架构设计.md` | 4 层架构、内容管线、平台适配、扩展性设计 |
| 3 | `docs/02-技术选型说明.md` | 各层选型理由与对比 |
| 4 | `docs/03-游戏设计文档-GDD.md` | 核心玩法、谜题类型、难度曲线、IP 设计 |
| 5 | `docs/04-关卡系统与Schema设计.md` | 关卡数据结构、版本化、校验器 |
| 6 | `docs/05-客户端架构设计.md` | Cocos 分层、状态机、平台适配层 |
| 7 | `docs/06-后端架构设计.md` | NestJS 模块划分、广告回调验证 |
| 8 | `docs/07-数据模型设计.md` | MySQL 表结构 + Redis 键设计 |
| 9 | `docs/08-API接口设计.md` | REST 接口清单、错误码 |
| 10 | `docs/09-商业化与广告系统设计.md` | 激励视频点位、会员、皮肤、收益模型 |
| 11 | `docs/10-数据分析与埋点设计.md` | 事件字典、漏斗、关卡卡点分析 |
| 12 | `docs/11-关卡编辑器与内容管线.md` | Web 编辑器 + AI 生成管线 |
| 13 | `docs/12-抖音平台集成与传播设计.md` | 广告 SDK、分享卡片、传播闭环 |
| 14 | `docs/13-开发路线图.md` | 三阶段里程碑与验收标准 |
| 15 | `docs/database/README.md` | 建库脚本说明 |
| 16 | `docs/database/init-schema.sql` | 建库建表脚本 |

## 六、全局术语对照（防漂移基准）

| 术语 | 定义 | 备注 |
| --- | --- | --- |
| Bug哥 | 主角 IP，有意识的小 Bug 程序角色 | 自信、嘴硬、搞笑 |
| 关卡 | 单局解谜内容的最小单位 | 数据驱动，JSON 描述 |
| Aha Moment | 恍然大悟时刻 | 核心爽感来源 |
| 误导层 | 玩家第一次的常识性错误思路 | 每关必须有 |
| 真相层 | 符合现实逻辑的正确解 | 不得违背现实逻辑 |
| 激励视频 | 观看广告获取提示/复活/奖励 | 主要变现来源 |
| 卡关 | 玩家在某一关停留过久 | 埋点重点指标 |
| 难度星级 | 1~5 星 | 与章节段位对应 |

## 七、快速启动（开发阶段生效）

```bash
# 1. 初始化数据库（需本机 MySQL 8.0）
mysql -u root -p < docs/database/init-schema.sql

# 2. 启动后端（端口 2010）
cd project/backend && npm install && npm run start:dev

# 3. 启动关卡编辑器（端口 1025，Vite 已代理 /api/v1 → 2010）
cd project/editor && npm install && npm run dev

# 4. 游戏前端（端口 1024）：Cocos Creator 3.8 打开 project/frontend 工程
#    工程创建手册见 project/frontend/README.md（R3 阻塞项）
```

### 接口一览（docs/08）

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | 登录（code 换 openid，本地 Mock） | 匿名 |
| GET | `/api/v1/user/profile` | 用户资料 + 统计 | 登录 |
| GET | `/api/v1/levels` | 关卡列表（仅已发布） | 登录 |
| GET | `/api/v1/levels/:id` | 关卡详情（含 content） | 登录 |
| POST | `/api/v1/progress` | 上报进度 | 登录 |
| GET | `/api/v1/progress` | 拉取存档 | 登录 |
| POST | `/api/v1/ad/start` / `verify` / `reward-claim` | 广告会话/验证/补偿领取 | 登录 |
| POST | `/api/v1/events` | 埋点批量上报（含匿名白名单） | 部分匿名 |
| GET/POST/PUT/DELETE | `/api/v1/admin/levels...` | 关卡管理（草稿/审核/发布/下线） | 登录 |

> 本地 Mock 登录：任意 `code` + `platform=douyin` 即可换取 token（`MockCodeExchanger`）。
> 广告验证 Mock：`platform_order_id` 以 `dyad_` 开头视为合法（`MockAdVerifier`）。

## 八、验收标准（本阶段）

1. `docs/` 下 15 份文档 + `docs/database/` 下 1 份脚本 + README，共 17 个文件
2. 端口 1024 / 1025 / 2010、数据库 `glitch_detective`、账号 `gd_app` 在所有文档中一致
3. 数据模型（07）与建库脚本（init-schema.sql）字段级一致
4. 所有文档无占位符、无"TODO 待补充"、无与《Bug哥》无关的内容
