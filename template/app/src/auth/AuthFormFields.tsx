import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { useI18n } from "../i18n";

export function EmailField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <Label htmlFor="auth-email">{t("auth.email")}</Label>
      <Input
        id="auth-email"
        name="email"
        type="email"
        autoComplete="email"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={t("auth.emailPlaceholder")}
        disabled={disabled}
        required
      />
    </div>
  );
}

export function PasswordField({
  id = "auth-password",
  label,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id === "auth-password" ? "password" : "confirmPassword"}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="pr-10"
          minLength={8}
          disabled={disabled}
          required
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-0 top-0 h-full"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          title={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          disabled={disabled}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  );
}

export function AuthMessage({
  type,
  children,
}: {
  type: "error" | "success";
  children: string;
}) {
  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={
        type === "error"
          ? "bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          : "bg-success/10 text-success rounded-md p-3 text-sm"
      }
    >
      {children}
    </p>
  );
}
