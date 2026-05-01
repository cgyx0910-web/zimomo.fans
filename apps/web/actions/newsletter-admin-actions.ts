"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdminSession } from "@/lib/auth/session";
import { getNewsletterById, markNewsletterUnsubscribed } from "@/lib/newsletter/queries";

export async function forceUnsubscribeNewsletterAction(
  formData: FormData
): Promise<void> {
  await assertAdminSession();

  const idParsed = z
    .string()
    .uuid()
    .safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) {
    return;
  }

  const row = await getNewsletterById(idParsed.data);
  if (!row) {
    return;
  }

  await markNewsletterUnsubscribed(row.id);
  revalidatePath("/admin/newsletter");
}
