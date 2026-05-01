import { cookies } from "next/headers";

import { USER_SESSION_COOKIE } from "@/lib/auth/user-constants";
import { verifyUserJwt } from "@/lib/auth/user-token";
import { findUserById } from "@/lib/users/queries";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** 已登录前台用户（DB 行）；未登录或 token 无效时为 null */
export async function getCurrentUser() {
  const secret = readEnv("USER_JWT_SECRET");
  if (!secret) {
    return null;
  }

  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { userId } = await verifyUserJwt({ token, secret });
    const user = await findUserById(userId);
    return user;
  } catch {
    return null;
  }
}
