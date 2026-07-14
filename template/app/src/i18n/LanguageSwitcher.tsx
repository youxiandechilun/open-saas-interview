import { Languages } from "lucide-react";
import { cn } from "../client/utils";
import { useI18n } from "./I18nProvider";
import type { Locale, MessageKey } from "./messages";

const localeOptions: Array<{
  locale: Locale;
  shortLabel: string;
  labelKey: MessageKey;
}> = [
  { locale: "zh-CN", shortLabel: "中", labelKey: "language.chinese" },
  { locale: "en", shortLabel: "EN", labelKey: "language.english" },
];

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn(
        "border-input bg-background flex h-8 shrink-0 items-center overflow-hidden rounded-md border",
        className,
      )}
    >
      <Languages className="text-muted-foreground ml-2 size-4" aria-hidden />
      <div className="ml-1 flex h-full items-stretch">
        {localeOptions.map((option) => {
          const isActive = locale === option.locale;
          return (
            <button
              key={option.locale}
              type="button"
              lang={option.locale}
              aria-label={t(option.labelKey)}
              aria-pressed={isActive}
              title={t(option.labelKey)}
              onClick={() => setLocale(option.locale)}
              className={cn(
                "focus-visible:ring-ring min-w-9 px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {option.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const LanguageSwitcher = LocaleToggle;
