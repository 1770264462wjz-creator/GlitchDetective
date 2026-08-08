# project/backend · NestJS 后端（端口 2010）

《Bug哥：别相信你的第一眼》后端服务骨架（M1 项目脚手架，13 开发路线图 2.2）。

## 启动

```bash
npm install
cp .env.example .env   # 按需修改本地连接信息
npm run start:dev      # 开发模式（watch）
```

- 健康检查：`GET http://localhost:2010/health`
- 生产构建：`npm run build && npm run start:prod`

## 约束

- 版本锁定：NestJS 10.x / Node 18+ / TypeScript 5.x（docs/02-技术选型说明.md）
- 业务模块按 `docs/06-后端架构设计.md` 划分，占位说明见 `src/modules/README.md`
- 数据库连接仅限本地开发（`.env`）；生产环境一律环境变量注入，严禁硬编码
- 端口 2010 全局唯一，修改前须按 README 约定全局查重
