import { query, type Spec } from "@wasp.sh/spec";

import { getOperationsOverview } from "./operations" with { type: "ref" };

export const analyticsSpec: Spec = [
  query(getOperationsOverview, {
    entities: [
      "User",
      "CmsPost",
      "CmsPublicationEvent",
      "AiAnimation",
      "AiUsageLog",
    ],
  }),
];
