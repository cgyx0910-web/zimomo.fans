import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { BlobStore, PutBlobInput, PutBlobResult } from "@/lib/storage/blob-store";

const DEFAULT_BLOB_DIR = ".data/raw-blobs";

function resolveBlobDir(): string {
  const custom = process.env.RAW_BLOB_LOCAL_DIR?.trim();
  return resolve(process.cwd(), custom || DEFAULT_BLOB_DIR);
}

function hashSha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function toStoragePath(key: string): string {
  const safe = key.replaceAll("\\", "/");
  return safe.endsWith(".xml") ? safe : `${safe}.xml`;
}

export class LocalBlobStore implements BlobStore {
  async putBlob(input: PutBlobInput): Promise<PutBlobResult> {
    const blobDir = resolveBlobDir();
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const key = `${yyyy}/${mm}/${dd}/${randomUUID()}`;
    const storagePath = toStoragePath(key);
    const absolutePath = resolve(blobDir, storagePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.data, "utf8");

    const byteSize = Buffer.byteLength(input.data, "utf8");
    const sha256 = hashSha256(input.data);

    return {
      storageKind: "local",
      storageKey: storagePath,
      contentType: input.contentType,
      byteSize,
      sha256,
    };
  }

  async deleteBlob(storageKey: string): Promise<void> {
    const absolutePath = resolve(resolveBlobDir(), storageKey);
    try {
      await unlink(absolutePath);
    } catch (error) {
      const maybe = error as { code?: string };
      if (maybe.code !== "ENOENT") {
        throw error;
      }
    }
  }
}
