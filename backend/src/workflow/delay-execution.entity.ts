import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['executeAt', 'status']) // Index for efficient cron job queries
export class DelayExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @Column()
  executionId: string;

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
    enum: ['pending', 'executed', 'cancelled'],
    default: 'pending'
  })
  status: 'pending' | 'executed' | 'cancelled';

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
