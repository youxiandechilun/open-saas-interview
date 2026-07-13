import { PageSeo } from "../seo/PageSeo";
import { ExamplesCarousel } from "./components/ExamplesCarousel";
import { FAQ } from "./components/FAQ";
import { FeaturesGrid } from "./components/FeaturesGrid";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { SchemaMarkup } from "./components/SchemaMarkup";
import { Testimonials } from "./components/Testimonials";
import {
  examples,
  faqs,
  features,
  footerNavigation,
  testimonials,
} from "./contentSections";
import { AIReady } from "./ExampleHighlightedFeature";

const landingDescription =
  "Launch a production-ready SaaS with authentication, payments, an admin dashboard, AI features, and a high-performance blog.";

export function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <PageSeo
        title="Your Open SaaS App"
        description={landingDescription}
        pathname="/"
      />
      <SchemaMarkup />
      <main className="isolate">
        <Hero />
        <ExamplesCarousel examples={examples} />
        <AIReady />
        <FeaturesGrid features={features} />
        <Testimonials testimonials={testimonials} />
        <FAQ faqs={faqs} />
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
