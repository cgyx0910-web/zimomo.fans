import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { verifyAdminJwt } from "@/lib/auth/token";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export async function assertAdminSession(): Promise<void> {
  const secret = readEnv("ADMIN_JWT_SECRET");
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is not configured");
  }

  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    throw new Error("Admin session is missing");
  }

  await verifyAdminJwt({ token, secret });
}
