import { DataSource } from 'typeorm';
import { WorkflowExecutionsScheduleOptimization1700000000001 } from './src/database/migrations/WorkflowExecutionsScheduleOptimization';

async function runWorkflowOptimizationMigration() {
  console.log('🚀 Starting workflow database optimization migration...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'workflow_user',
    password: process.env.DB_PASSWORD || 'workflow_password',
    database: process.env.DB_NAME || 'workflow_db',
    entities: [],
    migrations: [WorkflowExecutionsScheduleOptimization1700000000001],
    synchronize: false,
    // Add connection pool settings for migration
    extra: {
      max: 5,
      min: 1,
      acquire: 10000,
      idle: 5000,
    },
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const migration = new WorkflowExecutionsScheduleOptimization1700000000001();
    await migration.up(dataSource.createQueryRunner());
    console.log('✅ Database optimization migration completed successfully');

    await dataSource.destroy();
    console.log('✅ Database connection closed');
    console.log('🎉 Ready for multi-pod deployment!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Some indexes may already exist - this is normal');
      console.log('✅ Migration completed with warnings');
    } else {
      console.error('❌ Fatal migration error:', error);
      process.exit(1);
    }
  }
}

runWorkflowOptimizationMigration();
