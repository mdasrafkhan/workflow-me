import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { VisualWorkflow } from './visual-workflow.entity';

@Entity()
export class JsonLogicRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('jsonb')
  rule: any; // The actual JsonLogic rule

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // One-to-one relationship with visual workflow
  @OneToOne(() => VisualWorkflow, visualWorkflow => visualWorkflow.jsonLogicRule)
  visualWorkflow: VisualWorkflow;
}
