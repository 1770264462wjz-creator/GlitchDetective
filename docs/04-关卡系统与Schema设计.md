# 04 · 关卡系统与 Schema 设计

> 《Bug哥：别相信你的第一眼》关卡数据标准。定义关卡 JSON Schema v1.0、puzzleType 枚举、误导层/真相层表达、提示分档、版本化策略与校验器规则。
> 基准参考：docs/00（术语）、docs/01（数据驱动架构）、docs/03（谜题类型与示例关卡）。客户端解释器实现见 docs/05。

---

## 1. 数据驱动设计原则

| # | 原则 | 说明 |
| --- | --- | --- |
| 1 | 关卡 = 纯数据 | 关卡由 JSON 描述，客户端解释器执行，代码零硬编码 |
| 2 | 内容与代码分离 | 新关卡 = 新 JSON，无需发版客户端 |
| 3 | 可校验 | 所有关卡入库前必须通过校验器（第 9 章），AI 生成垃圾数据不进生产 |
| 4 | 可版本化 | Schema 带版本号，解释器向前兼容（第 8 章） |
| 5 | 单一事实源 | 关卡编辑器（Web）产出 JSON → 校验 → 版本化发布 → 客户端下载执行 |
| 6 | 可测试 | 校验器 + 解释器均可单元测试，关卡 JSON 可离线跑冒烟测试 |

---

## 2. 关卡 Schema v1.0 概览（顶层结构）

```
Level (schemaVersion 1.0.0)
├── schemaVersion      # Schema 版本号（必填）
├── levelId            # 关卡唯一 ID（必填）
├── chapterId          # 章节 ID（必填）
├── order              # 章节内序号（必填）
├── title              # 关卡标题（必填）
├── puzzleType         # 谜题类型枚举（必填）
├── difficulty         # 难度星级 1-5（必填）
├── unlock             # 解锁条件
├── story              # 剧情（intro/outro + Bug 哥台词）
├── scene              # 场景定义
│   ├── background     # 背景资源 key（必填）
│   ├── bgm            # 背景音乐资源 key（可选）
│   ├── objects[]      # 物件列表（必填，≥1）
│   └── camera         # 摄像机配置（可选）
├── misleadLayer       # 误导层（必填，≥1 个错误动作）
├── truthLayer         # 真相层（必填，≥1 个正确动作）
├── hints[]            # 提示分档 1/2/3（必填 3 档）
├── bugLog             # Bug 日志收藏（必填）
└── tags[]             # 内容标签（可选）
```

---

## 3. 完整 JSON Schema 定义（Draft-07）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "glitch-detective/level-schema/1.0.0",
  "title": "GlitchDetective Level Schema v1.0.0",
  "type": "object",
  "required": [
    "schemaVersion", "levelId", "chapterId", "order", "title",
    "puzzleType", "difficulty", "unlock", "story", "scene",
    "misleadLayer", "truthLayer", "hints", "bugLog"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "pattern": "^1\\.\\d+\\.\\d+$",
      "description": "Schema 版本号，主版本必须为 1"
    },
    "levelId": {
      "type": "string",
      "pattern": "^[A-Za-z][A-Za-z0-9_]{2,63}$",
      "description": "关卡唯一 ID，全局唯一"
    },
    "chapterId": {
      "type": "string",
      "pattern": "^chapter_[0-9]{2}$",
      "description": "章节 ID，格式 chapter_01"
    },
    "order": {
      "type": "integer",
      "minimum": 1,
      "description": "章节内序号，正整数"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 30,
      "description": "关卡标题"
    },
    "puzzleType": {
      "type": "string",
      "enum": ["visual", "reverse", "target", "language", "detail"],
      "description": "谜题类型，5 类枚举"
    },
    "difficulty": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5,
      "description": "难度星级 1-5，与关卡编号段位匹配"
    },
    "unlock": {
      "type": "object",
      "oneOf": [
        { "required": ["type"], "properties": { "type": { "const": "auto" } } },
        {
          "required": ["type", "levelId"],
          "properties": {
            "type": { "const": "previous" },
            "levelId": { "type": "string" }
          }
        }
      ],
      "description": "解锁条件：auto 首关自动解锁；previous 通关指定关卡解锁"
    },
    "story": {
      "type": "object",
      "required": ["intro", "outro"],
      "properties": {
        "intro":  { "type": "string", "description": "进入关卡剧情文案" },
        "outro":  { "type": "string", "description": "通关后剧情文案" },
        "introTalk": { "type": "string", "description": "Bug 哥开场台词（误导钩子）" },
        "outroTalk": { "type": "string", "description": "Bug 哥真相台词" }
      }
    },
    "scene": {
      "type": "object",
      "required": ["background", "objects"],
      "properties": {
        "background": { "type": "string", "description": "背景图资源 key" },
        "bgm": { "type": "string", "description": "BGM 资源 key，可选" },
        "objects": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/definitions/objectDef" }
        },
        "camera": {
          "type": "object",
          "properties": {
            "initialZoom": { "type": "number", "minimum": 0.5 },
            "maxZoom": { "type": "number", "minimum": 1 }
          },
          "description": "摄像机配置，可选"
        }
      }
    },
    "misleadLayer": {
      "type": "object",
      "required": ["description", "actions"],
      "properties": {
        "description": {
          "type": "string",
          "description": "误导层说明（供编辑器/审查者阅读，不出现在游戏中）"
        },
        "actions": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/definitions/actionDef" },
          "description": "被判定为「错误」的交互集"
        }
      }
    },
    "truthLayer": {
      "type": "object",
      "required": ["description", "successMode", "actions"],
      "properties": {
        "description": {
          "type": "string",
          "description": "真相层说明（供编辑器/审查者阅读）"
        },
        "successMode": {
          "type": "string",
          "enum": ["any", "sequence", "combo"],
          "description": "any=任一命中即胜；sequence=按 actions 顺序命中；combo=限定时间内连续命中"
        },
        "actions": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/definitions/actionDef" },
          "description": "被判定为「正确」的交互集"
        }
      }
    },
    "hints": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": { "$ref": "#/definitions/hintDef" },
      "description": "提示分档，固定 3 档：level 1/2/3"
    },
    "bugLog": {
      "type": "object",
      "required": ["id", "title", "detail"],
      "properties": {
        "id": { "type": "string", "pattern": "^Bug[0-9]{3,}$" },
        "title": { "type": "string", "minLength": 1, "maxLength": 30 },
        "detail": { "type": "string", "minLength": 1 },
        "reward": {
          "type": "object",
          "properties": {
            "coins": { "type": "integer", "minimum": 0, "default": 0 },
            "xp": { "type": "integer", "minimum": 0, "default": 0 }
          }
        }
      }
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "内容标签（主题/埋点用），可选"
    }
  },
  "definitions": {
    "objectDef": {
      "type": "object",
      "required": ["id", "type", "position", "interactive"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
        "type": {
          "type": "string",
          "enum": ["sprite", "label", "particle", "audio", "container"]
        },
        "spriteKey": { "type": "string", "description": "图片资源 key（sprite 类型必填）" },
        "text": { "type": "string", "description": "文字内容（label 类型必填）" },
        "position": {
          "type": "object",
          "required": ["x", "y"],
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" }
          }
        },
        "scale": { "type": "number", "minimum": 0.01, "default": 1 },
        "zIndex": { "type": "integer", "default": 0 },
        "rotation": { "type": "number", "default": 0 },
        "visible": { "type": "boolean", "default": true },
        "locked": { "type": "boolean", "default": false, "description": "锁定状态：true 时不可交互" },
        "initialState": { "type": "string", "description": "初始状态名" },
        "states": {
          "type": "object",
          "description": "状态字典：stateName -> { spriteKey, visible, lockable }",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "spriteKey": { "type": "string" },
              "visible": { "type": "boolean" }
            }
          }
        },
        "interactive": { "type": "boolean" },
        "actions": {
          "type": "array",
          "items": { "$ref": "#/definitions/actionDef" },
          "description": "该物件绑定的交互动作（interactive=true 时至少 1 条）"
        }
      }
    },
    "actionDef": {
      "type": "object",
      "required": ["id", "trigger", "targetId", "result"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
        "trigger": {
          "type": "string",
          "enum": ["tap", "doubleTap", "longPress", "drag", "combine"]
        },
        "targetId": { "type": "string", "description": "动作主体物件 id" },
        "payload": {
          "type": "object",
          "description": "trigger 专属参数：drag 必填 dragTo；combine 必填 combineWith",
          "properties": {
            "dragTo": { "type": "string", "description": "drag 的目标落点物件 id" },
            "combineWith": { "type": "string", "description": "combine 的组合对象 id" }
          }
        },
        "condition": { "$ref": "#/definitions/conditionDef", "description": "触发前置条件，可选" },
        "result": {
          "type": "string",
          "enum": ["wrong", "right", "info"],
          "description": "wrong=错误动作（误导层）；right=正确动作（真相层）；info=信息动作（不计错）"
        },
        "feedback": {
          "type": "object",
          "properties": {
            "bugTalk": { "type": "string", "description": "Bug 哥吐槽台词" },
            "text": { "type": "string", "description": "旁白/文案" },
            "toast": { "type": "string", "description": "轻提示文案" },
            "sound": { "type": "string", "description": "音效 key" },
            "vibrate": { "type": "boolean", "default": false }
          }
        },
        "onSuccess": {
          "type": "object",
          "description": "命中后执行的副作用（right 动作必填 gotoResult）",
          "properties": {
            "setState": {
              "type": "object",
              "description": "切换物件状态：{ objectId: stateName }",
              "additionalProperties": { "type": "string" }
            },
            "showObject": { "type": "array", "items": { "type": "string" } },
            "hideObject": { "type": "array", "items": { "type": "string" } },
            "playAnim": { "type": "string", "description": "播放动画 key" },
            "unlockBugLog": { "type": "boolean", "default": false },
            "gotoResult": { "type": "boolean", "default": false }
          }
        }
      }
    },
    "conditionDef": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["state", "count", "time"]
        },
        "objectId": { "type": "string", "description": "state 条件：物件 id" },
        "state": { "type": "string", "description": "state 条件：目标状态名" },
        "actionId": { "type": "string", "description": "count 条件：统计的动作 id" },
        "count": { "type": "integer", "minimum": 1, "description": "count 条件：最少命中次数" },
        "minSeconds": { "type": "number", "minimum": 0, "description": "time 条件：最少经过秒数" }
      }
    },
    "hintDef": {
      "type": "object",
      "required": ["level", "text"],
      "properties": {
        "level": { "type": "integer", "enum": [1, 2, 3] },
        "text": { "type": "string", "minLength": 1, "description": "提示文案" },
        "bugTalk": { "type": "string", "description": "Bug 哥说出提示时的台词" },
        "cost": {
          "type": "object",
          "properties": {
            "ad": { "type": "boolean", "default": false, "description": "是否需看激励视频" },
            "coins": { "type": "integer", "minimum": 0, "default": 0 }
          }
        },
        "cooldownSeconds": { "type": "number", "minimum": 0, "default": 0 }
      }
    }
  }
}
```

---

## 4. 字段说明表（全字段）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| schemaVersion | string | 是 | Schema 版本，当前必须为 1.x |
| levelId | string | 是 | 关卡 ID，全局唯一，如 level_001 |
| chapterId | string | 是 | 章节 ID，格式 chapter_01 |
| order | integer | 是 | 章节内序号 1-10 |
| title | string | 是 | 关卡标题，1-30 字 |
| puzzleType | string | 是 | 5 类枚举之一（见第 5 章） |
| difficulty | integer | 是 | 难度星级 1-5 |
| unlock.type | string | 是 | auto / previous |
| unlock.levelId | string | 条件 | previous 时必填：前置关卡 |
| story.intro | string | 是 | 进场剧情文案 |
| story.outro | string | 是 | 通关剧情文案 |
| story.introTalk | string | 否 | Bug 哥开场台词（误导钩子） |
| story.outroTalk | string | 否 | Bug 哥真相台词 |
| scene.background | string | 是 | 背景资源 key |
| scene.bgm | string | 否 | BGM 资源 key |
| scene.objects | array | 是 | 物件列表，≥1 |
| object.id | string | 是 | 物件 ID，小写下划线 |
| object.type | string | 是 | sprite / label / particle / audio / container |
| object.spriteKey | string | 条件 | sprite 类型必填 |
| object.text | string | 条件 | label 类型必填 |
| object.position | object | 是 | 坐标 {x, y} |
| object.scale | number | 否 | 缩放，默认 1 |
| object.zIndex | integer | 否 | 层级，默认 0 |
| object.rotation | number | 否 | 旋转角，默认 0 |
| object.visible | boolean | 否 | 初始可见，默认 true |
| object.locked | boolean | 否 | 锁定不可交互，默认 false |
| object.initialState | string | 否 | 初始状态名 |
| object.states | object | 否 | 状态字典 |
| object.interactive | boolean | 是 | 是否可交互 |
| object.actions | array | 条件 | interactive=true 时 ≥1 |
| action.id | string | 是 | 动作 ID，全局唯一（关卡内） |
| action.trigger | string | 是 | tap / doubleTap / longPress / drag / combine |
| action.targetId | string | 是 | 动作主体物件 |
| action.payload | object | 否 | dragTo（drag）/ combineWith（combine） |
| action.condition | object | 否 | 触发前置条件 |
| action.result | string | 是 | wrong / right / info |
| action.feedback | object | 否 | 反馈（bugTalk / text / toast / sound / vibrate） |
| action.onSuccess | object | 否 | 副作用（setState / show / hide / playAnim / gotoResult） |
| condition.type | string | 是 | state / count / time |
| hint.level | integer | 是 | 1 / 2 / 3 |
| hint.text | string | 是 | 提示文案 |
| hint.bugTalk | string | 否 | Bug 哥台词 |
| hint.cost.ad | boolean | 否 | 是否激励视频 |
| hint.cost.coins | integer | 否 | 金币消耗 |
| bugLog.id | string | 是 | Bug 日志编号，Bug001 格式 |
| bugLog.title | string | 是 | 日志标题 |
| bugLog.detail | string | 是 | 日志内容（错误思路记录） |
| bugLog.reward | object | 否 | coins / xp 奖励 |

---

## 5. puzzleType 枚举

| 枚举值 | 类型 | 心智模型 | 关卡示例（docs/03） |
| --- | --- | --- | --- |
| visual | 视觉误导 | 所见即所得，眼睛骗了你 | 关掉的灯还亮着、巨大的猫 |
| reverse | 常识反转 | 教科书答案失灵，关键条件被忽略 | 越开越热的空调、冒泡的锅 |
| target | 目标误解 | 最显眼的异常不是真目标 | 修错的那台电脑、喊救命的工人 |
| language | 语言陷阱 | 快速扫读文字抓住错误关键词 | 第二杯半价、请点击红色按钮 |
| detail | 细节推理 | 细节藏在角落，需要调查才可见 | 多出来的一只鸭、电梯口的水渍 |

扩展约定：新增类型 = 新增枚举值 + 解释器新增渲染/判定分支（docs/01 已列为扩展点），Schema 主版本需随之评估是否升级。

---

## 6. 误导层与真相层的结构表达

### 6.1 交互动作（Action）

误导层与真相层都由「交互动作集」表达，动作的 `result` 字段决定其归属：

| result | 归属 | 效果 |
| --- | --- | --- |
| wrong | misleadLayer | 命中即错误计数 +1，播放 Bug 哥吐槽，不结算 |
| right | truthLayer | 命中即推进真相判定，按 successMode 结算 |
| info | 可挂在任意物件 | 信息展示（看广告牌背面、翻说明书），不计错 |

### 6.2 触发条件（Condition）

- `state`：要求某物件处于指定状态（如：必须先翻看广告牌背面才能结账）。
- `count`：要求某动作已命中 N 次（如：必须先敲 3 下门）。
- `time`：要求经过最少秒数（如：等水烧开 5 秒后才能操作）。

### 6.3 成功模式（successMode）

| 模式 | 规则 | 适用 |
| --- | --- | --- |
| any | truthLayer.actions 任一命中即胜利 | 简单关卡（单动作真相） |
| sequence | 必须按 actions 数组顺序依次命中 | 多步骤真相（先翻牌、再换货、再结账） |
| combo | 限定时间窗口内连续命中全部动作 | 高难关（细节推理，如先观察后操作） |

### 6.4 物件状态机（states）

- 物件通过 `states` + `initialState` 表达多形态（广告牌正面/背面、开关开/关）。
- `action.onSuccess.setState` 切换状态，状态切换可联动显隐（onSuccess.showObject / hideObject）与解锁（locked）。

---

## 7. 提示分档（1/2/3 级）结构

| 档位 | level | 策略 | 提示示例 | 消耗 |
| --- | --- | --- | --- | --- |
| 1 级 | 1 | 泛提示：动摇第一印象，不指向具体物件 | 「别相信你的第一眼，换个角度看。」 | 免费（默认解锁） |
| 2 级 | 2 | 范围提示：指向可疑物件/区域 | 「注意那个不起眼的角落，它今天有点抢戏。」 | 激励视频 |
| 3 级 | 3 | 真相逻辑提示：点破关键条件（不说操作） | 「真相的逻辑是：开关是好的，光来自窗外。」 | 激励视频 |

- hints 数组固定 3 档（level 1/2/3），level 1 无条件解锁，level 2/3 由成长系统「提示」能力解锁（docs/03 7.2）。
- `cost.ad` 为 true 时走激励视频发放逻辑（docs/09），`cost.coins` 为金币兜底渠道。
- `cooldownSeconds` 防止连点刷屏。

---

## 8. 版本化与向前兼容策略

| 项 | 策略 |
| --- | --- |
| 版本号 | 语义化 MAJOR.MINOR.PATCH，如 1.2.0 |
| MAJOR | 主版本，破坏性变更；解释器只执行同主版本的关卡，遇更高主版本提示更新客户端 |
| MINOR | 向后兼容的新增能力（新增可选字段/新增枚举值），旧解释器忽略未知字段即可执行 |
| PATCH | 字段说明修正、默认值调整，不改变结构 |
| 演进铁律 | 只增不改不删：新增字段必须 optional 或带默认值；禁止复用/重命名既有字段 |
| 解释器策略 | 客户端内置解释器声明支持版本区间（如 1.x），运行时校验 schemaVersion |
| 内容管线 | 编辑器产出 → 校验器（第 9 章）→ 版本化发布 → 客户端增量拉取（docs/05 资源管理） |

---

## 9. 校验器规则清单（v1.0 强制规则）

> 校验器实现于 `utils/level-validator`，规则编号 R01-R16，全部为「必须通过」级别，违规即拒绝入库/进包。

| # | 规则 | 类别 |
| --- | --- | --- |
| R01 | schemaVersion 必填，且主版本为当前支持版本（1.x） | 必填字段 |
| R02 | levelId 必填，匹配 `^[A-Za-z][A-Za-z0-9_]{2,63}$`，且全库唯一 | 必填字段 |
| R03 | chapterId / order / title / puzzleType / difficulty 均必填 | 必填字段 |
| R04 | difficulty 为整数 1-5 | 枚举合法性 |
| R05 | puzzleType 必须属于 visual / reverse / target / language / detail 之一 | 枚举合法性 |
| R06 | trigger 必须属于 tap / doubleTap / longPress / drag / combine 之一 | 枚举合法性 |
| R07 | result 必须属于 wrong / right / info 之一 | 枚举合法性 |
| R08 | successMode 必须属于 any / sequence / combo 之一 | 枚举合法性 |
| R09 | 关卡编号（order + 章节推算全局序号）与 difficulty 段位匹配：1-20 关必须 = 2，20-50 关 = 3，50-80 关 = 4，80-100 关 = 5 | 逻辑一致性 |
| R10 | scene.objects 至少 1 个；object.id 非空且场景内唯一；interactive=true 的物件必须配置 ≥1 个 action，interactive=false 不得配置 action | 逻辑一致性 |
| R11 | 所有 action.targetId、condition.objectId / actionId、onSuccess.setState / showObject / hideObject 引用的物件 id 必须存在于 scene.objects | 引用一致性 |
| R12 | 关卡内 action.id 全局唯一 | 引用一致性 |
| R13 | misleadLayer.actions 至少 1 条且全部 result=wrong；truthLayer.actions 至少 1 条且全部 result=right | 逻辑一致性 |
| R14 | 同关卡内不得存在「同 (trigger, targetId, payload) 的 wrong 与 right 动作并存」，防止判定冲突 | 逻辑一致性 |
| R15 | hints 必须 2~3 档，level 必须为 {1, 2, 3} 且互不重复；level 1 的 cost.ad 必须为 false；发布级关卡（status=3）建议 3 档，新手关允许 2 档（见 11 文档 W01） | 逻辑一致性 |
| R16 | bugLog.id 必填且匹配 `^Bug[0-9]{3,}$`，数值须与关卡全局序号一致（第 1 关 = Bug001） | 必填字段 |
| R17 | 所有文案字段（title / text / detail / bugTalk / toast）去除首尾空白后不得为空 | 内容校验 |
| R18 | trigger=drag 时 payload.dragTo 必填；trigger=combine 时 payload.combineWith 必填；且 dragTo / combineWith 引用的物件 id 必须存在于 scene.objects | 必填字段 |
| R19 | 所有 result=right 的 action 必须配置 feedback.bugTalk 与 onSuccess.gotoResult=true（结算入口） | 逻辑一致性 |
| R20 | 条件引用计数：condition.type=count 时，condition.actionId 必须存在于本关全部动作集中 | 引用一致性 |

---

## 10. 关卡内容示例（完整 JSON）

### 10.1 视觉误导类示例：《关掉的灯还亮着》

对应 docs/03 示例关卡 1（第 1 关，★2，Bug001）。玩家以为灯坏了，真相是月光反射。

```json
{
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
            "feedback": {
              "bugTalk": "别摸！烫手算谁的？这绝对是灯坏了。",
              "sound": "sfx_wrong",
              "vibrate": true
            }
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
            "feedback": {
              "bugTalk": "开关我都关了啊，这灯怕不是成精了？",
              "sound": "sfx_wrong",
              "vibrate": true
            }
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
        ],
        "initialState": "closed",
        "states": {
          "closed": { "spriteKey": "obj_window_closed" },
          "opened": { "spriteKey": "obj_window_opened" }
        }
      },
      {
        "id": "moon_light",
        "type": "particle",
        "spriteKey": "fx_moon_beam",
        "position": { "x": 0, "y": 40 },
        "zIndex": 0,
        "visible": false,
        "interactive": false
      },
      {
        "id": "alarm_clock",
        "type": "sprite",
        "spriteKey": "obj_alarm_clock",
        "position": { "x": 340, "y": 120 },
        "zIndex": 2,
        "interactive": true,
        "actions": [
          {
            "id": "info_clock",
            "trigger": "tap",
            "targetId": "alarm_clock",
            "result": "info",
            "feedback": {
              "bugTalk": "闹钟：我就安静躺着，别看我。",
              "toast": "只是一个普通的闹钟。"
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
      {
        "id": "wrong_toggle_switch",
        "trigger": "tap",
        "targetId": "switch",
        "result": "wrong"
      },
      {
        "id": "wrong_touch_lamp",
        "trigger": "tap",
        "targetId": "lamp",
        "result": "wrong"
      }
    ]
  },
  "truthLayer": {
    "description": "正确动作：拖拽窗户拉开窗帘，发现光是月光反射。",
    "successMode": "any",
    "actions": [
      {
        "id": "right_open_curtain",
        "trigger": "drag",
        "targetId": "window",
        "payload": { "dragTo": "window_open_zone" },
        "result": "right"
      }
    ]
  },
  "hints": [
    {
      "level": 1,
      "text": "别相信你的第一眼，光一定来自光源吗？",
      "bugTalk": "先别急，再看看……光是怎么来的？",
      "cost": { "ad": false, "coins": 0 },
      "cooldownSeconds": 5
    },
    {
      "level": 2,
      "text": "注意窗边那个发亮的东西，它和月亮之间有什么？",
      "bugTalk": "你看看窗外，再回头看看灯罩……",
      "cost": { "ad": true, "coins": 0 },
      "cooldownSeconds": 10
    },
    {
      "level": 3,
      "text": "灯没有通电，发光的是灯罩反射的月光，试着拉开窗帘。",
      "bugTalk": "真相就是：灯是好的，Bug 在我的眼睛。",
      "cost": { "ad": true, "coins": 0 },
      "cooldownSeconds": 15
    }
  ],
  "bugLog": {
    "id": "Bug001",
    "title": "开关与月亮",
    "detail": "错误记录：我以为灯坏了。真相：开关确实关着，亮光来自月光反射。Bug 哥认证：问题不在灯，在我的第一眼。",
    "reward": { "coins": 50, "xp": 10 }
  },
  "tags": ["home", "night", "tutorial", "visual"]
}
```

### 10.2 语言陷阱类示例：《第二杯半价》

对应 docs/03 示例关卡 7（第 35 关，★3，Bug035）。玩家被广告牌「第二杯半价」误导，真相是小字「仅限同款」。

```json
{
  "schemaVersion": "1.0.0",
  "levelId": "level_035",
  "chapterId": "chapter_04",
  "order": 5,
  "title": "第二杯半价",
  "puzzleType": "language",
  "difficulty": 3,
  "unlock": { "type": "previous", "levelId": "level_034" },
  "story": {
    "intro": "奶茶店大促：「第二杯半价」！Bug 哥一眼相中新品椰椰芋泥。",
    "outro": "小字写着「仅限同款，新品除外」。Bug 哥认栽，换了两杯原味。",
    "introTalk": "半价！冲！买它！新品最贵的，半价血赚！",
    "outroTalk": "等等，好像问题在我——我读书时学的不是阅读，是『扫读关键词』速成班。"
  },
  "scene": {
    "background": "bg_milk_tea_shop",
    "objects": [
      {
        "id": "sign",
        "type": "sprite",
        "spriteKey": "obj_sign_front",
        "position": { "x": -280, "y": 120 },
        "zIndex": 3,
        "interactive": true,
        "initialState": "front",
        "states": {
          "front": { "spriteKey": "obj_sign_front" },
          "back": { "spriteKey": "obj_sign_back" }
        },
        "actions": [
          {
            "id": "info_flip_sign",
            "trigger": "tap",
            "targetId": "sign",
            "result": "info",
            "condition": { "type": "state", "objectId": "sign", "state": "front" },
            "feedback": {
              "bugTalk": "正面当然只有『第二杯半价』，小字在背面！商家的小心机！",
              "sound": "sfx_flip"
            },
            "onSuccess": {
              "setState": { "sign": "back" }
            }
          },
          {
            "id": "info_tap_sign_back",
            "trigger": "doubleTap",
            "targetId": "sign",
            "result": "info",
            "condition": { "type": "state", "objectId": "sign", "state": "back" },
            "feedback": {
              "bugTalk": "看见没：『仅限同款，新品除外』——小字才是重点。",
              "text": "小字：仅限同款，新品除外"
            },
            "onSuccess": {
              "setState": { "counter": "unlocked" }
            }
          }
        ]
      },
      {
        "id": "counter",
        "type": "sprite",
        "spriteKey": "obj_counter",
        "position": { "x": 0, "y": -160 },
        "zIndex": 1,
        "interactive": true,
        "locked": true,
        "initialState": "locked",
        "states": {
          "locked": { "spriteKey": "obj_counter" },
          "unlocked": { "spriteKey": "obj_counter_glow" }
        },
        "actions": [
          {
            "id": "info_look_counter",
            "trigger": "tap",
            "targetId": "counter",
            "result": "info",
            "condition": { "type": "state", "objectId": "counter", "state": "locked" },
            "feedback": {
              "bugTalk": "收银台空着呢，把奶茶放上来就能结账。",
              "toast": "收银台：等待结账"
            }
          }
        ]
      },
      {
        "id": "milk_tea_original_1",
        "type": "sprite",
        "spriteKey": "obj_milk_tea_original",
        "position": { "x": -140, "y": -60 },
        "zIndex": 2,
        "interactive": true,
        "actions": [
          {
            "id": "right_place_original_1",
            "trigger": "combine",
            "targetId": "milk_tea_original_1",
            "payload": { "combineWith": "counter" },
            "result": "right",
            "condition": { "type": "state", "objectId": "counter", "state": "unlocked" },
            "feedback": {
              "bugTalk": "原味一杯，放好！",
              "sound": "sfx_place"
            },
            "onSuccess": {
              "hideObject": ["milk_tea_original_1"]
            }
          },
          {
            "id": "info_look_original",
            "trigger": "tap",
            "targetId": "milk_tea_original_1",
            "result": "info",
            "feedback": {
              "bugTalk": "原味奶茶，经典款，参加活动。",
              "toast": "原味奶茶（参加第二杯半价）"
            }
          }
        ]
      },
      {
        "id": "milk_tea_original_2",
        "type": "sprite",
        "spriteKey": "obj_milk_tea_original",
        "position": { "x": -60, "y": -60 },
        "zIndex": 2,
        "interactive": true,
        "actions": [
          {
            "id": "right_place_original_2",
            "trigger": "combine",
            "targetId": "milk_tea_original_2",
            "payload": { "combineWith": "counter" },
            "result": "right",
            "condition": {
              "type": "count",
              "actionId": "right_place_original_1",
              "count": 1
            },
            "feedback": {
              "bugTalk": "第二杯原味，齐活！半价到手！",
              "sound": "sfx_aha"
            },
            "onSuccess": {
              "hideObject": ["milk_tea_original_2"],
              "playAnim": "anim_checkout",
              "unlockBugLog": true,
              "gotoResult": true
            }
          }
        ]
      },
      {
        "id": "milk_tea_new",
        "type": "sprite",
        "spriteKey": "obj_milk_tea_new",
        "position": { "x": 140, "y": -60 },
        "zIndex": 2,
        "interactive": true,
        "actions": [
          {
            "id": "wrong_place_new",
            "trigger": "combine",
            "targetId": "milk_tea_new",
            "payload": { "combineWith": "counter" },
            "result": "wrong",
            "feedback": {
              "bugTalk": "新品：您礼貌吗？半价写着『仅限同款』四个大字呢！",
              "sound": "sfx_wrong",
              "vibrate": true
            },
            "onSuccess": {
              "showObject": ["sign_back_hint"]
            }
          },
          {
            "id": "info_look_new",
            "trigger": "tap",
            "targetId": "milk_tea_new",
            "result": "info",
            "feedback": {
              "bugTalk": "椰椰芋泥，新品，标签上写着『新品不参与活动』。",
              "toast": "新品：不参与第二杯半价"
            }
          }
        ]
      },
      {
        "id": "sign_back_hint",
        "type": "label",
        "text": "注意广告牌背面",
        "position": { "x": -280, "y": 200 },
        "zIndex": 4,
        "visible": false,
        "interactive": false
      },
      {
        "id": "menu",
        "type": "sprite",
        "spriteKey": "obj_menu",
        "position": { "x": 300, "y": 140 },
        "zIndex": 1,
        "interactive": true,
        "actions": [
          {
            "id": "info_menu",
            "trigger": "tap",
            "targetId": "menu",
            "result": "info",
            "feedback": {
              "bugTalk": "菜单上写得很清楚：第二杯半价仅限同款。",
              "toast": "菜单：第二杯半价（仅限同款）"
            }
          }
        ]
      }
    ],
    "camera": { "initialZoom": 1.0, "maxZoom": 2.0 }
  },
  "misleadLayer": {
    "description": "玩家把新品与原味混搭结账（违反「仅限同款」），或误以为广告牌正面有全部信息。",
    "actions": [
      {
        "id": "wrong_place_new",
        "trigger": "combine",
        "targetId": "milk_tea_new",
        "payload": { "combineWith": "counter" },
        "result": "wrong"
      }
    ]
  },
  "truthLayer": {
    "description": "正确路径：点广告牌翻面 → 看小字 → 把 2 杯原味依次放到收银台结账。",
    "successMode": "sequence",
    "actions": [
      {
        "id": "right_place_original_1",
        "trigger": "combine",
        "targetId": "milk_tea_original_1",
        "payload": { "combineWith": "counter" },
        "result": "right"
      },
      {
        "id": "right_place_original_2",
        "trigger": "combine",
        "targetId": "milk_tea_original_2",
        "payload": { "combineWith": "counter" },
        "result": "right"
      }
    ]
  },
  "hints": [
    {
      "level": 1,
      "text": "广告牌上除了『第二杯半价』，还写了别的吗？",
      "bugTalk": "别急着结账，把招牌看清楚再说。",
      "cost": { "ad": false, "coins": 0 },
      "cooldownSeconds": 5
    },
    {
      "level": 2,
      "text": "广告牌是可以翻面的，背面有字。",
      "bugTalk": "点一下广告牌试试……嗯，还有背面。",
      "cost": { "ad": true, "coins": 0 },
      "cooldownSeconds": 10
    },
    {
      "level": 3,
      "text": "背面小字：仅限同款，新品除外。所以要点两杯原味，而不是原味+新品。",
      "bugTalk": "真相就是：语言陷阱。我把小字跳过了。",
      "cost": { "ad": true, "coins": 0 },
      "cooldownSeconds": 15
    }
  ],
  "bugLog": {
    "id": "Bug035",
    "title": "半价的文字游戏",
    "detail": "错误记录：我以为新品也能半价。真相：『第二杯半价』仅限同款，新品除外。Bug 哥认证：我的眼睛只扫到了关键词。",
    "reward": { "coins": 120, "xp": 25 }
  },
  "tags": ["mall", "shop", "language", "text-trap"]
}
```

---

## 11. 与其他文档的衔接

| 文档 | 衔接点 |
| --- | --- |
| docs/01 | 数据驱动架构、内容管线（编辑器 → 校验 → 发布） |
| docs/03 | 5 类谜题心智模型与示例关卡（本节示例为其落地 JSON） |
| docs/05 | 客户端关卡解释器读取并执行本 Schema |
| docs/07 | 关卡表、关卡包版本表结构 |
| docs/11 | 关卡编辑器产出 JSON、AI 生成管线过校验器 |
| docs/10 | tags 字段服务埋点与卡点分析 |

> 本文档为关卡数据唯一标准，字段增删必须走「版本化与向前兼容策略」（第 8 章）。
