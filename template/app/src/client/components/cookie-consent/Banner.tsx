import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { useI18n } from "../../../i18n";
import { getConfig } from "./Config";

/**
 * NOTE: if you do not want to use the cookie consent banner, you should
 * run `npm uninstall vanilla-cookieconsent`, and delete this component, its config file,
 * as well as its import in src/client/App.tsx .
 */
export function CookieConsentBanner() {
  const { locale } = useI18n();

  useEffect(() => {
    let cancelled = false;

    const syncLanguage = async () => {
      await CookieConsent.run(getConfig(locale));
      if (!cancelled) await CookieConsent.setLanguage(locale, true);
    };

    void syncLanguage().catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return <div id="cookieconsent"></div>;
}
