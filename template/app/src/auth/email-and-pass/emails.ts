import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({
  verificationLink,
}) => ({
  subject: "Verify your email / 验证邮箱",
  text: `Verify your email / 验证邮箱\n\nOpen the link below to verify your email:\n请打开下方链接完成邮箱验证：\n${verificationLink}`,
  html: `
        <p>Open the link below to verify your email.</p>
        <p>请打开下方链接完成邮箱验证。</p>
        <a href="${verificationLink}">Verify email / 验证邮箱</a>
    `,
});

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => ({
  subject: "Password reset / 重置密码",
  text: `Reset your password / 重置密码\n\nOpen the link below to reset your password:\n请打开下方链接重置密码：\n${passwordResetLink}`,
  html: `
        <p>Open the link below to reset your password.</p>
        <p>请打开下方链接重置密码。</p>
        <a href="${passwordResetLink}">Reset password / 重置密码</a>
    `,
});
