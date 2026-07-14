import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Film,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import { Link as RouterLink } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  getOperationsOverview,
  getSystemReadiness,
  useQuery,
} from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { type OperationsOverview } from "../../../analytics/operations";
import { Button } from "../../../client/components/ui/button";
import { hasAdminAccess } from "../../../client/components/workspace/permissions";
import { WorkspaceLayout } from "../../../client/components/workspace/WorkspaceLayout";
import { cn } from "../../../client/utils";
import { useI18n } from "../../../i18n";

const dashboardCopy = {
  en: {
    title: "Operations overview",
    description:
      "Track the path from animation generation to a search-ready publication.",
    personalScope:
      "Showing your animation activity and shared publishing work.",
    workspaceScope: "Showing activity across the workspace.",
    newAnimation: "New animation",
    newArticle: "New article",
    lastUpdated: "Updated",
    pipeline: "Production pipeline",
    pipelineDescription: "Current state across each handoff in the workflow.",
    generated: "Generated",
    generatedDetail: "animations ready",
    render: "Video render",
    renderDetail: "queued or processing",
    publishing: "Publishing",
    publishingDetail: "articles marked published",
    seo: "SEO quality",
    seoDetail: "articles ready",
    needsAttention: "needs attention",
    systemReadiness: "System readiness",
    readinessDescription:
      "Core services required to generate, render, and publish.",
    readinessUnavailable: "Readiness checks could not be loaded.",
    resolve: "Resolve",
    usageTitle: "Usage & cost",
    usageDescription: "AI activity during the last {days} days.",
    requests: "Requests",
    tokens: "Tokens",
    estimatedCost: "Estimated cost",
    failedRequests: "Failed requests",
    contentHealth: "Content health",
    articles: "articles",
    drafts: "Drafts",
    published: "Published",
    seoReady: "SEO ready",
    seoNeedsWork: "Needs SEO work",
    team: "Team",
    activeUsers: "active users",
    disabledUsers: "disabled",
    taskCenter: "Task Center",
    taskDescription:
      "Background renders and publication dispatches, including retryable failures.",
    activeTasks: "Active",
    failedTasks: "Failed",
    actionRequiredTasks: "Action required",
    completedTasks: "Completed in range",
    dispatched: "Dispatched",
    task: "Task",
    type: "Type",
    status: "Status",
    updated: "Updated",
    open: "Open",
    noTasks: "No render or publishing tasks yet.",
    noTasksHint:
      "Render an animation or publish an article and its progress will appear here.",
    loadFailed: "The operations overview could not be loaded.",
    loadFailedHint:
      "Check the application connection and try loading current data again.",
    retry: "Retry",
    loading: "Loading operations overview",
    restricted: "Not available for your role",
    dateLocale: "en-US",
    readinessLabels: {
      database: "Database",
      aiProvider: "AI provider",
      encryption: "Credential encryption",
      renderRuntime: "Video render runtime",
      renderStorage: "Render storage",
      emailDelivery: "Account email delivery",
      blogPublishing: "Blog publishing",
    },
    statuses: {
      queued: "Queued",
      processing: "Processing",
      succeeded: "Succeeded",
      failed: "Failed",
      ready: "Ready",
      action_required: "Action required",
      unavailable: "Unavailable",
    },
    kinds: {
      render: "Render",
      publication: "Publication",
      generation: "Generation",
    },
  },
  "zh-CN": {
    title: "运营概览",
    description: "集中查看动画生成、视频转码、SEO 检查与文章发布状态。",
    personalScope: "当前显示你的动画任务和团队共享的发布工作。",
    workspaceScope: "当前显示整个工作台的运营数据。",
    newAnimation: "新建动画",
    newArticle: "新建文章",
    lastUpdated: "更新时间",
    pipeline: "生产流程",
    pipelineDescription: "查看业务流程各环节的当前交接状态。",
    generated: "动画生成",
    generatedDetail: "个动画可用",
    render: "视频转码",
    renderDetail: "个任务排队或处理中",
    publishing: "内容发布",
    publishingDetail: "篇文章已设为发布",
    seo: "SEO 质量",
    seoDetail: "篇文章已达标",
    needsAttention: "需要处理",
    systemReadiness: "系统就绪状态",
    readinessDescription: "生成、转码和发布所需的核心服务状态。",
    readinessUnavailable: "无法读取系统就绪检查。",
    resolve: "去处理",
    usageTitle: "用量与成本",
    usageDescription: "最近 {days} 天的 AI 调用情况。",
    requests: "调用次数",
    tokens: "Token 用量",
    estimatedCost: "预估成本",
    failedRequests: "失败调用",
    contentHealth: "内容健康度",
    articles: "篇文章",
    drafts: "草稿",
    published: "已发布",
    seoReady: "SEO 达标",
    seoNeedsWork: "待优化",
    team: "团队",
    activeUsers: "名活跃用户",
    disabledUsers: "名已停用",
    taskCenter: "任务中心",
    taskDescription: "跟踪后台转码和发布任务，并定位可重试的失败。",
    activeTasks: "进行中",
    failedTasks: "失败",
    actionRequiredTasks: "需要配置",
    completedTasks: "周期内完成",
    dispatched: "已触发同步",
    task: "任务",
    type: "类型",
    status: "状态",
    updated: "更新时间",
    open: "查看",
    noTasks: "目前没有转码或发布任务。",
    noTasksHint: "发起动画转码或发布文章后，任务进度会显示在这里。",
    loadFailed: "无法加载运营概览。",
    loadFailedHint: "请检查应用连接，然后重新读取当前数据。",
    retry: "重试",
    loading: "正在加载运营概览",
    restricted: "当前角色不可用",
    dateLocale: "zh-CN",
    readinessLabels: {
      database: "数据库",
      aiProvider: "AI 服务",
      encryption: "凭据加密",
      renderRuntime: "视频转码环境",
      renderStorage: "转码文件存储",
      emailDelivery: "账户邮件发送",
      blogPublishing: "博客发布集成",
    },
    statuses: {
      queued: "排队中",
      processing: "处理中",
      succeeded: "已完成",
      failed: "失败",
      ready: "就绪",
      action_required: "需要配置",
      unavailable: "不可用",
    },
    kinds: {
      render: "视频转码",
      publication: "内容发布",
      generation: "动画生成",
    },
  },
} as const;

export function AnalyticsDashboardPage({ user }: { user: AuthUser }) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const isAdmin = hasAdminAccess(user);
  const overviewQuery = useQuery(getOperationsOverview);
  const readinessQuery = useQuery(getSystemReadiness);

  const handleRefresh = () => {
    void Promise.all([overviewQuery.refetch(), readinessQuery.refetch()]);
  };

  return (
    <WorkspaceLayout user={user}>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
              {copy.description}
            </p>
            {overviewQuery.data && (
              <p className="text-muted-foreground mt-2 text-xs">
                {overviewQuery.data.scope === "workspace"
                  ? copy.workspaceScope
                  : copy.personalScope}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={routes.AiStudioRoute.to}>
                <Sparkles aria-hidden="true" />
                {copy.newAnimation}
              </Link>
            </Button>
            {overviewQuery.data?.capabilities.canPublish && (
              <Button asChild>
                <Link to={routes.ContentCmsAdminRoute.to}>
                  <FileText aria-hidden="true" />
                  {copy.newArticle}
                </Link>
              </Button>
            )}
          </div>
        </header>

        {overviewQuery.isLoading ? (
          <OverviewSkeleton label={copy.loading} />
        ) : overviewQuery.error || !overviewQuery.data ? (
          <OverviewError
            title={copy.loadFailed}
            description={overviewQuery.error?.message || copy.loadFailedHint}
            retryLabel={copy.retry}
            onRetry={handleRefresh}
          />
        ) : (
          <>
            <PipelineSection overview={overviewQuery.data} copy={copy} />

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <ReadinessPanel
                data={readinessQuery.data}
                isLoading={readinessQuery.isLoading}
                error={readinessQuery.error}
                copy={copy}
              />
              <UsagePanel
                overview={overviewQuery.data}
                copy={copy}
                isAdmin={isAdmin}
              />
            </section>

            {overviewQuery.data.capabilities.canPublish && (
              <ContentHealthPanel overview={overviewQuery.data} copy={copy} />
            )}

            <TaskCenter overview={overviewQuery.data} copy={copy} />

            <p className="text-muted-foreground text-right text-xs">
              {copy.lastUpdated}:{" "}
              {formatDateTime(overviewQuery.data.generatedAt, locale)}
            </p>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}

type OverviewData = OperationsOverview;
type ReadinessData = {
  overall: "ready" | "action_required" | "unavailable";
  checkedAt: Date;
  checks: Array<{
    key: string;
    label: string;
    status: "ready" | "action_required" | "unavailable";
    detail: string;
    actionPath: string | null;
  }>;
};
type DashboardCopy = (typeof dashboardCopy)[keyof typeof dashboardCopy];

function PipelineSection({
  overview,
  copy,
}: {
  overview: OverviewData;
  copy: DashboardCopy;
}) {
  const pipeline = [
    {
      label: copy.generated,
      value: overview.animation.ready,
      detail: copy.generatedDetail,
      attention: overview.animation.failed,
      icon: Sparkles,
    },
    {
      label: copy.render,
      value: overview.rendering.queued + overview.rendering.processing,
      detail: copy.renderDetail,
      attention: overview.rendering.failed,
      icon: Film,
    },
    {
      label: copy.publishing,
      value: overview.publishing.published,
      detail: copy.publishingDetail,
      attention:
        overview.publishing.failedEvents + overview.publishing.disabledEvents,
      icon: FileCheck2,
      restricted: !overview.capabilities.canPublish,
    },
    {
      label: copy.seo,
      value: overview.seo.readyPosts,
      detail: copy.seoDetail,
      attention: overview.seo.needsWorkPosts,
      icon: Wrench,
      restricted: !overview.capabilities.canPublish,
    },
  ];

  return (
    <section
      aria-labelledby="pipeline-heading"
      className="bg-card rounded-lg border"
    >
      <div className="border-b px-5 py-4">
        <h2 id="pipeline-heading" className="font-semibold">
          {copy.pipeline}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {copy.pipelineDescription}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {pipeline.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.label}
              className={cn(
                "px-5 py-5",
                index > 0 && "border-t sm:border-l sm:border-t-0",
                index === 2 &&
                  "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="text-primary h-4 w-4" aria-hidden="true" />
                {stage.label}
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums">
                {stage.restricted ? "-" : stage.value.toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {stage.restricted ? copy.restricted : stage.detail}
              </p>
              {!stage.restricted && (
                <p
                  className={cn(
                    "mt-3 flex items-center gap-1.5 text-xs font-medium",
                    stage.attention > 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {stage.attention > 0 ? (
                    <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {stage.attention.toLocaleString()} {copy.needsAttention}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReadinessPanel({
  data,
  isLoading,
  error,
  copy,
}: {
  data: ReadinessData | undefined;
  isLoading: boolean;
  error: Error | null;
  copy: DashboardCopy;
}) {
  return (
    <section
      aria-labelledby="readiness-heading"
      className="bg-card rounded-lg border"
    >
      <div className="border-b px-5 py-4">
        <h2 id="readiness-heading" className="font-semibold">
          {copy.systemReadiness}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {copy.readinessDescription}
        </p>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-5" aria-label={copy.loading}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-muted h-11 animate-pulse rounded-md motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : error || !data ? (
        <div className="text-destructive flex items-start gap-3 p-5 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error?.message || copy.readinessUnavailable}</span>
        </div>
      ) : (
        <ul className="divide-y">
          {data.checks.map((check) => (
            <li
              key={check.key}
              className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center"
            >
              <StatusIcon status={check.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {copy.readinessLabels[
                    check.key as keyof typeof copy.readinessLabels
                  ] ?? check.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {check.detail}
                </p>
              </div>
              <StatusBadge status={check.status} copy={copy} />
              {check.actionPath && (
                <RouterLink
                  to={check.actionPath}
                  className="text-primary focus-visible:ring-primary inline-flex min-h-10 items-center gap-1 self-start rounded-md px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 sm:self-center"
                >
                  {copy.resolve}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </RouterLink>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UsagePanel({
  overview,
  copy,
  isAdmin,
}: {
  overview: OverviewData;
  copy: DashboardCopy;
  isAdmin: boolean;
}) {
  const metrics = [
    [copy.requests, overview.usage.requestsInRange.toLocaleString()],
    [copy.tokens, overview.usage.tokensInRange.toLocaleString()],
    [copy.estimatedCost, formatCost(overview.usage.estimatedCostMicrosInRange)],
    [
      copy.failedRequests,
      overview.usage.failedRequestsInRange.toLocaleString(),
    ],
  ];

  return (
    <section
      id="usage-cost"
      aria-labelledby="usage-heading"
      className="bg-card rounded-lg border"
    >
      <div className="border-b px-5 py-4">
        <h2 id="usage-heading" className="font-semibold">
          {copy.usageTitle}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {copy.usageDescription.replace("{days}", String(overview.rangeDays))}
        </p>
      </div>
      <dl className="bg-border grid grid-cols-2 gap-px">
        {metrics.map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-4">
            <dt className="text-muted-foreground text-xs font-medium">
              {label}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {isAdmin && overview.team && (
        <div className="text-muted-foreground flex items-center gap-2 border-t px-5 py-3 text-xs">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span className="text-foreground font-medium">{copy.team}:</span>
          {overview.team.activeUsers} {copy.activeUsers},{" "}
          {overview.team.disabledUsers} {copy.disabledUsers}
        </div>
      )}
    </section>
  );
}

function ContentHealthPanel({
  overview,
  copy,
}: {
  overview: OverviewData;
  copy: DashboardCopy;
}) {
  const items = [
    [copy.drafts, overview.publishing.drafts],
    [copy.published, overview.publishing.published],
    [copy.seoReady, overview.seo.readyPosts],
    [copy.seoNeedsWork, overview.seo.needsWorkPosts],
  ];

  return (
    <section
      aria-labelledby="content-health-heading"
      className="bg-card rounded-lg border px-5 py-4"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="md:w-56">
          <h2 id="content-health-heading" className="font-semibold">
            {copy.contentHealth}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {overview.publishing.totalPosts.toLocaleString()} {copy.articles}
          </p>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-muted-foreground text-xs font-medium">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {Number(value).toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        <Button asChild variant="outline">
          <Link to={routes.ContentCmsAdminRoute.to}>
            {copy.open}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function TaskCenter({
  overview,
  copy,
}: {
  overview: OverviewData;
  copy: DashboardCopy;
}) {
  return (
    <section
      id="task-center"
      aria-labelledby="task-center-heading"
      className="bg-card scroll-mt-24 rounded-lg border"
    >
      <div className="flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="task-center-heading" className="font-semibold">
            {copy.taskCenter}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {copy.taskDescription}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <TaskCount label={copy.activeTasks} value={overview.tasks.active} />
          <TaskCount
            label={copy.failedTasks}
            value={overview.tasks.failed}
            danger
          />
          <TaskCount
            label={copy.actionRequiredTasks}
            value={overview.tasks.actionRequired}
            warning
          />
          <TaskCount
            label={copy.completedTasks}
            value={overview.tasks.completedInRange}
          />
        </dl>
      </div>

      {overview.tasks.recent.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Clock3
            className="text-muted-foreground mx-auto h-7 w-7"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium">{copy.noTasks}</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-xl text-sm">
            {copy.noTasksHint}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs">
                <tr>
                  <th className="px-5 py-3 font-medium">{copy.task}</th>
                  <th className="px-4 py-3 font-medium">{copy.type}</th>
                  <th className="px-4 py-3 font-medium">{copy.status}</th>
                  <th className="px-4 py-3 font-medium">{copy.updated}</th>
                  <th className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">{copy.open}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overview.tasks.recent.map((task) => (
                  <tr key={task.id}>
                    <td className="max-w-md px-5 py-3.5">
                      <p className="truncate font-medium">{task.title}</p>
                      {task.detail && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                          {task.detail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{copy.kinds[task.kind]}</td>
                    <td className="px-4 py-3.5">
                      <TaskStatus
                        status={task.status}
                        kind={task.kind}
                        copy={copy}
                      />
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5 text-xs">
                      {formatDateTime(task.updatedAt, copy.dateLocale)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <RouterLink
                        to={task.href}
                        aria-label={`${copy.open}: ${task.title}`}
                        className="text-primary focus-visible:ring-primary inline-flex h-9 w-9 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </RouterLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y md:hidden">
            {overview.tasks.recent.map((task) => (
              <li key={task.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {copy.kinds[task.kind]} ·{" "}
                      {formatDateTime(task.updatedAt, copy.dateLocale)}
                    </p>
                  </div>
                  <TaskStatus
                    status={task.status}
                    kind={task.kind}
                    copy={copy}
                  />
                </div>
                {task.detail && (
                  <p className="text-muted-foreground mt-3 line-clamp-2 text-xs">
                    {task.detail}
                  </p>
                )}
                <RouterLink
                  to={task.href}
                  className="text-primary focus-visible:ring-primary mt-3 inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2"
                >
                  {copy.open}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </RouterLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TaskCount({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          danger && value > 0 && "text-destructive",
          warning && value > 0 && "text-warning",
        )}
      >
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function TaskStatus({
  status,
  kind,
  copy,
}: {
  status: OverviewData["tasks"]["recent"][number]["status"];
  kind: OverviewData["tasks"]["recent"][number]["kind"];
  copy: DashboardCopy;
}) {
  return (
    <StatusBadge
      status={status}
      copy={copy}
      label={
        kind === "publication" && status === "succeeded"
          ? copy.dispatched
          : undefined
      }
    />
  );
}

function StatusBadge({
  status,
  copy,
  label,
}: {
  status: keyof DashboardCopy["statuses"];
  copy: DashboardCopy;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        ["ready", "succeeded"].includes(status) && "bg-success/10 text-success",
        ["queued", "processing", "action_required"].includes(status) &&
          "bg-warning/15 text-foreground",
        ["failed", "unavailable"].includes(status) &&
          "bg-destructive/10 text-destructive",
      )}
    >
      {label ?? copy.statuses[status]}
    </span>
  );
}

function StatusIcon({
  status,
}: {
  status: ReadinessData["checks"][number]["status"];
}) {
  if (status === "ready") {
    return (
      <CheckCircle2
        className="text-success h-5 w-5 shrink-0"
        aria-hidden="true"
      />
    );
  }
  if (status === "action_required") {
    return (
      <Wrench className="text-warning h-5 w-5 shrink-0" aria-hidden="true" />
    );
  }
  return (
    <AlertCircle
      className="text-destructive h-5 w-5 shrink-0"
      aria-hidden="true"
    />
  );
}

function OverviewSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-6">
      <div className="bg-muted h-52 animate-pulse rounded-lg motion-reduce:animate-none" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-muted h-72 animate-pulse rounded-lg motion-reduce:animate-none" />
        <div className="bg-muted h-72 animate-pulse rounded-lg motion-reduce:animate-none" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function OverviewError({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <section className="bg-card rounded-lg border px-5 py-10 text-center">
      <AlertCircle
        className="text-destructive mx-auto h-8 w-8"
        aria-hidden="true"
      />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-1 max-w-xl text-sm">
        {description}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5"
        onClick={onRetry}
      >
        <RefreshCw aria-hidden="true" />
        {retryLabel}
      </Button>
    </section>
  );
}

function formatCost(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}

function formatDateTime(value: Date | string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
