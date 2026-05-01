import type { EmailTransport } from "@/lib/email/transport";

/**
 * F3 占位：真 SMTP 需引入 nodemailer（或供商 SDK）并配置：
 * `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`（true/false）
 */
export function createSmtpEmailTransport(): EmailTransport {
  return {
    async send(): Promise<void> {
      throw new Error(
        "EMAIL_TRANSPORT=smtp 尚未实现。请改用 console，或在本仓库接入 nodemailer 与 SMTP_* 环境变量。"
      );
    },
  };
}
