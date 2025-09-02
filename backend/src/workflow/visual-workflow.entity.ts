import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { JsonLogicRule } from './json-logic-rule.entity';

@Entity()
export class VisualWorkflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('jsonb')
  nodes: any; // React Flow nodes

  @Column('jsonb')
  edges: any; // React Flow edges

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // One-to-one relationship with JsonLogic rule
  @OneToOne(() => JsonLogicRule, jsonLogicRule => jsonLogicRule.visualWorkflow, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn()
  jsonLogicRule: JsonLogicRule;
}
