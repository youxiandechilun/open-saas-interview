import { BookOpenText, Tags, Users } from "lucide-react";
import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getCmsTaxonomy, useQuery } from "wasp/client/operations";
import { Breadcrumb } from "../admin/layout/Breadcrumb";
import { DefaultLayout } from "../admin/layout/DefaultLayout";
import { LoadingSpinner } from "../admin/layout/LoadingSpinner";
import { Button } from "../client/components/ui/button";
import { PostWorkspace } from "./components/PostWorkspace";
import { TaxonomyManager } from "./components/TaxonomyManager";

type CmsView = "posts" | "authors" | "tags";

export function ContentCmsPage({ user }: { user: AuthUser }) {
  const [view, setView] = useState<CmsView>("posts");
  const taxonomy = useQuery(getCmsTaxonomy);

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Content CMS" />
      <div className="border-border mb-6 flex flex-wrap gap-1 border-b">
        <ViewButton
          active={view === "posts"}
          icon={<BookOpenText />}
          onClick={() => setView("posts")}
        >
          Posts
        </ViewButton>
        <ViewButton
          active={view === "authors"}
          icon={<Users />}
          onClick={() => setView("authors")}
        >
          Authors
        </ViewButton>
        <ViewButton
          active={view === "tags"}
          icon={<Tags />}
          onClick={() => setView("tags")}
        >
          Tags
        </ViewButton>
      </div>

      {taxonomy.isLoading && <LoadingSpinner />}
      {taxonomy.error && (
        <p className="text-destructive text-sm">
          Could not load CMS data: {taxonomy.error.message}
        </p>
      )}
      {taxonomy.data && view === "posts" && (
        <PostWorkspace taxonomy={taxonomy.data} />
      )}
      {taxonomy.data && view !== "posts" && (
        <TaxonomyManager
          kind={view}
          taxonomy={taxonomy.data}
          onChanged={taxonomy.refetch}
        />
      )}
    </DefaultLayout>
  );
}

function ViewButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={`rounded-none border-b-2 ${
        active
          ? "border-primary text-foreground"
          : "text-muted-foreground border-transparent"
      }`}
    >
      {icon}
      {children}
    </Button>
  );
}
