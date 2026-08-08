# Cocos Creator 3.8 建工程操作单（R3 解除指引）

> 目标：在本机把 `project/frontend` 变成可运行的 Cocos 工程，挂载关卡解释器，连接后端 2010，跑通「第 1 关试玩」。
> 预计耗时：30~45 分钟。全程手工作业（Cocos 工程含 `.meta` 编辑器托管文件，无法纯手写）。

---

## 第 0 步：前置检查（5 分钟）

| 项 | 要求 | 检查方式 |
| --- | --- | --- |
| Cocos Creator | 已安装 **3.8.x**（LTS） | Cocos Dashboard 版本列表 |
| 后端 | 已能启动（2010） | `curl http://localhost:2010/api/v1/levels` 前先登录 |
| 本仓库 | 最新 main | `git pull` |

## 第 1 步：新建工程（10 分钟）

1. 打开 Cocos Dashboard → **项目** → **新建**
2. 选 **3.8.x（LTS）** 空项目模板（TypeScript）
3. **项目路径**：选择 `D:\Cocos\GlitchDetective\project\frontend`
   - 提示"目录非空"时选 **合并/使用现有目录**（保留已就位的解释器源码）
4. 项目名称填 `GlitchDetective`（或任意），点击创建
5. 等待 Cocos 导入完成（首次会生成 `.meta` 文件）

## 第 2 步：确认解释器源码被识别（5 分钟）

打开 Cocos 后，在 **资源管理器** 面板应能看到：

```
assets/scripts/
├── data/LevelRepo.ts
├── gameplay/LevelRuntime.ts
├── interpreter/LevelParser.ts / LevelTypes.ts / SceneBuilder.ts / Binder.ts / Judge.ts
└── ui/LevelScene.ts
```

- 若某文件显示红色/报错：检查 `import ... from 'cc'` 路径无误、文件在 `assets/` 下（Cocos 只扫描 assets 目录）
- 这些脚本 **不依赖场景即可编译**（LevelScene.ts 除外，它 import 'cc'，必须由 Cocos 编译）

## 第 3 步：搭建 Level 场景（10 分钟）

1. `assets/scenes/` 右键 → **创建 → 场景**，命名 `Level`（双击打开）
2. 场景根节点下创建：
   - **Canvas**（自动生成）+ 子节点 `ToastLabel`（Label 组件，用于提示文本，可先留空）
3. 在 **层级管理器** 选中 Canvas（或场景根）→ **添加组件 → 自定义脚本 → LevelScene**
4. 在 **属性检查器** 设置：
   - `BaseUrl`：`http://localhost:2010/api/v1`
   - `LevelId`：`1`
   - `Token`：留空（自动 Mock 登录）
5. `Ctrl+S` 保存场景

> 说明：LevelScene 会自动：Mock 登录 → 拉取第 1 关 → 用解释器构建物件（月亮/台灯为蓝色占位块）→ 绑定点击交互。
> 真实美术资源就位后，把 `buildNode` 里 sprite 替换为 `spriteKey` 对应图集即可（docs/05 资源约定）。

## 第 4 步：启动后端（可选项，先测试）

```bash
cd D:\Cocos\GlitchDetective\project\backend
npm run start:dev   # 2010
```

## 第 5 步：预览试玩（5 分钟）

1. 顶部预览设置：**浏览器**（H5），端口 **1024**
2. 点 **预览** 按钮
3. 预期行为：
   - Console 输出 `[LevelScene] 关卡「关掉的灯还亮着」装载完成`
   - 画面出现 4 个占位块（台灯/月亮/窗户/桌子，zIndex 分层）
   - 点击**月亮**（第 2 个占位块）→ 通关提示
   - 点击**台灯**（第 1 个）→ Bug 哥"不对哦"反馈

## 第 6 步：验收清单（逐项打勾）

- [ ] Cocos 打开工程无报错，解释器 7 个脚本全部编译通过
- [ ] 预览端口 1024 正常打开
- [ ] `[LevelScene] 关卡装载完成` 日志出现（后端连通）
- [ ] 点击月亮通关 ✅ / 点击台灯触发误导反馈 ✅
- [ ] 错误点击计数正确（wrongCount 累加）
- [ ] 编辑器新建并发布一关（admin API）后，改 `LevelId` 可拉到新关

## 常见问题（FAQ）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `Cannot find module 'cc'` | 脚本在 assets 外 | 确认脚本在 `assets/scripts/` 内 |
| 预览打开黑屏/无报错 | 场景没挂 LevelScene 或后端未启动 | 检查组件与后端日志 |
| `Fetch failed` | 后端未启动 / CORS | 先起后端；Cocos 预览默认 localhost 同源 |
| 点击无反应 | 物件 `interactive=false` 或没绑 TOUCH_END | 检查种子关卡 objects 定义 |

## 完成后

把验收结果（截图/日志）发我，我确认后把 R3 状态回写 `docs/14` 并标记解除。
