import { useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuth } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import { DisabledAccountPage } from "../auth/DisabledAccountPage";
import { Toaster } from "../client/components/ui/toaster";
import { I18nProvider } from "../i18n";
import { PrivatePageSeo } from "../seo/PrivatePageSeo";
import "./Main.css";
import { NavBar } from "./components/NavBar/NavBar";
import { marketingNavigationItems } from "./components/NavBar/constants";
import { CookieConsentBanner } from "./components/cookie-consent/Banner";

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export function App() {
  const location = useLocation();
  const { data: user } = useAuth();
  const isMarketingPage = useMemo(() => {
    return location.pathname === routes.LandingPageRoute.to;
  }, [location]);

  const isAuthPage = useMemo(
    () =>
      [
        routes.LoginRoute.to,
        routes.SignupRoute.to,
        routes.RequestPasswordResetRoute.to,
        routes.PasswordResetRoute.to,
        routes.EmailVerificationRoute.to,
      ].some((route) => route === location.pathname),
    [location.pathname],
  );
  const isPrivatePage = !isMarketingPage && !isAuthPage;

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  return (
    <I18nProvider>
      <div className="bg-background text-foreground min-h-screen">
        {!isMarketingPage && <PrivatePageSeo pathname={location.pathname} />}
        {isPrivatePage && user?.isDisabled ? (
          <DisabledAccountPage />
        ) : isPrivatePage ? (
          <Outlet />
        ) : (
          <>
            {isMarketingPage && (
              <NavBar navigationItems={marketingNavigationItems} />
            )}
            <Outlet />
          </>
        )}
      </div>
      <Toaster position="bottom-right" />
      {isMarketingPage && <CookieConsentBanner />}
    </I18nProvider>
  );
}
