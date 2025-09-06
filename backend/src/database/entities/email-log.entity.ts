import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('email_logs')
@Index(['executionId']) // For execution-based queries
@Index(['sentAt']) // For time-based queries
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  executionId: string;

  @Column()
  stepId: string;

  @Column()
  to: string;

  @Column()
  subject: string;

  @Column()
  templateId: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column()
  status: 'sent' | 'failed' | 'bounced' | 'delivered' | 'opened' | 'clicked';

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse: Record<string, any>;

  @Column({ type: 'timestamp with time zone' })
  sentAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  clickedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
