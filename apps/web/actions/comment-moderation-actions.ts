"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdminSession } from "@/lib/auth/session";
import { revalidateArticlePublicPaths } from "@/lib/i18n/revalidate-public";
import { updateArticleCommentStatus } from "@/lib/comments/queries";

const decisionSchema = z.enum(["approve", "reject"]);

export async function moderateArticleCommentAction(
  formData: FormData
): Promise<void> {
  await assertAdminSession();

  const idRaw = formData.get("id");
  const decisionRaw = formData.get("decision");

  const idParsed = z.string().uuid().safeParse(
    typeof idRaw === "string" ? idRaw.trim() : ""
  );
  const decisionParsed = decisionSchema.safeParse(
    typeof decisionRaw === "string" ? decisionRaw.trim() : ""
  );

  if (!idParsed.success || !decisionParsed.success) {
    return;
  }

  const nextStatus =
    decisionParsed.data === "approve" ? "approved" : "rejected";

  const slugRow = await updateArticleCommentStatus({
    id: idParsed.data,
    status: nextStatus,
  });

  if (slugRow && nextStatus === "approved") {
    revalidateArticlePublicPaths(slugRow.articleSlug);
  }
  revalidatePath("/admin/comments");
}
