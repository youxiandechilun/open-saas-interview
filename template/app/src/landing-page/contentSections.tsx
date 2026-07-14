import {
  FileCode2,
  Film,
  Gauge,
  LibraryBig,
  ListTodo,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { BlogUrl } from "../shared/common";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "Prompt optimization",
    description: "Rewrite and score prompts before generation.",
    icon: <WandSparkles className="size-7" aria-hidden="true" />,
    href: "/ai-studio",
    size: "medium",
  },
  {
    name: "HTML animation generation",
    description: "Generate safe, previewable HTML animation.",
    icon: <FileCode2 className="size-7" aria-hidden="true" />,
    href: "/ai-studio",
    size: "medium",
  },
  {
    name: "Asset library",
    description: "Save generated work and reuse it in content.",
    icon: <LibraryBig className="size-7" aria-hidden="true" />,
    href: "/ai-studio",
    size: "medium",
  },
  {
    name: "Video rendering",
    description: "Render animation jobs to MP4 or WebM.",
    icon: <Film className="size-7" aria-hidden="true" />,
    href: "/ai-studio",
    size: "medium",
  },
  {
    name: "Content workspace",
    description: "Manage posts, authors, tags, slugs, and status.",
    icon: <ListTodo className="size-7" aria-hidden="true" />,
    href: "/admin/content",
    size: "medium",
  },
  {
    name: "Publishing pipeline",
    description: "Track every publish and rebuild task to completion.",
    icon: <Sparkles className="size-7" aria-hidden="true" />,
    href: "/admin/content",
    size: "medium",
  },
  {
    name: "Roles and permissions",
    description: "Keep admin, editor, and creator access explicit.",
    icon: <ShieldCheck className="size-7" aria-hidden="true" />,
    href: "/admin/users",
    size: "medium",
  },
  {
    name: "Usage and cost controls",
    description: "Enforce quotas and inspect model usage logs.",
    icon: <Gauge className="size-7" aria-hidden="true" />,
    href: "/admin",
    size: "medium",
  },
  {
    name: "SEO quality gate",
    description: "Check metadata, headings, alt text, and links.",
    icon: <SearchCheck className="size-7" aria-hidden="true" />,
    href: "/admin/content",
    size: "medium",
  },
];

export const footerNavigation = {
  app: [
    { name: "AI Studio", href: "/ai-studio" },
    { name: "Blog", href: BlogUrl },
  ],
  company: [
    { name: "Features", href: "/#features" },
    { name: "Sign in", href: "/login" },
    { name: "Account", href: "/account" },
  ],
};
