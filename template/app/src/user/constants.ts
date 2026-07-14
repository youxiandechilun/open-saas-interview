import {
  FileText,
  KeyRound,
  type LucideIcon,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { routes } from "wasp/client/router";
import type { MessageKey } from "../i18n";
import {
  hasActiveAdminAccess,
  hasActivePublishingAccess,
} from "./accessPolicy";

type UserMenuItem = {
  labelKey: MessageKey;
  to: string;
  icon: LucideIcon;
  access: "authenticated" | "publishing" | "admin";
};

type MenuUser = {
  role?: "ADMIN" | "EDITOR" | "CREATOR";
  isAdmin?: boolean;
  isDisabled?: boolean;
};

export const userMenuItems = [
  {
    labelKey: "nav.aiStudio",
    to: routes.AiStudioRoute.to,
    icon: Sparkles,
    access: "authenticated",
  },
  {
    labelKey: "menu.accountSettings",
    to: routes.AccountRoute.to,
    icon: Settings,
    access: "authenticated",
  },
  {
    labelKey: "menu.contentCms",
    to: routes.ContentCmsAdminRoute.to,
    icon: FileText,
    access: "publishing",
  },
  {
    labelKey: "menu.aiProvider",
    to: routes.AiProviderSettingsRoute.to,
    icon: KeyRound,
    access: "admin",
  },
  {
    labelKey: "menu.adminDashboard",
    to: routes.AdminRoute.to,
    icon: Shield,
    access: "admin",
  },
] as const satisfies readonly UserMenuItem[];

export function canViewUserMenuItem(
  item: UserMenuItem,
  user: MenuUser | undefined,
): boolean {
  if (!user || user.isDisabled) return false;
  if (item.access === "authenticated") return true;
  if (item.access === "admin") return hasActiveAdminAccess(user);
  return hasActivePublishingAccess(user);
}
