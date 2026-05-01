import { LocalBlobStore } from "@/lib/storage/local-blob-store";

export function getBlobStore() {
  return new LocalBlobStore();
}
