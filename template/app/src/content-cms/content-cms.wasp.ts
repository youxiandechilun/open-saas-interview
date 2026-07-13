import { action, api, job, page, query, route, type Spec } from "@wasp.sh/spec";

import { ContentCmsPage } from "./ContentCmsPage" with { type: "ref" };
import { getPublishedCmsContentApi } from "./contentApi" with { type: "ref" };
import {
  createCmsAuthor,
  createCmsPost,
  createCmsTag,
  deleteCmsAuthor,
  deleteCmsPost,
  deleteCmsTag,
  getCmsPosts,
  getCmsTaxonomy,
  getPublishedCmsPosts,
  updateCmsAuthor,
  updateCmsPost,
  updateCmsTag,
} from "./operations" with { type: "ref" };
import { dispatchCmsPublicationEventsJob } from "./publicationJob" with { type: "ref" };

export const contentCmsSpec: Spec = [
  route(
    "ContentCmsAdminRoute",
    "/admin/content",
    page(ContentCmsPage, { authRequired: true }),
  ),
  query(getCmsPosts, { entities: ["CmsPost", "CmsAuthor", "CmsTag"] }),
  query(getPublishedCmsPosts, {
    entities: ["CmsPost", "CmsAuthor", "CmsTag"],
    auth: false,
  }),
  api("GET", "/content-cms/published", getPublishedCmsContentApi, {
    entities: ["CmsPost", "CmsAuthor", "CmsTag"],
    auth: false,
  }),
  query(getCmsTaxonomy, { entities: ["CmsAuthor", "CmsTag", "CmsPost"] }),
  action(createCmsPost, {
    entities: ["User", "CmsPost", "CmsAuthor", "CmsTag", "CmsPublicationEvent"],
  }),
  action(updateCmsPost, {
    entities: ["CmsPost", "CmsAuthor", "CmsTag", "CmsPublicationEvent"],
  }),
  action(deleteCmsPost, {
    entities: ["CmsPost", "CmsAuthor", "CmsTag", "CmsPublicationEvent"],
  }),
  action(createCmsAuthor, { entities: ["CmsAuthor"] }),
  action(updateCmsAuthor, {
    entities: ["CmsAuthor", "CmsPost", "CmsTag", "CmsPublicationEvent"],
  }),
  action(deleteCmsAuthor, { entities: ["CmsAuthor", "CmsPost"] }),
  action(createCmsTag, { entities: ["CmsTag"] }),
  action(updateCmsTag, {
    entities: ["CmsTag", "CmsPost", "CmsAuthor", "CmsPublicationEvent"],
  }),
  action(deleteCmsTag, {
    entities: ["CmsTag", "CmsPost", "CmsAuthor", "CmsPublicationEvent"],
  }),
  job(dispatchCmsPublicationEventsJob, {
    executor: "PgBoss",
    schedule: { cron: "* * * * *" },
    entities: ["CmsPublicationEvent"],
    performExecutorOptions: { pgBoss: { retryLimit: 2 } },
  }),
];
