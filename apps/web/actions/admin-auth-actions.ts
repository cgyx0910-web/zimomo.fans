"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { signAdminJwt } from "@/lib/auth/token";
import { enforceRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/rate-limit/request-ip";

function sanitizeNext(raw: unknown): string {
  if (typeof raw !== "string") {
    return "/admin";
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/admin";
  }
  return raw;
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v?.trim()) {
    return undefined;
  }
  return v;
}

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginActionState | null,
  formData: FormData
): Promise<LoginActionState> {
  const password = formData.get("password");
  if (typeof password !== "string") {
    return { error: "请输入密码。" };
  }

  const hash = readEnv("ADMIN_PASSWORD_HASH");
  const secret = readEnv("ADMIN_JWT_SECRET");
  if (!hash || !secret) {
    return { error: "服务端未配置 ADMIN_PASSWORD_HASH / ADMIN_JWT_SECRET。" };
  }

  const ip = await getRequestIp();
  const adminRl = await enforceRateLimit({
    bucket: "admin.login",
    key: ip,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!adminRl.allowed) {
    return { error: rateLimitMessage(adminRl) };
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(password, hash);
  } catch {
    return { error: "登录校验异常，请稍后重试。" };
  }

  if (!ok) {
    return { error: "口令不正确。" };
  }

  const token = await signAdminJwt({ secret, expiresIn: "12h" });
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 12,
  });

  redirect(sanitizeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete({
    name: ADMIN_SESSION_COOKIE,
    path: "/admin",
  });
  redirect("/admin/login");
}
