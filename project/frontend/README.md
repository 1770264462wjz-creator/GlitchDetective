# project/frontend · 游戏客户端（Cocos Creator 3.8，端口 1024）

《Bug哥：别相信你的第一眼》游戏客户端仓库。工程由 Cocos Creator IDE 生成（依据 `docs/00-项目概览与目录规范.md` 目录规则，Cocos 工程含 `.meta` 等编辑器托管文件，不宜纯手写）。

## 一、创建工程（Cocos Creator 3.8，R3）

1. 打开 Cocos Dashboard → 新建项目 → 选择 **3.8.x**（LTS）空项目（TypeScript 模板）
2. 项目路径选择本目录 `project/frontend/`
3. 按下方 `assets` 规划补齐目录与场景文件（引用 `docs/05-客户端架构设计.md` 第 1 章）
4. H5 预览端口固定 **1024**（Cocos 预览设置；修改端口须按 README 全局查重）

## 二、目录规划（assets，基准 docs/05）

```
assets/
├── scenes/                     # 场景（Boot/Login/MainMenu/LevelSelect/Level/Result…）
│   └── Level.scene             # 关卡运行时：解释器动态填充的通用单场景
├── scripts/
│   ├── core/                   # EventBus、ServiceLocator、工具
│   ├── ui/                     # UI 层界面控制器（不写业务规则）
│   ├── gameplay/               # 玩法层：GameFlow 状态机、LevelRuntime、HintService
│   ├── interpreter/            # 关卡解释器：LevelParser/SceneBuilder/Binder/Judge
│   ├── platform/               # 平台适配层：接口 + douyin/weixin/h5 实现
│   ├── data/                   # 数据层：PlayerDataService、LevelRepo、ServerApi
│   └── config/                 # 常量与枚举（GameState、GameEvents、AdPlacement…）
├── resources/
│   ├── prefabs/                # 通用 UI 预制体
│   ├── textures/               # 图集与贴图（按 UI/关卡物件/特效分包）
│   ├── audio/                  # sfx_* / bgm_*
│   ├── data/
│   │   ├── levels/             # 关卡 JSON 包（bundle: levels）
│   │   ├── dialogue/           # 台词表 dialogue_zh.json（Bug 哥台词库）
│   │   └── config/             # 游戏数值配置
│   └── skins/                  # 皮肤资源（bundle: skins）
├── bundles/                    # 分包声明（main/levels/skins/audio）
└── settings/                   # Cocos 项目设置
```

- Bundle 划分：main（启动加载）/ levels（按需）/ skins（按需）/ audio（首关预载）
- 分层、依赖规则、状态机与关卡解释器详见 `docs/05-客户端架构设计.md`
- 版本锁定：Cocos Creator **3.8.x**（禁跨大版本，docs/02 第 8 节）

## 三、关卡解释器（M2 核心，脚本结构）

```
scripts/interpreter/
├── LevelParser.ts     # JSON(content) → 运行时关卡模型（字段兜底 + 基础校验）
├── SceneBuilder.ts    # 按 scene.objects 构建节点树（sprite/label/particle）
├── Binder.ts          # 绑定交互：tap/doubleTap/longPress/drag/combine → action
└── Judge.ts           # 判定：result wrong/right、successMode(any/sequence/combo)、onSuccess 效果
```

行为契约（与后端 Schema 对齐，docs/04）：
- `interactive=true` 的物件才绑定交互；`interactive=false` 仅展示
- `truthLayer.actions[].result='right'` 且 `onSuccess.gotoResult=true` → 通关
- `misleadLayer.actions[].result='wrong'` → Bug 哥台词 + 错误计数
- `successMode`：any 任一 right 即过；sequence 按序；combo 需连续
- 提示 `hints[].level` 1/2/3 逐级解锁

## 四、前后端联调（R3 验收）

```bash
# 1. 启动后端（端口 2010）
cd project/backend && npm run start:dev

# 2. 登录拿 token（Mock 登录，任意 code）
POST http://localhost:2010/api/v1/auth/login
{"code":"dev_code_1","platform":"douyin"}

# 3. 客户端 LevelRepo 带 token 拉取关卡
GET http://localhost:2010/api/v1/levels        # 列表（仅已发布 status=3）
GET http://localhost:2010/api/v1/levels/1      # 详情（含 content）
```

## 五、验收清单

- [ ] Cocos 编辑器打开工程无报错，Boot 场景可运行
- [ ] `GET /levels` 返回 3 个已发布种子关卡
- [ ] 关卡详情含完整 `content`，解释器按契约渲染 objects/actions
- [ ] 试玩第 1 关：点击月亮 → 通关 → Bug 日志解锁提示出现
- [ ] 后端新发布关卡（编辑器操作）可被客户端拉到

## M2 交付目标

关卡解释器跑通 3 个试做关卡 + Bug哥形象与台词系统（`docs/13-开发路线图.md` M2）。
