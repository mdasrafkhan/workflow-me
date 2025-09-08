import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { JsonLogicRule } from './json-logic-rule.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class VisualWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ nullable: true })
  workflowId: string;

  // One-to-one relationship with JsonLogic rule
  @OneToOne(() => JsonLogicRule, jsonLogicRule => jsonLogicRule.visualWorkflow, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'workflowId' })
  jsonLogicRule: JsonLogicRule;

}
