/**
 * Serialize structured data for an inline script without allowing user-authored
 * text to terminate the script element.
 *
 * @param {unknown} value
 */
export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escapeByCharacter = {
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029",
    };

    return escapeByCharacter[character];
  });
}

/**
 * @typedef {object} BlogStructuredDataInput
 * @property {string} canonicalUrl
 * @property {string} blogUrl
 * @property {string} homeUrl
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} publishedAt
 * @property {string | undefined} modifiedAt
 * @property {string[]} authors
 * @property {string[]} tags
 * @property {string} siteTitle
 */

/**
 * Build schema.org entities for a published blog post.
 *
 * @param {BlogStructuredDataInput} input
 */
export function createBlogStructuredData(input) {
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    image: [input.imageUrl],
    datePublished: input.publishedAt,
    ...(input.modifiedAt ? { dateModified: input.modifiedAt } : {}),
    author: input.authors.map((name) => ({ "@type": "Person", name })),
    publisher: { "@type": "Organization", name: input.siteTitle },
    keywords: input.tags,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.canonicalUrl,
    },
    url: input.canonicalUrl,
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: input.homeUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: input.blogUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: input.title,
        item: input.canonicalUrl,
      },
    ],
  };

  return [article, breadcrumbs];
}
