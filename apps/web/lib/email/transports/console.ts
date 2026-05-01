import type { EmailMessage, EmailTransport } from "@/lib/email/transport";

export function createConsoleEmailTransport(): EmailTransport {
  return {
    async send(message: EmailMessage): Promise<void> {
      const payload = {
        to: message.to,
        from: message.from,
        subject: message.subject,
        text: message.text,
        html: message.html,
      };
      // eslint-disable-next-line no-console -- 设计为 console transport
      console.info("[email:console]", JSON.stringify(payload, null, 2));
    },
  };
}
