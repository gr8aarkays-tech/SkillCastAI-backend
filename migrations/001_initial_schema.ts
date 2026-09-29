import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM (
        'developer', 'tester', 'architect', 'manager', 'student', 'teacher'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE experience_level_enum AS ENUM (
        'beginner', 'intermediate', 'advanced'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE source_type_enum AS ENUM ('pdf', 'url', 'text')
    `);
    await queryRunner.query(`
      CREATE TYPE source_status_enum AS ENUM (
        'pending', 'processing', 'ready', 'error'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE podcast_status_enum AS ENUM (
        'pending', 'processing', 'ready', 'error'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE speaker_enum AS ENUM ('host', 'expert')
    `);
    await queryRunner.query(`
      CREATE TYPE quiz_option_enum AS ENUM ('a', 'b', 'c', 'd')
    `);

    // ── profiles ────────────────────────────────────────────────────────────
    // user_id references Supabase's built-in auth.users table
    await queryRunner.query(`
      CREATE TABLE profiles (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        role             user_role_enum,
        experience_level experience_level_enum,
        learning_goal    TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── sources ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE sources (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type       source_type_enum NOT NULL,
        title      TEXT,
        raw_url    TEXT,
        file_path  TEXT,
        status     source_status_enum NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_sources_user_id ON sources(user_id)`);

    // ── documents ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE documents (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id   UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        content     TEXT NOT NULL,
        token_count INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_documents_source_id ON documents(source_id)`);

    // ── topics ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE topics (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id   UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── questions ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE questions (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id          UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        question_text     TEXT NOT NULL,
        quick_answer      TEXT,
        interview_answer  TEXT,
        follow_up_question TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_questions_topic_id ON questions(topic_id)`);

    // ── podcasts ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE podcasts (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id        UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        title            TEXT,
        audio_url        TEXT,
        duration_seconds INT NOT NULL DEFAULT 0,
        status           podcast_status_enum NOT NULL DEFAULT 'pending',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── podcast_segments ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE podcast_segments (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        podcast_id     UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
        speaker        speaker_enum NOT NULL,
        text           TEXT NOT NULL,
        audio_url      TEXT,
        sequence_order INT NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_podcast_segments_podcast_id ON podcast_segments(podcast_id)`);

    // ── flashcards ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE flashcards (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        front_text  TEXT NOT NULL,
        back_text   TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── quizzes ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE quizzes (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        title     TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── quiz_questions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE quiz_questions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text  TEXT NOT NULL,
        option_a       TEXT NOT NULL,
        option_b       TEXT NOT NULL,
        option_c       TEXT NOT NULL,
        option_d       TEXT NOT NULL,
        correct_option quiz_option_enum NOT NULL,
        explanation    TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── user_progress ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE user_progress (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        source_id             UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        questions_completed   INT NOT NULL DEFAULT 0,
        questions_correct     INT NOT NULL DEFAULT 0,
        quiz_score            NUMERIC(5,2),
        podcasts_listened     INT NOT NULL DEFAULT 0,
        completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_progress UNIQUE (user_id, source_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_progress`);
    await queryRunner.query(`DROP TABLE IF EXISTS quiz_questions`);
    await queryRunner.query(`DROP TABLE IF EXISTS quizzes`);
    await queryRunner.query(`DROP TABLE IF EXISTS flashcards`);
    await queryRunner.query(`DROP TABLE IF EXISTS podcast_segments`);
    await queryRunner.query(`DROP TABLE IF EXISTS podcasts`);
    await queryRunner.query(`DROP TABLE IF EXISTS questions`);
    await queryRunner.query(`DROP TABLE IF EXISTS topics`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS sources`);
    await queryRunner.query(`DROP TABLE IF EXISTS profiles`);
    await queryRunner.query(`DROP TYPE IF EXISTS quiz_option_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS speaker_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS podcast_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS source_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS source_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS experience_level_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role_enum`);
  }
}
