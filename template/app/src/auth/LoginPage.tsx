import { Loader2, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { login } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../client/components/ui/button";
import { useI18n } from "../i18n";
import { AuthMessage, EmailField, PasswordField } from "./AuthFormFields";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function LoginPage() {
  useRedirectIfLoggedIn();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(routes.AiStudioRoute.to, { replace: true });
    } catch (requestError) {
      setError(
        getLoginError(
          requestError,
          t("auth.error.login"),
          t("auth.error.emailNotVerified"),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout
      title={t("auth.login.title")}
      description={t("auth.login.description")}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <EmailField value={email} onChange={setEmail} disabled={isSubmitting} />
        <PasswordField
          label={t("auth.password")}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={isSubmitting}
        />
        {error && <AuthMessage type="error">{error}</AuthMessage>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
          {isSubmitting ? t("auth.login.loading") : t("auth.login.submit")}
        </Button>
      </form>

      <div className="text-muted-foreground mt-6 space-y-3 text-sm">
        <p>
          {t("auth.login.noAccount")}{" "}
          <WaspRouterLink
            to={routes.SignupRoute.to}
            className="text-primary font-medium underline"
          >
            {t("auth.login.goSignup")}
          </WaspRouterLink>
        </p>
        <p>
          {t("auth.login.forgot")}{" "}
          <WaspRouterLink
            to={routes.RequestPasswordResetRoute.to}
            className="text-primary font-medium underline"
          >
            {t("auth.login.reset")}
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}

function getLoginError(
  error: unknown,
  fallback: string,
  emailNotVerified: string,
): string {
  if (error instanceof Error && /verif/i.test(error.message)) {
    return emailNotVerified;
  }
  return fallback;
}
