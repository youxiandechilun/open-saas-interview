import { type ReactNode, useState } from "react";
import { Navigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import { routes } from "wasp/client/router";
import { Header } from "../../../admin/layout/Header";
import { Sidebar } from "../../../admin/layout/Sidebar";
import { hasAdminAccess } from "./permissions";

type WorkspaceLayoutProps = {
  user: AuthUser;
  children?: ReactNode;
  adminOnly?: boolean;
};

export function WorkspaceLayout({
  user,
  children,
  adminOnly = false,
}: WorkspaceLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (adminOnly && !hasAdminAccess(user)) {
    return <Navigate to={routes.AdminRoute.to} replace />;
  }

  return (
    <div className="bg-muted/30 text-foreground min-h-screen">
      <a
        href="#workspace-main"
        className="bg-background text-foreground focus:ring-primary fixed left-3 top-3 z-50 -translate-y-20 rounded-md px-3 py-2 text-sm font-medium focus:translate-y-0 focus:outline-none focus:ring-2"
      >
        Skip to workspace content
      </a>

      <div className="flex min-h-screen">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close workspace navigation"
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="min-w-0 flex-1">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            user={user}
          />
          <main id="workspace-main" tabIndex={-1} className="outline-none">
            <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
