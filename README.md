# MotionPress

MotionPress 是一个面向内容运营团队的 AI 动画与 SEO 发布工作台。它把 Prompt 优化、安全 HTML 动画生成、视频渲染、文章管理、SEO 质量门禁和发布任务连接成一条可观察的业务链路。

实施边界和验收标准见 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)。产品与视觉约束见 `template/app/PRODUCT.md` 和 `template/app/DESIGN.md`。

## 核心流程

```text
就绪检查
  -> Prompt 优化与评分
  -> HTML 动画生成和沙箱预览
  -> MP4 / WebM 后台渲染
  -> 文章、作者、标签和素材管理
  -> SEO 质量门禁
  -> 发布、博客同步、metadata 和 sitemap 更新
  -> 状态、失败重试和 AI 用量审计
```

## 目录

- `template/app`：Wasp、React、Prisma、PostgreSQL 应用与后台任务。
- `template/blog`：Astro/Starlight 公开内容站、CMS 同步和 SEO 构建流水线。
- `template/e2e-tests`：Playwright 核心业务流程测试。

## 本地启动

Wasp 在 Windows 上通过 WSL 运行。首次启动前准备 Node.js、Wasp CLI 和 PostgreSQL。

### 1. 应用

在 `template/app` 中：

```bash
cp .env.client.example .env.client
cp .env.server.example .env.server
wasp start db
wasp db migrate-dev
wasp start
```

数据库就绪后即可启动核心服务；首次使用后台前必须在 `ADMIN_EMAILS` 配置至少一个受信邮箱，并用该邮箱完成注册。AI、发布 Hook、生产邮件和第三方分析是可选运行时集成，缺少配置时会显示明确的就绪状态。Starter 支付、通用文件上传和 AI 调度演示已经退出运行时，不再暴露接口。

如需在后台保存 AI 服务商密钥，先在 `.env.server` 设置稳定的 `AI_CONFIG_ENCRYPTION_KEY`。生成命令写在 `.env.server.example` 中。

视频文件在开发环境默认保存到用户目录；生产必须把 `AI_VIDEO_STORAGE_DIR` 设置为绝对路径并挂载持久卷，不能写入 `.wasp/out` 或临时容器目录。

### 2. 博客

在另一个终端进入 `template/blog`：

```powershell
npm install
$env:CMS_CONTENT_OFFLINE='1'
npm run dev
```

在线同步时设置 `CMS_CONTENT_API_URL`，生产发布还必须提供真实的 `PUBLIC_SITE_URL`。

## 本地地址

- 应用：http://localhost:3000
- API：http://localhost:3001
- Blog：http://localhost:4321
- PostgreSQL：localhost:5432

## 验证

```powershell
cd template/app
npm test
npm run seo:generate
npm run db:migrations:verify

cd ../blog
npm test
$env:PUBLIC_SITE_URL='https://journal.motionpress.example'
$env:PUBLIC_APP_URL='https://app.motionpress.example'
$env:CMS_CONTENT_OFFLINE='1'
npm run build
```

`npm run build` 按生产发布处理，因此会拒绝缺失、localhost、私网或非 HTTPS 的公开 URL，并要求 `ADMIN_EMAILS`、SendGrid 与已验证发件地址。应用本地代码检查使用 `wasp compile`。

完整交付还需要在运行中的本地栈上执行 `template/e2e-tests`，并检查桌面和移动端截图。

## 技术基础

项目使用 Wasp、React、TypeScript、Prisma、PostgreSQL、PgBoss、Astro、Starlight 与 Playwright，并保留对 OpenAI-compatible 模型服务的运行时配置能力。

本项目最初基于 [Open SaaS](https://opensaas.sh) 与 [Wasp](https://wasp.sh) 构建。
