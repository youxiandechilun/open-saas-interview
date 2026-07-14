import { useI18n } from "../../i18n";

interface NavigationItem {
  name: string;
  href: string;
}

export function Footer({
  footerNavigation,
}: {
  footerNavigation: {
    app: NavigationItem[];
    company: NavigationItem[];
  };
}) {
  const { t } = useI18n();

  return (
    <div className="bg-card">
      <footer
        aria-labelledby="footer-heading"
        className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8"
      >
        <h2 id="footer-heading" className="sr-only">
          {t("landing.footer.landmark")}
        </h2>
        <div className="grid gap-12 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
          <div className="max-w-sm">
            <p className="text-lg font-bold text-foreground">MotionPress</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("landing.footer.description")}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-foreground">
              {t("landing.footer.product")}
            </h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.app.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-muted-foreground hover:text-primary"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-foreground">
              {t("landing.footer.company")}
            </h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.company.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-muted-foreground hover:text-primary"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-14 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} MotionPress
        </p>
      </footer>
    </div>
  );
}
