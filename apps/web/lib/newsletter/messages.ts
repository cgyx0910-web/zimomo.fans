export function buildNewsletterConfirmEmail(params: {
  confirmUrl: string;
  siteLabel: string;
}): { subject: string; text: string; html: string } {
  const subject = `请确认订阅 ${params.siteLabel} 的邮件`;
  const text = [
    `您好，`,
    ``,
    `请点击以下链接完成订阅确认（24 小时内有效）：`,
    params.confirmUrl,
    ``,
    `若未发起订阅，请忽略本邮件。`,
    ``,
    `—— ${params.siteLabel}`,
  ].join("\n");

  const html = `<p>您好，</p><p>请点击以下链接完成订阅确认（24 小时内有效）：</p><p><a href="${escapeHtml(params.confirmUrl)}">${escapeHtml(params.confirmUrl)}</a></p><p>若未发起订阅，请忽略本邮件。</p><p>—— ${escapeHtml(params.siteLabel)}</p>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
