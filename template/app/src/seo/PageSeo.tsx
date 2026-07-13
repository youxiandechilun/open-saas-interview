import { getCanonicalUrl, getSocialImageUrl, siteSeo } from "./site";

type PageSeoProps = {
  title: string;
  description: string;
  pathname: string;
  type?: "website" | "product";
  noIndex?: boolean;
  structuredData?: Record<string, unknown>;
};

export function PageSeo({
  title,
  description,
  pathname,
  type = "website",
  noIndex = false,
  structuredData,
}: PageSeoProps) {
  const canonicalUrl = getCanonicalUrl(pathname);
  const imageUrl = getSocialImageUrl();

  return (
    <>
      <title>{title}</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:site_name" content={siteSeo.name} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={siteSeo.imageAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={siteSeo.imageAlt} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData).replace(/</g, "\\u003c")}
        </script>
      )}
    </>
  );
}
