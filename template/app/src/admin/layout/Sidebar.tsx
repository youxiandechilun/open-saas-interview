import {
  Blocks,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileText,
  KeyRound,
  LayoutDashboard,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, type ComponentType } from "react";
import { NavLink, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import { Link, routes } from "wasp/client/router";
import {
  getWorkspaceRole,
  hasAdminAccess,
  hasPublishingAccess,
} from "../../client/components/workspace/permissions";
import { cn } from "../../client/utils";
import { useI18n } from "../../i18n";

type SidebarProps = {
  user: AuthUser;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

type NavigationItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  exact?: boolean;
};

const copy = {
  en: {
    close: "Close navigation",
    workspace: "Workspace",
    administration: "Administration",
    overview: "Overview",
    animation: "Animation Studio",
    publishing: "Articles & Publishing",
    tasks: "Task Center",
    users: "Users & Roles",
    usage: "Usage & Cost",
    integrations: "AI Service Configuration",
    product: "MotionPress",
    environment: "Production workspace",
  },
  "zh-CN": {
    close: "关闭导航",
    workspace: "工作台",
    administration: "系统管理",
    overview: "运营概览",
    animation: "动画工作室",
    publishing: "文章与发布",
    tasks: "任务中心",
    users: "用户与角色",
    usage: "用量与成本",
    integrations: "AI 服务配置",
    product: "MotionPress",
    environment: "内容生产工作台",
  },
} as const;

export function Sidebar({ user, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { locale } = useI18n();
  const labels = copy[locale];
  const location = useLocation();
  const isAdmin = hasAdminAccess(user);
  const canPublish = hasPublishingAccess(user);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.hash, setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setSidebarOpen, sidebarOpen]);

  const workspaceItems: NavigationItem[] = [
    {
      label: labels.overview,
      to: routes.AdminRoute.to,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: labels.animation,
      to: routes.AiStudioRoute.to,
      icon: Sparkles,
      exact: true,
    },
    ...(canPublish
      ? [
          {
            label: labels.publishing,
            to: routes.ContentCmsAdminRoute.to,
            icon: FileText,
            exact: true,
          },
        ]
      : []),
    {
      label: labels.tasks,
      to: `${routes.AdminRoute.to}#task-center`,
      icon: Blocks,
    },
  ];

  const administrationItems: NavigationItem[] = isAdmin
    ? [
        {
          label: labels.users,
          to: routes.AdminUsersRoute.to,
          icon: Users,
          exact: true,
        },
        {
          label: labels.usage,
          to: `${routes.AdminRoute.to}#usage-cost`,
          icon: CircleDollarSign,
        },
        {
          label: labels.integrations,
          to: routes.AiProviderSettingsRoute.to,
          icon: KeyRound,
          exact: true,
        },
      ]
    : [];

  return (
    <aside
      id="workspace-sidebar"
      aria-label={labels.workspace}
      className={cn(
        "bg-background fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <Link
          to={routes.AdminRoute.to}
          className="focus-visible:ring-primary flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2"
        >
          <span className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">
              {labels.product}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {labels.environment}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label={labels.close}
          className="hover:bg-muted focus-visible:ring-primary flex h-10 w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <NavigationGroup label={labels.workspace} items={workspaceItems} />
        {administrationItems.length > 0 && (
          <NavigationGroup
            label={labels.administration}
            items={administrationItems}
            className="mt-7"
          />
        )}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <span className="bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold">
            {getInitials(user)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {user.email ?? user.username ?? "Workspace member"}
            </span>
            <span className="text-muted-foreground block text-xs">
              {getWorkspaceRole(user)}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavigationGroup({
  label,
  items,
  className,
}: {
  label: string;
  items: NavigationItem[];
  className?: string;
}) {
  const location = useLocation();

  return (
    <div className={className}>
      <p className="text-muted-foreground mb-2 px-3 text-xs font-semibold">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const [pathname, hash] = item.to.split("#");
          const isAnchorActive =
            hash !== undefined &&
            location.pathname === pathname &&
            location.hash === `#${hash}`;
          const isRouteActive =
            hash === undefined &&
            (pathname !== routes.AdminRoute.to || location.hash.length === 0);

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
                    (isAnchorActive || (isRouteActive && isActive)) &&
                      "bg-primary/10 text-primary",
                  )
                }
              >
                <Icon className="h-4.5 w-4.5" aria-hidden={true} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function getInitials(user: AuthUser): string {
  const source = user.email ?? user.username ?? "MP";
  return source.slice(0, 2).toUpperCase();
}
