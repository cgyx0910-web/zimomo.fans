export type PutBlobInput = {
  data: string;
  contentType: string;
};

export type PutBlobResult = {
  storageKind: "local";
  storageKey: string;
  contentType: string;
  byteSize: number;
  sha256: string;
};

export interface BlobStore {
  putBlob(input: PutBlobInput): Promise<PutBlobResult>;
  deleteBlob(storageKey: string): Promise<void>;
}
