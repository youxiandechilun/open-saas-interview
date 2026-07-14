export const CMS_PUBLICATION_DISABLED_MESSAGE =
  "Publishing webhook URL and token are not fully configured. Content remains available through the CMS feed.";

export function getPublicationWebhookConfig(
  webhookUrl: string | undefined,
  webhookToken: string | undefined,
) {
  const url = webhookUrl?.trim();
  const token = webhookToken?.trim();
  return url && token ? { url, token } : null;
}

export function getPublicationInitialState(
  webhookUrl: string | undefined,
  webhookToken: string | undefined,
) {
  const isConfigured = Boolean(
    getPublicationWebhookConfig(webhookUrl, webhookToken),
  );
  return {
    status: isConfigured ? ("PENDING" as const) : ("DISABLED" as const),
    lastError: isConfigured ? null : CMS_PUBLICATION_DISABLED_MESSAGE,
  };
}

export function isRetryablePublicationStatus(status: string): boolean {
  return status === "FAILED" || status === "DISABLED";
}
