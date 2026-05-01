import Link from "next/link";

import { ArticleCommentComposer } from "@/components/comments/article-comment-composer";
import { ArticleCommentList } from "@/components/comments/article-comment-list";
import { getCurrentUser } from "@/lib/auth/user-session";
import { listApprovedCommentsForArticle } from "@/lib/comments/queries";

export async function ArticleCommentsSection(props: {
  articleId: string;
  articleSlug: string;
}) {
  const [user, comments] = await Promise.all([
    getCurrentUser(),
    listApprovedCommentsForArticle(props.articleId),
  ]);

  const loginNextPath = `/articles/${props.articleSlug}`;

  return (
    <section
      aria-label="评论"
      className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        评论
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        仅展示<strong>已通过人工审核</strong>的评论；内容由{" "}
        <Link className="underline" href="/account/register">
          注册用户
        </Link>{" "}
        发表，不使用 AI 伪造评论。
      </p>

      <div className="mt-6">
        <ArticleCommentComposer
          articleSlug={props.articleSlug}
          isLoggedIn={Boolean(user)}
          loginNextPath={loginNextPath}
        />
      </div>

      <div className="mt-10">
        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          精选讨论
        </h3>
        <div className="mt-3">
          <ArticleCommentList comments={comments} />
        </div>
      </div>
    </section>
  );
}
