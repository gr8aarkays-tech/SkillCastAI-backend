import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `audio_url` column to `podcast_segments` so each segment can store its
 * individual TTS audio URL alongside the combined podcast `audio_url`.
 */
export class AddSegmentAudioUrl1700000000004 implements MigrationInterface {
  name = 'AddSegmentAudioUrl1700000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE podcast_segments
        ADD COLUMN IF NOT EXISTS audio_url TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE podcast_segments
        DROP COLUMN IF EXISTS audio_url
    `);
  }
}
