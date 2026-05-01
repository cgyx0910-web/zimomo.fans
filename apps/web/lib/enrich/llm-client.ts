export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

function readBaseUrl(): string {
  const raw =
    process.env.LLM_API_BASE_URL?.trim() || "https://api.deepseek.com/v1";
  return raw.replace(/\/+$/, "");
}

function readModel(): string {
  return process.env.LLM_MODEL?.trim() || "deepseek-chat";
}

function readApiKey(): string | null {
  const k = process.env.LLM_API_KEY?.trim();
  return k ? k : null;
}

function readTimeoutMs(): number {
  const raw = process.env.LLM_REQUEST_TIMEOUT_MS?.trim();
  if (!raw) {
    return 60_000;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 10_000 || n > 180_000) {
    return 60_000;
  }
  return n;
}

function readMaxTokens(): number {
  const raw = process.env.LLM_MAX_TOKENS?.trim();
  if (!raw) {
    return 1024;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 128 || n > 4096) {
    return 1024;
  }
  return n;
}

/**
 * OpenAI 兼容 POST /v1/chat/completions（DeepSeek 等）。
 */
export async function postChatCompletions(messages: ChatCompletionMessage[]): Promise<string> {
  const key = readApiKey();
  if (!key) {
    throw new Error("未配置 LLM_API_KEY，无法调用模型。");
  }

  const base = readBaseUrl();
  const url = `${base}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), readTimeoutMs());

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: readModel(),
        messages,
        temperature: 0.3,
        max_tokens: readMaxTokens(),
      }),
      signal: controller.signal,
    });

    const json = (await res.json()) as ChatCompletionResponse;
    if (!res.ok) {
      const msg = json.error?.message || res.statusText || "LLM 请求失败";
      throw new Error(`LLM HTTP ${res.status}: ${msg}`);
    }

    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("模型返回空内容。");
    }
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

export function getConfiguredLlmModelLabel(): string {
  return readModel();
}
