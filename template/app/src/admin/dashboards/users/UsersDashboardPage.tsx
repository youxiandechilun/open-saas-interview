import { type AuthUser } from "wasp/auth";
import { Breadcrumb } from "../../layout/Breadcrumb";
import { DefaultLayout } from "../../layout/DefaultLayout";
import { useUserAdminCopy } from "./i18n";
import { UsersTable } from "./UsersTable";

export function UsersDashboardPage({ user }: { user: AuthUser }) {
  const { t } = useUserAdminCopy();
  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("pageTitle")} />
      <div className="flex flex-col gap-6">
        <UsersTable />
      </div>
    </DefaultLayout>
  );
}
