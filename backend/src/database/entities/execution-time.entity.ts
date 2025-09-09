import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('workflow_executions_schedule')
@Unique(['workflowId', 'triggerType'])
export class WorkflowExecutionSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({ name: 'trigger_type' })
  triggerType: string; // 'user_created', 'user_buys_subscription', 'newsletter_subscribed'

  @Column({ type: 'timestamp', name: 'last_execution_time' })
  lastExecutionTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
