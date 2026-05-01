"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  loginAction,
  type LoginActionState,
} from "@/actions/admin-auth-actions";

export function LoginForm(props: { nextPath: string }) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(undefined);

      try {
        const formData = new FormData(event.currentTarget);
        const result: LoginActionState = await loginAction(null, formData);

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
        <span className="text-sm font-medium">管理员口令</span>
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
        单人后台：服务端使用 <code className="font-mono text-xs">ADMIN_PASSWORD_HASH</code>{" "}
       （bcrypt）校验。
      </p>
    </form>
  );
}
