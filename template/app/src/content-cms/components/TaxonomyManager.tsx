import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createCmsAuthor,
  createCmsTag,
  deleteCmsAuthor,
  deleteCmsTag,
  updateCmsAuthor,
  updateCmsTag,
} from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Textarea } from "../../client/components/ui/textarea";
import { toast } from "../../client/hooks/use-toast";
import {
  type CmsAuthorSummary,
  type CmsTagSummary,
  type CmsTaxonomy,
} from "../types";
import { normalizeCmsSlug } from "../validation";

type EditableTaxonomy = CmsAuthorSummary | CmsTagSummary;

export function TaxonomyManager({
  kind,
  taxonomy,
  onChanged,
}: {
  kind: "authors" | "tags";
  taxonomy: CmsTaxonomy;
  onChanged: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState<EditableTaxonomy | "new" | null>(null);
  const items = taxonomy[kind];
  const singular = kind === "authors" ? "author" : "tag";

  const remove = async (item: EditableTaxonomy) => {
    if (!window.confirm(`Delete ${singular} "${item.name}"?`)) return;
    try {
      if (kind === "authors") {
        await deleteCmsAuthor({ id: item.id });
      } else {
        await deleteCmsTag({ id: item.id });
      }
      await onChanged();
      toast({ title: `${capitalize(singular)} deleted` });
    } catch (error) {
      showError(error);
    }
  };

  return (
    <section className="border-border border">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <h3 className="font-semibold">{capitalize(kind)}</h3>
        <Button type="button" onClick={() => setEditing("new")}>
          <Plus /> Add {singular}
        </Button>
      </div>

      <div className="divide-border divide-y">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                /{item.slug}
              </p>
              {"bio" in item && item.bio && (
                <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
                  {item.bio}
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                {item.postCount} {item.postCount === 1 ? "post" : "posts"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                title={`Edit ${singular}`}
                onClick={() => setEditing(item)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={
                  kind === "authors" && item.postCount > 0
                    ? "Reassign posts before deleting this author"
                    : `Delete ${singular}`
                }
                className="text-destructive hover:text-destructive"
                disabled={kind === "authors" && item.postCount > 0}
                onClick={() => remove(item)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-muted-foreground p-10 text-center text-sm">
            No {kind} yet.
          </p>
        )}
      </div>

      <TaxonomyDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        kind={kind}
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await onChanged();
        }}
      />
    </section>
  );
}

function TaxonomyDialog({
  kind,
  item,
  onClose,
  onSaved,
}: {
  kind: "authors" | "tags";
  item: EditableTaxonomy | "new" | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const existing = item && item !== "new" ? item : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [bio, setBio] = useState<string>(
    existing && "bio" in existing && typeof existing.bio === "string"
      ? existing.bio
      : "",
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(existing));
  const [isSaving, setIsSaving] = useState(false);
  const singular = kind === "authors" ? "author" : "tag";

  const save = async () => {
    setIsSaving(true);
    const input = { name, slug: normalizeCmsSlug(slug || name) };
    try {
      if (kind === "authors") {
        if (existing) {
          await updateCmsAuthor({ id: existing.id, ...input, bio });
        } else {
          await createCmsAuthor({ ...input, bio });
        }
      } else if (existing) {
        await updateCmsTag({ id: existing.id, ...input });
      } else {
        await createCmsTag(input);
      }
      toast({ title: `${capitalize(singular)} saved` });
      await onSaved();
    } catch (error) {
      showError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit" : "Add"} {singular}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Slugs become stable public identifiers and must be unique.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="taxonomy-name">Name</Label>
            <Input
              id="taxonomy-name"
              value={name}
              maxLength={80}
              onChange={(event) => {
                const nextName = event.currentTarget.value;
                setName(nextName);
                if (!slugEdited) setSlug(normalizeCmsSlug(nextName));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxonomy-slug">Slug</Label>
            <Input
              id="taxonomy-slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.currentTarget.value);
              }}
              onBlur={() => setSlug(normalizeCmsSlug(slug || name))}
            />
          </div>
          {kind === "authors" && (
            <div className="space-y-2">
              <Label htmlFor="author-bio">Bio</Label>
              <Textarea
                id="author-bio"
                value={bio}
                maxLength={1000}
                className="min-h-28"
                onChange={(event) => setBio(event.currentTarget.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isSaving || !name.trim()}
          >
            {isSaving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function showError(error: unknown) {
  toast({
    title: "CMS operation failed",
    description: error instanceof Error ? error.message : "Unexpected error",
    variant: "destructive",
  });
}
