import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { DummyUser } from './dummy-user.entity';

@Entity('dummy_newsletters')
@Index(['subscribedAt', 'status']) // For efficient querying
@Index(['email', 'status']) // For email-based queries
export class DummyNewsletter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => DummyUser, user => user.newsletters)
  @JoinColumn({ name: 'userId' })
  user: DummyUser;

  @Column()
  email: string;

  @Column()
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  source: string; // 'website', 'social', 'referral', etc.

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    frequency: 'daily' | 'weekly' | 'monthly';
    categories: string[];
    language: string;
  };

  @Column({ default: false })
  workflowProcessed: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  subscribedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  unsubscribedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
