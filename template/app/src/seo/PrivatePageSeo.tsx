import { getCanonicalUrl, siteSeo } from "./site";

export function PrivatePageSeo({ pathname }: { pathname: string }) {
  return (
    <>
      <title>{`Application | ${siteSeo.name}`}</title>
      <link rel="canonical" href={getCanonicalUrl(pathname)} />
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="referrer" content="same-origin" />
    </>
  );
}
