import {
  Archive,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createCmsPost,
  deleteCmsPost,
  getCmsPosts,
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
import {
  CMS_POST_STATUSES,
  type CmsPostListItem,
  type CmsPostStatusValue,
  type CmsPostWriteInput,
  type CmsTaxonomy,
} from "../types";
import { getCmsSeoReadinessIssues, normalizeCmsSlug } from "../validation";

const EMPTY_POST: CmsPostWriteInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "DRAFT",
  authorId: "",
  tagIds: [],
};

export function PostWorkspace({ taxonomy }: { taxonomy: CmsTaxonomy }) {
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
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`))
      return;
    try {
      await deleteCmsPost({ id: post.id });
      if (selectedPost?.id === post.id) {
        setSelectedPost(null);
        setIsCreating(false);
      }
      await posts.refetch();
      toast({ title: "Post deleted" });
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border-border bg-muted/30 flex flex-col gap-3 border px-4 py-3 lg:flex-row lg:items-center">
        <div className="relative min-w-64 flex-1">
          <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
          <Input
            aria-label="Search posts"
            placeholder="Search title, slug or excerpt"
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value as CmsPostStatusValue | undefined);
            setPage(1);
          }}
          options={CMS_POST_STATUSES.map((value) => ({
            value,
            label: formatStatus(value),
          }))}
        />
        <FilterSelect
          label="Author"
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
          label="Tag"
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
          <FilePlus2 /> New post
        </Button>
      </div>

      {!taxonomy.authors.length && (
        <p className="border-warning/50 bg-warning/10 text-foreground border px-4 py-3 text-sm">
          Add an author before creating a post.
        </p>
      )}

      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(560px,1.5fr)]">
        <section
          className="border-border overflow-hidden border"
          aria-label="Posts"
        >
          <div className="border-border flex h-12 items-center justify-between border-b px-4">
            <p className="font-medium">{posts.data?.total ?? 0} posts</p>
            {posts.isLoading && (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            )}
          </div>
          {posts.error && (
            <p className="text-destructive p-4 text-sm">
              {posts.error.message}
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
                    {post.author.name} |{" "}
                    {new Date(post.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit post"
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
                    title="Delete post"
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
                No posts match these filters.
              </p>
            )}
          </div>
          {posts.data && posts.data.totalPages > 1 && (
            <div className="border-border flex items-center justify-between border-t px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                title="Previous page"
                disabled={page === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft />
              </Button>
              <span className="text-muted-foreground text-xs">
                Page {page} of {posts.data.totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                title="Next page"
                disabled={page === posts.data.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </section>

        <section className="border-border border" aria-label="Post editor">
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
              <p className="text-sm">
                Select a post to edit or create a new one.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
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
        }
      : { ...EMPTY_POST, authorId: taxonomy.authors[0]?.id ?? "" },
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const [isSaving, setIsSaving] = useState(false);
  const normalizedSlug = normalizeCmsSlug(form.slug || form.title);
  const seoIssues = useMemo(
    () => getCmsSeoReadinessIssues({ ...form, slug: normalizedSlug }),
    [form, normalizedSlug],
  );

  const setField = <Key extends keyof CmsPostWriteInput>(
    key: Key,
    value: CmsPostWriteInput[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setIsSaving(true);
    try {
      const input = { ...form, slug: normalizedSlug };
      if (post) {
        await updateCmsPost({ id: post.id, ...input });
      } else {
        await createCmsPost(input);
      }
      toast({ title: post ? "Post updated" : "Post created" });
      await onSaved();
    } catch (error) {
      showError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="border-border flex min-h-12 flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <p className="font-medium">{post ? "Edit post" : "New post"}</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={
              isSaving ||
              !form.title.trim() ||
              !form.authorId ||
              (form.status === "PUBLISHED" && seoIssues.length > 0)
            }
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cms-title">Title</Label>
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
            {form.title.length}/65 recommended
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cms-slug">Slug</Label>
          <Input
            id="cms-slug"
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              setField("slug", event.currentTarget.value);
            }}
            onBlur={() => setField("slug", normalizedSlug)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cms-author">Author</Label>
          <Select
            value={form.authorId}
            onValueChange={(value) => setField("authorId", value)}
          >
            <SelectTrigger id="cms-author">
              <SelectValue placeholder="Select author" />
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
          <Label htmlFor="cms-excerpt">Search excerpt</Label>
          <Textarea
            id="cms-excerpt"
            value={form.excerpt}
            maxLength={320}
            className="min-h-20"
            onChange={(event) => setField("excerpt", event.currentTarget.value)}
          />
          <p className="text-muted-foreground text-right text-xs">
            {form.excerpt.length}/160 recommended
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cms-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              setField("status", value as CmsPostStatusValue)
            }
          >
            <SelectTrigger id="cms-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CMS_POST_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatStatus(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tags</legend>
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
              <span className="text-muted-foreground text-sm">No tags yet</span>
            )}
          </div>
        </fieldset>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cms-content">Article body (Markdown or HTML)</Label>
          <Textarea
            id="cms-content"
            value={form.content}
            className="min-h-[360px] resize-y font-mono text-sm"
            onChange={(event) => setField("content", event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="border-border bg-muted/25 border-t px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Archive className="size-4" />
          <p className="text-sm font-medium">SEO readiness</p>
        </div>
        {seoIssues.length === 0 ? (
          <p className="text-success text-sm">Ready to publish.</p>
        ) : (
          <ul className="text-muted-foreground space-y-1 text-sm">
            {seoIssues.map((issue) => (
              <li key={issue.code}>- {issue.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(next === "all" ? undefined : next)}
    >
      <SelectTrigger className="w-full lg:w-40" aria-label={`${label} filter`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusBadge({ status }: { status: CmsPostStatusValue }) {
  const styles: Record<CmsPostStatusValue, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PUBLISHED: "bg-success/15 text-success",
    ARCHIVED: "bg-warning/15 text-warning",
  };
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(status: CmsPostStatusValue) {
  return status[0] + status.slice(1).toLowerCase();
}

function showError(error: unknown) {
  toast({
    title: "CMS operation failed",
    description: error instanceof Error ? error.message : "Unexpected error",
    variant: "destructive",
  });
}
