import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['executeAt', 'status']) // Index for efficient cron job queries
@Index(['executionId', 'status']) // Index for execution-based queries
export class DelayExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @Column()
  executionId: string;

  @Column()
  stepId: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['fixed', 'random'],
    default: 'fixed'
  })
  delayType: 'fixed' | 'random';

  @Column('decimal', { precision: 10, scale: 2 })
  delayHours: number;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'timestamp' })
  executeAt: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'executed', 'cancelled', 'failed'],
    default: 'pending'
  })
  status: 'pending' | 'processing' | 'executed' | 'cancelled' | 'failed';

  @Column('jsonb')
  context: any; // User data and workflow context

  @Column('jsonb', { nullable: true })
  result: any; // Execution result when completed

  @Column({ type: 'text', nullable: true })
  error: string; // Error message if execution failed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
