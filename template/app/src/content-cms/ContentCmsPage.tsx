import { BookOpenText, Tags, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import { getCmsTaxonomy, useQuery } from "wasp/client/operations";
import { routes } from "wasp/client/router";
import { Breadcrumb } from "../admin/layout/Breadcrumb";
import { LoadingSpinner } from "../admin/layout/LoadingSpinner";
import { Button } from "../client/components/ui/button";
import { WorkspaceLayout } from "../client/components/workspace/WorkspaceLayout";
import { hasPublishingAccess } from "../client/components/workspace/permissions";
import { PostWorkspace } from "./components/PostWorkspace";
import { TaxonomyManager } from "./components/TaxonomyManager";
import { useCmsCopy } from "./i18n";
import {
  CMS_PUBLICATION_TASKS_HASH,
  CMS_PUBLICATION_TASKS_ID,
} from "./publicationTask";

type CmsView = "posts" | "authors" | "tags";

export function ContentCmsPage({ user }: { user: AuthUser }) {
  if (!hasPublishingAccess(user)) {
    return <Navigate to={routes.AdminRoute.to} replace />;
  }

  return <ContentCmsWorkspace user={user} />;
}

function ContentCmsWorkspace({ user }: { user: AuthUser }) {
  const [view, setView] = useState<CmsView>("posts");
  const location = useLocation();
  const taxonomy = useQuery(getCmsTaxonomy);
  const { t } = useCmsCopy();

  useEffect(() => {
    if (location.hash !== CMS_PUBLICATION_TASKS_HASH) return;
    if (view !== "posts" || !taxonomy.data) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(CMS_PUBLICATION_TASKS_ID)?.scrollIntoView({
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, taxonomy.data, view]);

  return (
    <WorkspaceLayout user={user}>
      <Breadcrumb pageName={t("pageTitle")} homeLabel={t("dashboard")} />
      <div className="border-border mb-6 flex flex-wrap gap-1 border-b">
        <ViewButton
          active={view === "posts"}
          icon={<BookOpenText />}
          onClick={() => setView("posts")}
        >
          {t("posts")}
        </ViewButton>
        <ViewButton
          active={view === "authors"}
          icon={<Users />}
          onClick={() => setView("authors")}
        >
          {t("authors")}
        </ViewButton>
        <ViewButton
          active={view === "tags"}
          icon={<Tags />}
          onClick={() => setView("tags")}
        >
          {t("tags")}
        </ViewButton>
      </div>

      {taxonomy.isLoading && <LoadingSpinner />}
      {taxonomy.error && (
        <p className="text-destructive text-sm">{t("loadDataError")}</p>
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
    </WorkspaceLayout>
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
