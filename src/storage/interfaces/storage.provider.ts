export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageUploadOptions {
  /** Unique key / path within the bucket (e.g. 'podcasts/abc123.mp3') */
  key: string;
  data: Buffer;
  contentType: string;
}

export interface StorageProvider {
  /**
   * Upload a file and return a publicly accessible URL (or a path that
   * `getUrl` can later sign).
   */
  upload(options: StorageUploadOptions): Promise<string>;

  /**
   * Return a URL for an already-uploaded key.
   * For local dev this is just the same public URL.
   */
  getUrl(key: string): string;
}
