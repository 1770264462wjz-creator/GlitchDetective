# project/frontend · 游戏客户端（Cocos Creator 3.x，端口 1024）

《Bug哥：别相信你的第一眼》游戏客户端仓库。M1 阶段落地方式：**约定 + 目录骨架，工程由 Cocos Creator IDE 生成**（依据 `docs/00-项目概览与目录规范.md` 目录规则，Cocos 工程含 `.meta` 等编辑器托管文件，不宜纯手写）。

## 创建步骤（Cocos Creator 3.8.x）

1. 打开 Cocos Dashboard → 新建项目 → 选择 **3.8.x**（LTS）空项目（TypeScript 模板）
2. 项目路径选择本目录 `project/frontend/`
3. 按下方 `assets` 规划补齐目录与场景文件（引用 `docs/05-客户端架构设计.md` 第 1 章）
4. H5 预览端口固定 **1024**（Cocos 预览设置；修改端口须按 README 全局查重）

## assets 规划（基准：docs/05）

```
assets/
├── scenes/                     # 场景（Boot/Login/MainMenu/LevelSelect/Level/Result…）
│   └── Level.scene             # 关卡运行时：解释器动态填充的通用单场景
├── scripts/
│   ├── core/                   # EventBus、ServiceLocator、工具
│   ├── ui/                     # UI 层界面控制器（不写业务规则）
│   ├── gameplay/               # 玩法层：GameFlow 状态机、LevelRuntime、HintService
│   ├── interpreter/            # 关卡解释器：LevelParser/SceneBuilder/Binder/Judge
│   ├── platform/               # 平台适配层：接口 + douyin/wechat/h5 实现
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

## M2 交付目标

关卡解释器跑通 3 个试做关卡 + Bug哥形象与台词系统（`docs/13-开发路线图.md` M2）。