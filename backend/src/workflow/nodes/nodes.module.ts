import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { EmailLog } from '../../database/entities/email-log.entity';

// Node Executors
import { DelayNodeExecutor } from './executors/delay-node.executor';
import { ActionNodeExecutor } from './executors/action-node.executor';
import { SharedFlowNodeExecutor } from './executors/shared-flow-node.executor';
import { ConditionNodeExecutor } from './executors/condition-node.executor';
import { EndNodeExecutor } from './executors/end-node.executor';

// Registry
import { NodeRegistryService } from './registry/node-registry.service';

// Services
import { ActionService } from '../../services/action.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { EmailService } from '../../services/email.service';

// Execution Engine
import { WorkflowExecutionEngine } from '../execution/workflow-execution-engine';

// Trigger Module
import { WorkflowTriggerModule } from '../triggers/workflow-trigger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDelay,
      WorkflowExecution,
      EmailLog
    ]),
    WorkflowTriggerModule
  ],
  providers: [
    // Registry
    NodeRegistryService,

    // Node Executors
    DelayNodeExecutor,
    ActionNodeExecutor,
    SharedFlowNodeExecutor,
    ConditionNodeExecutor,
    EndNodeExecutor,

    // Execution Engine
    WorkflowExecutionEngine,

    // Services (if not already provided elsewhere)
    ActionService,
    SharedFlowService,
    EmailService
  ],
  exports: [
    NodeRegistryService,
    WorkflowExecutionEngine,
    DelayNodeExecutor,
    ActionNodeExecutor,
    SharedFlowNodeExecutor,
    ConditionNodeExecutor,
    EndNodeExecutor
  ]
})
export class NodesModule {
  constructor(
    private readonly nodeRegistry: NodeRegistryService,
    private readonly delayExecutor: DelayNodeExecutor,
    private readonly actionExecutor: ActionNodeExecutor,
    private readonly sharedFlowExecutor: SharedFlowNodeExecutor,
    private readonly conditionExecutor: ConditionNodeExecutor,
    private readonly endExecutor: EndNodeExecutor
  ) {
    // Auto-register all node executors
    this.registerNodeExecutors();
  }

  private registerNodeExecutors(): void {
    this.nodeRegistry.register(this.delayExecutor);
    this.nodeRegistry.register(this.actionExecutor);
    this.nodeRegistry.register(this.sharedFlowExecutor);
    this.nodeRegistry.register(this.conditionExecutor);
    this.nodeRegistry.register(this.endExecutor);
  }
}
