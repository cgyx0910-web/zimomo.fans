import { z } from "zod";
import { isIP } from "node:net";

const trimmed = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string()
);

export const sourceNameSchema = trimmed.pipe(
  z.string().min(1, "名称不能为空").max(120, "名称过长（最多 120 字）")
);

export const sourceFeedUrlSchema = trimmed.pipe(
  z
    .string()
    .url("必须是有效 URL")
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    }, "仅允许 http/https")
    .refine((value) => {
      const hostname = new URL(value).hostname.toLowerCase();
      if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        return false;
      }
      if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
        return false;
      }
      const ipType = isIP(hostname);
      if (!ipType) {
        return true;
      }
      if (ipType === 4) {
        if (
          hostname.startsWith("10.") ||
          hostname.startsWith("127.") ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("169.254.")
        ) {
          return false;
        }
        const match = /^172\.(\d{1,3})\./.exec(hostname);
        if (match) {
          const second = Number(match[1]);
          if (second >= 16 && second <= 31) {
            return false;
          }
        }
      }
      if (ipType === 6) {
        const normalized = hostname.toLowerCase();
        if (
          normalized === "::1" ||
          normalized.startsWith("fc") ||
          normalized.startsWith("fd") ||
          normalized.startsWith("fe80:")
        ) {
          return false;
        }
      }
      return true;
    }, "不允许使用本机/内网/metadata 地址")
);

export function formatSourceFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.filter(Boolean).join(".") || "form";
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}
