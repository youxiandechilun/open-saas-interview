import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMessage,
  isLocale,
  type Locale,
  type MessageKey,
  type MessageVariables,
} from "./messages";

export const LOCALE_STORAGE_KEY = "motionpress.locale";

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey, variables?: MessageVariables) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// Wasp may render an individual route during SSR/prerendering without the
// client root component. Keep those renders deterministic instead of throwing
// from a navigation component that requests a translated label.
const fallbackI18nContext: I18nContextValue = {
  locale: "en",
  setLocale: () => undefined,
  toggleLocale: () => undefined,
  t: (key, variables) => getMessage("en", key, variables),
};

export function I18nProvider({ children }: { children: ReactNode }) {
  // Keep server and first client render aligned, then apply browser preference.
  const [locale, setLocaleState] = useState<Locale>("en");

  const applyLocale = useCallback((nextLocale: Locale, persist = true) => {
    setLocaleState(nextLocale);

    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLocale;
    }

    if (persist) persistLocale(nextLocale);
  }, []);

  useEffect(() => {
    const preferredLocale = resolvePreferredLocale(
      readPersistedLocale(),
      getBrowserLanguages(),
    );

    // Defer until after hydration so SSR and the first client render stay aligned.
    const timeoutId = window.setTimeout(() => applyLocale(preferredLocale), 0);
    return () => window.clearTimeout(timeoutId);
  }, [applyLocale]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue)) {
        applyLocale(event.newValue, false);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applyLocale]);

  const toggleLocale = useCallback(() => {
    applyLocale(locale === "en" ? "zh-CN" : "en");
  }, [applyLocale, locale]);

  const t = useCallback(
    (key: MessageKey, variables?: MessageVariables) =>
      getMessage(locale, key, variables),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale: applyLocale, toggleLocale, t }),
    [applyLocale, locale, t, toggleLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  return context ?? fallbackI18nContext;
}

export function resolvePreferredLocale(
  persistedLocale: string | null | undefined,
  browserLanguages: readonly string[],
): Locale {
  if (isLocale(persistedLocale)) return persistedLocale;

  for (const language of browserLanguages) {
    const normalizedLanguage = language.toLowerCase();
    if (normalizedLanguage.startsWith("zh")) return "zh-CN";
    if (normalizedLanguage.startsWith("en")) return "en";
  }

  return "en";
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

function readPersistedLocale(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The UI can still switch languages when storage is unavailable.
  }
}
