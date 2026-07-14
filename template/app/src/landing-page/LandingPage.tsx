import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../client/components/ui/button";
import { useI18n } from "../i18n";
import { PageSeo } from "../seo/PageSeo";
import { FeaturesGrid } from "./components/FeaturesGrid";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { ProductWorkflow } from "./components/ProductWorkflow";
import { SchemaMarkup } from "./components/SchemaMarkup";
import { getLocalizedLandingContent } from "./localizedContent";

export function LandingPage() {
  const { t } = useI18n();
  const { features, footerNavigation } = useMemo(
    () => getLocalizedLandingContent(t),
    [t],
  );

  return (
    <div className="bg-background text-foreground">
      <PageSeo
        title={t("landing.seo.title")}
        description={t("landing.seo.description")}
        pathname="/"
      />
      <SchemaMarkup />
      <main className="isolate">
        <Hero />
        <ProductWorkflow />
        <FeaturesGrid features={features} />
        <section className="border-y border-border bg-primary px-6 py-16 text-primary-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">
                {t("landing.cta.title")}
              </h2>
              <p className="mt-3 text-base leading-7 text-primary-foreground/80">
                {t("landing.cta.description")}
              </p>
            </div>
            <Button size="lg" variant="secondary" asChild>
              <WaspRouterLink to={routes.SignupRoute.to}>
                {t("landing.cta.action")}
                <ArrowRight aria-hidden="true" />
              </WaspRouterLink>
            </Button>
          </div>
        </section>
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
