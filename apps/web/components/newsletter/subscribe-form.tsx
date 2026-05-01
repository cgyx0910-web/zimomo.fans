"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  subscribeNewsletterAction,
  type SubscribeNewsletterState,
} from "@/actions/newsletter-actions";
import { NEWSLETTER_HONEYPOT_FIELD } from "@/lib/newsletter/constants";

export function SubscribeForm(props: {
  defaultEmail?: string | null;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setError(undefined);
      setMessage(undefined);
      try {
        const formData = new FormData(event.currentTarget);
        const result: SubscribeNewsletterState = await subscribeNewsletterAction(
          null,
          formData
        );
        if (result.error) {
          setError(result.error);
        }
        if (result.message) {
          setMessage(result.message);
        }
      } catch {
        /* redirect() rejects in-flight transition */
      }
    });
  }

  return (
    <form className="relative space-y-5" onSubmit={(e) => void onSubmit(e)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 h-px w-px opacity-0"
      >
        <label htmlFor={NEWSLETTER_HONEYPOT_FIELD}>
          Company
          <input
            autoComplete="off"
            defaultValue=""
            id={NEWSLETTER_HONEYPOT_FIELD}
            name={NEWSLETTER_HONEYPOT_FIELD}
            tabIndex={-1}
            type="text"
          />
        </label>
      </div>

      {props.utmSource ?
        <input name="utm_source" type="hidden" value={props.utmSource} />
      : null}
      {props.utmMedium ?
        <input name="utm_medium" type="hidden" value={props.utmMedium} />
      : null}
      {props.utmCampaign ?
        <input name="utm_campaign" type="hidden" value={props.utmCampaign} />
      : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">邮箱</span>
        <input
          autoComplete="email"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={props.defaultEmail ?? ""}
          name="email"
          required
          type="email"
        />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          className="mt-1"
          name="acceptPrivacy"
          required
          type="checkbox"
          value="on"
        />
        <span className="text-neutral-700 dark:text-neutral-300">
          我已阅读并同意为完成订阅而处理我的邮箱地址（双 opt-in、可退订），详见
          <a className="ml-1 underline" href="/privacy">
            隐私说明
          </a>
          。
        </span>
      </label>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{message}</p>
      ) : null}

      <button
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        disabled={pending}
        type="submit"
      >
        {pending ? "提交中…" : "发送确认邮件"}
      </button>
    </form>
  );
}
