"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  registerUserAction,
  type UserAuthActionState,
} from "@/actions/user-auth-actions";

export function RegisterForm(props: { nextPath: string }) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(undefined);

      try {
        const formData = new FormData(event.currentTarget);
        const result: UserAuthActionState = await registerUserAction(
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
        <span className="text-sm font-medium">密码（至少 8 位）</span>
        <input
          autoComplete="new-password"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="password"
          required
          type="password"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">昵称（可选）</span>
        <input
          autoComplete="nickname"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          maxLength={100}
          name="displayName"
          type="text"
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
        {pending ? "注册中…" : "注册"}
      </button>

      <p className="text-xs text-neutral-500">
        注册即创建密码哈希（bcrypt）；邮箱验证将在 Newsletter 等后续功能中接入。
      </p>
    </form>
  );
}
