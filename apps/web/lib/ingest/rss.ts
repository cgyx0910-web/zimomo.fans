import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { listActiveSources, updateSourceFetchStatus } from "@/lib/sources/queries";
import { persistRawEntries, type ParsedFeedEntry } from "@/lib/ingest/raw-documents";
import { extractFeedEntries } from "@/lib/xml/rss-parser";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_ERROR_LENGTH = 500;
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const INGEST_CONCURRENCY = 3;

export type SourceIngestResult = {
  sourceId: string;
  name: string;
  feedUrl: string;
  ok: boolean;
  itemCount: number;
  storedCount: number;
  status: string;
  error: string | null;
};

export type RssIngestSummary = {
  totalSources: number;
  successCount: number;
  failedCount: number;
  totalStoredCount: number;
  durationMs: number;
  results: SourceIngestResult[];
};

function decodeXml(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function extractEntries(xml: string): ParsedFeedEntry[] {
  return extractFeedEntries(xml).map((entry) => ({
    ...entry,
    guid: entry.guid ? decodeXml(entry.guid) : null,
    title: entry.title ? decodeXml(entry.title) : null,
    link: entry.link ? decodeXml(entry.link) : null,
    author: entry.author ? decodeXml(entry.author) : null,
  }));
}

function cleanErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, MAX_ERROR_LENGTH);
  }
  return "unknown error";
}

function isPrivateIp(address: string): boolean {
  const ipType = isIP(address);
  if (!ipType) {
    return false;
  }
  if (ipType === 4) {
    if (
      address.startsWith("10.") ||
      address.startsWith("127.") ||
      address.startsWith("192.168.") ||
      address.startsWith("169.254.")
    ) {
      return true;
    }
    const match = /^172\.(\d{1,3})\./.exec(address);
    if (match) {
      const second = Number(match[1]);
      return second >= 16 && second <= 31;
    }
    return false;
  }
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

async function assertSafeFeedTarget(feedUrl: string): Promise<void> {
  const url = new URL(feedUrl);
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("blocked unsafe target host");
  }
  if (host === "169.254.169.254") {
    throw new Error("blocked metadata endpoint");
  }
  if (isPrivateIp(host)) {
    throw new Error("blocked private ip target");
  }

  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.some((addr) => isPrivateIp(addr.address))) {
      throw new Error("blocked private ip resolved target");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "dns lookup failed";
    if (message.includes("blocked")) {
      throw error;
    }
    // DNS failures will be handled by fetch afterwards.
  }
}

async function fetchFeed(feedUrl: string): Promise<string> {
  await assertSafeFeedTarget(feedUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feedUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "user-agent": "guge-b1-rss-ingest/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (!response.body) {
      return await response.text();
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = value ?? new Uint8Array();
      total += chunk.byteLength;
      if (total > MAX_FEED_BYTES) {
        throw new Error(`response_too_large:${total}`);
      }
      text += decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runRssIngest(): Promise<RssIngestSummary> {
  const startedAt = Date.now();
  const sourceRows = await listActiveSources();
  const results: SourceIngestResult[] = [];

  async function processSource(source: (typeof sourceRows)[number]): Promise<void> {
    const fetchedAt = new Date();
    try {
      const xml = await fetchFeed(source.feedUrl);
      let entries: ParsedFeedEntry[];
      try {
        entries = extractEntries(xml);
      } catch (error) {
        const message = cleanErrorMessage(error);
        const parseResult: SourceIngestResult = {
          sourceId: source.id,
          name: source.name,
          feedUrl: source.feedUrl,
          ok: false,
          itemCount: 0,
          storedCount: 0,
          status: "parse_error",
          error: message.startsWith("xml_parse_error:") ? message : `xml_parse_error:${message}`,
        };
        results.push(parseResult);
        await updateSourceFetchStatus({
          sourceId: source.id,
          status: parseResult.status,
          error: parseResult.error,
          fetchedAt,
        });
        return;
      }

      if (entries.length === 0) {
        const result: SourceIngestResult = {
          sourceId: source.id,
          name: source.name,
          feedUrl: source.feedUrl,
          ok: false,
          itemCount: 0,
          storedCount: 0,
          status: "parse_error",
          error: "未解析到 item/entry",
        };
        results.push(result);
        await updateSourceFetchStatus({
          sourceId: source.id,
          status: result.status,
          error: result.error,
          fetchedAt,
        });
        return;
      }

      const storedCount = await persistRawEntries({
        sourceId: source.id,
        fetchedAt,
        entries,
        contentType: "application/xml",
      });

      const result: SourceIngestResult = {
        sourceId: source.id,
        name: source.name,
        feedUrl: source.feedUrl,
        ok: true,
        itemCount: entries.length,
        storedCount,
        status: "ok",
        error: null,
      };
      results.push(result);
      await updateSourceFetchStatus({
        sourceId: source.id,
        status: "ok",
        error: null,
        fetchedAt,
      });
    } catch (error) {
      const message = cleanErrorMessage(error);
      const status =
        message.startsWith("HTTP ") ? "http_error"
        : message.startsWith("response_too_large:") ? "size_limit_exceeded"
        : "network_error";
      const result: SourceIngestResult = {
        sourceId: source.id,
        name: source.name,
        feedUrl: source.feedUrl,
        ok: false,
        itemCount: 0,
        storedCount: 0,
        status,
        error: message,
      };
      results.push(result);
      await updateSourceFetchStatus({
        sourceId: source.id,
        status,
        error: message,
        fetchedAt,
      });
    }
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(INGEST_CONCURRENCY, sourceRows.length) }).map(
    async () => {
      while (cursor < sourceRows.length) {
        const idx = cursor;
        cursor += 1;
        const source = sourceRows[idx];
        if (!source) {
          continue;
        }
        await processSource(source);
      }
    }
  );
  await Promise.all(workers);

  const successCount = results.filter((result) => result.ok).length;
  const totalStoredCount = results.reduce(
    (sum, result) => sum + result.storedCount,
    0
  );
  return {
    totalSources: sourceRows.length,
    successCount,
    failedCount: results.length - successCount,
    totalStoredCount,
    durationMs: Date.now() - startedAt,
    results,
  };
}
