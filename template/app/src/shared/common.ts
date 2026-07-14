export const DocsUrl = "https://docs.opensaas.sh";
const configuredBlogUrl =
  import.meta.env.REACT_APP_BLOG_URL?.trim() ||
  "https://docs.opensaas.sh/blog/";

export const BlogUrl = configuredBlogUrl.endsWith("/")
  ? configuredBlogUrl
  : `${configuredBlogUrl}/`;
