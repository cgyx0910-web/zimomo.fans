import { parseFeedXml, xmlTextFromMixed } from "@/lib/xml/rss-parser";

function decodeXml(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function fieldText(node: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = node[key];
    const text = xmlTextFromMixed(value);
    if (text?.trim()) {
      return text.trim();
    }
  }
  return null;
}

function collectReadableStrings(value: unknown, out: string[], budget: { remaining: number }): void {
  if (budget.remaining <= 0) {
    return;
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (s.length) {
      out.push(s);
      budget.remaining -= s.length;
    }
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    budget.remaining -= 16;
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const child of value) {
      collectReadableStrings(child, out, budget);
      if (budget.remaining <= 0) {
        return;
      }
    }
    return;
  }

  const obj = value as Record<string, unknown>;

  const text = obj["#text"];
  if (typeof text === "string" || typeof text === "number" || typeof text === "boolean") {
    const s = String(text).trim();
    if (s.length) {
      out.push(s);
      budget.remaining -= s.length;
    }
  }

  for (const [key, child] of Object.entries(obj)) {
    if (key.startsWith("@_")) {
      continue;
    }
    if (key === "#text") {
      continue;
    }
    collectReadableStrings(child, out, budget);
    if (budget.remaining <= 0) {
      return;
    }
  }
}

function coerceArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function unwrapFeedEntryCandidates(root: Record<string, unknown>): Record<string, unknown>[] {
  const direct: Record<string, unknown>[] = [];

  const rss = root.rss;
  if (rss && typeof rss === "object") {
    const channels = coerceArray((rss as Record<string, unknown>).channel).filter(
      (ch): ch is Record<string, unknown> => Boolean(ch && typeof ch === "object")
    );
    for (const channel of channels) {
      const items = coerceArray(channel.item).filter(
        (it): it is Record<string, unknown> => Boolean(it && typeof it === "object")
      );
      if (items.length) {
        direct.push(...items);
      } else {
        direct.push(channel);
      }
    }
    return direct.length ? direct : [root];
  }

  const feed = root.feed;
  if (feed && typeof feed === "object") {
    const entries = coerceArray((feed as Record<string, unknown>).entry).filter(
      (e): e is Record<string, unknown> => Boolean(e && typeof e === "object")
    );
    direct.push(...entries);
    return direct.length ? direct : [root];
  }

  const RDF = root.RDF ?? root["rdf:RDF"];
  if (RDF && typeof RDF === "object") {
    const rdfObj = RDF as Record<string, unknown>;
    const channels = coerceArray(rdfObj.channel).filter(
      (ch): ch is Record<string, unknown> => Boolean(ch && typeof ch === "object")
    );
    const items: Record<string, unknown>[] = [];
    for (const channel of channels) {
      items.push(...coerceArray(channel.item).filter(Boolean) as Record<string, unknown>[]);
    }
    items.push(
      ...coerceArray(rdfObj.item).filter(
        (it): it is Record<string, unknown> => Boolean(it && typeof it === "object")
      )
    );
    direct.push(...items);
    return direct.length ? direct : [root];
  }

  return direct.length ? direct : [root];
}

function normalizedFromParsedNode(root: Record<string, unknown>): string | null {
  const candidates = unwrapFeedEntryCandidates(root);

  for (const node of candidates) {
    const title = fieldText(node, ["title"]);

    const desc = fieldText(node, ["description", "summary", "subtitle"]);

    const contentEncoded =
      fieldText(node, ["content:encoded", "content_encoded", "encoded", "content", "body"]) ??
      xmlTextFromMixed(node.content) ??
      xmlTextFromMixed(node["content:encoded"]);

    const chunks = [title, desc, contentEncoded].filter((value): value is string => Boolean(value));
    const joined = chunks.length ? chunks.join("\n") : null;
    if (!joined) {
      const out: string[] = [];
      collectReadableStrings(node, out, { remaining: 200_000 });
      const scraped = collapseWhitespace(decodeXml(stripTags(out.join("\n"))));
      if (scraped.length) {
        return scraped;
      }
      continue;
    }

    const text = collapseWhitespace(decodeXml(stripTags(joined)));
    if (text.length) {
      return text;
    }
  }

  return null;
}

export function extractNormalizedTextFromXml(xml: string): string {
  try {
    const parsed = parseFeedXml(xml) as Record<string, unknown>;
    const fromNode = normalizedFromParsedNode(parsed);
    if (fromNode) {
      return fromNode;
    }
  } catch {
    // fall back below
  }

  return collapseWhitespace(decodeXml(stripTags(xml)));
}
