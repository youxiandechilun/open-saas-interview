import { ExternalLink, Menu } from "lucide-react";
import { useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import { routes } from "wasp/client/router";
import { DarkModeSwitcher } from "../../client/components/DarkModeSwitcher";
import { LocaleToggle, useI18n } from "../../i18n";
import { BlogUrl } from "../../shared/common";
import { UserDropdown } from "../../user/UserDropdown";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  user: AuthUser;
};

const headerCopy = {
  en: {
    openNavigation: "Open navigation",
    publicSite: "View public site",
    overview: "Overview",
    animation: "Animation Studio",
    publishing: "Articles & Publishing",
    users: "Users & Roles",
    integrations: "AI Service Configuration",
    workspace: "Workspace",
  },
  "zh-CN": {
    openNavigation: "打开导航",
    publicSite: "查看公开站点",
    overview: "运营概览",
    animation: "动画工作室",
    publishing: "文章与发布",
    users: "用户与角色",
    integrations: "AI 服务配置",
    workspace: "工作台",
  },
} as const;

export function Header({ sidebarOpen, setSidebarOpen, user }: HeaderProps) {
  const { locale } = useI18n();
  const labels = headerCopy[locale];
  const location = useLocation();
  const section = getSectionLabel(location.pathname, labels);

  return (
    <header className="bg-background sticky top-0 z-30 flex h-16 w-full items-center border-b px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        aria-controls="workspace-sidebar"
        aria-expanded={sidebarOpen}
        aria-label={labels.openNavigation}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hover:bg-muted focus-visible:ring-primary mr-3 flex h-10 w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <p className="min-w-0 flex-1 text-sm font-semibold">
        <span className="sm:hidden">MotionPress</span>
        <span className="hidden sm:inline">{section}</span>
      </p>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <a
          href={BlogUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary hidden min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 sm:inline-flex"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="hidden xl:inline">{labels.publicSite}</span>
        </a>
        <LocaleToggle />
        <DarkModeSwitcher />
        <div className="ml-1 border-l pl-2 sm:ml-2 sm:pl-3">
          <UserDropdown user={user} />
        </div>
      </div>
    </header>
  );
}

function getSectionLabel(
  pathname: string,
  labels: (typeof headerCopy)[keyof typeof headerCopy],
): string {
  if (pathname === routes.AdminRoute.to) return labels.overview;
  if (pathname === routes.AiStudioRoute.to) return labels.animation;
  if (pathname === routes.ContentCmsAdminRoute.to) return labels.publishing;
  if (pathname === routes.AdminUsersRoute.to) return labels.users;
  if (pathname === routes.AiProviderSettingsRoute.to)
    return labels.integrations;
  return labels.workspace;
}
