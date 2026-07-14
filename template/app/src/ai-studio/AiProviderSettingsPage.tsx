import {
  CircleAlert,
  CircleCheck,
  KeyRound,
  MailCheck,
  PlugZap,
  RotateCcw,
  Save,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getAiProviderSettings,
  resetAiProviderSettings,
  testAiProviderConnection,
  updateAiProviderSettings,
  useQuery,
} from "wasp/client/operations";
import { Breadcrumb } from "../admin/layout/Breadcrumb";
import { DefaultLayout } from "../admin/layout/DefaultLayout";
import { LoadingSpinner } from "../admin/layout/LoadingSpinner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { toast } from "../client/hooks/use-toast";
import { useI18n } from "../i18n";
import { useAiStudioCopy } from "./i18n";
import {
  type EmailDeliveryIntegrationView,
  type PublishingIntegrationView,
} from "./providerSettings";

type ProviderForm = {
  baseUrl: string;
  model: string;
  apiKey: string;
  hourlyTokenLimit: string;
  maxCompletionTokens: string;
};

const emptyForm: ProviderForm = {
  baseUrl: "",
  model: "",
  apiKey: "",
  hourlyTokenLimit: "100000",
  maxCompletionTokens: "12000",
};

const serviceSettingsCopy = {
  en: {
    publishingTitle: "Publishing integration",
    publishingDescription:
      "Server-side webhook used to request a public blog rebuild after publication.",
    ready: "Ready",
    actionRequired: "Action required",
    configured: "Configured",
    missing: "Missing",
    webhookUrl: "Rebuild webhook URL",
    webhookUrlDetail: "Public HTTPS endpoint that accepts rebuild requests.",
    webhookToken: "Webhook authentication token",
    webhookTokenDetail: "Shared secret sent only by the server.",
    deploymentTitle: "Deployment steps",
    deploymentSteps: [
      "Set both variables in the server deployment environment.",
      "Restart or redeploy the application so the server loads the new values.",
      "Publish or retry an article from Articles & Publishing, then verify that the build platform received the webhook.",
    ],
    acceptanceNote:
      "A successful 2xx response means the rebuild request was accepted; it does not prove the public site is already live.",
    secretNote:
      "The token value is never returned to the browser. This page only reports whether it is configured.",
    emailTitle: "Account email delivery",
    emailDescription:
      "Verification and password-reset messages sent by the authentication system.",
    emailProvider: "Email provider",
    emailProviderDetail:
      "Dummy writes messages to server logs; SendGrid delivers real email.",
    sendGridKey: "SendGrid API key",
    sendGridKeyDetail: "Server-only credential used for SendGrid delivery.",
    fromAddress: "Sender email address",
    fromAddressDetail:
      "Use a verified, public-domain sender address for production.",
    fromName: "Sender display name",
    fromNameDetail: "Name shown beside the sender address.",
    dummyLogOnly: "Dummy · logs only",
    emailDeploymentTitle: "Production delivery",
    emailDeploymentSteps: [
      "Set EMAIL_PROVIDER to SendGrid and provide a SendGrid API key.",
      "Set EMAIL_FROM_ADDRESS to a sender verified by your SendGrid account.",
      "Restart or redeploy the server, then send a verification or password-reset email to confirm delivery.",
    ],
    emailSecretNote:
      "The SendGrid key is never returned to the browser. This page only reports whether it is configured.",
  },
  "zh-CN": {
    publishingTitle: "发布集成",
    publishingDescription:
      "文章发布后，由服务端调用此 Webhook 请求公开博客重新构建。",
    ready: "已就绪",
    actionRequired: "需要配置",
    configured: "已配置",
    missing: "缺失",
    webhookUrl: "重建 Webhook 地址",
    webhookUrlDetail: "用于接收重建请求的公网 HTTPS 地址。",
    webhookToken: "Webhook 鉴权令牌",
    webhookTokenDetail: "仅由服务端发送的共享密钥。",
    deploymentTitle: "部署步骤",
    deploymentSteps: [
      "在服务端部署环境中同时设置两个环境变量。",
      "重启或重新部署应用，使服务端加载新配置。",
      "前往“文章与发布”发布或重试文章，并确认构建平台已收到 Webhook。",
    ],
    acceptanceNote:
      "Webhook 返回 2xx 仅表示重建请求已被接收，不代表公开站点已经上线。",
    secretNote: "页面不会从服务端读取或显示令牌明文，只会报告是否已配置。",
    emailTitle: "账户邮件发送",
    emailDescription: "认证系统发送的邮箱验证和密码重置邮件。",
    emailProvider: "邮件服务商",
    emailProviderDetail:
      "Dummy 只把邮件写入服务端日志；SendGrid 才会真实投递。",
    sendGridKey: "SendGrid API 密钥",
    sendGridKeyDetail: "仅供服务端调用 SendGrid 的凭据。",
    fromAddress: "发件邮箱地址",
    fromAddressDetail: "生产环境应使用已在 SendGrid 验证的公网域名邮箱。",
    fromName: "发件人名称",
    fromNameDetail: "显示在发件邮箱旁的名称。",
    dummyLogOnly: "Dummy · 仅写日志",
    emailDeploymentTitle: "生产邮件投递",
    emailDeploymentSteps: [
      "将 EMAIL_PROVIDER 设置为 SendGrid，并配置 SendGrid API 密钥。",
      "将 EMAIL_FROM_ADDRESS 设置为已在 SendGrid 验证的发件地址。",
      "重启或重新部署服务端，再发送验证邮件或密码重置邮件确认投递。",
    ],
    emailSecretNote:
      "页面不会读取或显示 SendGrid 密钥明文，只会报告是否已配置。",
  },
} as const;

type ServiceSettingsCopy =
  (typeof serviceSettingsCopy)[keyof typeof serviceSettingsCopy];

export function AiProviderSettingsPage({ user }: { user: AuthUser }) {
  const copy = useAiStudioCopy();
  const { locale } = useI18n();
  const integrationCopy = serviceSettingsCopy[locale];
  const settings = useQuery(getAiProviderSettings);
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [loadedVersion, setLoadedVersion] = useState<string>();
  const [busy, setBusy] = useState<"save" | "test" | "reset" | null>(null);

  const settingsVersion = useMemo(() => {
    if (!settings.data) return undefined;
    return `${settings.data.source}:${
      settings.data.updatedAt?.toString() ?? "env"
    }`;
  }, [settings.data]);

  useEffect(() => {
    if (
      !settings.data ||
      !settingsVersion ||
      settingsVersion === loadedVersion
    ) {
      return;
    }
    setForm({
      baseUrl: settings.data.baseUrl,
      model: settings.data.model,
      apiKey: "",
      hourlyTokenLimit: String(settings.data.hourlyTokenLimit),
      maxCompletionTokens: String(settings.data.maxCompletionTokens),
    });
    setLoadedVersion(settingsVersion);
  }, [loadedVersion, settings.data, settingsVersion]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("save");
    try {
      const saved = await updateAiProviderSettings(toInput(form));
      setForm({
        baseUrl: saved.baseUrl,
        model: saved.model,
        apiKey: "",
        hourlyTokenLimit: String(saved.hourlyTokenLimit),
        maxCompletionTokens: String(saved.maxCompletionTokens),
      });
      setLoadedVersion(
        `${saved.source}:${saved.updatedAt?.toString() ?? "env"}`,
      );
      await settings.refetch();
      toast({ title: copy.saved });
    } catch (error) {
      showError(
        error,
        copy.providerRequestFailed,
        copy.tryAgain,
        copy.errorMessage,
      );
    } finally {
      setBusy(null);
    }
  };

  const testConnection = async () => {
    setBusy("test");
    try {
      const result = await testAiProviderConnection(toInput(form));
      toast({
        title: copy.connectionSuccessful,
        description: copy.providerLatency(result.latencyMs),
      });
    } catch (error) {
      showError(
        error,
        copy.providerRequestFailed,
        copy.tryAgain,
        copy.errorMessage,
      );
    } finally {
      setBusy(null);
    }
  };

  const restoreEnvironment = async () => {
    if (!window.confirm(copy.restoreEnvironmentConfirm)) return;

    setBusy("reset");
    try {
      const restored = await resetAiProviderSettings();
      setForm({
        baseUrl: restored.baseUrl,
        model: restored.model,
        apiKey: "",
        hourlyTokenLimit: String(restored.hourlyTokenLimit),
        maxCompletionTokens: String(restored.maxCompletionTokens),
      });
      setLoadedVersion(
        `${restored.source}:${restored.updatedAt?.toString() ?? "env"}`,
      );
      await settings.refetch();
      toast({ title: copy.environmentRestored });
    } catch (error) {
      showError(
        error,
        copy.providerRequestFailed,
        copy.tryAgain,
        copy.errorMessage,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="mx-auto max-w-4xl">
        <Breadcrumb pageName={copy.settingsTitle} homeLabel={copy.dashboard} />

        {settings.isLoading && <LoadingSpinner />}
        {settings.error && (
          <Alert variant="destructive">
            <AlertTitle>{copy.settingsUnavailable}</AlertTitle>
            <AlertDescription>{settings.error.message}</AlertDescription>
          </Alert>
        )}

        {settings.data && (
          <div className="space-y-6">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>
                {settings.data.source === "database"
                  ? copy.databaseActive
                  : copy.environmentActive}
              </AlertTitle>
              <AlertDescription>
                {copy.apiKey}: {settings.data.apiKeyHint ?? copy.notConfigured}
                {settings.data.updatedAt
                  ? ` | ${copy.updated} ${new Date(
                      settings.data.updatedAt,
                    ).toLocaleString(copy.dateLocale)}`
                  : ""}
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <KeyRound className="h-5 w-5" />
                  {copy.providerCredentials}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider-base-url">{copy.baseUrl}</Label>
                    <Input
                      id="ai-provider-base-url"
                      name="baseUrl"
                      type="url"
                      required
                      autoComplete="url"
                      value={form.baseUrl}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setForm((current) => ({ ...current, baseUrl: value }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-provider-model">{copy.model}</Label>
                    <Input
                      id="ai-provider-model"
                      name="model"
                      required
                      autoComplete="off"
                      value={form.model}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setForm((current) => ({ ...current, model: value }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-provider-api-key">{copy.apiKey}</Label>
                    <Input
                      id="ai-provider-api-key"
                      name="apiKey"
                      type="password"
                      autoComplete="new-password"
                      value={form.apiKey}
                      placeholder={
                        settings.data.hasApiKey
                          ? copy.keepKey(
                              settings.data.apiKeyHint ?? copy.notConfigured,
                            )
                          : copy.enterKey
                      }
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setForm((current) => ({ ...current, apiKey: value }));
                      }}
                    />
                    <p className="text-muted-foreground text-sm">
                      {copy.encryptedKeyNote}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ai-provider-hourly-token-limit">
                        {copy.hourlyTokenLimit}
                      </Label>
                      <Input
                        id="ai-provider-hourly-token-limit"
                        name="hourlyTokenLimit"
                        type="number"
                        min={1_000}
                        max={10_000_000}
                        step={1_000}
                        required
                        inputMode="numeric"
                        value={form.hourlyTokenLimit}
                        onChange={(event) => {
                          const { value } = event.currentTarget;
                          setForm((current) => ({
                            ...current,
                            hourlyTokenLimit: value,
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-provider-max-completion-tokens">
                        {copy.maxCompletionTokens}
                      </Label>
                      <Input
                        id="ai-provider-max-completion-tokens"
                        name="maxCompletionTokens"
                        type="number"
                        min={512}
                        max={64_000}
                        step={512}
                        required
                        inputMode="numeric"
                        value={form.maxCompletionTokens}
                        onChange={(event) => {
                          const { value } = event.currentTarget;
                          setForm((current) => ({
                            ...current,
                            maxCompletionTokens: value,
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-6">
                    {copy.tokenBudgetNote}
                  </p>

                  <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                    {settings.data.source === "database" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={restoreEnvironment}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {busy === "reset"
                          ? copy.restoringEnvironment
                          : copy.restoreEnvironment}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy !== null || !form.baseUrl || !form.model}
                      onClick={testConnection}
                    >
                      <PlugZap className="h-4 w-4" />
                      {busy === "test" ? copy.testing : copy.testConnection}
                    </Button>
                    <Button
                      type="submit"
                      disabled={busy !== null || !form.baseUrl || !form.model}
                    >
                      <Save className="h-4 w-4" />
                      {busy === "save" ? copy.saving : copy.save}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <EmailDeliveryPanel
              integration={settings.data.emailDelivery}
              copy={integrationCopy}
            />

            <PublishingIntegrationPanel
              integration={settings.data.publishingIntegration}
              copy={integrationCopy}
            />
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function EmailDeliveryPanel({
  integration,
  copy,
}: {
  integration: EmailDeliveryIntegrationView;
  copy: ServiceSettingsCopy;
}) {
  const usingSendGrid = integration.provider === "SendGrid";
  return (
    <Card id="email-delivery" className="scroll-mt-24">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
              {copy.emailTitle}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {copy.emailDescription}
            </p>
          </div>
          <IntegrationStatus
            configured={integration.ready}
            configuredLabel={copy.ready}
            missingLabel={copy.actionRequired}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <dl className="divide-y rounded-md border">
          <IntegrationVariableRow
            label={copy.emailProvider}
            detail={copy.emailProviderDetail}
            variable="EMAIL_PROVIDER"
            configured={usingSendGrid}
            configuredLabel="SendGrid"
            missingLabel={copy.dummyLogOnly}
            copy={copy}
          />
          <IntegrationVariableRow
            label={copy.sendGridKey}
            detail={copy.sendGridKeyDetail}
            variable="SENDGRID_API_KEY"
            configured={integration.sendGridApiKeyConfigured}
            copy={copy}
          />
          <IntegrationVariableRow
            label={copy.fromAddress}
            detail={copy.fromAddressDetail}
            variable="EMAIL_FROM_ADDRESS"
            configured={integration.fromAddressConfigured}
            copy={copy}
          />
          <IntegrationVariableRow
            label={copy.fromName}
            detail={copy.fromNameDetail}
            variable="EMAIL_FROM_NAME"
            configured={integration.fromNameConfigured}
            copy={copy}
          />
        </dl>

        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold">{copy.emailDeploymentTitle}</h3>
          <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            {copy.emailDeploymentSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <p className="bg-muted/50 rounded-md px-4 py-3 text-sm leading-6">
          {copy.emailSecretNote}
        </p>
      </CardContent>
    </Card>
  );
}

function PublishingIntegrationPanel({
  integration,
  copy,
}: {
  integration: PublishingIntegrationView;
  copy: ServiceSettingsCopy;
}) {
  return (
    <Card id="publishing-integration" className="scroll-mt-24">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Webhook className="h-5 w-5" aria-hidden="true" />
              {copy.publishingTitle}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {copy.publishingDescription}
            </p>
          </div>
          <IntegrationStatus
            configured={integration.ready}
            configuredLabel={copy.ready}
            missingLabel={copy.actionRequired}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <dl className="divide-y rounded-md border">
          <IntegrationVariableRow
            label={copy.webhookUrl}
            detail={copy.webhookUrlDetail}
            variable="CMS_REBUILD_WEBHOOK_URL"
            configured={integration.webhookUrlConfigured}
            copy={copy}
          />
          <IntegrationVariableRow
            label={copy.webhookToken}
            detail={copy.webhookTokenDetail}
            variable="CMS_REBUILD_WEBHOOK_TOKEN"
            configured={integration.webhookTokenConfigured}
            copy={copy}
          />
        </dl>

        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold">{copy.deploymentTitle}</h3>
          <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            {copy.deploymentSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="bg-muted/50 space-y-2 rounded-md px-4 py-3 text-sm leading-6">
          <p>{copy.acceptanceNote}</p>
          <p className="text-muted-foreground">{copy.secretNote}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationVariableRow({
  label,
  detail,
  variable,
  configured,
  configuredLabel,
  missingLabel,
  copy,
}: {
  label: string;
  detail: string;
  variable: string;
  configured: boolean;
  configuredLabel?: string;
  missingLabel?: string;
  copy: ServiceSettingsCopy;
}) {
  return (
    <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <dt className="text-sm font-medium">{label}</dt>
        <dd className="text-muted-foreground mt-1 text-xs leading-5">
          {detail}
        </dd>
        <code className="bg-muted mt-2 inline-block max-w-full overflow-x-auto rounded px-2 py-1 text-xs">
          {variable}
        </code>
      </div>
      <IntegrationStatus
        configured={configured}
        configuredLabel={configuredLabel ?? copy.configured}
        missingLabel={missingLabel ?? copy.missing}
      />
    </div>
  );
}

function IntegrationStatus({
  configured,
  configuredLabel,
  missingLabel,
}: {
  configured: boolean;
  configuredLabel: string;
  missingLabel: string;
}) {
  const Icon = configured ? CircleCheck : CircleAlert;
  return (
    <span
      className={
        configured
          ? "bg-success/10 text-success inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
          : "bg-warning/10 text-warning inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
      }
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {configured ? configuredLabel : missingLabel}
    </span>
  );
}

function toInput(form: ProviderForm) {
  return {
    baseUrl: form.baseUrl,
    model: form.model,
    apiKey: form.apiKey || undefined,
    hourlyTokenLimit: Number(form.hourlyTokenLimit),
    maxCompletionTokens: Number(form.maxCompletionTokens),
  };
}

function showError(
  error: unknown,
  title: string,
  fallback: string,
  localize: (message: string | undefined, fallback: string) => string,
) {
  toast({
    variant: "destructive",
    title,
    description: localize(
      error instanceof Error ? error.message : undefined,
      fallback,
    ),
  });
}
