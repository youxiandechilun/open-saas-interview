import { CircleCheck, CircleX, UserRound } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import { Breadcrumb } from "../admin/layout/Breadcrumb";
import { WorkspaceLayout } from "../client/components/workspace/WorkspaceLayout";
import { hasAdminAccess } from "../client/components/workspace/permissions";
import { useI18n } from "../i18n";

export function AccountPage({ user }: { user: AuthUser }) {
  const { locale, t } = useI18n();
  const isDisabled = user.isDisabled === true;
  const roleLabel = hasAdminAccess(user)
    ? t("account.roleAdmin")
    : user.role === "EDITOR"
      ? t("account.roleEditor")
      : t("account.roleCreator");

  return (
    <WorkspaceLayout user={user}>
      <Breadcrumb
        pageName={t("account.pageTitle")}
        homeLabel={t("menu.adminDashboard")}
      />
      <section className="border-border overflow-hidden border bg-card">
        <div className="border-border flex items-start gap-3 border-b px-5 py-5 sm:px-6">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <UserRound className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t("account.heading")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("account.description")}
            </p>
          </div>
        </div>

        <dl className="divide-border divide-y">
          <AccountField label={t("account.email")} value={user.email ?? "-"} />
          <AccountField
            label={t("account.username")}
            value={user.username ?? "-"}
          />
          <AccountField label={t("account.role")} value={roleLabel} />
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
            <dt className="text-muted-foreground text-sm font-medium">
              {t("account.status")}
            </dt>
            <dd
              className={
                isDisabled
                  ? "text-destructive flex items-center gap-2 text-sm font-medium"
                  : "flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
              }
            >
              {isDisabled ? (
                <CircleX className="size-4" aria-hidden="true" />
              ) : (
                <CircleCheck className="size-4" aria-hidden="true" />
              )}
              {t(isDisabled ? "account.disabled" : "account.active")}
            </dd>
          </div>
          <AccountField
            label={t("account.memberSince")}
            value={new Intl.DateTimeFormat(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(user.createdAt))}
          />
        </dl>
      </section>
    </WorkspaceLayout>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{value}</dd>
    </div>
  );
}
