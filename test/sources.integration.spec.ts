import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { DataSource } from 'typeorm';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FAKE_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Integration test: upload a real PDF → poll until ready → verify documents stored.
 *
 * Prerequisites:
 *   - Docker Redis running:  docker compose up -d
 *   - SUPABASE_DB_URL set in .env pointing to a real Postgres instance
 *
 * Run with: npm run test:integration
 */
describe('Sources ingestion pipeline (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let createdSourceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override JwtAuthGuard so we don't need real Supabase tokens
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: { switchToHttp: () => { getRequest: () => unknown } }) => {
          const req = ctx.switchToHttp().getRequest() as Record<string, unknown>;
          req['user'] = { id: FAKE_USER_ID, email: 'test@integration.test' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  }, 30_000);

  afterAll(async () => {
    // Clean up test data
    if (dataSource?.isInitialized && createdSourceId) {
      await dataSource.query(`DELETE FROM documents WHERE source_id = $1`, [createdSourceId]);
      await dataSource.query(`DELETE FROM sources WHERE id = $1`, [createdSourceId]);
    }
    await app?.close();
  });

  it('POST /sources/pdf → status pending → eventually ready with documents', async () => {
    const samplePdfPath = path.join(__dirname, 'fixtures/sample.pdf');

    // 1. Upload the PDF
    const uploadRes = await request(app.getHttpServer())
      .post('/sources/pdf')
      .attach('file', samplePdfPath)
      .expect(201);

    expect(uploadRes.body).toHaveProperty('id');
    expect(uploadRes.body.status).toBe('pending');
    createdSourceId = uploadRes.body.id as string;

    // 2. Poll until ready (max 30 s)
    let finalStatus = 'pending';
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3_000));
      const statusRes = await request(app.getHttpServer())
        .get(`/sources/${createdSourceId}/status`)
        .expect(200);
      finalStatus = statusRes.body.status as string;
      if (finalStatus === 'ready' || finalStatus === 'error') break;
    }

    expect(finalStatus).toBe('ready');

    // 3. Verify at least one document chunk stored
    const rows: unknown[] = await dataSource.query(
      `SELECT id, content FROM documents WHERE source_id = $1`,
      [createdSourceId],
    );
    expect(rows.length).toBeGreaterThan(0);
    expect((rows[0] as { content: string }).content.length).toBeGreaterThan(10);
  }, 60_000);
});
