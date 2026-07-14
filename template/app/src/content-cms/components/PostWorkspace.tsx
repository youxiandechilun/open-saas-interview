import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  FilePlus2,
  ListTodo,
  Loader2,
  Pencil,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createCmsPost,
  deleteCmsPost,
  getCmsPosts,
  getCmsPublicationTasks,
  retryCmsPublicationEvent,
  updateCmsPost,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { Checkbox } from "../../client/components/ui/checkbox";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { Textarea } from "../../client/components/ui/textarea";
import { toast } from "../../client/hooks/use-toast";
import { useDebounce } from "../../client/hooks/useDebounce";
import { type CmsTranslate, useCmsCopy } from "../i18n";
import { isRetryablePublicationStatus } from "../publicationPolicy";
import { CMS_PUBLICATION_TASKS_ID } from "../publicationTask";
import { getCmsPublicMediaDescriptor } from "../publicMedia";
import { getCmsPublicUrl } from "../publicUrl";
import {
  CMS_POST_STATUSES,
  type CmsPostListItem,
  type CmsPostStatusValue,
  type CmsPublicationTaskSummary,
  type CmsPostWriteInput,
  type CmsTaxonomy,
} from "../types";
import { getCmsSeoReadinessIssues, normalizeCmsSlug } from "../validation";

const NO_ANIMATION_VALUE = "none";

const EMPTY_POST: CmsPostWriteInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "DRAFT",
  authorId: "",
  tagIds: [],
  animationId: null,
};

export function PostWorkspace({ taxonomy }: { taxonomy: CmsTaxonomy }) {
  const { formatDate, statusLabel, t } = useCmsCopy();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CmsPostStatusValue | undefined>();
  const [authorId, setAuthorId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [selectedPost, setSelectedPost] = useState<CmsPostListItem | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 250);

  const posts = useQuery(getCmsPosts, {
    page,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
    ...(authorId && { authorId }),
    ...(tagId && { tagId }),
  });

  const openNewPost = () => {
    setSelectedPost(null);
    setIsCreating(true);
  };

  const removePost = async (post: CmsPostListItem) => {
    if (!window.confirm(t("deletePostConfirm", { title: post.title }))) return;
    try {
      await deleteCmsPost({ id: post.id });
      if (selectedPost?.id === post.id) {
        setSelectedPost(null);
        setIsCreating(false);
      }
      await posts.refetch();
      toast({ title: t("postDeleted") });
    } catch (error) {
      showError(error, t);
    }
  };

  return (
    <div className="space-y-5">
      <PublicationTasksPanel />
      <div className="border-border bg-muted/30 flex flex-col gap-3 border px-4 py-3 lg:flex-row lg:items-center">
        <div className="relative min-w-64 flex-1">
          <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
          <Input
            aria-label={t("searchPosts")}
            placeholder={t("searchPostsPlaceholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <FilterSelect
          label={t("status")}
          ariaLabel={t("statusFilter")}
          allLabel={t("allStatuses")}
          value={status}
          onChange={(value) => {
            setStatus(value as CmsPostStatusValue | undefined);
            setPage(1);
          }}
          options={CMS_POST_STATUSES.map((value) => ({
            value,
            label: statusLabel(value),
          }))}
        />
        <FilterSelect
          label={t("author")}
          ariaLabel={t("authorFilter")}
          allLabel={t("allAuthors")}
          value={authorId}
          onChange={(value) => {
            setAuthorId(value);
            setPage(1);
          }}
          options={taxonomy.authors.map(({ id, name }) => ({
            value: id,
            label: name,
          }))}
        />
        <FilterSelect
          label={t("tag")}
          ariaLabel={t("tagFilter")}
          allLabel={t("allTags")}
          value={tagId}
          onChange={(value) => {
            setTagId(value);
            setPage(1);
          }}
          options={taxonomy.tags.map(({ id, name }) => ({
            value: id,
            label: name,
          }))}
        />
        <Button
          type="button"
          onClick={openNewPost}
          disabled={!taxonomy.authors.length}
        >
          <FilePlus2 /> {t("newPost")}
        </Button>
      </div>

      {!taxonomy.authors.length && (
        <p className="border-warning/50 bg-warning/10 text-foreground border px-4 py-3 text-sm">
          {t("authorRequired")}
        </p>
      )}

      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(560px,1.5fr)]">
        <section
          className="border-border overflow-hidden border"
          aria-label={t("posts")}
        >
          <div className="border-border flex h-12 items-center justify-between border-b px-4">
            <p className="font-medium">
              {t(
                (posts.data?.total ?? 0) === 1
                  ? "postCountOne"
                  : "postCountMany",
                { count: posts.data?.total ?? 0 },
              )}
            </p>
            {posts.isLoading && (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            )}
          </div>
          {posts.error && (
            <p className="text-destructive p-4 text-sm">
              {t("loadPostsError")}
            </p>
          )}
          <div className="divide-border divide-y">
            {posts.data?.items.map((post) => (
              <article
                key={post.id}
                className={`grid grid-cols-[1fr_auto] gap-3 px-4 py-3 ${
                  selectedPost?.id === post.id
                    ? "bg-accent"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    /{post.slug}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {post.author.name} | {formatDate(post.updatedAt)}
                  </p>
                  {post.animation && (
                    <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
                      <Film className="size-3 shrink-0" />
                      {post.animation.title}
                    </p>
                  )}
                  {post.latestPublicationEvent && (
                    <div className="mt-2">
                      <PublicationBadge
                        status={post.latestPublicationEvent.status}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("editPost")}
                    onClick={() => {
                      setSelectedPost(post);
                      setIsCreating(false);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("deletePost")}
                    className="text-destructive hover:text-destructive"
                    onClick={() => removePost(post)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            ))}
            {!posts.isLoading && posts.data?.items.length === 0 && (
              <p className="text-muted-foreground p-8 text-center text-sm">
                {t("noMatchingPosts")}
              </p>
            )}
          </div>
          {posts.data && posts.data.totalPages > 1 && (
            <div className="border-border flex items-center justify-between border-t px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                title={t("previousPage")}
                disabled={page === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft />
              </Button>
              <span className="text-muted-foreground text-xs">
                {t("pagination", {
                  page,
                  totalPages: posts.data.totalPages,
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                title={t("nextPage")}
                disabled={page === posts.data.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </section>

        <section className="border-border border" aria-label={t("postEditor")}>
          {selectedPost || isCreating ? (
            <PostEditor
              key={selectedPost?.id ?? "new"}
              post={selectedPost}
              taxonomy={taxonomy}
              onSaved={async () => {
                setSelectedPost(null);
                setIsCreating(false);
                await posts.refetch();
              }}
              onCancel={() => {
                setSelectedPost(null);
                setIsCreating(false);
              }}
            />
          ) : (
            <div className="text-muted-foreground flex min-h-[620px] flex-col items-center justify-center gap-3 p-8 text-center">
              <FilePlus2 className="size-8" />
              <p className="text-sm">{t("selectPost")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PublicationTasksPanel() {
  const { formatDateTime, t } = useCmsCopy();
  const tasks = useQuery(getCmsPublicationTasks, undefined, {
    refetchInterval: 15_000,
  });
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);

  const retryTask = async (task: CmsPublicationTaskSummary) => {
    setRetryingEventId(task.eventId);
    try {
      await retryCmsPublicationEvent({ id: task.eventId });
      toast({ title: t("publicationRetryQueued") });
      await tasks.refetch();
    } catch (error) {
      showError(error, t);
    } finally {
      setRetryingEventId(null);
    }
  };

  return (
    <section
      id={CMS_PUBLICATION_TASKS_ID}
      aria-labelledby="publication-tasks-heading"
      className="border-border scroll-mt-24 border"
    >
      <div className="border-border flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <ListTodo className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <h2 id="publication-tasks-heading" className="text-sm font-medium">
              {t("publicationTasks")}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("publicationTasksDescription")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={t("refreshPublicationTasks")}
          disabled={tasks.isLoading}
          onClick={() => tasks.refetch()}
        >
          <RefreshCcw
            className={tasks.isLoading ? "animate-spin" : undefined}
          />
        </Button>
      </div>

      {tasks.error ? (
        <p className="text-destructive px-4 py-3 text-sm">
          {t("publicationTasksLoadError")}
        </p>
      ) : tasks.isLoading && !tasks.data ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : tasks.data?.length ? (
        <ul className="divide-border divide-y">
          {tasks.data.map((task) => {
            const isRetrying = retryingEventId === task.eventId;
            return (
              <li
                key={task.eventId}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {task.slug
                        ? `/${task.slug}`
                        : t("publicationTaskFallback", {
                            id: task.postId.slice(0, 8),
                          })}
                    </p>
                    <PublicationBadge status={task.status} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {task.eventType} |{" "}
                    {t("publicationTaskAttempts", { count: task.attempts })} |{" "}
                    {t("publicationTaskUpdated", {
                      time: formatDateTime(task.updatedAt),
                    })}
                  </p>
                  {task.lastError && (
                    <p className="text-muted-foreground mt-1 break-words text-xs">
                      {task.lastError}
                    </p>
                  )}
                </div>
                {isRetryablePublicationStatus(task.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={retryingEventId !== null}
                    onClick={() => retryTask(task)}
                  >
                    {isRetrying ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCcw />
                    )}
                    {t("retryPublication")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground px-4 py-5 text-sm">
          {t("noPublicationTasks")}
        </p>
      )}
    </section>
  );
}

function PostEditor({
  post,
  taxonomy,
  onSaved,
  onCancel,
}: {
  post: CmsPostListItem | null;
  taxonomy: CmsTaxonomy;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const {
    animationVideoStatusLabel,
    publicationStatusLabel,
    seoIssueLabel,
    t,
  } = useCmsCopy();
  const [form, setForm] = useState<CmsPostWriteInput>(() =>
    post
      ? {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          status: post.status,
          authorId: post.author.id,
          tagIds: post.tags.map(({ id }) => id),
          animationId: post.animation?.id ?? null,
        }
      : { ...EMPTY_POST, authorId: taxonomy.authors[0]?.id ?? "" },
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const [savingStatus, setSavingStatus] = useState<CmsPostStatusValue | null>(
    null,
  );
  const isSaving = savingStatus !== null;
  const normalizedSlug = normalizeCmsSlug(form.slug || form.title);
  const seoIssues = useMemo(
    () => getCmsSeoReadinessIssues({ ...form, slug: normalizedSlug }),
    [form, normalizedSlug],
  );
  const seoScore = Math.max(0, 100 - seoIssues.length * 12);
  const publicUrl = getCmsPublicUrl(
    import.meta.env.REACT_APP_BLOG_URL,
    normalizedSlug,
  );
  const selectableAnimations = useMemo(() => {
    if (
      !post?.animation ||
      taxonomy.animations.some(({ id }) => id === post.animation?.id)
    ) {
      return taxonomy.animations;
    }
    return [post.animation, ...taxonomy.animations];
  }, [post?.animation, taxonomy.animations]);
  const selectedAnimation = selectableAnimations.find(
    ({ id }) => id === form.animationId,
  );
  const selectedAnimationIsPublishable = Boolean(
    getCmsPublicMediaDescriptor(selectedAnimation ?? null),
  );

  const setField = <Key extends keyof CmsPostWriteInput>(
    key: Key,
    value: CmsPostWriteInput[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (nextStatus: CmsPostStatusValue) => {
    if (
      post?.status === "PUBLISHED" &&
      nextStatus !== "PUBLISHED" &&
      !window.confirm(t("unpublishConfirm"))
    ) {
      return;
    }
    setSavingStatus(nextStatus);
    try {
      const input = { ...form, slug: normalizedSlug, status: nextStatus };
      if (post) {
        await updateCmsPost({ id: post.id, ...input });
      } else {
        await createCmsPost(input);
      }
      toast({ title: post ? t("postUpdated") : t("postCreated") });
      await onSaved();
    } catch (error) {
      showError(error, t);
    } finally {
      setSavingStatus(null);
    }
  };

  const retryPublication = async () => {
    if (!post?.latestPublicationEvent) return;
    try {
      await retryCmsPublicationEvent({ id: post.latestPublicationEvent.id });
      toast({ title: t("publicationRetryQueued") });
      await onSaved();
    } catch (error) {
      showError(error, t);
    }
  };

  return (
    <div>
      <div className="border-border flex min-h-12 flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <p className="font-medium">{post ? t("editPost") : t("newPost")}</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
          {post && post.status !== "ARCHIVED" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => save("ARCHIVED")}
              disabled={isSaving}
            >
              {savingStatus === "ARCHIVED" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Archive />
              )}
              {t("archivePost")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => save("DRAFT")}
            disabled={isSaving || !form.title.trim() || !form.authorId}
          >
            {savingStatus === "DRAFT" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            {post?.status === "PUBLISHED"
              ? t("unpublishToDraft")
              : t("saveDraft")}
          </Button>
          <Button
            type="button"
            onClick={() => save("PUBLISHED")}
            disabled={
              isSaving ||
              !form.title.trim() ||
              !form.authorId ||
              (Boolean(selectedAnimation) && !selectedAnimationIsPublishable) ||
              seoIssues.length > 0
            }
          >
            {savingStatus === "PUBLISHED" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            {post?.status === "PUBLISHED" ? t("updatePublished") : t("publish")}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cms-title">{t("title")}</Label>
          <Input
            id="cms-title"
            value={form.title}
            maxLength={180}
            onChange={(event) => {
              const title = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                title,
                ...(!slugEdited && { slug: normalizeCmsSlug(title) }),
              }));
            }}
          />
          <p className="text-muted-foreground text-right text-xs">
            {t("titleRecommendation", { count: form.title.length })}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cms-slug">{t("slug")}</Label>
          <Input
            id="cms-slug"
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              setField("slug", event.currentTarget.value);
            }}
            onBlur={() => setField("slug", normalizedSlug)}
          />
          {normalizedSlug && (
            <div className="text-muted-foreground space-y-1 text-xs">
              <p>{t("canonicalUrl")}</p>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary block break-all hover:underline"
              >
                {publicUrl}
              </a>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cms-author">{t("author")}</Label>
          <Select
            value={form.authorId}
            onValueChange={(value) => setField("authorId", value)}
          >
            <SelectTrigger id="cms-author">
              <SelectValue placeholder={t("selectAuthor")} />
            </SelectTrigger>
            <SelectContent>
              {taxonomy.authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cms-animation" className="flex items-center gap-2">
            <Film className="size-4" /> {t("animationAttachment")}
          </Label>
          <Select
            value={form.animationId ?? NO_ANIMATION_VALUE}
            onValueChange={(value) =>
              setField(
                "animationId",
                value === NO_ANIMATION_VALUE ? null : value,
              )
            }
          >
            <SelectTrigger id="cms-animation">
              <SelectValue placeholder={t("noAnimation")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ANIMATION_VALUE}>
                {t("noAnimation")}
              </SelectItem>
              {selectableAnimations.map((animation) => (
                <SelectItem
                  key={animation.id}
                  value={animation.id}
                  disabled={!getCmsPublicMediaDescriptor(animation)}
                >
                  {animation.title} ·{" "}
                  {animation.ownerLabel || t("animationOwnerUnknown")}
                  {!getCmsPublicMediaDescriptor(animation) &&
                    ` (${animationVideoStatusLabel(animation.videoStatus)})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {t("animationAttachmentHelp")}
          </p>
          {selectedAnimation && (
            <div className="border-border bg-muted/20 border px-3 py-2">
              <p className="text-xs font-medium">
                {t("selectedAnimation")}: {selectedAnimation.title}
              </p>
              {selectedAnimation.description && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {selectedAnimation.description}
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                {t("animationOwner", {
                  owner:
                    selectedAnimation.ownerLabel || t("animationOwnerUnknown"),
                })}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("animationVideoStatus", {
                  status: animationVideoStatusLabel(
                    selectedAnimation.videoStatus,
                  ),
                })}
              </p>
              {!selectedAnimationIsPublishable && (
                <p className="text-destructive mt-1 text-xs font-medium">
                  {t("animationNotPublishable")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cms-excerpt">{t("searchExcerpt")}</Label>
          <Textarea
            id="cms-excerpt"
            value={form.excerpt}
            maxLength={320}
            className="min-h-20"
            onChange={(event) => setField("excerpt", event.currentTarget.value)}
          />
          <p className="text-muted-foreground text-right text-xs">
            {t("excerptRecommendation", { count: form.excerpt.length })}
          </p>
        </div>
        <fieldset className="space-y-2 md:col-span-2">
          <legend className="text-sm font-medium">{t("tags")}</legend>
          <div className="border-input flex min-h-9 flex-wrap gap-3 border px-3 py-2">
            {taxonomy.tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.tagIds.includes(tag.id)}
                  onCheckedChange={(checked) =>
                    setField(
                      "tagIds",
                      checked
                        ? [...form.tagIds, tag.id]
                        : form.tagIds.filter((id) => id !== tag.id),
                    )
                  }
                />
                {tag.name}
              </label>
            ))}
            {!taxonomy.tags.length && (
              <span className="text-muted-foreground text-sm">
                {t("noTagsYet")}
              </span>
            )}
          </div>
        </fieldset>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cms-content">{t("articleBody")}</Label>
          <Textarea
            id="cms-content"
            value={form.content}
            className="min-h-[360px] resize-y font-mono text-sm"
            onChange={(event) => setField("content", event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="border-border bg-muted/25 space-y-4 border-t px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {seoIssues.length === 0 ? (
              <CheckCircle2 className="text-success size-4" />
            ) : (
              <AlertTriangle className="text-warning size-4" />
            )}
            <div>
              <p className="text-sm font-medium">{t("seoReadiness")}</p>
              <p className="text-muted-foreground text-xs">
                {t("seoScore", { score: seoScore })}
              </p>
            </div>
          </div>
          {post?.status === "PUBLISHED" && normalizedSlug && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink /> {t("openPublicPage")}
              </a>
            </Button>
          )}
        </div>
        {seoIssues.length === 0 ? (
          <p className="text-success text-sm">{t("readyToPublish")}</p>
        ) : (
          <div>
            <p className="text-muted-foreground mb-2 text-xs">
              {t("seoSuggestions")}
            </p>
            <ul className="space-y-2 text-sm">
              {seoIssues.map((issue) => (
                <li
                  key={issue.code}
                  className="border-border bg-background border px-3 py-2"
                >
                  <span className="font-medium">{issue.field}</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="text-muted-foreground">
                    {seoIssueLabel(issue.code)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="border-border border-t pt-3">
          <p className="text-sm font-medium">{t("publicationSync")}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("publicationDispatchHelp")}
          </p>
          {post?.latestPublicationEvent ? (
            <div className="mt-2 space-y-1 text-sm">
              <PublicationBadge status={post.latestPublicationEvent.status} />
              <p className="text-muted-foreground">
                {publicationStatusLabel(post.latestPublicationEvent.status)} |{" "}
                {new Date(
                  post.latestPublicationEvent.updatedAt,
                ).toLocaleString()}
              </p>
              {post.latestPublicationEvent.lastError && (
                <p className="text-muted-foreground break-words text-xs">
                  {post.latestPublicationEvent.lastError}
                </p>
              )}
              {isRetryablePublicationStatus(
                post.latestPublicationEvent.status,
              ) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retryPublication}
                >
                  <RefreshCcw /> {t("retryPublication")}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">
              {t("noPublicationEvent")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  ariaLabel,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  allLabel: string;
  value: string | undefined;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(next === "all" ? undefined : next)}
    >
      <SelectTrigger className="w-full lg:w-40" aria-label={ariaLabel}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PublicationBadge({ status }: { status: string }) {
  const { publicationStatusLabel } = useCmsCopy();
  const style =
    {
      PENDING: "bg-warning/15 text-warning",
      PROCESSING: "bg-primary/10 text-primary",
      PROCESSED: "bg-success/15 text-success",
      FAILED: "bg-destructive/10 text-destructive",
      DISABLED: "bg-muted text-muted-foreground",
    }[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${style}`}
    >
      {publicationStatusLabel(status)}
    </span>
  );
}

function StatusBadge({ status }: { status: CmsPostStatusValue }) {
  const { statusLabel } = useCmsCopy();
  const styles: Record<CmsPostStatusValue, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PUBLISHED: "bg-success/15 text-success",
    ARCHIVED: "bg-warning/15 text-warning",
  };
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function showError(error: unknown, t: CmsTranslate) {
  console.error(error);
  toast({
    title: t("operationFailed"),
    description:
      error instanceof Error && error.message
        ? error.message
        : t("unexpectedError"),
    variant: "destructive",
  });
}
