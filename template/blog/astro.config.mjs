import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";
import { SITE_URL } from "./src/lib/site.mjs";
import { motionpressMarkdownRehypePlugins } from "./src/lib/markdownSecurity.mjs";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  markdown: {
    rehypePlugins: motionpressMarkdownRehypePlugins,
  },
  // Keep both /blog and /blog/ usable when the blog is opened directly in dev.
  trailingSlash: "ignore",
  integrations: [
    starlight({
      title: "MotionPress Journal",
      customCss: ["./src/styles/tailwind.css"],
      description:
        "Practical guides for AI animation, video rendering, content operations, and search-ready publishing.",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            href: "/favicon.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: "#f6f8fa",
          },
        },
      ],
      components: {
        SiteTitle: "./src/components/MyHeader.astro",
        Head: "./src/components/HeadWithOGImage.astro",
        PageTitle: "./src/components/TitleWithBannerImage.astro",
      },
      sidebar: [
        {
          label: "MotionPress",
          items: [
            {
              label: "Journal home",
              link: "/",
            },
            {
              label: "Publishing workflow",
              link: "/guides/publishing-workflow/",
            },
          ],
        },
      ],
      plugins: [
        starlightBlog({
          title: "Articles",
          customCss: ["./src/styles/tailwind.css"],
          authors: {
            MotionPress: {
              name: "MotionPress Editorial",
              title: "Content operations team",
              url: SITE_URL,
            },
          },
        }),
      ],
    }),
    tailwind({ applyBaseStyles: false }),
  ],
});
