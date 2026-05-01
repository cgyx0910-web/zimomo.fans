import { XMLBuilder, XMLParser } from "fast-xml-parser";

import type { ParsedFeedEntry } from "@/lib/ingest/raw-documents";

const TEXT = "#text" as const;
const ATTR = "@_" as const;

const feedParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  textNodeName: TEXT,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  htmlEntities: true,
  ignoreDeclaration: false,
  ignorePiTags: false,
  removeNSPrefix: true,
  alwaysCreateTextNode: false,
  isArray: (tagName, jPath) => {
    const p = `${jPath}.${tagName}`;
    return (
      p.endsWith("rss.channel.item") ||
      p.endsWith("rss.channel") ||
      p.endsWith("feed.entry") ||
      p.endsWith("rdf:RDF.channel.item") ||
      p.endsWith("RDF.channel.item") ||
      p.endsWith("rdf.channel.item")
    );
  },
});

const entryBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  textNodeName: TEXT,
  format: false,
  suppressEmptyNode: true,
  suppressUnpairedNode: true,
});

export function parseFeedXml(xml: string): unknown {
  return feedParser.parse(xml);
}

function coerceArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function xmlTextFromMixed(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const s = String(value).trim();
    return s.length ? s : null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    const parts = value.map(xmlTextFromMixed).filter((v): v is string => Boolean(v));
    return parts.length ? parts.join(" ") : null;
  }

  const node = value as Record<string, unknown>;

  const text = node[TEXT];
  const fromText =
    typeof text === "string" || typeof text === "number" || typeof text === "boolean"
      ? String(text).trim()
      : "";

  let nested = "";
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("@_") || key === TEXT || key.startsWith(":")) {
      continue;
    }
    const part = xmlTextFromMixed(child);
    if (part) {
      nested += nested ? ` ${part}` : part;
    }
  }

  const combined = [fromText, nested].filter(Boolean).join(" ").trim();
  return combined.length ? combined : null;
}

function extractAtomLinkHref(linkValue: unknown): string | null {
  const candidates = coerceArray(linkValue);
  let preferred: string | null = null;
  let anyHref: string | null = null;
  for (const c of candidates) {
    if (!c || typeof c !== "object") {
      continue;
    }
    const node = c as Record<string, unknown>;
    const rel = typeof node[`${ATTR}rel`] === "string" ? (node[`${ATTR}rel`] as string) : "";
    const href = typeof node[`${ATTR}href`] === "string" ? (node[`${ATTR}href`] as string).trim() : "";
    const type =
      typeof node[`${ATTR}type`] === "string" ? (node[`${ATTR}type`] as string).toLowerCase() : "";
    const textFallback = xmlTextFromMixed(node);
    const resolved = href || textFallback?.trim() || "";

    if (!resolved) {
      continue;
    }
    if (!anyHref) {
      anyHref = resolved;
    }
    if (rel === "alternate") {
      if (!type || type.includes("html") || type.includes("atom") || type.includes("xml")) {
        preferred = resolved;
      }
    }
  }
  return preferred ?? anyHref;
}

function extractRssLink(linkValue: unknown): string | null {
  if (typeof linkValue === "string") {
    const s = linkValue.trim();
    return s.length ? s : null;
  }
  if (!linkValue || typeof linkValue !== "object") {
    return null;
  }
  if (Array.isArray(linkValue)) {
    const first = linkValue[0];
    return extractRssLink(first);
  }

  const node = linkValue as Record<string, unknown>;
  const href = typeof node[`${ATTR}href`] === "string" ? node[`${ATTR}href`] as string : "";
  const textFallback = xmlTextFromMixed(linkValue)?.trim();
  const resolved = (href.trim() || textFallback || "").trim();
  return resolved.length ? resolved : null;
}

function readGuid(node: Record<string, unknown>): string | null {
  const g = node.guid ?? node.id;
  if (!g) {
    return null;
  }
  if (typeof g === "string") {
    const s = g.trim();
    return s.length ? s : null;
  }
  const text = xmlTextFromMixed(g);
  return text?.trim() ? text.trim() : null;
}

function readAuthor(node: Record<string, unknown>): string | null {
  const direct = xmlTextFromMixed(node.author);
  const dcCreator = xmlTextFromMixed(node["dc:creator"] ?? node.creator);
  return (direct ?? dcCreator)?.trim()
    ? (direct ?? dcCreator)!.trim()
    : null;
}

function parsePublished(node: Record<string, unknown>): Date | null {
  const candidates = ["pubDate", "published", "updated", "dc:date"];
  for (const key of candidates) {
    const raw = xmlTextFromMixed(node[key]);
    if (!raw) {
      continue;
    }
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }
  return null;
}

function serializeEntryRoot(tag: "item" | "entry", payload: unknown): string {
  return entryBuilder.build({ [tag]: payload });
}

function rssItemsFromRoot(root: Record<string, unknown>): unknown[] | null {
  const rss = root.rss;
  if (!rss || typeof rss !== "object") {
    return null;
  }
  const rssObj = rss as Record<string, unknown>;
  const channels = coerceArray(rssObj.channel);

  let itemsOut: unknown[] = [];
  for (const channel of channels) {
    if (!channel || typeof channel !== "object") {
      continue;
    }
    const ch = channel as Record<string, unknown>;
    itemsOut = itemsOut.concat(coerceArray(ch.item));
  }

  return itemsOut;
}

function atomEntriesFromRoot(root: Record<string, unknown>): unknown[] | null {
  const feed = root.feed;
  if (!feed || typeof feed !== "object") {
    return null;
  }
  const feedObj = feed as Record<string, unknown>;
  return coerceArray(feedObj.entry);
}

function rdfItemsFromRoot(root: Record<string, unknown>): unknown[] | null {
  const RDF = root.RDF ?? root["rdf:RDF"];
  if (!RDF || typeof RDF !== "object") {
    return null;
  }
  const channels = coerceArray((RDF as Record<string, unknown>).channel).filter(Boolean);
  const items: unknown[] = [];
  for (const channel of channels) {
    const chObj = channel as Record<string, unknown>;
    items.push(...coerceArray(chObj.item));
  }

  const directItems = coerceArray((RDF as Record<string, unknown>).item).filter(Boolean);
  if (directItems.length) {
    items.push(...directItems);
  }

  return items.length ? items : null;
}

export function extractFeedEntries(xml: string): ParsedFeedEntry[] {
  const parsed = feedParser.parse(xml) as Record<string, unknown>;

  const rssItems = rssItemsFromRoot(parsed);
  if (rssItems && rssItems.length) {
    return rssItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const node = item as Record<string, unknown>;
        return {
          rawXml: serializeEntryRoot("item", item),
          guid: readGuid(node),
          title: xmlTextFromMixed(node.title),
          link: extractRssLink(node.link),
          author: readAuthor(node),
          publishedAt: parsePublished(node),
        } satisfies ParsedFeedEntry;
      })
      .filter((e): e is ParsedFeedEntry => Boolean(e && e.rawXml));
  }

  const atomEntries = atomEntriesFromRoot(parsed);
  if (atomEntries && atomEntries.length) {
    return atomEntries
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const node = entry as Record<string, unknown>;
        return {
          rawXml: serializeEntryRoot("entry", entry),
          guid: readGuid(node),
          title: xmlTextFromMixed(node.title),
          link: extractAtomLinkHref(node.link),
          author: readAuthor(node),
          publishedAt: parsePublished(node),
        } satisfies ParsedFeedEntry;
      })
      .filter((e): e is ParsedFeedEntry => Boolean(e && e.rawXml));
  }

  const rdfItems = rdfItemsFromRoot(parsed);
  if (rdfItems && rdfItems.length) {
    return rdfItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const node = item as Record<string, unknown>;
        return {
          rawXml: serializeEntryRoot("item", item),
          guid: readGuid(node),
          title: xmlTextFromMixed(node.title),
          link: extractRssLink(node.link),
          author: readAuthor(node),
          publishedAt: parsePublished(node),
        } satisfies ParsedFeedEntry;
      })
      .filter((e): e is ParsedFeedEntry => Boolean(e && e.rawXml));
  }

  return [];
}
