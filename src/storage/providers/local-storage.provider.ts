import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  StorageProvider,
  StorageUploadOptions,
} from '../interfaces/storage.provider.js';

/**
 * Local-disk storage provider for development and testing.
 *
 * Files are written to `STORAGE_LOCAL_DIR` (default: `./uploads/audio`).
 * URLs are served as `STORAGE_LOCAL_BASE_URL/<key>` (default: `http://localhost:3000/audio/<key>`).
 *
 * Wire a static-file middleware for the `/audio` route in main.ts to serve them.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor(config: ConfigService) {
    this.baseDir =
      config.get<string>('STORAGE_LOCAL_DIR') ??
      join(process.cwd(), 'uploads', 'audio');
    this.baseUrl =
      config.get<string>('STORAGE_LOCAL_BASE_URL') ??
      `http://localhost:${config.get('PORT') ?? 3000}/audio`;

    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(options: StorageUploadOptions): Promise<string> {
    const { key, data } = options;
    // Flatten any path separators so sub-paths don't require directory creation
    const safeFilename = key.replace(/\//g, '_');
    const filePath = join(this.baseDir, safeFilename);
    writeFileSync(filePath, data);
    const url = `${this.baseUrl}/${safeFilename}`;
    this.logger.log(`Stored audio → ${filePath} (${data.length} bytes)`);
    return url;
  }

  getUrl(key: string): string {
    const safeFilename = key.replace(/\//g, '_');
    return `${this.baseUrl}/${safeFilename}`;
  }
}
