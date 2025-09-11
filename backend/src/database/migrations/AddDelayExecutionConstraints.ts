import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDelayExecutionConstraints1700000000000 implements MigrationInterface {
  name = 'AddDelayExecutionConstraints1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new status values to enum
    await queryRunner.query(`
      ALTER TYPE "delay_execution_status_enum" ADD VALUE 'processing';
    `);
    await queryRunner.query(`
      ALTER TYPE "delay_execution_status_enum" ADD VALUE 'failed';
    `);

    // Add stepId column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "delay_execution" 
      ADD COLUMN IF NOT EXISTS "stepId" varchar;
    `);

    // Add unique constraint to prevent duplicate delays for same execution step
    await queryRunner.query(`
      ALTER TABLE "delay_execution" 
      ADD CONSTRAINT "UQ_delay_execution_execution_step" 
      UNIQUE ("executionId", "stepId");
    `);

    // Add index for execution-based queries
    await queryRunner.query(`
      CREATE INDEX "IDX_delay_execution_execution_status"
      ON "delay_execution" ("executionId", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the unique constraint
    await queryRunner.query(`
      ALTER TABLE "delay_execution"
      DROP CONSTRAINT "UQ_delay_execution_execution_workflow_user";
    `);

    // Remove the index
    await queryRunner.query(`
      DROP INDEX "IDX_delay_execution_execution_status";
    `);

    // Note: We cannot easily remove enum values in PostgreSQL
    // The enum values will remain but won't be used
  }
}
