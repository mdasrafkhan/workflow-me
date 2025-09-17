export interface WorkflowConfig {
  // Queue configuration
  queues: {
    workflowExecution: {
      concurrency: number;
      maxRetries: number;
      retryDelay: number;
      removeOnComplete: number;
      removeOnFail: number;
    };
    workflowDelay: {
      concurrency: number;
      maxRetries: number;
      retryDelay: number;
      removeOnComplete: number;
      removeOnFail: number;
    };
    workflowScheduler: {
      concurrency: number;
      maxRetries: number;
      retryDelay: number;
      removeOnComplete: number;
      removeOnFail: number;
    };
  };

  // Lock configuration
  locks: {
    defaultTtl: number;
    maxRetries: number;
    retryDelay: number;
    schedulerLockTtl: number;
  };

  // Database configuration
  database: {
    maxConcurrentExecutions: number;
    batchSize: number;
    cleanupInterval: number;
    retentionDays: number;
  };

  // Scheduler configuration
  scheduler: {
    cronExpression: string;
    maxConcurrentWorkflows: number;
    batchProcessingSize: number;
  };
}

export const defaultWorkflowConfig: WorkflowConfig = {
  queues: {
    workflowExecution: {
      concurrency: 50, // Process up to 50 workflows concurrently
      maxRetries: 3,
      retryDelay: 2000,
      removeOnComplete: 10,
      removeOnFail: 5
    },
    workflowDelay: {
      concurrency: 30, // Process up to 30 delayed workflows concurrently
      maxRetries: 3,
      retryDelay: 2000,
      removeOnComplete: 10,
      removeOnFail: 5
    },
    workflowScheduler: {
      concurrency: 1, // Only one scheduler should run at a time
      maxRetries: 3,
      retryDelay: 5000,
      removeOnComplete: 5,
      removeOnFail: 3
    }
  },

  locks: {
    defaultTtl: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 100,
    schedulerLockTtl: 60000 // 1 minute for scheduler lock
  },

  database: {
    maxConcurrentExecutions: 100, // Allow up to 100 concurrent executions
    batchSize: 50, // Process in batches of 50
    cleanupInterval: 3600000, // 1 hour
    retentionDays: 30 // Keep executions for 30 days
  },

  scheduler: {
    cronExpression: '* * * * *', // Every minute
    maxConcurrentWorkflows: 100,
    batchProcessingSize: 20
  }
};

export const getWorkflowConfig = (): WorkflowConfig => {
  return {
    queues: {
      workflowExecution: {
        concurrency: parseInt(process.env.WORKFLOW_EXECUTION_CONCURRENCY || '50'),
        maxRetries: parseInt(process.env.WORKFLOW_EXECUTION_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.WORKFLOW_EXECUTION_RETRY_DELAY || '2000'),
        removeOnComplete: parseInt(process.env.WORKFLOW_EXECUTION_REMOVE_ON_COMPLETE || '10'),
        removeOnFail: parseInt(process.env.WORKFLOW_EXECUTION_REMOVE_ON_FAIL || '5')
      },
      workflowDelay: {
        concurrency: parseInt(process.env.WORKFLOW_DELAY_CONCURRENCY || '30'),
        maxRetries: parseInt(process.env.WORKFLOW_DELAY_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.WORKFLOW_DELAY_RETRY_DELAY || '2000'),
        removeOnComplete: parseInt(process.env.WORKFLOW_DELAY_REMOVE_ON_COMPLETE || '10'),
        removeOnFail: parseInt(process.env.WORKFLOW_DELAY_REMOVE_ON_FAIL || '5')
      },
      workflowScheduler: {
        concurrency: parseInt(process.env.WORKFLOW_SCHEDULER_CONCURRENCY || '1'),
        maxRetries: parseInt(process.env.WORKFLOW_SCHEDULER_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.WORKFLOW_SCHEDULER_RETRY_DELAY || '5000'),
        removeOnComplete: parseInt(process.env.WORKFLOW_SCHEDULER_REMOVE_ON_COMPLETE || '5'),
        removeOnFail: parseInt(process.env.WORKFLOW_SCHEDULER_REMOVE_ON_FAIL || '3')
      }
    },

    locks: {
      defaultTtl: parseInt(process.env.DISTRIBUTED_LOCK_DEFAULT_TTL || '30000'),
      maxRetries: parseInt(process.env.DISTRIBUTED_LOCK_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.DISTRIBUTED_LOCK_RETRY_DELAY || '100'),
      schedulerLockTtl: parseInt(process.env.SCHEDULER_LOCK_TTL || '60000')
    },

    database: {
      maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '100'),
      batchSize: parseInt(process.env.DATABASE_BATCH_SIZE || '50'),
      cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '3600000'),
      retentionDays: parseInt(process.env.RETENTION_DAYS || '30')
    },

    scheduler: {
      cronExpression: process.env.SCHEDULER_CRON_EXPRESSION || '* * * * *',
      maxConcurrentWorkflows: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '100'),
      batchProcessingSize: parseInt(process.env.BATCH_PROCESSING_SIZE || '20')
    }
  };
};
