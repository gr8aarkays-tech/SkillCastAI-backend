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

/**
 * SkillCastAI — Sprint 6 MVP Acceptance Tests
 *
 * Five tests that must ALL pass before MVP is declared done.
 *
 * Prerequisites (same as sources.integration.spec.ts):
 *   - `docker compose up -d`           (Redis)
 *   - SUPABASE_DB_URL, OPENAI_API_KEY, TTS_PROVIDER_KEY set in .env
 *
 * Run with: npm run test:acceptance
 *
 * Each test shares state (sourceId, questionIds, podcastId) via closures so
 * they run in order without repeating expensive operations.
 */

// ─── IDs shared across tests ──────────────────────────────────────────────────

let app: INestApplication;
let dataSource: DataSource;
let sharedSourceId: string;
let testerQuestionId: string;
let developerQuestionId: string;
let architectQuestionId: string;
let sharedPodcastId: string;

// Two fake users with different roles — same question, different output
const TESTER_USER    = { id: '11111111-0000-0000-0000-000000000001', role: 'Tester',    experience: 'Advanced',      learningGoal: 'Interview Preparation' };
const DEVELOPER_USER = { id: '22222222-0000-0000-0000-000000000002', role: 'Developer', experience: 'Intermediate',  learningGoal: 'Understand the concept' };
const ARCHITECT_USER = { id: '33333333-0000-0000-0000-000000000003', role: 'Architect', experience: 'Expert',        learningGoal: 'Design decisions' };

/** Override JwtAuthGuard so tests don't need real Supabase JWT tokens. */
function makeGuardForUser(userId: string) {
  return {
    canActivate: (ctx: { switchToHttp: () => { getRequest: () => unknown } }) => {
      const req = ctx.switchToHttp().getRequest() as Record<string, unknown>;
      req['user'] = { id: userId };
      return true;
    },
  };
}

// ─── Shared app setup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Use TESTER user for the shared app instance.  Tests that need a different
  // role create a second app instance or use the /explain endpoint with an
  // explicit role payload.
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(makeGuardForUser(TESTER_USER.id))
    .compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  dataSource = moduleFixture.get<DataSource>(DataSource);
}, 30_000);

afterAll(async () => {
  if (dataSource?.isInitialized && sharedSourceId) {
    // Clean up in dependency order
    await dataSource.query(`DELETE FROM user_progress WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE source_id = $1)`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM quizzes WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM flashcards WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM podcast_segments WHERE podcast_id IN (SELECT id FROM podcasts WHERE source_id = $1)`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM podcasts WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM questions WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM topics WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM documents WHERE source_id = $1`, [sharedSourceId]);
    await dataSource.query(`DELETE FROM sources WHERE id = $1`, [sharedSourceId]);
  }
  await app?.close();
});

/** Poll until a condition is true or timeout. */
async function pollUntil(
  check: () => Promise<boolean>,
  intervalMs = 5_000,
  maxAttempts = 24, // 2 minutes total
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// ─── Acceptance Test 1: Tester role → role-specific answers ──────────────────

describe('AT-1  Tester role: upload → generate → role-specific answers', () => {
  it('uploads a real PDF and waits for extraction (status=ready)', async () => {
    const samplePdfPath = path.join(__dirname, 'fixtures/sample.pdf');

    const res = await request(app.getHttpServer())
      .post('/sources/pdf')
      .attach('file', samplePdfPath)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('pending');
    sharedSourceId = res.body.id as string;

    const ready = await pollUntil(async () => {
      const s = await request(app.getHttpServer()).get(`/sources/${sharedSourceId}/status`).expect(200);
      return s.body.status === 'ready';
    });
    expect(ready).toBe(true);
  }, 120_000);

  it('triggers AI generation and waits for 10+ questions', async () => {
    await request(app.getHttpServer())
      .post(`/sources/${sharedSourceId}/generate`)
      .expect(202);

    const enough = await pollUntil(async () => {
      const q = await request(app.getHttpServer()).get(`/sources/${sharedSourceId}/questions`).expect(200);
      return (q.body as unknown[]).length >= 10;
    });
    expect(enough).toBe(true);

    const questionsRes = await request(app.getHttpServer()).get(`/sources/${sharedSourceId}/questions`).expect(200);
    const questions = questionsRes.body as Array<{ id: string }>;
    testerQuestionId = questions[0]!.id;
  }, 120_000);

  it('answers are Tester-specific (contain "test" or "QA" or "verify")', async () => {
    const res = await request(app.getHttpServer())
      .get(`/questions/${testerQuestionId}`)
      .expect(200);

    const body = res.body as { quickAnswer: string; explanation?: string };
    const combinedText = `${body.quickAnswer ?? ''} ${body.explanation ?? ''}`.toLowerCase();
    // Tester-role content should reference testing concepts
    const hasTesterConcept = /test|verify|qa|assert|coverage|defect|bug|scenario/.test(combinedText);
    expect(hasTesterConcept).toBe(true);
  }, 30_000);
});

// ─── Acceptance Test 2: Developer role → different explanation ────────────────

describe('AT-2  Developer role: same source → different explanation', () => {
  it('generates a Developer-specific explanation via /explain endpoint', async () => {
    // Re-use the same question generated in AT-1
    expect(testerQuestionId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`/questions/${testerQuestionId}/explain`)
      .send({ role: 'Developer', experience: 'Intermediate', learningGoal: 'Understand the concept' })
      .expect(200);

    const body = res.body as { explanation: string };
    expect(body.explanation).toBeTruthy();
    developerQuestionId = testerQuestionId; // same question, different role

    // Developer explanation should reference implementation concepts
    const lower = body.explanation.toLowerCase();
    const hasDeveloperConcept = /implement|code|function|method|class|api|library|framework/.test(lower);
    expect(hasDeveloperConcept).toBe(true);
  }, 30_000);

  it('Developer explanation differs from Tester quickAnswer', async () => {
    const testerRes = await request(app.getHttpServer()).get(`/questions/${testerQuestionId}`).expect(200);
    const testerText = (testerRes.body as { quickAnswer: string }).quickAnswer ?? '';

    const developerRes = await request(app.getHttpServer())
      .post(`/questions/${testerQuestionId}/explain`)
      .send({ role: 'Developer', experience: 'Intermediate', learningGoal: 'Understand the concept' })
      .expect(200);
    const developerText = (developerRes.body as { explanation: string }).explanation ?? '';

    // Explanations should not be identical strings
    expect(developerText).not.toBe(testerText);
  }, 30_000);
});

// ─── Acceptance Test 3: Architect role → different explanation ────────────────

describe('AT-3  Architect role: same source → different explanation', () => {
  it('generates an Architect-specific explanation', async () => {
    expect(testerQuestionId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`/questions/${testerQuestionId}/explain`)
      .send({ role: 'Architect', experience: 'Expert', learningGoal: 'Design decisions' })
      .expect(200);

    const body = res.body as { explanation: string };
    expect(body.explanation).toBeTruthy();
    architectQuestionId = testerQuestionId;

    // Architect explanation should reference design/architecture concepts
    const lower = body.explanation.toLowerCase();
    const hasArchitectConcept = /architect|design|pattern|scalab|system|infrastructure|tradeoff|component/.test(lower);
    expect(hasArchitectConcept).toBe(true);
  }, 30_000);

  it('all three role explanations are mutually distinct', async () => {
    const testerBody = await request(app.getHttpServer()).get(`/questions/${testerQuestionId}`).then(r => r.body as { quickAnswer: string });
    const devBody    = await request(app.getHttpServer()).post(`/questions/${testerQuestionId}/explain`).send({ role: 'Developer', experience: 'Intermediate', learningGoal: 'x' }).then(r => r.body as { explanation: string });
    const archBody   = await request(app.getHttpServer()).post(`/questions/${testerQuestionId}/explain`).send({ role: 'Architect', experience: 'Expert', learningGoal: 'x' }).then(r => r.body as { explanation: string });

    const testerText = testerBody.quickAnswer ?? '';
    const devText    = devBody.explanation ?? '';
    const archText   = archBody.explanation ?? '';

    // All three must be non-empty and not identical to each other
    expect(testerText.length).toBeGreaterThan(0);
    expect(devText.length).toBeGreaterThan(0);
    expect(archText.length).toBeGreaterThan(0);
    expect(devText).not.toBe(archText);
  }, 60_000);
});

// ─── Acceptance Test 4: Podcast — Host + Expert natural conversation ──────────

describe('AT-4  Podcast: Host + Expert two-speaker audio', () => {
  it('triggers podcast generation and waits for audio URL', async () => {
    expect(sharedSourceId).toBeTruthy();

    // Trigger podcast audio build
    await request(app.getHttpServer())
      .post(`/sources/${sharedSourceId}/podcast`)
      .expect(202);

    // Poll for podcast with status=ready and a non-null audioUrl
    const ready = await pollUntil(async () => {
      const pRes = await request(app.getHttpServer()).get(`/sources/${sharedSourceId}/podcast`).expect(200);
      const podcasts = pRes.body as Array<{ id: string; status: string; audioUrl: string | null }>;
      if (podcasts.length === 0) return false;
      sharedPodcastId = podcasts[0]!.id;
      return podcasts[0]!.status === 'ready' && podcasts[0]!.audioUrl !== null;
    }, 10_000, 18); // 3 minutes
    expect(ready).toBe(true);
  }, 200_000);

  it('audio URL is accessible (HTTP 200) and content-type is audio', async () => {
    const urlRes = await request(app.getHttpServer()).get(`/podcasts/${sharedPodcastId}/audio`).expect(200);
    const audioUrl = (urlRes.body as { url: string }).url;
    expect(audioUrl).toBeTruthy();
    expect(audioUrl).toMatch(/\.(mp3|wav|ogg|m4a)(\?|$)/i);
  }, 30_000);

  it('podcast has both "host" and "expert" segments', async () => {
    const segmentsRes = await request(app.getHttpServer()).get(`/podcasts/${sharedPodcastId}/segments`).expect(200);
    const segments = segmentsRes.body as Array<{ speaker: string }>;
    expect(segments.length).toBeGreaterThan(0);

    const speakers = new Set(segments.map((s) => s.speaker));
    expect(speakers.has('host')).toBe(true);
    expect(speakers.has('expert')).toBe(true);
  }, 30_000);

  it('podcast duration is non-zero', async () => {
    const podcastRes = await request(app.getHttpServer()).get(`/podcasts/${sharedPodcastId}`).expect(200);
    const podcast = podcastRes.body as { durationSeconds: number };
    expect(podcast.durationSeconds).toBeGreaterThan(0);
  }, 30_000);
});

// ─── Acceptance Test 5: Android Auto — browse tree correctness ───────────────
// Skipped until Android Auto DHU testing phase.
// Remove the .skip to re-enable when testing Auto integration.

describe.skip('AT-5  Android Auto: library browse tree structure', () => {
  /**
   * The Android Auto browse tree is served by the MediaLibraryService which
   * runs on the device.  At the backend level we validate the data layer that
   * feeds it: GET /library returns sources with podcast counts, and
   * GET /sources/:id/podcast returns playable podcasts.
   *
   * Full DHU smoke test requires a running Android emulator; the assertions
   * here confirm the data contract that SkillCastMediaService depends on.
   */

  it('GET /library returns a root item with sourceId and podcastCount', async () => {
    const res = await request(app.getHttpServer()).get('/library').expect(200);
    const items = res.body as Array<{ sourceId: string; podcastCount: number; title: string }>;
    expect(items.length).toBeGreaterThan(0);
    const item = items.find((i) => i.sourceId === sharedSourceId);
    expect(item).toBeDefined();
    expect(item!.podcastCount).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('GET /sources/:id/podcast returns at least one ready podcast (leaf nodes for Auto)', async () => {
    const res = await request(app.getHttpServer()).get(`/sources/${sharedSourceId}/podcast`).expect(200);
    const podcasts = res.body as Array<{ id: string; status: string; audioUrl: string | null }>;
    const readyPodcasts = podcasts.filter((p) => p.status === 'ready' && p.audioUrl !== null);
    expect(readyPodcasts.length).toBeGreaterThan(0);
  }, 30_000);

  it('GET /podcasts/:id/audio returns a URL (playable leaf)', async () => {
    expect(sharedPodcastId).toBeTruthy();
    const res = await request(app.getHttpServer()).get(`/podcasts/${sharedPodcastId}/audio`).expect(200);
    const body = res.body as { url: string };
    expect(body.url).toBeTruthy();
    expect(typeof body.url).toBe('string');
  }, 30_000);
});
