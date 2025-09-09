import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('workflow_executions')
@Index(['status', 'createdAt']) // For efficient querying
@Index(['triggerType', 'triggerId']) // For trigger-based queries
@Unique(['workflowId', 'userId', 'triggerType', 'triggerId']) // Prevent duplicate executions
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  executionId: string;

  @Column()
  workflowId: string;

  @Column()
  triggerType: string; // 'subscription_created', 'newsletter_subscribed', etc.

  @Column()
  triggerId: string; // ID of the triggering record

  @Column()
  userId: string;

  @Column()
  status: 'pending' | 'running' | 'delayed' | 'paused' | 'completed' | 'failed' | 'cancelled';

  @Column({ nullable: true })
  currentStep: string;

  @Column({ type: 'jsonb' })
  state: {
    currentState: string;
    context: Record<string, any>;
    history: Array<{
      stepId: string;
      state: string;
      timestamp: Date;
      result?: any;
      error?: string;
    }>;
    sharedFlows?: Array<{
      flowId: string;
      status: string;
      executedAt: Date;
    }>;
    recovery?: {
      lastRecoveryAt: Date;
      recoveredAt: Date;
      recoveryCount: number;
    };
  };

  @Column({ type: 'jsonb' })
  workflowDefinition: Record<string, any>;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
