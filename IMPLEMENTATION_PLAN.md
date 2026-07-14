# MotionPress 重构与交付方案

## 1. 改造目标

把当前由 Open SaaS Starter、演示页面和若干半成品功能拼成的系统，收敛为一个明确的产品：**AI 动画生成与 SEO 内容发布工作台**。

最终只围绕一条可观察、可重试、可审计的业务主链路建设：

```text
系统就绪检查
  -> 编写 Prompt
  -> Prompt 优化与评分
  -> 人工确认
  -> 生成安全 HTML 动画
  -> 预览并保存素材
  -> 后台渲染 MP4 / WebM
  -> 创建文章并关联素材
  -> SEO 质量门禁
  -> 发布并创建同步任务
  -> 博客同步、构建、metadata 与 sitemap 更新
  -> 查看公开链接、成本、失败原因与重试结果
```

## 2. 产品边界

### 保留并打通

- 邮箱登录、账户管理与服务端权限校验。
- AI 服务商配置、连接测试和密钥加密存储。
- Prompt 优化、评分、前后对比与明确确认。
- 安全 HTML 动画生成、沙箱预览、历史记录和用量日志。
- MP4/WebM 后台渲染、任务状态、失败重试与授权下载。
- Post、Author、Tag、slug 和发布状态的 CMS 管理。
- canonical、Open Graph、Twitter Card、robots、sitemap 和结构化数据。
- SEO 标题、摘要、H1/H2、canonical、图片 alt、内链检查。
- 请求、并发、Token 配额、幂等控制和调用审计。

### 从主产品移除

- AI 日程调度演示。
- 写死数据的日历。
- 空消息页、UI 组件展示页和不持久化的模板设置页。
- 未接入内容素材链路的通用 S3 上传页。
- 依赖假数据或外部 Stripe 配置的收入仪表盘。
- 未形成真实商业能力的 Starter Pricing 页面。
- Open SaaS、Your SaaS、示例文章和占位 SEO 信息。

底层兼容代码可以暂时保留，但不能继续出现在主导航或绕过新的权限、额度与日志入口。

## 3. 信息架构

```text
公开站
  首页
  Journal / Blog

工作台
  总览
  动画工作室
  文章与发布
  任务中心

系统管理
  用户与角色
  用量与成本
  集成配置
```

角色分为：

- `ADMIN`：系统配置、用户权限、全部内容、全局用量与任务。
- `EDITOR`：文章、作者、标签、SEO 检查和发布流程。
- `CREATOR`：自己的动画生成、预览、渲染和历史记录。

## 4. 分阶段实施

### A. 基础配置与可启动性

- 非核心 Starter 集成不得阻塞服务启动。
- AI 服务可在后台启动后配置，不再强制依赖某一家模型环境变量。
- 增加数据库、AI 服务、渲染运行时、存储和发布集成的就绪状态。
- 提交并验证 Prisma 迁移，保证新环境可以复现。
- 修正产品名称、站点 URL、邮件、robots、sitemap 和社交元数据。

**验收标准：** 只配置数据库即可启动；缺少可选集成时显示明确的未配置状态和处理入口，而不是直接崩溃。

### B. AI 治理与视频渲染

- 原子执行请求次数、并发、每小时 Token 和单次最大输出限制。
- 真实传递后台配置的最大输出 Token，并按实际用量结算预留。
- 所有保留的 AI 操作统一走服务商、幂等、额度和日志网关。
- 旧 AI Scheduler 调用明确停用，不能成为绕过入口。
- 视频任务保留错误、尝试次数、重试和授权下载记录。

**验收标准：** 并发和重复请求不能绕过额度；后台修改 Token 限制后会影响真实模型调用。

### C. 统一工作台与真实仪表盘

- 所有登录后页面使用同一套工作台外壳、侧栏和移动导航。
- 总览展示动画、渲染、发布、SEO、失败任务和 AI 用量的真实数据库指标。
- 动画工作室按“输入 -> 优化 -> 生成 -> 预览 -> 渲染”组织，而不是平铺按钮。
- 删除与产品无关的菜单、公告和死链。

**验收标准：** 每个主导航入口都对应真实任务；总览无需 Stripe 或第三方分析配置也能工作。

### D. 用户、角色与权限

- 新增 `ADMIN`、`EDITOR`、`CREATOR` 与禁用状态。
- 用户列表支持搜索、角色筛选、状态筛选和明确的更新反馈。
- 服务端禁止自我降权、禁用当前用户和移除最后一个有效管理员。
- CMS、AI 配置、全局数据和导航均执行同一权限规则。

**验收标准：** 不能通过直接调用接口绕过权限；桌面表格与移动布局均可用且支持键盘操作。

### E. CMS、SEO 与发布生命周期

- Post、Author、Tag CRUD 与 slug 唯一性完整可用。
- 编辑器显示 canonical、SEO 分数、具体问题和修复建议。
- H2 与内链加入 SEO 质量门禁。
- 发布事件区分待处理、处理中、成功、失败和未配置，不再把“收到请求”当成发布成功。
- 博客构建先同步公开 CMS 数据，再执行 SEO 检查、metadata 和 sitemap 生成。

**验收标准：** 编辑可以完成草稿、检查、发布、观察同步结果、打开公开链接和重试失败任务。

### F. 品牌、响应式与验证

- 全站统一为 MotionPress，执行 `template/app/PRODUCT.md` 与 `template/app/DESIGN.md`。
- 使用克制的蓝、橙、黑白灰配色；取消渐变、装饰光斑、卡片套卡片和悬浮缩放。
- 公开首页直接展示真实业务流程，博客替换 Starter 内容。
- 补齐空状态、加载、错误、禁用、无权限、长文本和窄屏状态。
- 验证中英文、桌面与移动端、焦点、减少动画、文本溢出和对比度。

**验收标准：** 构建、单元测试和核心 E2E 通过；桌面与移动截图没有遮挡、截断、空白画布和不可达操作。

## 5. 验证方式

应用目录 `template/app`：

```powershell
npm test
npx tsc -p tsconfig.src.json --noEmit --pretty false
npx prettier --check "src/**/*.{ts,tsx,css}" "*.{ts,json,md}"
# 在已安装 Wasp CLI 的环境执行
wasp compile
```

博客目录 `template/blog`：

```powershell
npm test
$env:PUBLIC_SITE_URL='https://journal.motionpress.example'
$env:PUBLIC_APP_URL='https://app.motionpress.example'
$env:CMS_CONTENT_OFFLINE='1'
npm run build
```

运行时验证：

- PostgreSQL、Web、API、Blog 分别检查端口 `5432`、`3000`、`3001`、`4321`。
- 使用真实管理员账号验证 AI 配置、用户角色、CMS 和任务状态。
- 使用 Playwright 覆盖桌面与移动端的登录、动画、发布和管理链路。
- 检查公开页 canonical、Open Graph、Twitter Card、robots、sitemap 和 JSON-LD。

## 6. 完成定义

- 主产品页面不再出现 Starter 占位内容。
- 主导航没有演示页、假页面、死入口或无业务解释的功能。
- 核心配置可在产品内完成，并有可操作的就绪反馈。
- AI 生成、视频渲染、CMS 发布、SEO 检查、额度治理和权限控制均可观察且有测试。
- 新数据库可从仓库中的迁移完整建立。
- 关键业务流程在桌面和移动端均能完成。

## 7. 实施结果（2026-07-14）

本方案的 A-F 阶段已在本地代码和运行环境完成。主产品现在统一为 MotionPress，Starter 支付、AI 调度演示和通用文件上传已退出构建；工作台仅保留真实业务入口。

已完成的核心链路：

- AI 服务配置、连接审计、Prompt 改写与评分、安全 HTML 生成、沙箱预览、素材记录。
- 请求数、并发、Token 预算、最大输出、成本日志和幂等控制；传输失败会复用逻辑请求 Key，双击不能重复扣费。
- MP4/WebM 后台渲染、租约、失败回收、重试和授权下载；数据库成功状态会再次校验真实文件、MIME、扩展名与持久存储根。
- Post、Author、Tag、slug、草稿/发布状态、角色权限、SEO 质量门禁、发布任务和公开 CMS Feed。
- CMS 文章关联已完成视频可发布性校验；Astro 同步后生成 canonical、Open Graph、Twitter Card、robots、sitemap、JSON-LD 和 SEO manifest。
- `ADMIN`、`EDITOR`、`CREATOR` 与禁用状态已经同时落到服务端权限和前端导航；管理员编辑角色/禁用的真实浏览器流程已验证。
- 统一工作台、真实运营总览、任务中心、服务就绪状态、中英文和桌面/移动布局已经落地。

最终验证结果：

- App 单元/契约测试：`162 passed`，默认跳过的 2 个真实渲染测试已在 WSL 中单独启用并通过（MP4、WebM）。
- Blog 测试：`22 passed`；在线 CMS 同步后构建 `15` 个页面，SEO 构建断言全部通过。
- Playwright：桌面与移动端 `19 passed`，覆盖登录、语言、用户角色/禁用、CMS 草稿、SEO、公开 Feed、导航与响应式。
- Prisma：在临时全新 PostgreSQL 数据库中从零应用 `5` 个迁移并自动清理，验证通过。
- Wasp：`wasp compile` 与严格生产构建通过；TypeScript 通过。
- 视觉验收：最终截图位于 `artifacts/final-qa/`，页面无运行时错误或横向溢出。

本地服务：

- App：`http://localhost:3000`
- API：`http://localhost:3001`
- Blog：`http://localhost:4321`
- PostgreSQL：`localhost:5432`

外部部署仍需提供真实值：公网 App/Blog/CMS URL、至少一个 `ADMIN_EMAILS`、SendGrid 密钥与已验证发件地址、绝对持久卷 `AI_VIDEO_STORAGE_DIR`，以及需要自动触发博客部署时的 Webhook URL/Token。缺少这些值时系统会明确显示“需要配置”，不会伪装成已经就绪。
