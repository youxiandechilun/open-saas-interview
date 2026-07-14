export const supportedLocales = ["zh-CN", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

const en = {
  "language.label": "Language",
  "language.chinese": "Chinese",
  "language.english": "English",
  "common.welcome": "Welcome, {name}",
  "nav.global": "Global navigation",
  "nav.brand": "MotionPress",
  "nav.logoAlt": "MotionPress",
  "nav.features": "Features",
  "nav.aiStudio": "AI Studio",
  "nav.blog": "Blog",
  "nav.login": "Log in",
  "nav.openMenu": "Open main menu",
  "nav.toggleDarkMode": "Toggle dark mode",
  "menu.accountSettings": "Account Settings",
  "menu.aiProvider": "AI provider",
  "menu.contentCms": "Articles & publishing",
  "menu.adminDashboard": "Workspace overview",
  "menu.logout": "Log Out",
  "account.pageTitle": "Account",
  "account.heading": "Account profile",
  "account.description": "Your identity and workspace access in MotionPress.",
  "account.email": "Email address",
  "account.username": "Username",
  "account.role": "Workspace role",
  "account.roleAdmin": "Administrator",
  "account.roleEditor": "Editor",
  "account.roleCreator": "Creator",
  "account.status": "Account status",
  "account.active": "Active",
  "account.disabled": "Disabled",
  "account.disabledHeading": "Account access suspended",
  "account.disabledDescription":
    "An administrator has suspended this account. Your content and audit history are retained, but workspace access is blocked.",
  "account.memberSince": "Member since",
  "announcement.support": "Support open-source software!",
  "announcement.star": "Star our repo on GitHub",
  "announcement.mobile": "Star the repo and support open source",
  "auth.email": "Email",
  "auth.emailPlaceholder": "you@example.com",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm password",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.login.title": "Log in",
  "auth.login.description": "Continue to AI Studio and your workspace.",
  "auth.login.submit": "Log in",
  "auth.login.loading": "Logging in...",
  "auth.login.noAccount": "Don't have an account?",
  "auth.login.goSignup": "Create one",
  "auth.login.forgot": "Forgot your password?",
  "auth.login.reset": "Reset it",
  "auth.signup.title": "Create account",
  "auth.signup.description":
    "Create an account to use AI Studio and your saved work.",
  "auth.signup.submit": "Sign up",
  "auth.signup.loading": "Creating account...",
  "auth.signup.verifyEmail":
    "Account created. Check your inbox to verify your email, then log in.",
  "auth.signup.hasAccount": "Already have an account?",
  "auth.signup.goLogin": "Log in",
  "auth.error.login": "The email or password is incorrect.",
  "auth.error.signup": "This account could not be created.",
  "auth.error.accountExists": "An account with this email already exists.",
  "auth.error.passwordMismatch": "The passwords do not match.",
  "auth.error.emailNotVerified":
    "Verify your email before logging in, then try again.",
  "auth.error.devAutoLogin":
    "This email may already have an account with a different password. Log in with the original password, reset it, or register with another email.",
  "auth.reset.request.title": "Reset password",
  "auth.reset.request.description":
    "Enter your email and we will send you a password reset link.",
  "auth.reset.password.title": "Choose a new password",
  "auth.reset.password.description":
    "Use the secure link from your email to update your password.",
  "auth.verify.title": "Verify your email",
  "auth.verify.description":
    "Confirm your email address to finish activating your account.",
  "auth.flow.returnLogin": "Return to login",
  "landing.seo.title": "MotionPress | AI animation and SEO publishing",
  "landing.seo.description":
    "Create HTML animation with AI, render it to video, and publish search-ready articles from one governed workspace.",
  "landing.hero.titlePrefix": "AI animation and content operations",
  "landing.hero.titleHighlight":
    "From one prompt to a published, searchable story.",
  "landing.hero.titleSuffix": "",
  "landing.hero.subtitle":
    "Optimize the prompt, generate safe HTML, preview and render video, then move the asset through editorial review and the SEO publishing gate.",
  "landing.hero.learnMore": "See the workflow",
  "landing.hero.getStarted": "Create a workspace",
  "landing.hero.imageAlt": "MotionPress animation and publishing workflow",
  "landing.hero.output.preview": "Preview and save",
  "landing.hero.output.video": "Queued rendering",
  "landing.hero.output.publish": "Quality-gated publishing",
  "landing.workflow.eyebrow": "One accountable workflow",
  "landing.workflow.title": "The core path is visible from start to finish",
  "landing.workflow.description":
    "Each step produces a saved record with an owner, status, usage log, and retry path. No disconnected demos and no mystery buttons.",
  "landing.workflow.prompt": "Describe the animation",
  "landing.workflow.optimize": "Rewrite and score",
  "landing.workflow.generate": "Generate safe HTML",
  "landing.workflow.render": "Render MP4 or WebM",
  "landing.workflow.check": "Run the SEO gate",
  "landing.workflow.publish": "Publish and sync",
  "landing.examples.heading": "MotionPress in action",
  "landing.examples.one.name": "Prompt optimization",
  "landing.examples.two.name": "HTML animation",
  "landing.examples.three.name": "Safe preview",
  "landing.examples.four.name": "Video rendering",
  "landing.examples.five.name": "Editorial review",
  "landing.examples.six.name": "SEO quality gate",
  "landing.examples.seven.name": "Publication delivery",
  "landing.examples.description":
    "One traceable workflow from creative input to public content.",
  "landing.highlight.title": "AI-ready from the first prompt",
  "landing.highlight.description":
    "Connect model-powered workflows without rebuilding authentication, persistence, usage controls, and delivery infrastructure.",
  "landing.highlight.imageAlt": "AI-ready product workflow",
  "landing.features.title": "The system behind the workflow",
  "landing.features.description":
    "Operational controls for content teams, not a collection of starter demos.",
  "landing.features.auth.name": "Prompt optimizer",
  "landing.features.auth.description":
    "Rewrite prompts, score their quality, and compare before generation.",
  "landing.features.security.name": "HTML animation generation",
  "landing.features.security.description":
    "Generate sanitized HTML that can be previewed and saved safely.",
  "landing.features.stack.name": "Reusable asset library",
  "landing.features.stack.description":
    "Keep prompts, HTML, previews, and outputs attached to one record.",
  "landing.features.payments.name": "Video rendering",
  "landing.features.payments.description":
    "Queue MP4 or WebM jobs with status, retry, and secure downloads.",
  "landing.features.admin.name": "Articles and publishing",
  "landing.features.admin.description":
    "Manage posts, authors, tags, slugs, assets, and publishing states.",
  "landing.features.analytics.name": "Task center",
  "landing.features.analytics.description":
    "See rendering and publishing jobs, failures, retries, and outcomes.",
  "landing.features.email.name": "Roles and permissions",
  "landing.features.email.description":
    "Give admins, editors, and creators clear, enforceable boundaries.",
  "landing.features.ai.name": "Usage and cost controls",
  "landing.features.ai.description":
    "Enforce request, concurrency, and token limits with auditable logs.",
  "landing.features.seo.name": "SEO quality gate",
  "landing.features.seo.description":
    "Check metadata, headings, canonical URLs, images, and internal links.",
  "landing.cta.title": "Start with the core workflow, not another demo",
  "landing.cta.description":
    "Create an account, configure one AI provider, and take a real animation through generation, rendering, and publishing.",
  "landing.cta.action": "Open MotionPress",
  "landing.testimonials.title": "What builders say",
  "landing.testimonials.avatarAlt": "{name}'s avatar",
  "landing.testimonials.showLess": "Show less",
  "landing.testimonials.showMore": "Show {count} more",
  "landing.testimonials.mascot.role": "Content operations lead",
  "landing.testimonials.mascot.quote":
    "The repetitive setup is handled, so teams can focus on the product.",
  "landing.testimonials.founder.role": "Founder at a SaaS startup",
  "landing.testimonials.founder.quote":
    "We moved from an idea to a working customer flow much faster.",
  "landing.testimonials.customer.role": "Product builder",
  "landing.testimonials.customer.quote":
    "The defaults are useful, but the architecture still leaves room to grow.",
  "landing.faq.title": "Frequently asked questions",
  "landing.faq.build.question": "What is MotionPress designed for?",
  "landing.faq.build.answer":
    "Use it to turn AI-assisted animation assets into governed, search-ready articles with observable rendering and publication tasks.",
  "landing.faq.learnMore": "Learn more",
  "landing.footer.landmark": "Footer",
  "landing.footer.product": "Product",
  "landing.footer.company": "Company",
  "landing.footer.documentation": "AI Studio",
  "landing.footer.blog": "Blog",
  "landing.footer.about": "Features",
  "landing.footer.privacy": "Sign in",
  "landing.footer.terms": "Account",
  "landing.footer.description":
    "AI animation, video rendering, and SEO publishing in one operational workspace.",
} as const;

export type MessageKey = keyof typeof en;
export type MessageVariables = Record<string, string | number>;

const zhCn: Record<MessageKey, string> = {
  "language.label": "语言",
  "language.chinese": "中文",
  "language.english": "英文",
  "common.welcome": "欢迎，{name}",
  "nav.global": "全局导航",
  "nav.brand": "MotionPress",
  "nav.logoAlt": "MotionPress",
  "nav.features": "功能",
  "nav.aiStudio": "AI 工作室",
  "nav.blog": "博客",
  "nav.login": "登录",
  "nav.openMenu": "打开主菜单",
  "nav.toggleDarkMode": "切换深色模式",
  "menu.accountSettings": "账户设置",
  "menu.aiProvider": "AI 服务配置",
  "menu.contentCms": "文章与发布",
  "menu.adminDashboard": "工作台总览",
  "menu.logout": "退出登录",
  "account.pageTitle": "账户",
  "account.heading": "账户资料",
  "account.description": "查看你在 MotionPress 中的身份与工作台权限。",
  "account.email": "邮箱地址",
  "account.username": "用户名",
  "account.role": "工作台角色",
  "account.roleAdmin": "管理员",
  "account.roleEditor": "编辑",
  "account.roleCreator": "创作者",
  "account.status": "账户状态",
  "account.active": "正常",
  "account.disabled": "已停用",
  "account.disabledHeading": "账号访问已暂停",
  "account.disabledDescription":
    "管理员已停用此账号。内容和审计记录仍会保留，但当前无法进入工作台。",
  "account.memberSince": "加入时间",
  "announcement.support": "支持开源软件！",
  "announcement.star": "在 GitHub 为项目点亮 Star",
  "announcement.mobile": "点亮 Star，支持开源项目",
  "auth.email": "邮箱",
  "auth.emailPlaceholder": "请输入邮箱地址",
  "auth.password": "密码",
  "auth.confirmPassword": "确认密码",
  "auth.showPassword": "显示密码",
  "auth.hidePassword": "隐藏密码",
  "auth.login.title": "登录",
  "auth.login.description": "登录后进入 AI 工作室和你的工作区。",
  "auth.login.submit": "登录",
  "auth.login.loading": "正在登录...",
  "auth.login.noAccount": "还没有账号？",
  "auth.login.goSignup": "立即注册",
  "auth.login.forgot": "忘记密码？",
  "auth.login.reset": "重置密码",
  "auth.signup.title": "创建账号",
  "auth.signup.description": "注册后即可使用 AI 工作室并保存作品。",
  "auth.signup.submit": "注册",
  "auth.signup.loading": "正在创建账号...",
  "auth.signup.verifyEmail": "账号已创建，请前往邮箱完成验证后再登录。",
  "auth.signup.hasAccount": "已经有账号？",
  "auth.signup.goLogin": "去登录",
  "auth.error.login": "邮箱或密码不正确。",
  "auth.error.signup": "暂时无法创建这个账号。",
  "auth.error.accountExists": "这个邮箱已经注册过账号。",
  "auth.error.passwordMismatch": "两次输入的密码不一致。",
  "auth.error.emailNotVerified": "请先完成邮箱验证，然后再尝试登录。",
  "auth.error.devAutoLogin":
    "这个邮箱可能已经注册过，当前密码与原账号不一致。请使用原密码登录、重置密码，或换一个邮箱注册。",
  "auth.reset.request.title": "重置密码",
  "auth.reset.request.description": "输入邮箱地址，我们会发送密码重置链接。",
  "auth.reset.password.title": "设置新密码",
  "auth.reset.password.description": "通过邮件中的安全链接更新你的密码。",
  "auth.verify.title": "验证邮箱",
  "auth.verify.description": "确认邮箱地址以完成账号激活。",
  "auth.flow.returnLogin": "返回登录",
  "landing.seo.title": "MotionPress | AI 动画与 SEO 内容发布",
  "landing.seo.description":
    "在一个可治理的工作台中生成 AI HTML 动画、渲染视频，并发布经过 SEO 检查的文章。",
  "landing.hero.titlePrefix": "AI 动画与内容运营工作台",
  "landing.hero.titleHighlight": "从一个 Prompt，到一篇可搜索、可传播的内容。",
  "landing.hero.titleSuffix": "",
  "landing.hero.subtitle":
    "先优化 Prompt，再生成安全 HTML、预览并渲染视频，最后进入文章审核与 SEO 发布门禁。",
  "landing.hero.learnMore": "查看业务流程",
  "landing.hero.getStarted": "创建工作区",
  "landing.hero.imageAlt": "MotionPress 动画与发布工作流",
  "landing.hero.output.preview": "预览并保存",
  "landing.hero.output.video": "后台任务渲染",
  "landing.hero.output.publish": "通过质量门禁后发布",
  "landing.workflow.eyebrow": "一条可追踪的核心链路",
  "landing.workflow.title": "从开始到完成，每一步都看得见",
  "landing.workflow.description":
    "每一步都有保存记录、负责人、任务状态、用量日志和失败重试，不再堆砌互不相关的演示入口。",
  "landing.workflow.prompt": "描述动画需求",
  "landing.workflow.optimize": "优化并评分",
  "landing.workflow.generate": "生成安全 HTML",
  "landing.workflow.render": "渲染 MP4 或 WebM",
  "landing.workflow.check": "执行 SEO 检查",
  "landing.workflow.publish": "发布并同步博客",
  "landing.examples.heading": "MotionPress 实际工作流",
  "landing.examples.one.name": "Prompt 优化",
  "landing.examples.two.name": "HTML 动画",
  "landing.examples.three.name": "安全预览",
  "landing.examples.four.name": "视频渲染",
  "landing.examples.five.name": "编辑审核",
  "landing.examples.six.name": "SEO 质量门禁",
  "landing.examples.seven.name": "发布交付",
  "landing.examples.description": "从创意输入到公开内容的一条可追踪链路。",
  "landing.highlight.title": "从第一个 Prompt 开始就为 AI 就绪",
  "landing.highlight.description":
    "无需重复搭建认证、持久化、用量控制和交付基础设施，直接连接模型驱动的产品工作流。",
  "landing.highlight.imageAlt": "AI 就绪的产品工作流",
  "landing.features.title": "支撑核心流程的系统能力",
  "landing.features.description":
    "这是面向内容团队的运营系统，不是一组 Starter Demo。",
  "landing.features.auth.name": "Prompt 优化器",
  "landing.features.auth.description":
    "生成前自动改写和评分，对比优化前后的差异。",
  "landing.features.security.name": "HTML 动画生成",
  "landing.features.security.description":
    "生成经过清理、可安全预览并能持久保存的 HTML 动画。",
  "landing.features.stack.name": "可复用素材库",
  "landing.features.stack.description":
    "把 Prompt、HTML、预览和输出文件归档到同一条记录。",
  "landing.features.payments.name": "视频渲染",
  "landing.features.payments.description":
    "通过后台任务输出 MP4 或 WebM，支持状态、重试与安全下载。",
  "landing.features.admin.name": "文章与发布",
  "landing.features.admin.description":
    "集中管理文章、作者、标签、slug、素材和发布状态。",
  "landing.features.analytics.name": "任务中心",
  "landing.features.analytics.description":
    "统一查看渲染与发布任务、失败原因、重试次数和结果。",
  "landing.features.email.name": "角色与权限",
  "landing.features.email.description":
    "明确区分管理员、编辑和创作者，并在服务端强制执行。",
  "landing.features.ai.name": "用量与成本控制",
  "landing.features.ai.description":
    "限制请求、并发与 Token 用量，让每一次模型调用都可审计。",
  "landing.features.seo.name": "SEO 质量门禁",
  "landing.features.seo.description":
    "检查元数据、标题层级、canonical、图片 alt 与内链。",
  "landing.cta.title": "从核心链路开始，不再从 Demo 开始",
  "landing.cta.description":
    "创建账号、配置一个 AI 服务商，然后让一条真实动画走完生成、渲染和发布流程。",
  "landing.cta.action": "进入 MotionPress",
  "landing.testimonials.title": "构建者怎么说",
  "landing.testimonials.avatarAlt": "{name} 的头像",
  "landing.testimonials.showLess": "收起",
  "landing.testimonials.showMore": "再看 {count} 条",
  "landing.testimonials.mascot.role": "内容运营负责人",
  "landing.testimonials.mascot.quote":
    "重复的基础工作已经完成，团队可以把精力放回产品。",
  "landing.testimonials.founder.role": "SaaS 创业者",
  "landing.testimonials.founder.quote":
    "我们从想法走到完整客户流程的速度明显更快了。",
  "landing.testimonials.customer.role": "产品构建者",
  "landing.testimonials.customer.quote":
    "默认能力足够实用，架构也为后续增长保留了空间。",
  "landing.faq.title": "常见问题",
  "landing.faq.build.question": "MotionPress 适合解决什么问题？",
  "landing.faq.build.answer":
    "它把 AI 动画素材转成经过治理、可搜索的文章，并让渲染与发布任务始终可观察、可重试。",
  "landing.faq.learnMore": "了解更多",
  "landing.footer.landmark": "页脚",
  "landing.footer.product": "产品",
  "landing.footer.company": "公司",
  "landing.footer.documentation": "AI 工作室",
  "landing.footer.blog": "博客",
  "landing.footer.about": "核心能力",
  "landing.footer.privacy": "登录",
  "landing.footer.terms": "账户",
  "landing.footer.description":
    "在一个运营工作台中完成 AI 动画、视频渲染与 SEO 内容发布。",
};

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  "zh-CN": zhCn,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function getMessage(
  locale: Locale,
  key: MessageKey,
  variables?: MessageVariables,
): string {
  const message = messages[locale][key];
  if (!variables) return message;

  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = variables[name];
    return value === undefined ? placeholder : String(value);
  });
}
