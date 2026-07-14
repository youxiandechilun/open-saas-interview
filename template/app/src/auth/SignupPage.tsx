import { Loader2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { login, signup } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../client/components/ui/button";
import { useI18n } from "../i18n";
import { AuthMessage, EmailField, PasswordField } from "./AuthFormFields";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function SignupPage() {
  useRedirectIfLoggedIn();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError(t("auth.error.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = email.trim();

    try {
      await signup({
        email: normalizedEmail,
        password,
        username: normalizedEmail,
        isAdmin: false,
        role: "CREATOR",
      });

      if (import.meta.env.DEV) {
        try {
          await login({ email: normalizedEmail, password });
          navigate(routes.AiStudioRoute.to, { replace: true });
        } catch {
          setError(t("auth.error.devAutoLogin"));
        }
      } else {
        setSuccess(t("auth.signup.verifyEmail"));
      }
    } catch (requestError) {
      setError(
        getSignupError(
          requestError,
          t("auth.error.signup"),
          t("auth.error.accountExists"),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout
      title={t("auth.signup.title")}
      description={t("auth.signup.description")}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <EmailField value={email} onChange={setEmail} disabled={isSubmitting} />
        <PasswordField
          label={t("auth.password")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        <PasswordField
          id="auth-confirm-password"
          label={t("auth.confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {error && <AuthMessage type="error">{error}</AuthMessage>}
        {success && <AuthMessage type="success">{success}</AuthMessage>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {isSubmitting ? t("auth.signup.loading") : t("auth.signup.submit")}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-sm">
        {t("auth.signup.hasAccount")}{" "}
        <WaspRouterLink
          to={routes.LoginRoute.to}
          className="text-primary font-medium underline"
        >
          {t("auth.signup.goLogin")}
        </WaspRouterLink>
      </p>
    </AuthPageLayout>
  );
}

function getSignupError(
  error: unknown,
  fallback: string,
  accountExists: string,
): string {
  if (error instanceof Error && /already|exist/i.test(error.message)) {
    return accountExists;
  }
  return fallback;
}
