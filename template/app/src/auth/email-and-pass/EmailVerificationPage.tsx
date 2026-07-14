import { VerifyEmailForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useI18n } from "../../i18n";
import { AuthPageLayout } from "../AuthPageLayout";

export function EmailVerificationPage() {
  const { t } = useI18n();

  return (
    <AuthPageLayout
      title={t("auth.verify.title")}
      description={t("auth.verify.description")}
    >
      <VerifyEmailForm />
      <WaspRouterLink
        to={routes.LoginRoute.to}
        className="text-primary mt-5 inline-block text-sm font-medium underline"
      >
        {t("auth.flow.returnLogin")}
      </WaspRouterLink>
    </AuthPageLayout>
  );
}
