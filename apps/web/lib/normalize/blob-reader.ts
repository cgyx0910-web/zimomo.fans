import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const DEFAULT_BLOB_DIR = ".data/raw-blobs";

function resolveBlobDir(): string {
  const custom = process.env.RAW_BLOB_LOCAL_DIR?.trim();
  return resolve(process.cwd(), custom || DEFAULT_BLOB_DIR);
}

export async function readLocalBlobXml(storageKey: string): Promise<string> {
  const blobDir = resolveBlobDir();
  const absolutePath = resolve(blobDir, storageKey);
  const relativePath = relative(blobDir, absolutePath);
  if (
    relativePath.startsWith("..") ||
    relativePath.includes(":") ||
    relativePath.startsWith("/") ||
    relativePath.startsWith("\\")
  ) {
    throw new Error("Invalid blob storage key path");
  }
  return readFile(absolutePath, "utf8");
}

export function truncateForDisplay(content: string, maxLength = 120_000): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}\n\n...[truncated ${content.length - maxLength} chars]`;
}
