import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/messages";
import type {
  CmsAnimationSummary,
  CmsPostStatusValue,
  CmsSeoIssueCode,
} from "./types";

const cmsEnglish = {
  dashboard: "Dashboard",
  pageTitle: "Content CMS",
  posts: "Posts",
  authors: "Authors",
  tags: "Tags",
  loadDataError: "Could not load CMS data.",
  searchPosts: "Search posts",
  searchPostsPlaceholder: "Search title, slug or excerpt",
  status: "Status",
  author: "Author",
  tag: "Tag",
  statusFilter: "Status filter",
  authorFilter: "Author filter",
  tagFilter: "Tag filter",
  allStatuses: "All statuses",
  allAuthors: "All authors",
  allTags: "All tags",
  newPost: "New post",
  authorRequired: "Add an author before creating a post.",
  postCountOne: "{count} post",
  postCountMany: "{count} posts",
  loadPostsError: "Could not load posts. Please try again.",
  editPost: "Edit post",
  deletePost: "Delete post",
  deletePostConfirm: 'Delete "{title}"? This cannot be undone.',
  postDeleted: "Post deleted",
  noMatchingPosts: "No posts match these filters.",
  previousPage: "Previous page",
  nextPage: "Next page",
  pagination: "Page {page} of {totalPages}",
  postEditor: "Post editor",
  selectPost: "Select a post to edit or create a new one.",
  postUpdated: "Post updated",
  postCreated: "Post created",
  cancel: "Cancel",
  save: "Save",
  saveDraft: "Save draft",
  publish: "Publish",
  updatePublished: "Update published post",
  unpublishToDraft: "Unpublish to draft",
  unpublishConfirm:
    "This removes the public post until you publish it again. Continue?",
  archivePost: "Archive post",
  title: "Title",
  titleRecommendation: "{count}/65 recommended",
  slug: "Slug",
  selectAuthor: "Select author",
  searchExcerpt: "Search excerpt",
  excerptRecommendation: "{count}/160 recommended",
  noTagsYet: "No tags yet",
  animationAttachment: "Animation asset",
  noAnimation: "No animation",
  animationAttachmentHelp:
    "Browse ready animations from active teammates. Only completed MP4 or WebM videos can be attached for publishing.",
  selectedAnimation: "Selected animation",
  animationOwner: "Created by {owner}",
  animationOwnerUnknown: "Team member",
  animationNotPublishable: "Video is not ready for publishing",
  animationVideoStatus: "Video: {status}",
  articleBody: "Article body (Markdown or HTML)",
  seoReadiness: "SEO readiness",
  seoScore: "SEO score: {score}/100",
  seoSuggestions: "Resolve every suggestion before publishing.",
  readyToPublish: "Ready to publish.",
  canonicalUrl: "Canonical URL",
  publicPreview: "Public preview",
  openPublicPage: "Open public page",
  publicationTasks: "Publication attention",
  publicationTasksDescription:
    "Active and retryable dispatches remain here even after a source post is deleted. Configure both webhook values before retrying.",
  refreshPublicationTasks: "Refresh publication tasks",
  publicationTasksLoadError: "Could not load publication tasks.",
  noPublicationTasks: "No publication tasks need attention.",
  publicationTaskFallback: "Deleted post {id}",
  publicationTaskAttempts: "Attempts: {count}",
  publicationTaskUpdated: "Updated {time}",
  publicationSync: "Publication sync",
  publicationDispatchHelp:
    "Webhook acknowledgement confirms dispatch only, not that the public site is live. Verify the public page or build system.",
  noPublicationEvent: "No publication has been dispatched yet.",
  retryPublication: "Retry publication",
  publicationRetryQueued: "Publication retry queued",
  operationFailed: "CMS operation failed",
  unexpectedError: "An unexpected error occurred. Please try again.",
  addAuthor: "Add author",
  addTag: "Add tag",
  deleteAuthorConfirm: 'Delete author "{name}"?',
  deleteTagConfirm: 'Delete tag "{name}"?',
  authorDeleted: "Author deleted",
  tagDeleted: "Tag deleted",
  authorSaved: "Author saved",
  tagSaved: "Tag saved",
  editAuthor: "Edit author",
  editTag: "Edit tag",
  deleteAuthor: "Delete author",
  deleteTag: "Delete tag",
  reassignAuthorBeforeDelete: "Reassign posts before deleting this author",
  noAuthorsYet: "No authors yet.",
  editAuthorHeading: "Edit author",
  addAuthorHeading: "Add author",
  editTagHeading: "Edit tag",
  addTagHeading: "Add tag",
  taxonomySlugDescription:
    "Slugs become stable public identifiers and must be unique.",
  name: "Name",
  bio: "Bio",
} as const;

export type CmsCopyKey = keyof typeof cmsEnglish;
export type CmsMessageVariables = Record<string, string | number>;
export type CmsTranslate = (
  key: CmsCopyKey,
  variables?: CmsMessageVariables,
) => string;

const cmsChinese: Record<CmsCopyKey, string> = {
  dashboard: "仪表盘",
  pageTitle: "内容管理",
  posts: "文章",
  authors: "作者",
  tags: "标签",
  loadDataError: "无法加载内容管理数据，请重试。",
  searchPosts: "搜索文章",
  searchPostsPlaceholder: "搜索标题、Slug 或摘要",
  status: "状态",
  author: "作者",
  tag: "标签",
  statusFilter: "状态筛选",
  authorFilter: "作者筛选",
  tagFilter: "标签筛选",
  allStatuses: "全部状态",
  allAuthors: "全部作者",
  allTags: "全部标签",
  newPost: "新建文章",
  authorRequired: "请先添加作者，再创建文章。",
  postCountOne: "{count} 篇文章",
  postCountMany: "{count} 篇文章",
  loadPostsError: "无法加载文章，请重试。",
  editPost: "编辑文章",
  deletePost: "删除文章",
  deletePostConfirm: "确定删除《{title}》吗？此操作无法撤销。",
  postDeleted: "文章已删除",
  noMatchingPosts: "没有符合当前筛选条件的文章。",
  previousPage: "上一页",
  nextPage: "下一页",
  pagination: "第 {page} 页，共 {totalPages} 页",
  postEditor: "文章编辑器",
  selectPost: "请选择一篇文章进行编辑，或新建文章。",
  postUpdated: "文章已更新",
  postCreated: "文章已创建",
  cancel: "取消",
  save: "保存",
  saveDraft: "保存草稿",
  publish: "发布",
  updatePublished: "更新已发布文章",
  unpublishToDraft: "取消发布并转为草稿",
  unpublishConfirm: "此操作会下线公开文章，直到再次发布。是否继续？",
  archivePost: "归档文章",
  title: "标题",
  titleRecommendation: "已输入 {count} 个字符，建议不超过 65 个",
  slug: "Slug",
  selectAuthor: "选择作者",
  searchExcerpt: "搜索摘要",
  excerptRecommendation: "已输入 {count} 个字符，建议不超过 160 个",
  noTagsYet: "暂无标签",
  animationAttachment: "动画素材",
  noAnimation: "不关联动画",
  animationAttachmentHelp:
    "可浏览活跃团队成员的已生成动画；只有转码完成的 MP4 或 WebM 视频才能关联发布。",
  selectedAnimation: "已选动画",
  animationOwner: "创建者：{owner}",
  animationOwnerUnknown: "团队成员",
  animationNotPublishable: "视频尚未完成转码，暂不可发布",
  animationVideoStatus: "视频：{status}",
  articleBody: "文章正文（Markdown 或 HTML）",
  seoReadiness: "SEO 发布检查",
  seoScore: "SEO 得分：{score}/100",
  seoSuggestions: "请在发布前处理全部建议。",
  readyToPublish: "已满足发布要求。",
  canonicalUrl: "Canonical 地址",
  publicPreview: "公开预览",
  openPublicPage: "打开公开页面",
  publicationTasks: "发布待处理任务",
  publicationTasksDescription:
    "进行中和可重试的发布任务都会保留在这里，即使源文章已经删除。重试前需同时配置 Webhook 地址和令牌。",
  refreshPublicationTasks: "刷新发布任务",
  publicationTasksLoadError: "无法加载发布任务。",
  noPublicationTasks: "当前没有需要处理的发布任务。",
  publicationTaskFallback: "已删除文章 {id}",
  publicationTaskAttempts: "已尝试：{count} 次",
  publicationTaskUpdated: "更新时间：{time}",
  publicationSync: "发布同步",
  publicationDispatchHelp:
    "Webhook 返回成功只表示同步请求已发出，不代表公开站点已经上线；请继续检查公开页面或构建系统。",
  noPublicationEvent: "尚未触发发布同步。",
  retryPublication: "重试发布同步",
  publicationRetryQueued: "发布重试已加入队列",
  operationFailed: "内容管理操作失败",
  unexpectedError: "发生意外错误，请重试。",
  addAuthor: "添加作者",
  addTag: "添加标签",
  deleteAuthorConfirm: "确定删除作者“{name}”吗？",
  deleteTagConfirm: "确定删除标签“{name}”吗？",
  authorDeleted: "作者已删除",
  tagDeleted: "标签已删除",
  authorSaved: "作者已保存",
  tagSaved: "标签已保存",
  editAuthor: "编辑作者",
  editTag: "编辑标签",
  deleteAuthor: "删除作者",
  deleteTag: "删除标签",
  reassignAuthorBeforeDelete: "请先重新分配该作者的文章，再删除作者",
  noAuthorsYet: "暂无作者。",
  editAuthorHeading: "编辑作者",
  addAuthorHeading: "添加作者",
  editTagHeading: "编辑标签",
  addTagHeading: "添加标签",
  taxonomySlugDescription: "Slug 是稳定的公开标识，且不能重复。",
  name: "名称",
  bio: "简介",
};

const cmsMessages: Record<Locale, Record<CmsCopyKey, string>> = {
  en: cmsEnglish,
  "zh-CN": cmsChinese,
};

const statusLabels: Record<Locale, Record<CmsPostStatusValue, string>> = {
  en: {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    ARCHIVED: "Archived",
  },
  "zh-CN": {
    DRAFT: "草稿",
    PUBLISHED: "已发布",
    ARCHIVED: "已归档",
  },
};

const seoIssueLabels: Record<Locale, Record<CmsSeoIssueCode, string>> = {
  en: {
    TITLE_MISSING: "Add a descriptive title before publishing.",
    TITLE_LENGTH: "Keep the title between 10 and 65 characters.",
    EXCERPT_MISSING: "Add a search-result excerpt before publishing.",
    EXCERPT_LENGTH: "Keep the excerpt between 50 and 160 characters.",
    CONTENT_TOO_SHORT: "Add at least 200 characters of useful article content.",
    AUTHOR_MISSING: "Assign an author before publishing.",
    SLUG_INVALID:
      "Use a non-empty lowercase slug with letters, numbers and hyphens.",
    DUPLICATE_H1:
      "Remove H1 headings from the body; the post title is the page H1.",
    H2_MISSING:
      "Add at least one H2 section heading so the article is easy to scan.",
    INTERNAL_LINK_MISSING:
      "Add at least one relevant internal link to another page or article.",
    IMAGE_ALT_MISSING: "Add meaningful alt text to every image.",
  },
  "zh-CN": {
    TITLE_MISSING: "发布前请添加清晰的标题。",
    TITLE_LENGTH: "标题长度应保持在 10 到 65 个字符之间。",
    EXCERPT_MISSING: "发布前请添加用于搜索结果的摘要。",
    EXCERPT_LENGTH: "摘要长度应保持在 50 到 160 个字符之间。",
    CONTENT_TOO_SHORT: "正文至少需要 200 个字符的有效内容。",
    AUTHOR_MISSING: "发布前请指定作者。",
    SLUG_INVALID: "Slug 不能为空，且只能包含小写字母、数字和连字符。",
    DUPLICATE_H1: "请移除正文中的 H1；文章标题会作为页面唯一的 H1。",
    H2_MISSING: "请至少添加一个 H2 小节标题，让文章结构便于阅读。",
    INTERNAL_LINK_MISSING: "请至少添加一个指向站内页面或文章的相关链接。",
    IMAGE_ALT_MISSING: "请为每张图片添加有意义的 alt 文本。",
  },
};

const publicationStatusLabels: Record<Locale, Record<string, string>> = {
  en: {
    PENDING: "Queued",
    PROCESSING: "Dispatching",
    PROCESSED: "Dispatched",
    FAILED: "Failed",
    DISABLED: "Integration disabled",
  },
  "zh-CN": {
    PENDING: "等待同步",
    PROCESSING: "正在同步",
    PROCESSED: "已触发同步",
    FAILED: "同步失败",
    DISABLED: "集成未启用",
  },
};

const animationVideoStatusLabels: Record<
  Locale,
  Record<CmsAnimationSummary["videoStatus"], string>
> = {
  en: {
    NOT_REQUESTED: "Not requested",
    QUEUED: "Queued",
    PROCESSING: "Processing",
    SUCCEEDED: "Ready",
    FAILED: "Failed",
  },
  "zh-CN": {
    NOT_REQUESTED: "未请求",
    QUEUED: "等待处理",
    PROCESSING: "处理中",
    SUCCEEDED: "已就绪",
    FAILED: "失败",
  },
};

export function getCmsText(
  locale: Locale,
  key: CmsCopyKey,
  variables: CmsMessageVariables = {},
): string {
  return cmsMessages[locale][key].replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.prototype.hasOwnProperty.call(variables, name)
      ? String(variables[name])
      : placeholder,
  );
}

export function getCmsStatusLabel(
  locale: Locale,
  status: CmsPostStatusValue,
): string {
  return statusLabels[locale][status];
}

export function getCmsSeoIssueLabel(
  locale: Locale,
  code: CmsSeoIssueCode,
): string {
  return seoIssueLabels[locale][code];
}

export function getCmsPublicationStatusLabel(
  locale: Locale,
  status: string,
): string {
  return publicationStatusLabels[locale][status] ?? status;
}

export function getCmsAnimationVideoStatusLabel(
  locale: Locale,
  status: CmsAnimationSummary["videoStatus"],
): string {
  return animationVideoStatusLabels[locale][status];
}

export function useCmsCopy() {
  const { locale } = useI18n();
  const t: CmsTranslate = (key, variables) =>
    getCmsText(locale, key, variables);

  return {
    locale,
    t,
    statusLabel: (status: CmsPostStatusValue) =>
      getCmsStatusLabel(locale, status),
    seoIssueLabel: (code: CmsSeoIssueCode) => getCmsSeoIssueLabel(locale, code),
    publicationStatusLabel: (status: string) =>
      getCmsPublicationStatusLabel(locale, status),
    animationVideoStatusLabel: (status: CmsAnimationSummary["videoStatus"]) =>
      getCmsAnimationVideoStatusLabel(locale, status),
    formatDate: (value: Date | string | number) =>
      new Date(value).toLocaleDateString(
        locale === "zh-CN" ? "zh-CN" : "en-US",
      ),
    formatDateTime: (value: Date | string | number) =>
      new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US"),
  };
}
