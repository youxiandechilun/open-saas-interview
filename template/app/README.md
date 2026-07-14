# MotionPress App

Wasp 应用，提供统一工作台、AI 动画生成、视频渲染、CMS、用户角色、用量治理和发布任务。

## 启动

```bash
cp .env.client.example .env.client
cp .env.server.example .env.server
wasp start db
wasp db migrate-dev
wasp start
```

核心应用不要求支付、分析、S3 或外部发布 Hook 才能启动。后台“集成配置”和“系统就绪状态”会说明哪些可选能力尚未配置。

## 必要配置

- PostgreSQL：使用 `wasp start db`，或在 `.env.server` 设置 `DATABASE_URL`。
- 管理员：在 `ADMIN_EMAILS` 填入受信邮箱，完成验证后注册为 `ADMIN`。
- AI 密钥加密：如需从页面保存模型密钥，设置稳定的 `AI_CONFIG_ENCRYPTION_KEY`。
- 账户邮件：本地可使用 `EMAIL_PROVIDER=Dummy` 从服务端日志读取验证链接；生产必须使用 `EMAIL_PROVIDER=SendGrid`、`SENDGRID_API_KEY` 和已验证的 `EMAIL_FROM_ADDRESS`。

AI Provider 的 Base URL、模型、API Key、每小时 Token 预算和单次最大输出可由管理员在应用内维护。

## 命令

```powershell
npm test
npm run seo:generate
wasp compile
npm run db:migrations:verify
```

`db:migrations:verify` 会创建一个临时空数据库，回放仓库中的全部迁移后立即删除，用于确认新环境可复现。

`npm run seo:generate` 会根据 `REACT_APP_SITE_URL` 与 `REACT_APP_BLOG_URL` 生成公开站的 `robots.txt`、`sitemap.xml` 和 `llms.txt`。

`npm run build` 是严格的生产构建入口，会拒绝 localhost、私网、HTTP 或缺失的公开 URL：

```powershell
$env:REACT_APP_SITE_URL='https://app.motionpress.example'
$env:REACT_APP_BLOG_URL='https://journal.motionpress.example/blog/'
$env:ADMIN_EMAILS='admin@motionpress.example'
$env:AI_VIDEO_STORAGE_DIR='/var/lib/motionpress/ai-studio-videos'
$env:EMAIL_PROVIDER='SendGrid'
$env:SENDGRID_API_KEY='SG.replace-with-deployment-secret'
$env:EMAIL_FROM_ADDRESS='hello@motionpress.example'
npm run build
```
