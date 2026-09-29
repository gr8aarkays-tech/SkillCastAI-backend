import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds explanation columns to questions table and role column.
 * Also adds a 'generating' status to the source_status_enum.
 */
export class AddQuestionExplanationColumns1700000000003 implements MigrationInterface {
  name = 'AddQuestionExplanationColumns1700000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add explanation columns to questions
    await queryRunner.query(`
      ALTER TABLE questions
        ADD COLUMN IF NOT EXISTS detailed_answer TEXT,
        ADD COLUMN IF NOT EXISTS role_specific_explanation TEXT,
        ADD COLUMN IF NOT EXISTS practical_example TEXT,
        ADD COLUMN IF NOT EXISTS role TEXT
    `);

    // Add 'generating' to source status enum
    await queryRunner.query(`
      ALTER TYPE source_status_enum ADD VALUE IF NOT EXISTS 'generating'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions
        DROP COLUMN IF EXISTS detailed_answer,
        DROP COLUMN IF EXISTS role_specific_explanation,
        DROP COLUMN IF EXISTS practical_example,
        DROP COLUMN IF EXISTS role
    `);
    // Note: cannot remove enum values in Postgres without recreating the type
  }
}
