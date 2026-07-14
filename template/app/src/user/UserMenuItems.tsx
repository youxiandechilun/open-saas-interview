import { LogOut } from "lucide-react";
import { logout } from "wasp/client/auth";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type User } from "wasp/entities";
import { useI18n } from "../i18n";
import { canViewUserMenuItem, userMenuItems } from "./constants";

export function UserMenuItems({
  user,
  onItemClick,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      {userMenuItems.map((item) => {
        if (!canViewUserMenuItem(item, user)) return null;

        return (
          <li key={item.labelKey}>
            <WaspRouterLink
              to={item.to}
              onClick={onItemClick}
              className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
            >
              <item.icon size="1.1rem" />
              {t(item.labelKey)}
            </WaspRouterLink>
          </li>
        );
      })}
      <li>
        <button
          onClick={() => {
            logout();
            onItemClick?.();
          }}
          className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
        >
          <LogOut size="1.1rem" />
          {t("menu.logout")}
        </button>
      </li>
    </>
  );
}
