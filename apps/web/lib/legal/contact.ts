/** 法务/纠错/侵权联系邮箱（可选）。未配置时页面展示占位说明，不渲染真实mailto。 */
export function getLegalContactEmail(): string | undefined {
  const v = process.env.LEGAL_CONTACT_EMAIL?.trim();
  return v?.length ? v : undefined;
}
