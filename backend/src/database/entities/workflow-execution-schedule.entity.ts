import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('workflow_executions_schedule')
@Unique(['workflowId', 'triggerType'])
export class WorkflowExecutionSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column()
  triggerType: string; // 'user_created', 'user_buys_subscription', 'newsletter_subscribed'

  @Column({ type: 'timestamp' })
  lastExecutionTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
