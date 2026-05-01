import { createConsoleEmailTransport } from "@/lib/email/transports/console";
import { createSmtpEmailTransport } from "@/lib/email/transports/smtp";

export type EmailMessage = {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

/**
 * `EMAIL_TRANSPORT`：
 * - `console`（默认）：开发/验收，控制台输出邮件正文与链接
 * - `smtp`：占位，需后续接入 nodemailer + `SMTP_*` 环境变量
 */
export function getEmailTransport(): EmailTransport {
  const mode = (process.env.EMAIL_TRANSPORT ?? "console").trim().toLowerCase();
  if (mode === "smtp") {
    return createSmtpEmailTransport();
  }
  return createConsoleEmailTransport();
}
