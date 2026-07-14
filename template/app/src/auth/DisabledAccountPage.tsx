import { CircleX, LogOut } from "lucide-react";
import { logout } from "wasp/client/auth";
import { Button } from "../client/components/ui/button";
import { useI18n } from "../i18n";

export function DisabledAccountPage() {
  const { t } = useI18n();

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center px-6 py-12">
      <section className="border-border bg-background w-full max-w-lg border p-6 text-center sm:p-8">
        <span className="bg-destructive/10 text-destructive mx-auto flex size-11 items-center justify-center rounded-md">
          <CircleX className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">
          {t("account.disabledHeading")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
          {t("account.disabledDescription")}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={logout}
        >
          <LogOut aria-hidden="true" />
          {t("menu.logout")}
        </Button>
      </section>
    </main>
  );
}
