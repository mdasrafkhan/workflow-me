import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DummySubscription } from './dummy-subscription.entity';
import { DummyNewsletter } from './dummy-newsletter.entity';

@Entity('dummy_users')
export class DummyUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => DummySubscription, subscription => subscription.user)
  subscriptions: DummySubscription[];

  @OneToMany(() => DummyNewsletter, newsletter => newsletter.user)
  newsletters: DummyNewsletter[];
}
