"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  loginUserAction,
  type UserAuthActionState,
} from "@/actions/user-auth-actions";

export function LoginForm(props: { nextPath: string }) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(undefined);

      try {
        const formData = new FormData(event.currentTarget);
        const result: UserAuthActionState = await loginUserAction(
          null,
          formData
        );

        if (result?.error) {
          setError(result.error);
        }
      } catch {
        /* redirect()/navigation rejects in-flight transitions */
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void submitForm(e)}>
      <input name="next" type="hidden" value={props.nextPath} />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">邮箱</span>
        <input
          autoComplete="email"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="email"
          required
          type="email"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">密码</span>
        <input
          autoComplete="current-password"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="password"
          required
          type="password"
        />
      </label>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        disabled={pending}
        type="submit"
      >
        {pending ? "登录中…" : "登录"}
      </button>

      <p className="text-xs text-neutral-500">
        会话 Cookie <code className="font-mono text-xs">guge_user</code>
        ，需配置环境变量{" "}
        <code className="font-mono text-xs">USER_JWT_SECRET</code>。
      </p>
    </form>
  );
}
