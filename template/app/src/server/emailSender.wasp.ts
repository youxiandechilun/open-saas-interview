import { type EmailSender } from "@wasp.sh/spec";

const emailProvider =
  process.env.EMAIL_PROVIDER?.trim().toLowerCase() === "sendgrid"
    ? "SendGrid"
    : "Dummy";

export const emailSender: EmailSender = {
  provider: emailProvider,
  defaultFrom: {
    name: process.env.EMAIL_FROM_NAME?.trim() || "MotionPress",
    email:
      process.env.EMAIL_FROM_ADDRESS?.trim() || "noreply@motionpress.local",
  },
};
