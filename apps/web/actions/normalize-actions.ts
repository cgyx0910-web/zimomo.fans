"use server";

import { revalidatePath } from "next/cache";

import { assertAdminSession } from "@/lib/auth/session";
import { runNormalizeBatch } from "@/lib/normalize/worker";

export async function runNormalizeNowAction(): Promise<
  { error: string } | { summary: Awaited<ReturnType<typeof runNormalizeBatch>> }
> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  try {
    const summary = await runNormalizeBatch();
    revalidatePath("/admin/content-items");
    return { summary };
  } catch (error) {
    console.error(error);
    return { error: "执行 normalize 失败，请稍后重试。" };
  }
}
