# 施工问题追踪系统

筒仓工程施工现场的问题管理系统，统一登记、跟踪和统计施工问题与图纸问题，支持中英双语界面。

## 功能

- **仪表盘**：问题总数、处理状态、逾期情况等 KPI 一览
- **施工问题**：登记、指派、整改、关闭，支持附件与自动编号
- **图纸库**：图纸登记与 Excel 批量导入
- **图纸问题**：针对图纸的设计疑问（DI）及回复跟踪
- **报表分析**：按状态、责任方、时间统计，并导出 Word 报告
- **用户管理**：账号与角色权限（管理员 / 工程师等）

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS · Supabase（数据库与实时同步）· docx / xlsx（导出导入）

## 运行

```bash
npm install
npm run dev     # 开发模式
npm run build   # 生成 dist/，可部署到 Netlify 等静态托管
```

数据库表结构见 `sql/` 目录。首次运行前复制 `.env.example` 为 `.env.local`，填入自己的 Supabase 项目 URL 和 anon key；部署到 Netlify 时在站点环境变量里设置同名的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
