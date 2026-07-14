import { useI18n } from "../i18n";

type AiStudioCopy = {
  dateLocale: string;
  dashboard: string;
  studioTitle: string;
  promptLabel: string;
  promptPlaceholder: string;
  loadExample: string;
  examplePrompt: string;
  optimize: string;
  promptTooShort: string;
  optimizing: string;
  preview: string;
  before: string;
  after: string;
  generate: string;
  generateHtml: string;
  generating: string;
  history: string;
  noAnimations: string;
  usage: string;
  requestsThisHour: string;
  remaining: string;
  inFlight: string;
  tokens: string;
  tokenBudget: string;
  unlimited: string;
  estimatedCost: string;
  usageLog: string;
  time: string;
  operation: string;
  status: string;
  latency: string;
  cost: string;
  code: string;
  noUsage: string;
  clarity: string;
  specificity: string;
  motion: string;
  feasibility: string;
  renderingVideo: string;
  downloadVideo: string;
  retryVideo: string;
  renderVideo: string;
  video: string;
  attempt: (attempt: number, max: number) => string;
  requestFailed: string;
  unexpectedError: string;
  statusLabel: (status: string) => string;
  operationLabel: (operation: string) => string;
  settingsTitle: string;
  settingsUnavailable: string;
  databaseActive: string;
  environmentActive: string;
  apiKey: string;
  notConfigured: string;
  updated: string;
  providerCredentials: string;
  baseUrl: string;
  model: string;
  hourlyTokenLimit: string;
  maxCompletionTokens: string;
  tokenBudgetNote: string;
  keepKey: (hint: string) => string;
  enterKey: string;
  encryptedKeyNote: string;
  testConnection: string;
  testing: string;
  save: string;
  saving: string;
  saved: string;
  restoreEnvironment: string;
  restoringEnvironment: string;
  restoreEnvironmentConfirm: string;
  environmentRestored: string;
  connectionSuccessful: string;
  providerLatency: (latencyMs: number) => string;
  providerRequestFailed: string;
  tryAgain: string;
  errorMessage: (message: string | undefined, fallback: string) => string;
};

const en: AiStudioCopy = {
  dateLocale: "en",
  dashboard: "Dashboard",
  studioTitle: "AI Animation Studio",
  promptLabel: "Animation prompt",
  promptPlaceholder: "A kinetic typography sequence where...",
  loadExample: "Load example",
  examplePrompt:
    "Create a 1280x720 looping animation of a paper airplane crossing a bright sky. Use a clean blue and white palette, smooth easing, subtle cloud parallax, a six-second duration, and a stable reduced-motion frame.",
  optimize: "Optimize",
  promptTooShort: "Enter at least 20 characters to optimize.",
  optimizing: "Optimizing...",
  preview: "Preview",
  before: "Before",
  after: "After",
  generate: "Generate animation",
  generateHtml: "Start HTML animation",
  generating: "Generating...",
  history: "History",
  noAnimations: "No animations yet",
  usage: "Usage",
  requestsThisHour: "Requests this hour",
  remaining: "Remaining",
  inFlight: "In flight",
  tokens: "Tokens",
  tokenBudget: "Token budget",
  unlimited: "Unlimited",
  estimatedCost: "Estimated cost",
  usageLog: "AI usage log",
  time: "Time",
  operation: "Operation",
  status: "Status",
  latency: "Latency",
  cost: "Est. cost",
  code: "Code",
  noUsage: "No usage recorded",
  clarity: "Clarity",
  specificity: "Specificity",
  motion: "Motion",
  feasibility: "Feasibility",
  renderingVideo: "Rendering video",
  downloadVideo: "Download video",
  retryVideo: "Retry video",
  renderVideo: "Render video",
  video: "Video",
  attempt: (attempt, max) => `attempt ${attempt}/${max}`,
  requestFailed: "Request failed",
  unexpectedError: "Something went wrong",
  statusLabel: humanize,
  operationLabel: humanize,
  settingsTitle: "AI Service Configuration",
  settingsUnavailable: "Settings unavailable",
  databaseActive: "Database override active",
  environmentActive: "Environment fallback active",
  apiKey: "API key",
  notConfigured: "not configured",
  updated: "Updated",
  providerCredentials: "Provider credentials",
  baseUrl: "Base URL",
  model: "Model",
  hourlyTokenLimit: "Hourly token budget",
  maxCompletionTokens: "Max output tokens",
  tokenBudgetNote:
    "These limits control AI usage and prevent unexpectedly large requests.",
  keepKey: (hint) => `Leave blank to keep ${hint}`,
  enterKey: "Enter an API key",
  encryptedKeyNote:
    "Stored keys are encrypted and are never returned to this page.",
  testConnection: "Test connection",
  testing: "Testing...",
  save: "Save",
  saving: "Saving...",
  saved: "AI provider settings saved",
  restoreEnvironment: "Restore environment",
  restoringEnvironment: "Restoring...",
  restoreEnvironmentConfirm:
    "Delete the database override and restore the server environment configuration?",
  environmentRestored: "Environment configuration restored",
  connectionSuccessful: "Connection successful",
  providerLatency: (latencyMs) => `Provider responded in ${latencyMs} ms.`,
  providerRequestFailed: "AI provider request failed",
  tryAgain: "Please try again.",
  errorMessage: (message, fallback) => message ?? fallback,
};

const zhCn: AiStudioCopy = {
  dateLocale: "zh-CN",
  dashboard: "管理后台",
  studioTitle: "AI 动画工作室",
  promptLabel: "动画描述",
  promptPlaceholder: "描述画面、动作、配色、时长和循环方式...",
  loadExample: "加载示例",
  examplePrompt:
    "制作一个 1280x720 的循环动画：一架纸飞机从明亮天空中飞过。使用清爽的蓝白配色、平滑缓动、轻微云层视差，时长 6 秒，并为减少动态效果模式提供稳定画面。",
  optimize: "优化提示词",
  promptTooShort: "至少输入 20 个字符后才能优化提示词。",
  optimizing: "正在优化...",
  preview: "预览",
  before: "优化前",
  after: "优化后",
  generate: "生成动画",
  generateHtml: "开始生成 HTML 动画",
  generating: "正在生成...",
  history: "生成记录",
  noAnimations: "还没有生成动画",
  usage: "AI 用量",
  requestsThisHour: "本小时请求",
  remaining: "剩余额度",
  inFlight: "进行中",
  tokens: "Token 用量",
  tokenBudget: "Token 预算",
  unlimited: "不限制",
  estimatedCost: "预估成本",
  usageLog: "AI 调用日志",
  time: "时间",
  operation: "操作",
  status: "状态",
  latency: "耗时",
  cost: "预估成本",
  code: "错误码",
  noUsage: "暂无调用记录",
  clarity: "清晰度",
  specificity: "具体程度",
  motion: "动效描述",
  feasibility: "可实现性",
  renderingVideo: "正在渲染视频",
  downloadVideo: "下载视频",
  retryVideo: "重试视频渲染",
  renderVideo: "渲染视频",
  video: "视频",
  attempt: (attempt, max) => `第 ${attempt}/${max} 次尝试`,
  requestFailed: "请求失败",
  unexpectedError: "操作未完成，请稍后重试",
  statusLabel: (status) =>
    ({
      READY: "已就绪",
      SUCCEEDED: "成功",
      FAILED: "失败",
      BLOCKED: "已拦截",
      STARTED: "已开始",
      QUEUED: "排队中",
      PROCESSING: "处理中",
      NOT_REQUESTED: "未请求",
    })[status.toUpperCase()] ?? humanize(status),
  operationLabel: (operation) =>
    ({
      OPTIMIZE_PROMPT: "优化提示词",
      GENERATE_ANIMATION: "生成动画",
      RENDER_VIDEO: "渲染视频",
      AI_STUDIO: "AI 工作室",
      AI_PROVIDER_CONNECTION_TEST: "测试 AI 服务连接",
    })[operation.toUpperCase()] ?? humanize(operation),
  settingsTitle: "AI 服务配置",
  settingsUnavailable: "暂时无法读取配置",
  databaseActive: "正在使用网页保存的配置",
  environmentActive: "正在使用服务器环境变量配置",
  apiKey: "API 密钥",
  notConfigured: "尚未配置",
  updated: "更新时间",
  providerCredentials: "模型服务凭据",
  baseUrl: "接口地址（Base URL）",
  model: "模型名称",
  hourlyTokenLimit: "每小时 Token 预算",
  maxCompletionTokens: "单次最大输出 Token",
  tokenBudgetNote: "这些限制用于控制 AI 用量，避免单次请求消耗过多 Token。",
  keepKey: (hint) => `留空则继续使用 ${hint}`,
  enterKey: "请输入 API 密钥",
  encryptedKeyNote: "密钥会在服务端加密保存，页面不会读取或回显明文。",
  testConnection: "测试连接",
  testing: "正在测试...",
  save: "保存配置",
  saving: "正在保存...",
  saved: "AI 服务配置已保存",
  restoreEnvironment: "恢复环境配置",
  restoringEnvironment: "正在恢复...",
  restoreEnvironmentConfirm:
    "确定删除数据库中的覆盖配置，并恢复服务器环境变量配置吗？",
  environmentRestored: "已恢复服务器环境变量配置",
  connectionSuccessful: "连接成功",
  providerLatency: (latencyMs) => `模型服务在 ${latencyMs} 毫秒内返回。`,
  providerRequestFailed: "AI 服务请求失败",
  tryAgain: "请检查配置后重试。",
  errorMessage: (message, fallback) =>
    localizeChineseError(message) ?? fallback,
};

export function useAiStudioCopy(): AiStudioCopy {
  const { locale } = useI18n();
  return locale === "zh-CN" ? zhCn : en;
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}

function localizeChineseError(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const normalized = message.toLowerCase();

  if (normalized.includes("api key") && normalized.includes("not configured")) {
    return "尚未配置 AI 服务的 API 密钥。";
  }
  if (normalized.includes("enter the api key again")) {
    return "更换接口地址时，请重新输入 API 密钥。";
  }
  if (
    normalized.includes("public https") ||
    normalized.includes("public https url") ||
    normalized.includes("resolved to a public address")
  ) {
    return "接口地址必须是可公开访问的 HTTPS 地址。";
  }
  if (normalized.includes("once every 30 seconds")) {
    return "连接测试每 30 秒最多执行一次，请稍后重试。";
  }
  if (normalized.includes("rejected the configured credentials")) {
    return "AI 服务拒绝了当前密钥，请检查 API 密钥。";
  }
  if (normalized.includes("endpoint or model was not found")) {
    return "未找到接口或模型，请检查接口地址和模型名称。";
  }
  if (normalized.includes("provider rate limit")) {
    return "AI 服务触发了限流，请稍后重试。";
  }
  if (
    normalized.includes("encryption key") ||
    normalized.includes("ai_config_encryption_key")
  ) {
    return "服务器的 AI 配置加密密钥无效，请检查服务端配置。";
  }
  if (normalized.includes("quota") || normalized.includes("token budget")) {
    return "AI 额度不足或本小时用量已达上限。";
  }
  if (normalized.includes("concurrent") || normalized.includes("in flight")) {
    return "同时进行的 AI 操作过多，请稍后重试。";
  }

  return undefined;
}
