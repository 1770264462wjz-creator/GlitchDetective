# 08 · API 接口设计

> 《Bug哥：别相信你的第一眼》REST API 设计。共 15 个接口，覆盖登录、用户、关卡、进度、广告、排行、每日挑战、埋点、皮肤。
> 错误码见 `06-后端架构设计.md` §9；字段语义见 `07-数据模型设计.md`；广告奖励规则见 `09-商业化与广告系统设计.md`。

## 1. 接口总览表

| # | 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/v1/auth/login` | 抖音登录（code 换 openid） | 匿名 |
| 2 | GET | `/api/v1/user/profile` | 用户信息 | 需登录 |
| 3 | GET | `/api/v1/levels` | 关卡列表（分页） | 需登录 |
| 4 | GET | `/api/v1/levels/:id` | 关卡详情（含内容） | 需登录 |
| 5 | POST | `/api/v1/progress` | 上报进度 | 需登录 |
| 6 | GET | `/api/v1/progress` | 拉取存档 | 需登录 |
| 7 | POST | `/api/v1/ad/start` | 开启广告会话（防自造请求，返回 ad_token） | 需登录 |
| 8 | POST | `/api/v1/ad/verify` | 广告奖励验证（抖音服务端验证） | 需登录 |
| 9 | POST | `/api/v1/ad/reward-claim` | 领取广告奖励（补偿领取） | 需登录 |
| 10 | GET | `/api/v1/rank` | 排行榜 | 需登录 |
| 11 | GET | `/api/v1/daily` | 每日挑战 | 需登录 |
| 12 | POST | `/api/v1/daily/submit` | 提交每日成绩 | 需登录 |
| 13 | POST | `/api/v1/events` | 埋点上报（批量，含匿名白名单） | 需登录 |
| 14 | GET | `/api/v1/skins` | 皮肤列表 | 需登录 |
| 15 | POST | `/api/v1/skins/:id/equip` | 穿戴皮肤 | 需登录 |

## 2. 统一约定

### 2.1 前缀与版本

- 所有接口统一前缀 `/api/v1`，由 `main.ts` 全局注册，业务路由内不再重复写前缀。
- 破坏性变更时升级为 `/api/v2`，旧版本保留一个过渡期。

### 2.2 鉴权头

- 除 `POST /auth/login` 外，所有接口必须携带：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

- token 缺失 → 2001；过期 → 2002；无效 → 2003；账号封禁 → 2004。

### 2.3 响应格式

所有响应（成功与失败）统一结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | int | 0 成功，非 0 见错误码表（06 §9，4 位码） |
| message | string | 成功为 `ok`，失败为可读中文提示 |
| data | object/array | 业务数据；失败时可为 null |

HTTP 状态码语义：200 正常、400 参数、401 未登录、403 无权限、404 不存在、409 冲突、426 版本过低、429 限流、500 服务端。**客户端一律以 `code` 为准。**

### 2.4 分页约定

- 参数：`page`（从 1 起，默认 1）、`page_size`（默认 20，上限 50）
- 响应 data：

```json
{
  "list": [],
  "total": 0,
  "page": 1,
  "page_size": 20,
  "has_more": false
}
```

### 2.5 其它约定

- 请求/响应 `Content-Type: application/json`，编码 UTF-8。
- 所有 ID（user_id / level_id / skin_id 等）对外一律为字符串；金额单位分；时间使用 ISO8601（含时区，默认 +08:00）。
- **level_id 契约**：API 层 `level_id` 为关卡序号 `gd_level.level_no` 的十进制字符串（如 `"1001"` 表示第 1001 关）；内容层关卡 JSON 的 `levelId` 为语义化 ID（如 `level_001`，见 04 文档 R02）。二者通过 `gd_level` 表映射，客户端仅使用 API 层 `level_id`。
- 广告发奖、每日提交等服务端按唯一键幂等，客户端重复调用不会重复发奖。

## 3. 接口明细

### 3.1 POST /auth/login 抖音登录

匿名接口。客户端 `tt.login()` 拿 code 后调用，后端换 openid 并注册/登录，返回 token。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| code | string | 是 | tt.login 返回的临时凭证 |
| nickname | string | 否 | 首次注册时写入 |
| avatar_url | string | 否 | 首次注册时写入 |
| platform | string | 是 | 固定 `douyin`（预留 weixin/h5） |

请求示例：

```json
{
  "code": "0b2e1f9a7c4d3e5f",
  "nickname": "Bug收集者",
  "avatar_url": "https://p3.douyinpic.com/avatar/avatar_1001.png",
  "platform": "douyin"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 604800,
    "is_new": true,
    "is_minor": false,
    "user": {
      "user_id": "gd_u_102488",
      "nickname": "Bug收集者",
      "avatar_url": "https://p3.douyinpic.com/avatar/avatar_1001.png",
      "platform": "douyin",
      "is_member": false,
      "member_expire_at": null,
      "last_login_at": "2026-08-07T10:00:00+08:00"
    }
  }
}
```

错误码：1001 参数缺失；1004 客户端版本过低；2004 账号封禁；3004 抖音 code2Session 失败。

---

### 3.2 GET /user/profile 用户信息

返回用户资料与统计汇总。

请求参数：无。

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "user_id": "gd_u_102488",
      "nickname": "Bug收集者",
      "avatar_url": "https://p3.douyinpic.com/avatar/avatar_1001.png",
      "platform": "douyin",
      "is_member": true,
      "member_expire_at": "2026-09-01T00:00:00+08:00",
      "last_login_at": "2026-08-07T10:00:00+08:00"
    },
    "stats": {
      "max_level": 12,
      "finished_count": 11,
      "stars_total": 46
    },
    "equipped_skin": {
      "skin_id": "1001",
      "skin_key": "programmer",
      "name": "程序员Bug哥"
    }
  }
}
```

错误码：2001~2004 鉴权相关。

---

### 3.3 GET /levels 关卡列表（分页）

只返回已发布关卡摘要，不含 content（详情见 3.4）。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| chapter_id | int | 否 | 按章节过滤 |
| puzzle_type | string | 否 | 谜题类型过滤（visual/reverse/target/language/detail） |
| page | int | 否 | 默认 1 |
| page_size | int | 否 | 默认 20，上限 50 |

请求示例：`GET /api/v1/levels?page=1&page_size=20`

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "level_id": "1001",
        "level_no": 1,
        "chapter_id": 1,
        "title": "消失的开关",
        "puzzle_type": "visual",
        "difficulty": 2,
        "reward_stars": 3,
        "is_hidden": false,
        "unlocked": true,
        "stars": 3,
        "best_time_ms": 12000
      },
      {
        "level_id": "1002",
        "level_no": 2,
        "chapter_id": 1,
        "title": "打不开的门",
        "puzzle_type": "reverse",
        "difficulty": 2,
        "reward_stars": 3,
        "is_hidden": false,
        "unlocked": true,
        "stars": 0,
        "best_time_ms": null
      }
    ],
    "total": 12,
    "page": 1,
    "page_size": 20,
    "has_more": false
  }
}
```

错误码：1001 参数越界；4031 访问越级章节（列表按解锁范围裁剪，一般不触发）。

---

### 3.4 GET /levels/:id 关卡详情（含内容）

返回关卡完整内容（JSON Schema v1，见 04），客户端关卡解释器执行。

请求参数：路径参数 `id`（关卡 ID 字符串）。

请求示例：`GET /api/v1/levels/1001`

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "level_id": "1001",
    "level_no": 1,
    "title": "消失的开关",
    "puzzle_type": "visual",
    "difficulty": 2,
    "schema_version": "1.0.0",
    "reward_stars": 3,
    "hint_ids": ["hint_1001_1", "hint_1001_2", "hint_1001_3"],
    "content": {
      "schemaVersion": "1.0.0",
      "levelId": "level_001",
      "chapterId": "chapter_01",
      "order": 1,
      "title": "关掉的灯还亮着",
      "puzzleType": "visual",
      "difficulty": 2,
      "unlock": { "type": "auto" },
      "story": {
        "intro": "深夜的卧室，台灯亮着，可开关明明是关着的。",
        "outro": "原来光来自窗外的月亮——灯罩只是反射了月光。",
        "introTalk": "你看这灯，开关明明关着，它却亮着——这不就是 Bug 吗？修它！",
        "outroTalk": "等等……好像问题不在灯，在我的眼睛。月亮，你礼貌吗？"
      },
      "scene": {
        "background": "bg_bedroom_night",
        "bgm": "bgm_room_quiet",
        "objects": [
          {
            "id": "lamp",
            "type": "sprite",
            "spriteKey": "obj_lamp_on",
            "position": { "x": 260, "y": -60 },
            "zIndex": 3,
            "interactive": true,
            "actions": [
              {
                "id": "wrong_touch_lamp",
                "trigger": "tap",
                "targetId": "lamp",
                "result": "wrong",
                "feedback": { "bugTalk": "别摸！烫手算谁的？这绝对是灯坏了。", "sound": "sfx_wrong", "vibrate": true }
              }
            ]
          },
          {
            "id": "switch",
            "type": "sprite",
            "spriteKey": "obj_switch_off",
            "position": { "x": -300, "y": 80 },
            "zIndex": 2,
            "interactive": true,
            "actions": [
              {
                "id": "wrong_toggle_switch",
                "trigger": "tap",
                "targetId": "switch",
                "result": "wrong",
                "feedback": { "bugTalk": "开关我都关了啊，这灯怕不是成精了？", "sound": "sfx_wrong", "vibrate": true }
              }
            ]
          },
          {
            "id": "window",
            "type": "sprite",
            "spriteKey": "obj_window_closed",
            "position": { "x": 0, "y": 0 },
            "zIndex": 1,
            "interactive": true,
            "initialState": "closed",
            "states": {
              "closed": { "spriteKey": "obj_window_closed" },
              "opened": { "spriteKey": "obj_window_opened" }
            },
            "actions": [
              {
                "id": "right_open_curtain",
                "trigger": "drag",
                "targetId": "window",
                "payload": { "dragTo": "window_open_zone" },
                "result": "right",
                "feedback": {
                  "bugTalk": "拉开窗帘的瞬间，真相有点亮……",
                  "text": "月光穿过窗户，洒在灯罩上——灯其实没亮。",
                  "sound": "sfx_aha"
                },
                "onSuccess": {
                  "setState": { "window": "opened" },
                  "hideObject": ["lamp"],
                  "showObject": ["moon_light"],
                  "playAnim": "anim_moon_path",
                  "unlockBugLog": true,
                  "gotoResult": true
                }
              }
            ]
          }
        ],
        "camera": { "initialZoom": 1.0, "maxZoom": 2.0 }
      },
      "misleadLayer": {
        "description": "玩家认为「开关关了灯却亮着」= 灯坏了，去按开关或摸灯。",
        "actions": [
          { "id": "wrong_toggle_switch", "trigger": "tap", "targetId": "switch", "result": "wrong" },
          { "id": "wrong_touch_lamp", "trigger": "tap", "targetId": "lamp", "result": "wrong" }
        ]
      },
      "truthLayer": {
        "description": "正确动作：拖拽窗户拉开窗帘，发现光是月光反射。",
        "successMode": "any",
        "actions": [
          { "id": "right_open_curtain", "trigger": "drag", "targetId": "window", "payload": { "dragTo": "window_open_zone" }, "result": "right" }
        ]
      },
      "hints": [
        { "level": 1, "text": "别相信你的第一眼，光一定来自光源吗？", "bugTalk": "先别急，再看看……光是怎么来的？", "cost": { "ad": false, "coins": 0 }, "cooldownSeconds": 5 },
        { "level": 2, "text": "注意窗边那个发亮的东西，它和月亮之间有什么？", "bugTalk": "你看看窗外，再回头看看灯罩……", "cost": { "ad": true, "coins": 0 }, "cooldownSeconds": 10 },
        { "level": 3, "text": "灯没有通电，发光的是灯罩反射的月光，试着拉开窗帘。", "bugTalk": "真相就是：灯是好的，Bug 在我的眼睛。", "cost": { "ad": true, "coins": 0 }, "cooldownSeconds": 15 }
      ],
      "bugLog": {
        "id": "Bug001",
        "title": "开关与月亮",
        "detail": "错误记录：我以为灯坏了。真相：开关确实关着，亮光来自月光反射。Bug 哥认证：问题不在灯，在我的第一眼。",
        "reward": { "coins": 50, "xp": 10 }
      },
      "tags": ["home", "night", "tutorial", "visual"]
    },
    "unlocked": true
  }
}
```

错误码：1003 关卡不存在；4031 关卡未解锁；4032 关卡数据异常（Schema 校验失败）。

---

### 3.5 POST /progress 上报进度

单关结算后上报。服务端按 `(user_id, level_id)` 更新存档；同一关卡重复上报取最优（先看通关，再看星级，再看用时）。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| level_id | string | 是 | 关卡 ID |
| stars | int | 是 | 本次星级 1~3 |
| time_ms | int | 是 | 用时（毫秒） |
| finished | bool | 是 | 是否通关 |
| hint_used | int | 否 | 使用提示次数（影响结算） |
| bug_unlocked | bool | 否 | 是否解锁 Bug 日志 |
| client_version | string | 否 | 客户端版本（校验 1004） |

请求示例：

```json
{
  "level_id": "1002",
  "stars": 2,
  "time_ms": 34000,
  "finished": true,
  "hint_used": 1,
  "bug_unlocked": true,
  "client_version": "1.0.0"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accepted": true,
    "best_updated": true,
    "progress": {
      "max_level": 12,
      "stars_total": 46,
      "finished_count": 11
    },
    "rewards": {
      "stars_gained": 2,
      "bug_log_unlocked": {
        "bug_no": "Bug002",
        "content": "错误记录：开关是假的，灯是声控的"
      }
    }
  }
}
```

错误码：1001 参数错误；1003 关卡不存在；1004 版本过低；4031 关卡未解锁（不允许越级上报）；4091 存档版本冲突（客户端需先拉取最新存档重放）。

---

### 3.6 GET /progress 拉取存档

登录后拉取完整存档（含进度、成长能力、最近 Bug 日志）。

请求参数：无。

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "progress": {
      "current_level_id": "1013",
      "max_level": 12,
      "stars_total": 46,
      "finished_count": 11,
      "best_time_ms": { "1001": 12000, "1002": 34000 },
      "extra": { "sound": true, "vibration": false }
    },
    "skills": [
      { "skill_key": "observe", "name": "观察", "level": 3, "exp": 120 },
      { "skill_key": "investigate", "name": "调查", "level": 2, "exp": 60 },
      { "skill_key": "hint", "name": "提示", "level": 4, "exp": 200 }
    ],
    "recent_bug_logs": [
      { "bug_no": "Bug002", "level_id": "1002", "content": "错误记录：开关是假的，灯是声控的", "unlocked_at": "2026-08-07T09:40:00+08:00" }
    ]
  }
}
```

错误码：2001~2004 鉴权相关。

---

### 3.7 POST /ad/start 开启广告会话

激励视频点位播放前调用，服务端登记本次广告会话（点位、场景、关卡），返回一次性凭证 `ad_token`，用于 `/ad/verify` 上报，防止客户端自造请求绕过流程。频控前置校验（超限直接拒绝，见 09 §2.3）。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| ad_type | string | 是 | hint / revive / double / clue |
| scene | string | 是 | level（关卡内）/ settle（结算双倍） |
| level_id | string | 否 | 关联关卡（hint/revive 必填） |

请求示例：

```json
{
  "ad_type": "double",
  "scene": "settle",
  "level_id": "1002"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "ad_token": "ad_20260807_9f3a2b1c"
  }
}
```

错误码：1001 参数错误；4001 广告频控（超单日/单关限额）；4023 广告奖励冷却中。

---

### 3.8 POST /ad/verify 广告奖励验证

激励视频播放完成后上报凭证。服务端调抖音服务端验证接口校验（防伪造，详见 06 §5），**验证通过直接发奖**。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| ad_token | string | 是 | `/ad/start` 返回的广告会话凭证（防自造请求） |
| ad_type | string | 是 | hint / revive / double / clue |
| scene | string | 是 | level（关卡内）/ settle（结算双倍） |
| level_id | string | 否 | 关联关卡（hint/revive 必填） |
| platform_order_id | string | 是 | 抖音广告回调凭证 ID（幂等键） |
| ad_unit_id | string | 是 | 抖音广告位 ID |

请求示例：

```json
{
  "ad_token": "ad_20260807_9f3a2b1c",
  "ad_type": "double",
  "scene": "settle",
  "level_id": "1002",
  "platform_order_id": "dyad_20260807_88372",
  "ad_unit_id": "adunit_hint_01"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "rewarded": true,
    "reward": {
      "type": "double_stars",
      "stars_gained": 2,
      "platform_order_id": "dyad_20260807_88372"
    }
  }
}
```

错误码：1001 参数错误；4001 广告频控；4021 广告凭证无效（抖音验证拒绝，防伪造）；4022 广告奖励已发放（幂等重复）；4023 广告奖励冷却中；4031 关联关卡未解锁。

---

### 3.9 POST /ad/reward-claim 领取广告奖励（补偿领取）

客户端在 `ad/verify` 响应丢失/超时后补偿调用。服务端只对 `verify_status=2`（已通过服务端验证）的记录补发，未验证通过的记录不补发。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| platform_order_id | string | 是 | 与 /ad/verify 上报的凭证 ID 一致 |

请求示例：

```json
{
  "platform_order_id": "dyad_20260807_88372"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "claimed": true,
    "reward": {
      "type": "double_stars",
      "stars_gained": 2,
      "platform_order_id": "dyad_20260807_88372"
    }
  }
}
```

错误码：1001 参数错误；1003 无对应验证记录；4021 广告凭证未通过验证（不可补发）；4022 奖励已领取。

---

### 3.10 GET /rank 排行榜

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | string | 是 | daily / weekly / level |
| period | string | 否 | 缺省取当前周期（如 `2026-08-07`、`2026W32`、关卡号） |
| page | int | 否 | 默认 1 |
| page_size | int | 否 | 默认 20，上限 50 |

请求示例：`GET /api/v1/rank?type=daily&page=1&page_size=20`

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "rank": 1,
        "user_id": "gd_u_102488",
        "nickname": "Bug收集者",
        "avatar_url": "https://p3.douyinpic.com/avatar/avatar_1001.png",
        "score": 1200,
        "is_self": true
      },
      {
        "rank": 2,
        "user_id": "gd_u_991237",
        "nickname": "真相只有一个",
        "avatar_url": "https://p3.douyinpic.com/avatar/avatar_1002.png",
        "score": 1150,
        "is_self": false
      }
    ],
    "my_rank": 1,
    "total": 58,
    "page": 1,
    "page_size": 20,
    "has_more": true
  }
}
```

错误码：1001 type 非法；1003 该周期榜单不存在。

---

### 3.11 GET /daily 每日挑战

返回当天（或指定日期）每日挑战配置与我的完成状态。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| date | string | 否 | 缺省当天，格式 `2026-08-07` |

请求示例：`GET /api/v1/daily`

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "challenge_id": "80001",
    "date": "2026-08-07",
    "levels": [
      { "level_id": "1005", "title": "空杯满水", "difficulty": 2 },
      { "level_id": "1008", "title": "反向电梯", "difficulty": 2 },
      { "level_id": "1012", "title": "无字菜单", "difficulty": 2 }
    ],
    "reward": { "stars": 6, "member_days": 1 },
    "status": 1,
    "my": {
      "completed": false,
      "score": 0,
      "reward_claimed": false
    }
  }
}
```

错误码：4041 当日挑战不存在或已结束。

---

### 3.12 POST /daily/submit 提交每日成绩

服务端校验后写入记录、入日榜并发放奖励（幂等：`UNIQUE(user_id, challenge_id)`）。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| challenge_id | string | 是 | 每日挑战 ID |
| score | int | 是 | 本次得分 |
| completed | bool | 是 | 是否全部完成 |
| used_time_ms | int | 否 | 总用时（毫秒，同分排序参考） |

请求示例：

```json
{
  "challenge_id": "80001",
  "score": 1200,
  "completed": true,
  "used_time_ms": 180000
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "challenge_id": "80001",
    "score": 1200,
    "completed": true,
    "rank_updated": true,
    "reward": {
      "type": "daily_clear",
      "stars": 6,
      "member_days": 1
    }
  }
}
```

错误码：1001 参数错误；1003 挑战不存在；4041 挑战已结束；4042 重复提交；4001 提交频率超限。

---

### 3.13 POST /events 埋点上报

批量上报埋点事件（单次 ≤ 50 条），事件字典见 10。服务端异步缓冲落库，不阻塞主链路。

> 鉴权说明：**匿名事件白名单**（app_launch / login_fail / privacy_agree 等，见 10 §5.1）允许未登录上报，此时 `user_id` 为空；其余事件需登录态携带 token，登录态缺失返回 2001。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| events | array | 是 | 事件数组，元素见下 |
| events[].event_name | string | 是 | 事件名 |
| events[].properties | object | 否 | 事件属性 |
| events[].ts | string | 是 | 客户端事件时间（ISO8601） |

请求示例：

```json
{
  "events": [
    {
      "event_name": "level_start",
      "properties": { "level_id": "1002", "hint_count": 0 },
      "ts": "2026-08-07T09:30:00.000+08:00"
    },
    {
      "event_name": "level_win",
      "properties": { "level_id": "1002", "stars": 2, "time_ms": 34000 },
      "ts": "2026-08-07T09:31:00.000+08:00"
    }
  ]
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accepted": 2,
    "dropped": 0
  }
}
```

错误码：1001 单次超过 50 条或事件名非法；4001 上报频率超限。

---

### 3.14 GET /skins 皮肤列表

返回全部上架皮肤及我的拥有/穿戴状态。

请求参数：无。

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "skin_id": "1001",
        "skin_key": "programmer",
        "name": "程序员Bug哥",
        "price": 0,
        "unlock_type": "event",
        "asset_url": "skins/programmer",
        "owned": true,
        "equipped": true
      },
      {
        "skin_id": "1002",
        "skin_key": "detective",
        "name": "侦探Bug哥",
        "price": 1500,
        "unlock_type": "ad",
        "asset_url": "skins/detective",
        "owned": false,
        "equipped": false
      }
    ]
  }
}
```

错误码：2001~2004 鉴权相关。

---

### 3.15 POST /skins/:id/equip 穿戴皮肤

穿戴/卸下皮肤。穿戴会取消其它皮肤的穿戴状态（同用户仅一件生效）。

请求参数：路径参数 `id`（皮肤 ID）；可选 body `{ "equip": false }` 表示卸下，缺省为穿戴。

请求示例：

```json
{
  "equip": true
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "skin_id": "1001",
    "equipped": true
  }
}
```

错误码：1001 参数错误；4051 皮肤不存在；4052 皮肤未解锁（需先获得）。

## 4. 接口与表、模块的映射

| 接口 | 模块（06 §3） | 主要表（07） |
| --- | --- | --- |
| /auth/login | AuthModule | gd_user |
| /user/profile | UserModule | gd_user、gd_user_skin |
| /levels、/levels/:id | LevelModule | gd_level |
| /progress（POST/GET） | ProgressModule | gd_user_progress、gd_skill、gd_user_skill、gd_bug_log |
| /ad/start、/ad/verify、/ad/reward-claim | AdModule | gd_ad_reward |
| /rank | RankModule | gd_rank（+ Redis ZSet） |
| /daily、/daily/submit | DailyModule | gd_daily_challenge、gd_user_daily |
| /events | EventModule | gd_event |
| /skins、/skins/:id/equip | SkinModule | gd_skin、gd_user_skin |

## 5. 附录：通用错误码速查

| 错误码 | 含义 | 错误码 | 含义 |
| --- | --- | --- | --- |
| 0000 | 成功 | 4001 | 请求过于频繁 |
| 1001 | 参数校验失败 | 4011 | 回调签名校验失败 |
| 1002 | 请求体解析失败 | 4021 | 广告凭证无效（防伪造） |
| 1003 | 资源不存在 | 4022 | 广告奖励已发放 |
| 1004 | 客户端版本过低 | 4023 | 广告奖励冷却中 |
| 2001 | 未登录 | 4031 | 关卡未解锁 |
| 2002 | token 过期 | 4032 | 关卡数据异常 |
| 2003 | token 无效 | 4041 | 每日挑战不存在或已结束 |
| 2004 | 账号被封禁 | 4042 | 每日挑战重复提交 |
| 3001 | 服务器内部错误 | 4051 | 皮肤不存在 |
| 3002 | 数据访问异常 | 4052 | 皮肤未解锁 |
| 3003 | 缓存服务异常 | 4091 | 存档版本冲突 |
| 3004 | 第三方服务异常 | 4092 | 重复操作 |

> 完整错误码定义见 06 §9；新增接口必须复用本表错误码，不得自定义。
