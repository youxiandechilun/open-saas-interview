import type { ReactNode } from "react";
import { Link, routes } from "wasp/client/router";
import { LocaleToggle } from "../i18n";

export function AuthPageLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="bg-muted/30 min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          to={routes.LandingPageRoute.to}
          className="text-foreground text-lg font-bold"
        >
          MotionPress
        </Link>
        <LocaleToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <section className="bg-card w-full rounded-lg border p-6 shadow-sm sm:p-8">
          <header className="mb-6 space-y-2">
            <h1 className="text-foreground text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </header>
          <div>{children}</div>
        </section>
      </div>
    </main>
  );
}
