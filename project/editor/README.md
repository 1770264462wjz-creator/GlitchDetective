# project/editor · 关卡编辑器（端口 1025）

《Bug哥：别相信你的第一眼》关卡编辑器骨架（M1 项目脚手架，13 开发路线图 2.2）。

## 启动

```bash
npm install
npm run dev        # http://localhost:1025
```

## 定位与边界

- 独立 Web 工具（Vue 3 + Vite + TypeScript），**仅产出并校验关卡 JSON**，不承担游戏渲染
- 试玩预览通过 iframe 内嵌 Cocos H5 构建产物（`docs/02-技术选型说明.md` 第 6 节），杜绝双实现
- 关卡 Schema 依据 `docs/04-关卡系统与Schema设计.md`；内容管线依据 `docs/11-关卡编辑器与内容管线.md`
- 版本锁定：Vue 3.4+ / Vite 5.x / Node 18+ / TS 5.x

## M2 及以后

- 表单化编辑（误导层/真相层/台词/难度）、Schema 校验器集成、iframe 试玩预览、提交发布流程