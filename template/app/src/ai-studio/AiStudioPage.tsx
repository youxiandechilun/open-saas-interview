import {
  Clock3,
  Download,
  Film,
  Gauge,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "wasp/client/api";
import {
  generateAiAnimation,
  getAiStudioDashboard,
  optimizeAiAnimationPrompt,
  requestAiAnimationVideo,
  retryAiAnimationVideo,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Progress } from "../client/components/ui/progress";
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import { AI_PREVIEW_IFRAME_SANDBOX, buildSandboxSrcDoc } from "./security";
import type {
  AiStudioDashboard,
  AnimationView,
  PromptOptimizationView,
  PromptScore,
} from "./types";

type BusyAction = "optimize" | "generate" | `video:${string}` | null;
type VideoFormat = "mp4" | "webm";

export function AiStudioPage() {
  const {
    data: dashboard,
    isLoading,
    refetch,
  } = useQuery(getAiStudioDashboard);
  const [prompt, setPrompt] = useState("");
  const [optimization, setOptimization] =
    useState<PromptOptimizationView | null>(null);
  const [selected, setSelected] = useState<AnimationView | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
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
    setBusy("optimize");
    try {
      const result = await optimizeAiAnimationPrompt({
        prompt,
        idempotencyKey: newRequestKey("optimize"),
      });
      setOptimization(result);
      await refetch();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    if (!optimization) return;
    setBusy("generate");
    try {
      const animation = await generateAiAnimation({
        optimizationId: optimization.optimizationId,
        idempotencyKey: newRequestKey("generate"),
      });
      setSelected(animation);
      await refetch();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(null);
    }
  };

  const handleVideo = async (animation: AnimationView, retry: boolean) => {
    setBusy(`video:${animation.id}`);
    try {
      const action = retry ? retryAiAnimationVideo : requestAiAnimationVideo;
      const updated = await action({
        animationId: animation.id,
        format: videoFormat,
        idempotencyKey: newRequestKey(retry ? "retry" : "video"),
      });
      setSelected(updated);
      await refetch();
    } catch (error) {
      showError(error);
    } finally {
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
      showError(error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="bg-background min-h-screen py-8 lg:py-12">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
        <header className="border-b pb-6">
          <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
            AI Animation Studio
          </h1>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <div className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="animation-prompt"
                className="text-sm font-semibold"
              >
                Animation prompt
              </label>
              <Textarea
                id="animation-prompt"
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.currentTarget.value);
                  setOptimization(null);
                }}
                rows={8}
                maxLength={4_000}
                placeholder="A kinetic typography sequence where..."
                className="resize-y"
              />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs tabular-nums">
                  {prompt.length} / 4,000
                </span>
                <Button
                  type="button"
                  onClick={handleOptimize}
                  disabled={prompt.trim().length < 20 || busy !== null}
                >
                  {busy === "optimize" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <WandSparkles />
                  )}
                  Optimize
                </Button>
              </div>
            </div>

            {optimization && (
              <div className="space-y-5 border-t pt-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <PromptVersion
                    label="Before"
                    prompt={optimization.originalPrompt}
                    score={optimization.originalScore}
                  />
                  <PromptVersion
                    label="After"
                    prompt={optimization.optimizedPrompt}
                    score={optimization.score}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={busy !== null}
                  >
                    {busy === "generate" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                    Generate animation
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex min-h-9 items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Preview</h2>
              <div className="border-input inline-flex rounded-md border p-0.5">
                {(["mp4", "webm"] as const).map((format) => (
                  <Button
                    key={format}
                    type="button"
                    size="sm"
                    variant={videoFormat === format ? "secondary" : "ghost"}
                    className="h-7 px-3 uppercase"
                    onClick={() => setVideoFormat(format)}
                  >
                    {format}
                  </Button>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 aspect-video w-full overflow-hidden rounded-lg border">
              {previewSrcDoc ? (
                <iframe
                  title={`Preview of ${selected?.title ?? "animation"}`}
                  srcDoc={previewSrcDoc}
                  sandbox={AI_PREVIEW_IFRAME_SANDBOX}
                  referrerPolicy="no-referrer"
                  className="h-full w-full bg-white"
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  <Play className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
            </div>
            {selected && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selected.title}
                  </p>
                  <VideoState animation={selected} />
                </div>
                <VideoActions
                  animation={selected}
                  busy={busy === `video:${selected.id}`}
                  onRender={() => handleVideo(selected, false)}
                  onRetry={() => handleVideo(selected, true)}
                  onDownload={() => handleDownload(selected)}
                />
              </div>
            )}
          </div>
        </section>

        <UsageBand dashboard={dashboard} isLoading={isLoading} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">History</h2>
            <span className="text-muted-foreground text-sm tabular-nums">
              {dashboard?.animations.length ?? 0}
            </span>
          </div>
          {dashboard?.animations.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.animations.map((animation) => (
                <Card key={animation.id} className="rounded-lg shadow-sm">
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="min-w-0 truncate text-base">
                        {animation.title}
                      </CardTitle>
                      <StatusPill status={animation.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                      {animation.description ?? animation.generationError}
                    </p>
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5" />{" "}
                        {animation.promptScore}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(animation.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={animation.status !== "READY"}
                        onClick={() => setSelected(animation)}
                      >
                        <Play /> Preview
                      </Button>
                      <VideoActions
                        animation={animation}
                        busy={busy === `video:${animation.id}`}
                        onRender={() => handleVideo(animation, false)}
                        onRetry={() => handleVideo(animation, true)}
                        onDownload={() => handleDownload(animation)}
                      />
                    </div>
                    <VideoState animation={animation} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground border-y py-12 text-center text-sm">
              No animations yet
            </div>
          )}
        </section>

        <UsageLogTable logs={dashboard?.logs ?? []} />
      </div>
    </main>
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
        <ScoreRow label="Clarity" value={score.clarity} />
        <ScoreRow label="Specificity" value={score.specificity} />
        <ScoreRow label="Motion" value={score.motionDirection} />
        <ScoreRow label="Feasibility" value={score.feasibility} />
      </div>
      <ul className="text-muted-foreground space-y-1 text-xs">
        {score.feedback.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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
}: {
  animation: AnimationView;
  busy: boolean;
  onRender: () => void;
  onRetry: () => void;
  onDownload: () => void;
}) {
  if (busy || ["QUEUED", "PROCESSING"].includes(animation.videoStatus)) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled
        title="Rendering video"
      >
        <Loader2 className="animate-spin" />
      </Button>
    );
  }
  if (animation.videoStatus === "SUCCEEDED") {
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onDownload}
        title="Download video"
      >
        <Download />
      </Button>
    );
  }
  if (animation.videoStatus === "FAILED") {
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onRetry}
        title="Retry video"
      >
        <RotateCcw />
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={onRender}
      disabled={animation.status !== "READY"}
      title="Render video"
    >
      <Film />
    </Button>
  );
}

function VideoState({ animation }: { animation: AnimationView }) {
  const text = animation.videoStatus.replaceAll("_", " ").toLowerCase();
  return (
    <p className="text-muted-foreground truncate text-xs">
      Video: {text}
      {animation.videoAttempts > 0
        ? ` - attempt ${animation.videoAttempts}/3`
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
  const usage = dashboard?.usage;
  return (
    <section className="border-y py-6">
      <h2 className="mb-4 text-lg font-semibold">Usage</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <Metric
          label="Requests this hour"
          value={
            isLoading
              ? "..."
              : `${usage?.usedThisHour ?? 0} / ${usage?.hourlyLimit ?? 20}`
          }
        />
        <Metric
          label="Remaining"
          value={isLoading ? "..." : String(usage?.remainingThisHour ?? 0)}
        />
        <Metric
          label="In flight"
          value={isLoading ? "..." : String(usage?.inFlight ?? 0)}
        />
        <Metric
          label="Tokens"
          value={isLoading ? "..." : (usage?.totalTokens ?? 0).toLocaleString()}
        />
        <Metric
          label="Token budget"
          value={
            isLoading
              ? "..."
              : `${(usage?.tokensUsedThisHour ?? 0).toLocaleString()} / ${(usage?.hourlyTokenLimit ?? 100_000).toLocaleString()}`
          }
        />
        <Metric
          label="Estimated cost"
          value={
            isLoading
              ? "..."
              : formatEstimatedCost(usage?.estimatedCostMicros ?? 0)
          }
        />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function UsageLogTable({ logs }: { logs: AiStudioDashboard["logs"] }) {
  return (
    <section className="space-y-4 pb-8">
      <h2 className="text-xl font-semibold">AI usage log</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Operation</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Tokens</th>
              <th className="px-4 py-3 text-right font-medium">Latency</th>
              <th className="px-4 py-3 text-right font-medium">Est. cost</th>
              <th className="px-4 py-3 font-medium">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-muted-foreground px-4 py-3">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {log.operation.replaceAll("_", " ")}
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
                  No usage recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
        ["READY", "SUCCEEDED"].includes(normalized) &&
          "bg-success/10 text-success",
        ["FAILED", "BLOCKED"].includes(normalized) &&
          "bg-destructive/10 text-destructive",
        ["STARTED", "QUEUED", "PROCESSING"].includes(normalized) &&
          "bg-warning/10 text-warning",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function newRequestKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function showError(error: unknown) {
  toast({
    title: "Request failed",
    description:
      error instanceof Error ? error.message : "Something went wrong",
    variant: "destructive",
  });
}

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat(undefined, {
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
