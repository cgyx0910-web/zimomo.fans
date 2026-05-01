"use server";

// F2 起：与评论 spam 一并加入速率限制 / Captcha；F1 仅交付账户与会话。

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { USER_SESSION_COOKIE } from "@/lib/auth/user-constants";
import { signUserJwt } from "@/lib/auth/user-token";
import {
  createUser,
  findUserByEmail,
  touchLastLoginAt,
} from "@/lib/users/queries";
import {
  buildRateKey,
  enforceRateLimit,
  rateLimitMessage,
} from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/rate-limit/request-ip";
import {
  loginInputSchema,
  registerInputSchema,
} from "@/lib/users/validation";

/** 用户不存在时仍走 bcrypt.compare，降低邮箱枚举 timing 信号 */
const BCRYPT_TIMING_DUMMY =
  "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGgaC1eO";

const BCRYPT_COST = 12;
const USER_SESSION_MAX_AGE = 60 * 60 * 12;

function sanitizeNext(raw: unknown): string {
  if (typeof raw !== "string") {
    return "/account";
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/account";
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

export type UserAuthActionState = {
  error?: string;
};

export async function registerUserAction(
  _prevState: UserAuthActionState | null,
  formData: FormData
): Promise<UserAuthActionState> {
  const parsed = registerInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") ?? undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ??
      first.password?.[0] ??
      first.displayName?.[0] ??
      "请检查输入。";
    return { error: msg };
  }

  const ipReg = await getRequestIp();
  const regRl = await enforceRateLimit({
    bucket: "user.register",
    key: ipReg,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!regRl.allowed) {
    return { error: rateLimitMessage(regRl) };
  }

  const secret = readEnv("USER_JWT_SECRET");
  if (!secret) {
    return { error: "服务端未配置 USER_JWT_SECRET。" };
  }

  const { email, password, displayName } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return { error: "该邮箱已注册。" };
  }

  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  } catch {
    return { error: "注册处理异常，请稍后重试。" };
  }

  let userId: string;
  try {
    const row = await createUser({
      email,
      passwordHash,
      displayName: displayName ?? null,
    });
    userId = row.id;
  } catch {
    return { error: "注册失败，该邮箱可能已被占用。" };
  }

  const token = await signUserJwt({
    secret,
    userId,
    email,
    expiresIn: "12h",
  });

  const store = await cookies();
  store.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
  });

  redirect(sanitizeNext(formData.get("next")));
}

export async function loginUserAction(
  _prevState: UserAuthActionState | null,
  formData: FormData
): Promise<UserAuthActionState> {
  const parsed = loginInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ?? first.password?.[0] ?? "请检查输入。";
    return { error: msg };
  }

  const ipLogin = await getRequestIp();
  const loginRl = await enforceRateLimit({
    bucket: "user.login",
    key: buildRateKey(ipLogin, parsed.data.email.toLowerCase()),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!loginRl.allowed) {
    return { error: rateLimitMessage(loginRl) };
  }

  const secret = readEnv("USER_JWT_SECRET");
  if (!secret) {
    return { error: "服务端未配置 USER_JWT_SECRET。" };
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  const hashToCompare = user?.passwordHash ?? BCRYPT_TIMING_DUMMY;
  let ok = false;
  try {
    ok = await bcrypt.compare(password, hashToCompare);
  } catch {
    return { error: "登录校验异常，请稍后重试。" };
  }

  if (!user || !ok) {
    return { error: "邮箱或密码不正确。" };
  }

  const token = await signUserJwt({
    secret,
    userId: user.id,
    email: user.email,
    expiresIn: "12h",
  });

  const store = await cookies();
  store.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
  });

  await touchLastLoginAt(user.id);

  redirect(sanitizeNext(formData.get("next")));
}

export async function logoutUserAction(): Promise<void> {
  const store = await cookies();
  store.delete({
    name: USER_SESSION_COOKIE,
    path: "/",
  });
  redirect("/");
}
