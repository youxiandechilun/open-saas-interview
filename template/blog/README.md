# MotionPress Journal

MotionPress 的公开内容站。文章既可以来自仓库中的 Markdown，也可以在构建前从 MotionPress CMS 的公开 feed 同步。两种来源统一进入 Astro/Starlight 的 canonical、Open Graph、Twitter Card、JSON-LD、robots 与 sitemap 流水线。

## 环境变量

| 变量                    | 生产要求                 | 用途                                    |
| ----------------------- | ------------------------ | --------------------------------------- |
| `PUBLIC_SITE_URL`       | 必填，公网 HTTPS         | Journal 的 canonical 与 sitemap 源站    |
| `PUBLIC_APP_URL`        | 必填，公网 HTTPS         | 返回工作台及公开动画素材的源站          |
| `CMS_CONTENT_API_URL`   | 在线构建必填，公网 HTTPS | CMS 已发布文章 feed                     |
| `CMS_CONTENT_API_TOKEN` | 可选                     | 受保护 feed 的 Bearer token，不写入产物 |
| `CMS_CONTENT_OFFLINE`   | 仅离线快照构建           | 显式设为 `1` 时保留现有内容，不静默回退 |

缺少 CMS URL 时，普通构建会失败。只有显式设置 `CMS_CONTENT_OFFLINE=1` 才允许使用本地快照；`npm run content:publish` 永远要求在线 CMS，避免把旧内容误发布到生产环境。

## 常用命令

```powershell
npm install
npm test
npm run dev
```

本地开发默认运行在 `http://localhost:4321`。验证离线生产构建时，需要给出非本地的部署 URL：

```powershell
$env:PUBLIC_SITE_URL='https://journal.motionpress.example'
$env:PUBLIC_APP_URL='https://app.motionpress.example'
$env:CMS_CONTENT_OFFLINE='1'
npm run build
```

在线发布入口：

```powershell
$env:PUBLIC_SITE_URL='https://journal.motionpress.example'
$env:PUBLIC_APP_URL='https://app.motionpress.example'
$env:CMS_CONTENT_API_URL='https://api.motionpress.example/content-cms/published'
npm run content:publish
```

## 发布契约

公开 feed 只接收 `PUBLISHED` 文章，并校验 ID、slug、发布时间、作者、标签及 `/blog/<slug>/` canonical。同步过程先写入暂存目录，再原子替换 `src/content/docs/blog/cms-generated/`，校验或网络失败时不会留下半套内容。

构建顺序固定为：CMS 同步、SEO 质量门禁、SEO manifest、Astro 构建与产物断言。标题、摘要、H1、图片 alt、canonical 或内部路由存在阻断问题时，构建直接失败；H2 与内链不足会给出可操作建议。
