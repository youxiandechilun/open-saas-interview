import {
  ArrowRight,
  FileCheck2,
  FileCode2,
  Film,
  SearchCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useI18n } from "../../i18n";

const stepKeys = [
  { name: "landing.workflow.prompt", Icon: WandSparkles },
  { name: "landing.workflow.optimize", Icon: Sparkles },
  { name: "landing.workflow.generate", Icon: FileCode2 },
  { name: "landing.workflow.render", Icon: Film },
  { name: "landing.workflow.check", Icon: SearchCheck },
  { name: "landing.workflow.publish", Icon: FileCheck2 },
] as const;

export function ProductWorkflow() {
  const { t } = useI18n();

  return (
    <section id="workflow" className="border-b border-border bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-secondary">
            {t("landing.workflow.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
            {t("landing.workflow.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            {t("landing.workflow.description")}
          </p>
        </div>

        <ol className="mt-12 grid border-y border-border sm:grid-cols-2 lg:grid-cols-6">
          {stepKeys.map(({ name, Icon }, index) => (
            <li
              key={name}
              className="relative flex min-h-36 flex-col justify-between border-b border-border p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0"
            >
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-7 text-sm font-semibold text-foreground">
                {t(name)}
              </p>
              {index < stepKeys.length - 1 && (
                <ArrowRight
                  className="absolute -right-2.5 top-1/2 z-10 hidden size-5 rounded-full bg-card text-muted-foreground lg:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
