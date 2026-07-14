import { getCanonicalUrl, getSocialImageUrl } from "../../seo/site";

function getSchema() {
  const homeUrl = getCanonicalUrl("/");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${homeUrl}#software`,
        name: "MotionPress",
        description:
          "AI animation generation, video rendering, and SEO content publishing in one workspace.",
        url: homeUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Cross-platform",
        image: getSocialImageUrl(),
      },
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        url: homeUrl,
        name: "MotionPress",
        description:
          "AI animation generation, video rendering, and SEO content publishing in one workspace.",
      },
    ],
  };
}

export function SchemaMarkup() {
  return (
    <script type="application/ld+json">{JSON.stringify(getSchema())}</script>
  );
}
