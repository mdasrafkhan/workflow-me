import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('workflow_delays')
@Index(['executeAt', 'status']) // For efficient cron job queries
@Index(['executionId']) // For execution-based queries
export class WorkflowDelay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  executionId: string;

  @Column()
  stepId: string;

  @Column()
  delayType: string;

  @Column({ type: 'bigint' })
  delayMs: number;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ type: 'timestamp with time zone' })
  executeAt: Date;

  @Column()
  status: 'pending' | 'processing' | 'executed' | 'cancelled' | 'failed';

  @Column({ type: 'jsonb' })
  context: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  executedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
