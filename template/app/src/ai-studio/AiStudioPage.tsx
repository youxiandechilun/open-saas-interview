import {
  Check,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  Film,
  Gauge,
  KeyRound,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "wasp/client/api";
import { useAuth } from "wasp/client/auth";
import {
  generateAiAnimation,
  getAiStudioDashboard,
  optimizeAiAnimationPrompt,
  requestAiAnimationVideo,
  retryAiAnimationVideo,
  useQuery,
} from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { Button } from "../client/components/ui/button";
import { Progress } from "../client/components/ui/progress";
import { Textarea } from "../client/components/ui/textarea";
import { WorkspaceLayout } from "../client/components/workspace/WorkspaceLayout";
import {
  hasAdminAccess,
  hasPublishingAccess,
} from "../client/components/workspace/permissions";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import { useI18n } from "../i18n";
import { useAiStudioCopy } from "./i18n";
import {
  getOrCreateRequestKey,
  isRetryableTransportFailure,
  releaseAction,
  requestFingerprint,
  settleRequestKey,
  tryAcquireAction,
} from "./clientRequestPolicy";
import { AI_PREVIEW_IFRAME_SANDBOX, buildSandboxSrcDoc } from "./security";
import type {
  AiStudioDashboard,
  AnimationView,
  PromptOptimizationView,
  PromptScore,
} from "./types";

type BusyAction = "optimize" | "generate" | `video:${string}` | null;
type VideoFormat = "mp4" | "webm";

const workflowCopy = {
  en: {
    subtitle:
      "Turn one reviewed prompt into a browser animation and a downloadable video.",
    steps: ["Prompt", "Optimize", "Generate", "Preview", "Render"],
    compactSteps: ["Prompt", "Tune", "Build", "View", "Video"],
    workflowLabel: "Animation production steps",
    promptHeading: "Describe the animation",
    promptHint:
      "Include the subject, movement, visual style, duration, and loop behavior.",
    optimizationHeading: "Review the optimized prompt",
    optimizationHint:
      "Compare the rewrite and score before committing generation quota.",
    generateHeading: "Generate safe HTML",
    generateHint: "The optimized prompt is locked to this generation request.",
    previewEmpty: "Your generated animation will appear here.",
    previewEmptyHint:
      "Complete prompt optimization, then generate HTML to unlock preview and video rendering.",
    recentWork: "Recent animations",
    recentWorkHint: "Preview prior work or continue its video render.",
    usageDetails: "AI usage details",
    usageDetailsHint: "Request, token, latency, and cost audit records.",
    dashboardError: "Saved work and usage could not be loaded.",
    loadingWorkspace: "Loading Animation Studio",
    formatLabel: "Video format",
    currentStep: "Current step",
    completedStep: "Completed step",
  },
  "zh-CN": {
    subtitle: "将审核后的 Prompt 生成可预览的 HTML 动画，并转为可下载视频。",
    steps: ["编写 Prompt", "优化", "生成", "预览", "转码"],
    compactSteps: ["编写", "优化", "生成", "预览", "转码"],
    workflowLabel: "动画生产步骤",
    promptHeading: "描述动画需求",
    promptHint: "请说明主体、运动方式、视觉风格、时长以及是否循环。",
    optimizationHeading: "审核优化结果",
    optimizationHint: "生成前对比原始与优化版本，确认评分和改写内容。",
    generateHeading: "生成安全 HTML",
    generateHint: "本次生成会使用当前已确认的优化 Prompt。",
    previewEmpty: "生成后的动画会显示在这里。",
    previewEmptyHint:
      "先完成 Prompt 优化，再生成 HTML，即可预览和发起视频转码。",
    recentWork: "最近动画",
    recentWorkHint: "预览历史作品，或继续未完成的视频转码。",
    usageDetails: "AI 调用明细",
    usageDetailsHint: "查看调用、Token、耗时与成本审计记录。",
    dashboardError: "无法加载已保存动画和用量数据。",
    loadingWorkspace: "正在加载动画工作室",
    formatLabel: "视频格式",
    currentStep: "当前步骤",
    completedStep: "已完成步骤",
  },
} as const;

export function AiStudioPage() {
  const copy = useAiStudioCopy();
  const { t, locale } = useI18n();
  const workflow = workflowCopy[locale];
  const { data: user } = useAuth();
  const {
    data: dashboard,
    isLoading,
    error: dashboardError,
    refetch,
  } = useQuery(getAiStudioDashboard);
  const [prompt, setPrompt] = useState("");
  const [optimization, setOptimization] =
    useState<PromptOptimizationView | null>(null);
  const [selected, setSelected] = useState<AnimationView | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const busyRef = useRef<BusyAction>(null);
  const requestKeysRef = useRef(new Map<string, string>());
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("mp4");

  const hasActiveVideo = dashboard?.animations.some((animation) =>
    ["QUEUED", "PROCESSING"].includes(animation.videoStatus),
  );

  useEffect(() => {
    if (!hasActiveVideo) return;
    const timer = window.setInterval(() => void refetch(), 3_000);
    return () => window.clearInterval(timer);
  }, [hasActiveVideo, refetch]);

  useEffect(() => {
    if (!selected || !dashboard) return;
    const latest = dashboard.animations.find((item) => item.id === selected.id);
    if (latest && latest.updatedAt !== selected.updatedAt) setSelected(latest);
  }, [dashboard, selected]);

  const previewSrcDoc = useMemo(() => {
    if (!selected || selected.status !== "READY") return undefined;
    try {
      return buildSandboxSrcDoc(selected.html);
    } catch {
      return undefined;
    }
  }, [selected]);

  const handleOptimize = async () => {
    if (prompt.trim().length < 20) return;
    const action = "optimize" as const;
    if (!tryAcquireAction(busyRef, action)) return;
    const fingerprint = requestFingerprint("optimize", [prompt.trim()]);
    const idempotencyKey = getOrCreateRequestKey(
      requestKeysRef.current,
      fingerprint,
      "optimize",
    );
    setBusy(action);
    try {
      const result = await optimizeAiAnimationPrompt({
        prompt,
        idempotencyKey,
      });
      settleRequestKey(requestKeysRef.current, fingerprint, "completed");
      setOptimization(result);
      await refetch();
    } catch (error) {
      settleRequestKey(
        requestKeysRef.current,
        fingerprint,
        isRetryableTransportFailure(error)
          ? "transport-failure"
          : "confirmed-failure",
      );
      showError(
        error,
        copy.requestFailed,
        copy.unexpectedError,
        copy.errorMessage,
      );
    } finally {
      releaseAction(busyRef, action);
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    if (!optimization) return;
    const action = "generate" as const;
    if (!tryAcquireAction(busyRef, action)) return;
    const fingerprint = requestFingerprint("generate", [
      optimization.optimizationId,
    ]);
    const idempotencyKey = getOrCreateRequestKey(
      requestKeysRef.current,
      fingerprint,
      "generate",
    );
    setBusy(action);
    try {
      const animation = await generateAiAnimation({
        optimizationId: optimization.optimizationId,
        idempotencyKey,
      });
      settleRequestKey(requestKeysRef.current, fingerprint, "completed");
      setSelected(animation);
      await refetch();
    } catch (error) {
      settleRequestKey(
        requestKeysRef.current,
        fingerprint,
        isRetryableTransportFailure(error)
          ? "transport-failure"
          : "confirmed-failure",
      );
      showError(
        error,
        copy.requestFailed,
        copy.unexpectedError,
        copy.errorMessage,
      );
    } finally {
      releaseAction(busyRef, action);
      setBusy(null);
    }
  };

  const handleVideo = async (animation: AnimationView, retry: boolean) => {
    const action = `video:${animation.id}` as const;
    if (!tryAcquireAction(busyRef, action)) return;
    const operation = retry ? "retry" : "video";
    const fingerprint = requestFingerprint(operation, [
      animation.id,
      videoFormat,
      animation.updatedAt,
    ]);
    const idempotencyKey = getOrCreateRequestKey(
      requestKeysRef.current,
      fingerprint,
      operation,
    );
    setBusy(action);
    try {
      const videoAction = retry
        ? retryAiAnimationVideo
        : requestAiAnimationVideo;
      const updated = await videoAction({
        animationId: animation.id,
        format: videoFormat,
        idempotencyKey,
      });
      settleRequestKey(requestKeysRef.current, fingerprint, "completed");
      setSelected(updated);
      await refetch();
    } catch (error) {
      settleRequestKey(
        requestKeysRef.current,
        fingerprint,
        isRetryableTransportFailure(error)
          ? "transport-failure"
          : "confirmed-failure",
      );
      showError(
        error,
        copy.requestFailed,
        copy.unexpectedError,
        copy.errorMessage,
      );
    } finally {
      releaseAction(busyRef, action);
      setBusy(null);
    }
  };

  const handleDownload = async (animation: AnimationView) => {
    if (!animation.videoDownloadPath) return;
    setBusy(`video:${animation.id}`);
    try {
      const blob = await api.get(animation.videoDownloadPath).blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${fileSafeTitle(animation.title)}.${
        animation.videoFormat ?? "mp4"
      }`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      showError(
        error,
        copy.requestFailed,
        copy.unexpectedError,
        copy.errorMessage,
      );
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return <StudioLoadingState label={workflow.loadingWorkspace} />;
  }

  const canPublish = hasPublishingAccess(user);
  const isAdmin = hasAdminAccess(user);
  const activeStep = getActiveStep({ prompt, optimization, selected, busy });

  return (
    <WorkspaceLayout user={user}>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{copy.studioTitle}</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {workflow.subtitle}
            </p>
          </div>
          {(canPublish || isAdmin) && (
            <div className="flex flex-wrap gap-2">
              {canPublish && (
                <Button asChild size="sm" variant="outline">
                  <Link to={routes.ContentCmsAdminRoute.to}>
                    <FileText aria-hidden="true" />
                    {t("menu.contentCms")}
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button asChild size="sm" variant="outline">
                  <Link to={routes.AiProviderSettingsRoute.to}>
                    <KeyRound aria-hidden="true" />
                    {t("menu.aiProvider")}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </header>

        <WorkflowStepper
          steps={workflow.steps}
          compactSteps={workflow.compactSteps}
          activeStep={activeStep}
          label={workflow.workflowLabel}
          currentLabel={workflow.currentStep}
          completedLabel={workflow.completedStep}
        />

        {dashboardError && (
          <div
            role="alert"
            className="bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
          >
            <TriangleAlert
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{dashboardError.message || workflow.dashboardError}</span>
          </div>
        )}

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <div className="bg-card rounded-lg border">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">{workflow.promptHeading}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {workflow.promptHint}
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <label
                  htmlFor="animation-prompt"
                  className="text-sm font-semibold"
                >
                  {copy.promptLabel}
                </label>
                <Textarea
                  id="animation-prompt"
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.currentTarget.value);
                    setOptimization(null);
                    setSelected(null);
                  }}
                  rows={8}
                  maxLength={4_000}
                  minLength={20}
                  placeholder={copy.promptPlaceholder}
                  className="min-h-44 resize-y"
                />
                <div className="flex min-h-5 items-center justify-between gap-3">
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {prompt.length} / 4,000
                  </span>
                  {prompt.trim().length > 0 && prompt.trim().length < 20 && (
                    <span className="text-destructive text-xs">
                      {copy.promptTooShort}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPrompt(copy.examplePrompt);
                    setOptimization(null);
                    setSelected(null);
                  }}
                  disabled={busy !== null}
                >
                  <FileText aria-hidden="true" />
                  {copy.loadExample}
                </Button>
                <Button
                  type="button"
                  onClick={handleOptimize}
                  disabled={prompt.trim().length < 20 || busy !== null}
                >
                  {busy === "optimize" ? (
                    <Loader2 className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <WandSparkles aria-hidden="true" />
                  )}
                  {busy === "optimize" ? copy.optimizing : copy.optimize}
                </Button>
              </div>

              {optimization && (
                <div className="space-y-5 border-t pt-5">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {workflow.optimizationHeading}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {workflow.optimizationHint}
                    </p>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <PromptVersion
                      label={copy.before}
                      prompt={optimization.originalPrompt}
                      score={optimization.originalScore}
                    />
                    <PromptVersion
                      label={copy.after}
                      prompt={optimization.optimizedPrompt}
                      score={optimization.score}
                    />
                  </div>
                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {workflow.generateHeading}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {workflow.generateHint}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleGenerate}
                      disabled={busy !== null}
                    >
                      {busy === "generate" ? (
                        <Loader2 className="animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Sparkles aria-hidden="true" />
                      )}
                      {busy === "generate"
                        ? copy.generating
                        : copy.generateHtml}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <h2 className="font-semibold">{copy.preview}</h2>
              <div
                className="border-input inline-flex rounded-md border p-0.5"
                role="group"
                aria-label={workflow.formatLabel}
              >
                {(["mp4", "webm"] as const).map((format) => (
                  <Button
                    key={format}
                    type="button"
                    size="sm"
                    variant={videoFormat === format ? "secondary" : "ghost"}
                    className="h-8 px-3"
                    aria-pressed={videoFormat === format}
                    onClick={() => setVideoFormat(format)}
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="bg-muted/30 aspect-video w-full overflow-hidden rounded-lg border">
                {previewSrcDoc ? (
                  <iframe
                    title={`${copy.preview}: ${
                      selected?.title ?? copy.studioTitle
                    }`}
                    srcDoc={previewSrcDoc}
                    sandbox={AI_PREVIEW_IFRAME_SANDBOX}
                    referrerPolicy="no-referrer"
                    className="h-full w-full bg-white"
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full flex-col items-center justify-center px-6 text-center">
                    <Play className="h-8 w-8" aria-hidden="true" />
                    <p className="text-foreground mt-3 text-sm font-medium">
                      {workflow.previewEmpty}
                    </p>
                    <p className="mt-1 max-w-md text-xs">
                      {workflow.previewEmptyHint}
                    </p>
                  </div>
                )}
              </div>
              {selected && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {selected.title}
                      </p>
                      <StatusPill status={selected.status} />
                    </div>
                    <VideoState animation={selected} />
                  </div>
                  <VideoActions
                    animation={selected}
                    busy={busy === `video:${selected.id}`}
                    onRender={() => handleVideo(selected, false)}
                    onRetry={() => handleVideo(selected, true)}
                    onDownload={() => handleDownload(selected)}
                    showLabel
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <UsageBand dashboard={dashboard} isLoading={isLoading} />

        <section
          aria-labelledby="animation-history-heading"
          className="bg-card rounded-lg border"
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 id="animation-history-heading" className="font-semibold">
                {workflow.recentWork}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {workflow.recentWorkHint}
              </p>
            </div>
            <span className="text-muted-foreground text-sm tabular-nums">
              {dashboard?.animations.length ?? 0}
            </span>
          </div>
          {isLoading ? (
            <div
              className="space-y-1 p-3"
              role="status"
              aria-label={workflow.loadingWorkspace}
            >
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-20 animate-pulse rounded-md motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : dashboard?.animations.length ? (
            <div className="divide-y">
              {dashboard.animations.map((animation) => (
                <article
                  key={animation.id}
                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {animation.title}
                      </h3>
                      <StatusPill status={animation.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                      {animation.description ?? animation.generationError}
                    </p>
                  </div>
                  <div className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                      {animation.promptScore}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(animation.createdAt, copy.dateLocale)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-2 md:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={animation.status !== "READY"}
                      onClick={() => setSelected(animation)}
                    >
                      <Play aria-hidden="true" /> {copy.preview}
                    </Button>
                    <VideoActions
                      animation={animation}
                      busy={busy === `video:${animation.id}`}
                      onRender={() => handleVideo(animation, false)}
                      onRetry={() => handleVideo(animation, true)}
                      onDownload={() => handleDownload(animation)}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <Film
                className="text-muted-foreground mx-auto h-7 w-7"
                aria-hidden="true"
              />
              <p className="text-muted-foreground mt-3 text-sm">
                {copy.noAnimations}
              </p>
            </div>
          )}
        </section>

        <details className="bg-card group rounded-lg border">
          <summary className="focus-visible:ring-primary flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-lg px-5 py-3 focus-visible:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{workflow.usageDetails}</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {workflow.usageDetailsHint}
              </p>
            </div>
            <ChevronDown
              className="text-muted-foreground h-4 w-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <UsageLogTable logs={dashboard?.logs ?? []} />
        </details>
      </div>
    </WorkspaceLayout>
  );
}

function PromptVersion({
  label,
  prompt,
  score,
}: {
  label: string;
  prompt: string;
  score: PromptScore;
}) {
  const copy = useAiStudioCopy();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-primary text-lg font-bold tabular-nums">
          {score.score}
        </span>
      </div>
      <p className="bg-muted/40 max-h-44 overflow-y-auto rounded-md border p-3 text-sm leading-6">
        {prompt}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <ScoreRow label={copy.clarity} value={score.clarity} />
        <ScoreRow label={copy.specificity} value={score.specificity} />
        <ScoreRow label={copy.motion} value={score.motionDirection} />
        <ScoreRow label={copy.feasibility} value={score.feasibility} />
      </div>
      <ul className="text-muted-foreground space-y-1 text-xs">
        {score.feedback.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function WorkflowStepper({
  steps,
  compactSteps,
  activeStep,
  label,
  currentLabel,
  completedLabel,
}: {
  steps: readonly string[];
  compactSteps: readonly string[];
  activeStep: number;
  label: string;
  currentLabel: string;
  completedLabel: string;
}) {
  return (
    <nav aria-label={label} className="bg-card rounded-lg border">
      <ol className="grid grid-cols-5">
        {steps.map((step, index) => {
          const isComplete = index < activeStep;
          const isCurrent = index === activeStep;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 sm:min-h-16 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:py-3",
                index > 0 && "border-l",
                isCurrent && "bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "border-input text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-xs",
                  isComplete &&
                    "border-success bg-success text-success-foreground",
                  isCurrent && "border-primary text-primary",
                )}
                aria-label={
                  isComplete
                    ? `${completedLabel}: ${step}`
                    : isCurrent
                      ? `${currentLabel}: ${step}`
                      : undefined
                }
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "min-w-0 text-center text-[10px] font-medium leading-3 sm:hidden",
                  !isComplete && !isCurrent && "text-muted-foreground",
                )}
              >
                {compactSteps[index] ?? step}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  !isComplete && !isCurrent && "text-muted-foreground",
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getActiveStep({
  prompt,
  optimization,
  selected,
  busy,
}: {
  prompt: string;
  optimization: PromptOptimizationView | null;
  selected: AnimationView | null;
  busy: BusyAction;
}): number {
  if (selected?.videoStatus === "SUCCEEDED") return 5;
  if (selected) return 4;
  if (busy === "generate" || optimization) return 2;
  if (busy === "optimize" || prompt.trim().length >= 20) return 1;
  return 0;
}

function StudioLoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="bg-background text-muted-foreground flex min-h-screen items-center justify-center gap-2 text-sm"
    >
      <Loader2
        className="h-5 w-5 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums">{value}/25</span>
      </div>
      <Progress value={value * 4} className="h-1" />
    </div>
  );
}

function VideoActions({
  animation,
  busy,
  onRender,
  onRetry,
  onDownload,
  showLabel = false,
}: {
  animation: AnimationView;
  busy: boolean;
  onRender: () => void;
  onRetry: () => void;
  onDownload: () => void;
  showLabel?: boolean;
}) {
  const copy = useAiStudioCopy();
  const size = showLabel ? "default" : "icon";

  if (busy || ["QUEUED", "PROCESSING"].includes(animation.videoStatus)) {
    return (
      <Button
        type="button"
        size={size}
        variant="ghost"
        disabled
        title={copy.renderingVideo}
        aria-label={copy.renderingVideo}
      >
        <Loader2 className="animate-spin motion-reduce:animate-none" />
        {showLabel && copy.renderingVideo}
      </Button>
    );
  }
  if (animation.videoStatus === "SUCCEEDED") {
    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={onDownload}
        title={copy.downloadVideo}
        aria-label={copy.downloadVideo}
      >
        <Download />
        {showLabel && copy.downloadVideo}
      </Button>
    );
  }
  if (animation.videoStatus === "FAILED") {
    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={onRetry}
        title={copy.retryVideo}
        aria-label={copy.retryVideo}
      >
        <RotateCcw />
        {showLabel && copy.retryVideo}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      onClick={onRender}
      disabled={animation.status !== "READY"}
      title={copy.renderVideo}
      aria-label={copy.renderVideo}
    >
      <Film />
      {showLabel && copy.renderVideo}
    </Button>
  );
}

function VideoState({ animation }: { animation: AnimationView }) {
  const copy = useAiStudioCopy();
  const text = copy.statusLabel(animation.videoStatus);
  return (
    <p className="text-muted-foreground truncate text-xs">
      {copy.video}: {text}
      {animation.videoAttempts > 0
        ? ` - ${copy.attempt(animation.videoAttempts, 3)}`
        : ""}
      {animation.videoError ? ` - ${animation.videoError}` : ""}
    </p>
  );
}

function UsageBand({
  dashboard,
  isLoading,
}: {
  dashboard: AiStudioDashboard | undefined;
  isLoading: boolean;
}) {
  const copy = useAiStudioCopy();
  const usage = dashboard?.usage;
  return (
    <section
      aria-labelledby="studio-usage-heading"
      className="bg-card rounded-lg border"
    >
      <div className="border-b px-5 py-3.5">
        <h2 id="studio-usage-heading" className="text-sm font-semibold">
          {copy.usage}
        </h2>
      </div>
      <dl className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          label={copy.requestsThisHour}
          value={
            isLoading
              ? "..."
              : `${usage?.usedThisHour ?? 0} / ${usage?.hourlyLimit ?? 20}`
          }
        />
        <Metric
          label={copy.remaining}
          value={isLoading ? "..." : String(usage?.remainingThisHour ?? 0)}
        />
        <Metric
          label={copy.inFlight}
          value={isLoading ? "..." : String(usage?.inFlight ?? 0)}
        />
        <Metric
          label={copy.tokens}
          value={isLoading ? "..." : (usage?.totalTokens ?? 0).toLocaleString()}
        />
        <Metric
          label={copy.tokenBudget}
          value={
            isLoading
              ? "..."
              : usage?.hourlyTokenLimit === 0
                ? copy.unlimited
                : `${(usage?.tokensUsedThisHour ?? 0).toLocaleString()} / ${(
                    usage?.hourlyTokenLimit ?? 100_000
                  ).toLocaleString()}`
          }
        />
        <Metric
          label={copy.estimatedCost}
          value={
            isLoading
              ? "..."
              : formatEstimatedCost(usage?.estimatedCostMicros ?? 0)
          }
        />
      </dl>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function UsageLogTable({ logs }: { logs: AiStudioDashboard["logs"] }) {
  const copy = useAiStudioCopy();

  return (
    <div className="border-t">
      <h3 className="sr-only">{copy.usageLog}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">{copy.time}</th>
              <th className="px-4 py-3 font-medium">{copy.operation}</th>
              <th className="px-4 py-3 font-medium">{copy.status}</th>
              <th className="px-4 py-3 text-right font-medium">
                {copy.tokens}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {copy.latency}
              </th>
              <th className="px-4 py-3 text-right font-medium">{copy.cost}</th>
              <th className="px-4 py-3 font-medium">{copy.code}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-muted-foreground px-4 py-3">
                  {formatDate(log.createdAt, copy.dateLocale)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {copy.operationLabel(log.operation)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={log.status} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {log.totalTokens.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {log.latencyMs === null ? "-" : `${log.latencyMs} ms`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatEstimatedCost(log.estimatedCostMicros)}
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {log.errorCode ?? "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  {copy.noUsage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const copy = useAiStudioCopy();
  const normalized = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        ["READY", "SUCCEEDED"].includes(normalized) &&
          "bg-success/10 text-success",
        ["FAILED", "BLOCKED"].includes(normalized) &&
          "bg-destructive/10 text-destructive",
        ["STARTED", "QUEUED", "PROCESSING"].includes(normalized) &&
          "bg-warning/10 text-warning",
      )}
    >
      {copy.statusLabel(status)}
    </span>
  );
}

function showError(
  error: unknown,
  title: string,
  fallback: string,
  localize: (message: string | undefined, fallback: string) => string,
) {
  toast({
    title,
    description: localize(
      error instanceof Error ? error.message : undefined,
      fallback,
    ),
    variant: "destructive",
  });
}

function formatDate(value: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function fileSafeTitle(value: string): string {
  return (
    value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "animation"
  );
}

function formatEstimatedCost(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}
