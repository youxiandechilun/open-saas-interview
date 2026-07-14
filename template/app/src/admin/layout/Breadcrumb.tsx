import { ChevronRight, Home } from "lucide-react";
import { Link, routes } from "wasp/client/router";

interface BreadcrumbProps {
  pageName: string;
  homeLabel?: string;
}

export function Breadcrumb({
  pageName,
  homeLabel = "Overview",
}: BreadcrumbProps) {
  return (
    <div className="mb-6 space-y-2">
      <nav aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <li>
            <Link
              to={routes.AdminRoute.to}
              className="hover:text-foreground focus-visible:ring-primary inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2"
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              {homeLabel}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page">{pageName}</li>
        </ol>
      </nav>
      <h1 className="text-foreground text-2xl font-bold">{pageName}</h1>
    </div>
  );
}
