import { Clapperboard, LogIn, Menu } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { Link as ReactRouterLink } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../client/components/ui/sheet";
import {
  LocaleToggle,
  useI18n,
  type I18nContextValue,
  type MessageKey,
} from "../../../i18n";
import { UserDropdown } from "../../../user/UserDropdown";
import { UserMenuItems } from "../../../user/UserMenuItems";
import { cn } from "../../utils";
import { DarkModeSwitcher } from "../DarkModeSwitcher";

export interface NavigationItem {
  labelKey: MessageKey;
  to: string;
}

export function NavBar({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8"
        aria-label={t("nav.global")}
      >
            <div className="flex items-center gap-6">
              <WaspRouterLink
                to={routes.LandingPageRoute.to}
                className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out"
              >
                <NavLogo />
                <span className="ml-2 text-sm font-bold leading-6 text-foreground">
                  {t("nav.brand")}
                </span>
              </WaspRouterLink>

              <ul className="ml-4 hidden items-center gap-6 lg:flex">
                {renderNavigationItems(navigationItems, t)}
              </ul>
            </div>
            <NavBarMobileMenu
              navigationItems={navigationItems}
            />
            <NavBarDesktopUserDropdown />
      </nav>
    </header>
  );
}

function NavBarDesktopUserDropdown() {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const { t } = useI18n();

  return (
    <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <LocaleToggle />
        <DarkModeSwitcher />
      </div>
      {isUserLoading ? null : !user ? (
        <WaspRouterLink
          to={routes.LoginRoute.to}
          className="ml-3 text-sm font-semibold leading-6"
        >
          <div className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out">
            {t("nav.login")}{" "}
            <LogIn className="ml-1 size-4" />
          </div>
        </WaspRouterLink>
      ) : (
        <div className="ml-3">
          <UserDropdown user={user} />
        </div>
      )}
    </div>
  );
}

function NavBarMobileMenu({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="flex lg:hidden">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="sr-only">{t("nav.openMenu")}</span>
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <WaspRouterLink to={routes.LandingPageRoute.to}>
                <span className="sr-only">{t("nav.brand")}</span>
                <NavLogo />
              </WaspRouterLink>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 flow-root">
            <div className="divide-border -my-6 divide-y">
              <ul className="space-y-2 py-6">
                {renderNavigationItems(navigationItems, t, setMobileMenuOpen)}
              </ul>
              <div className="py-6">
                {isUserLoading ? null : !user ? (
                  <WaspRouterLink to={routes.LoginRoute.to}>
                    <div className="text-foreground hover:text-primary flex items-center justify-end transition-colors duration-300 ease-in-out">
                      {t("nav.login")} <LogIn size="1.1rem" className="ml-1" />
                    </div>
                  </WaspRouterLink>
                ) : (
                  <ul className="space-y-2">
                    <UserMenuItems
                      user={user}
                      onItemClick={() => setMobileMenuOpen(false)}
                    />
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-end gap-4 py-6">
                <LocaleToggle />
                <DarkModeSwitcher />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function renderNavigationItems(
  navigationItems: NavigationItem[],
  t: I18nContextValue["t"],
  setMobileMenuOpen?: Dispatch<SetStateAction<boolean>>,
) {
  const menuStyles = cn({
    "block rounded-lg px-3 py-2 text-sm font-medium leading-7 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors":
      !!setMobileMenuOpen,
    "text-sm font-normal leading-6 text-foreground duration-300 ease-in-out hover:text-primary transition-colors":
      !setMobileMenuOpen,
  });

  return navigationItems.map((item) => {
    return (
      <li key={item.labelKey}>
        <ReactRouterLink
          to={item.to}
          className={menuStyles}
          onClick={setMobileMenuOpen && (() => setMobileMenuOpen(false))}
          target={item.to.startsWith("http") ? "_blank" : undefined}
        >
          {t(item.labelKey)}
        </ReactRouterLink>
      </li>
    );
  });
}

function NavLogo() {
  const { t } = useI18n();

  return (
    <span
      className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"
      role="img"
      aria-label={t("nav.logoAlt")}
    >
      <Clapperboard className="size-5" aria-hidden="true" />
    </span>
  );
}
