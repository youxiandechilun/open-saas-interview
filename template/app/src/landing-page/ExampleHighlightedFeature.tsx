import aiReadyDark from "../client/static/assets/aiready-dark.webp";
import aiReady from "../client/static/assets/aiready.webp";
import { useI18n } from "../i18n";
import { HighlightedFeature } from "./components/HighlightedFeature";

export function AIReady() {
  const { t } = useI18n();

  return (
    <HighlightedFeature
      name={t("landing.highlight.title")}
      description={t("landing.highlight.description")}
      highlightedComponent={<AIReadyExample />}
      direction="row-reverse"
    />
  );
}

function AIReadyExample() {
  const { t } = useI18n();

  return (
    <div className="w-full">
      <img
        src={aiReady}
        alt={t("landing.highlight.imageAlt")}
        loading="lazy"
        className="dark:hidden"
      />
      <img
        src={aiReadyDark}
        alt={t("landing.highlight.imageAlt")}
        loading="lazy"
        className="hidden dark:block"
      />
    </div>
  );
}
