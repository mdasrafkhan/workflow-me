import { Injectable, Logger } from '@nestjs/common';
import { WorkflowTrigger, WorkflowTriggerRegistry, WorkflowTriggerContext, WorkflowTriggerResult } from '../interfaces/workflow-trigger.interface';

/**
 * Workflow Trigger Registry Service
 *
 * Manages registration and discovery of workflow triggers.
 * The state machine uses this to find and execute triggers generically.
 */
@Injectable()
export class WorkflowTriggerRegistryService implements WorkflowTriggerRegistry {
  private readonly logger = new Logger(WorkflowTriggerRegistryService.name);
  private readonly triggers = new Map<string, WorkflowTrigger>();

  /**
   * Register a new trigger implementation
   */
  register(trigger: WorkflowTrigger): void {
    if (this.triggers.has(trigger.triggerType)) {
      this.logger.warn(`Trigger type '${trigger.triggerType}' is already registered. Overwriting.`);
    }

    this.triggers.set(trigger.triggerType, trigger);
    this.logger.log(`Registered trigger: ${trigger.triggerType} v${trigger.version} - ${trigger.name}`);
  }

  /**
   * Get trigger by type
   */
  getTrigger(triggerType: string): WorkflowTrigger | undefined {
    return this.triggers.get(triggerType);
  }

  /**
   * Get all registered triggers
   */
  getAllTriggers(): WorkflowTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Check if trigger is registered
   */
  isRegistered(triggerType: string): boolean {
    return this.triggers.has(triggerType);
  }

  /**
   * Get trigger statistics
   */
  getStats(): { totalTriggers: number; triggerTypes: string[] } {
    return {
      totalTriggers: this.triggers.size,
      triggerTypes: Array.from(this.triggers.keys())
    };
  }

  /**
   * Validate trigger data using the appropriate trigger implementation
   */
  async validateTriggerData(triggerType: string, data: any): Promise<{
    isValid: boolean;
    context?: WorkflowTriggerContext;
    errors?: string[];
  }> {
    const trigger = this.getTrigger(triggerType);
    if (!trigger) {
      return {
        isValid: false,
        errors: [`Trigger type '${triggerType}' is not registered`]
      };
    }

    try {
      return trigger.validate(data);
    } catch (error) {
      this.logger.error(`Error validating trigger data for ${triggerType}:`, error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Process trigger data using the appropriate trigger implementation
   */
  async processTrigger(triggerType: string, data: any): Promise<WorkflowTriggerResult> {
    const trigger = this.getTrigger(triggerType);
    if (!trigger) {
      return {
        success: false,
        context: null as any, // This will be handled by the caller
        error: `Trigger type '${triggerType}' is not registered`
      };
    }

    try {
      this.logger.log(`Processing trigger: ${triggerType}`);
      const result = await trigger.process(data);
      this.logger.log(`Trigger processed successfully: ${triggerType}`);
      return result;
    } catch (error) {
      this.logger.error(`Error processing trigger ${triggerType}:`, error);
      return {
        success: false,
        context: null as any, // This will be handled by the caller
        error: `Processing error: ${error.message}`
      };
    }
  }

  /**
   * Get workflow ID for a trigger
   */
  getWorkflowIdForTrigger(triggerType: string, context: WorkflowTriggerContext): string | null {
    const trigger = this.getTrigger(triggerType);
    if (!trigger) {
      this.logger.error(`Trigger type '${triggerType}' is not registered`);
      return null;
    }

    try {
      return trigger.getWorkflowId(context);
    } catch (error) {
      this.logger.error(`Error getting workflow ID for trigger ${triggerType}:`, error);
      return null;
    }
  }

  /**
   * Check if trigger should execute
   */
  shouldTriggerExecute(triggerType: string, context: WorkflowTriggerContext): boolean {
    const trigger = this.getTrigger(triggerType);
    if (!trigger) {
      this.logger.error(`Trigger type '${triggerType}' is not registered`);
      return false;
    }

    try {
      return trigger.shouldExecute(context);
    } catch (error) {
      this.logger.error(`Error checking if trigger should execute ${triggerType}:`, error);
      return false;
    }
  }
}
