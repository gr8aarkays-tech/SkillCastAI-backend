import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds error_message column to sources table.
 * This column stores the error details when source processing fails.
 */
export class AddSourceErrorMessage1700000000001 implements MigrationInterface {
  name = 'AddSourceErrorMessage1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sources ADD COLUMN IF NOT EXISTS error_message TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sources DROP COLUMN IF EXISTS error_message
    `);
  }
}
