import { routes } from "wasp/client/router";
import { BlogUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";

export const marketingNavigationItems: NavigationItem[] = [
  { labelKey: "nav.features", to: "/#features" },
  { labelKey: "nav.aiStudio", to: routes.AiStudioRoute.to },
  { labelKey: "nav.blog", to: BlogUrl },
] as const;
