import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { DummyUser } from './dummy-user.entity';
import { DummySubscriptionType } from './dummy-subscription-type.entity';

@Entity('dummy_subscriptions')
@Index(['createdAt', 'status']) // For efficient querying
@Index(['userId', 'status']) // For user-specific queries
export class DummySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => DummyUser, user => user.subscriptions)
  @JoinColumn({ name: 'userId' })
  user: DummyUser;

  @Column()
  subscriptionTypeId: string;

  @ManyToOne(() => DummySubscriptionType)
  @JoinColumn({ name: 'subscriptionTypeId' })
  subscriptionType: DummySubscriptionType;

  @Column()
  product: string; // 'united', 'podcast', 'premium', etc.

  @Column()
  status: 'active' | 'cancelled' | 'expired' | 'suspended';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  workflowProcessed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
