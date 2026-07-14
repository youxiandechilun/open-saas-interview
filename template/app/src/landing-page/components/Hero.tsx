import { ArrowRight, CirclePlay } from "lucide-react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";
import { useI18n } from "../../i18n";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative isolate min-h-[calc(88svh-4rem)] overflow-hidden bg-[#e8f0f6] dark:bg-[#15191d]">
      <AnimationScene />
      <div className="relative mx-auto flex min-h-[calc(88svh-8rem)] max-w-7xl items-center px-6 pb-32 pt-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-semibold text-primary">
            {t("landing.hero.titlePrefix")}
          </p>
          <h1 className="text-5xl font-bold text-foreground sm:text-6xl lg:text-7xl">
            MotionPress
          </h1>
          <p className="mt-5 max-w-xl text-xl font-semibold leading-8 text-foreground sm:text-2xl">
            {t("landing.hero.titleHighlight")}
          </p>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <WaspRouterLink to={routes.SignupRoute.to}>
                {t("landing.hero.getStarted")}
                <ArrowRight aria-hidden="true" />
              </WaspRouterLink>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#workflow">
                <CirclePlay aria-hidden="true" />
                {t("landing.hero.learnMore")}
              </a>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-y border-foreground/10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-foreground/10 px-6 lg:px-8">
          <HeroOutput label="HTML" value={t("landing.hero.output.preview")} />
          <HeroOutput
            label="MP4 / WebM"
            value={t("landing.hero.output.video")}
          />
          <HeroOutput label="SEO" value={t("landing.hero.output.publish")} />
        </div>
      </div>
    </section>
  );
}

function HeroOutput({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-4 sm:py-5">
      <p className="text-xs font-bold text-primary sm:text-sm">{label}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function AnimationScene() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 right-0 w-[56%] opacity-35 sm:opacity-55 lg:opacity-100">
        <div className="absolute right-[8%] top-[17%] h-px w-[78%] bg-[#0b5cad]/25" />
        <div className="absolute right-[3%] top-[36%] h-px w-[88%] bg-[#17212b]/15 dark:bg-white/15" />
        <div className="absolute right-[14%] top-[65%] h-px w-[70%] bg-[#d96b2b]/35" />
        <div className="absolute bottom-[20%] right-[9%] h-[62%] w-px bg-[#17212b]/15 dark:bg-white/15" />
        <div className="motionpress-scene-word absolute right-[5%] top-[24%] text-[clamp(3.5rem,8vw,8rem)] font-black text-[#17212b] dark:text-white">
          MOVE
        </div>
        <div className="motionpress-scene-caption absolute right-[10%] top-[50%] bg-[#0b5cad] px-5 py-3 text-sm font-bold text-white sm:text-lg">
          PROMPT → MOTION
        </div>
        <div className="motionpress-scene-block absolute right-[32%] top-[64%] h-20 w-20 bg-[#d96b2b] sm:h-28 sm:w-28" />
        <div className="motionpress-playhead absolute bottom-[18%] right-[8%] h-2 w-[76%] bg-[#17212b]/15 dark:bg-white/20">
          <span className="block h-full w-[32%] bg-[#0b5cad]" />
        </div>
      </div>
    </div>
  );
}
