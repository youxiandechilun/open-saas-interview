import type { I18nContextValue, MessageKey } from "../i18n";
import { features, footerNavigation } from "./contentSections";

type Translate = I18nContextValue["t"];

const featureMessageKeys = [
  {
    name: "landing.features.auth.name",
    description: "landing.features.auth.description",
  },
  {
    name: "landing.features.security.name",
    description: "landing.features.security.description",
  },
  {
    name: "landing.features.stack.name",
    description: "landing.features.stack.description",
  },
  {
    name: "landing.features.payments.name",
    description: "landing.features.payments.description",
  },
  {
    name: "landing.features.admin.name",
    description: "landing.features.admin.description",
  },
  {
    name: "landing.features.analytics.name",
    description: "landing.features.analytics.description",
  },
  {
    name: "landing.features.email.name",
    description: "landing.features.email.description",
  },
  {
    name: "landing.features.ai.name",
    description: "landing.features.ai.description",
  },
  {
    name: "landing.features.seo.name",
    description: "landing.features.seo.description",
  },
] as const satisfies ReadonlyArray<{
  name: MessageKey;
  description: MessageKey;
}>;

export function getLocalizedLandingContent(t: Translate) {
  return {
    features: features.map((feature, index) => {
      const keys = featureMessageKeys[index];
      return keys
        ? {
            ...feature,
            name: t(keys.name),
            description: t(keys.description),
          }
        : feature;
    }),
    footerNavigation: {
      app: [
        {
          ...footerNavigation.app[0],
          name: t("landing.footer.documentation"),
        },
        { ...footerNavigation.app[1], name: t("landing.footer.blog") },
      ],
      company: [
        { ...footerNavigation.company[0], name: t("landing.footer.about") },
        { ...footerNavigation.company[1], name: t("landing.footer.privacy") },
        { ...footerNavigation.company[2], name: t("landing.footer.terms") },
      ],
    },
  };
}
