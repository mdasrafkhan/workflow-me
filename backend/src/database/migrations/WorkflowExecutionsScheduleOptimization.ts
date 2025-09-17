import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkflowExecutionsScheduleOptimization1700000000001 implements MigrationInterface {
  name = 'WorkflowExecutionsScheduleOptimization1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes for better performance
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_schedule_workflow_trigger"
      ON "workflow_executions_schedule" ("workflow_id", "trigger_type")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_schedule_last_execution"
      ON "workflow_executions_schedule" ("last_execution_time")
    `);

    // Add partial index for active schedules
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_schedule_active"
      ON "workflow_executions_schedule" ("workflow_id", "trigger_type", "last_execution_time")
      WHERE "last_execution_time" IS NOT NULL
    `);

    // Optimize workflow_executions table for concurrent access
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_status_created"
      ON "workflow_executions" ("status", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_workflow_user_trigger"
      ON "workflow_executions" ("workflow_id", "user_id", "trigger_type", "trigger_id")
    `);

    // Add index for delayed executions
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_delays_execute_status"
      ON "workflow_delays" ("execute_at", "status")
    `);

    // Add index for execution lookups
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_delays_execution_id"
      ON "workflow_delays" ("execution_id")
    `);

    // Add composite index for workflow execution queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_composite"
      ON "workflow_executions" ("workflow_id", "status", "created_at", "updated_at")
    `);

    // Add index for retry logic
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_workflow_executions_retry"
      ON "workflow_executions" ("status", "next_retry_at")
      WHERE "next_retry_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_retry"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_composite"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_delays_execution_id"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_delays_execute_status"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_workflow_user_trigger"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_status_created"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_schedule_active"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_schedule_last_execution"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_workflow_executions_schedule_workflow_trigger"`);
  }
}
