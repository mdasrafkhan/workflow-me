import { createMachine, assign, send, spawn, ActorRefFrom, interpret } from 'xstate';
import { WorkflowExecutionContext, WorkflowStep, ActionExecutionResult } from '../types';

// Workflow State Machine Events
export interface WorkflowEvent {
  type: 'START' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'DELAY_COMPLETED' | 'RETRY' | 'CANCEL';
  stepId?: string;
  result?: ActionExecutionResult;
  error?: string;
  delayMs?: number;
}

// Workflow State Machine Context
export interface WorkflowStateContext {
  executionId: string;
  workflowId: string;
  context: WorkflowExecutionContext;
  steps: WorkflowStep[];
  currentStepIndex: number;
  completedSteps: string[];
  failedSteps: string[];
  state: Record<string, any>;
  retryCount: number;
  maxRetries: number;
}

// Workflow State Machine
export const createWorkflowStateMachine = (steps: WorkflowStep[], context: WorkflowExecutionContext) => {
  return createMachine<WorkflowStateContext, WorkflowEvent>({
    id: 'workflow',
    initial: 'idle',
    context: {
      executionId: context.executionId,
      workflowId: context.workflowId,
      context,
      steps,
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      state: {},
      retryCount: 0,
      maxRetries: 3
    },
    states: {
      idle: {
        on: {
          START: 'running'
        }
      },
      running: {
        entry: 'logState',
        on: {
          STEP_COMPLETED: {
            target: 'stepCompleted',
            actions: ['handleStepCompleted']
          },
          STEP_FAILED: {
            target: 'stepFailed',
            actions: ['handleStepFailed']
          },
          CANCEL: 'cancelled'
        }
      },
      stepCompleted: {
        entry: 'logState',
        always: [
          {
            target: 'completed',
            cond: 'allStepsCompleted'
          },
          {
            target: 'running',
            actions: ['moveToNextStep']
          }
        ]
      },
      stepFailed: {
        entry: 'logState',
        always: [
          {
            target: 'failed',
            cond: 'maxRetriesReached'
          },
          {
            target: 'retrying',
            actions: ['incrementRetryCount']
          }
        ]
      },
      retrying: {
        entry: 'logState',
        after: {
          5000: 'running' // Wait 5 seconds before retry
        }
      },
      delayed: {
        entry: 'logState',
        on: {
          DELAY_COMPLETED: {
            target: 'running',
            actions: ['handleDelayCompleted']
          },
          CANCEL: 'cancelled'
        }
      },
      completed: {
        entry: ['logState', 'markCompleted'],
        type: 'final'
      },
      failed: {
        entry: ['logState', 'markFailed'],
        type: 'final'
      },
      cancelled: {
        entry: ['logState', 'markCancelled'],
        type: 'final'
      }
    }
  }, {
    actions: {
      logState: (context, event) => {
        console.log(`Workflow ${context.workflowId} - State: ${event.type}`, {
          executionId: context.executionId,
          currentStep: context.steps[context.currentStepIndex]?.id,
          completedSteps: context.completedSteps,
          retryCount: context.retryCount
        });
      },

      handleStepCompleted: assign({
        completedSteps: (context, event) => [
          ...context.completedSteps,
          event.stepId || context.steps[context.currentStepIndex]?.id
        ],
        state: (context, event) => ({
          ...context.state,
          [event.stepId || context.steps[context.currentStepIndex]?.id]: event.result
        })
      }),

      handleStepFailed: assign({
        failedSteps: (context, event) => [
          ...context.failedSteps,
          event.stepId || context.steps[context.currentStepIndex]?.id
        ],
        state: (context, event) => ({
          ...context.state,
          [event.stepId || context.steps[context.currentStepIndex]?.id]: {
            error: event.error,
            failed: true
          }
        })
      }),

      moveToNextStep: assign({
        currentStepIndex: (context) => context.currentStepIndex + 1,
        retryCount: 0
      }),

      incrementRetryCount: assign({
        retryCount: (context) => context.retryCount + 1
      }),

      handleDelayCompleted: assign({
        completedSteps: (context, event) => [
          ...context.completedSteps,
          event.stepId || context.steps[context.currentStepIndex]?.id
        ]
      }),

      markCompleted: (context) => {
        console.log(`Workflow ${context.workflowId} completed successfully`);
      },

      markFailed: (context) => {
        console.log(`Workflow ${context.workflowId} failed after ${context.retryCount} retries`);
      },

      markCancelled: (context) => {
        console.log(`Workflow ${context.workflowId} was cancelled`);
      }
    },

    guards: {
      allStepsCompleted: (context) =>
        context.currentStepIndex >= context.steps.length,

      maxRetriesReached: (context) =>
        context.retryCount >= context.maxRetries
    }
  });
};

// Workflow State Machine Service
export class WorkflowStateMachineService {
  private machines = new Map<string, ActorRefFrom<typeof createWorkflowStateMachine>>();

  createMachine(executionId: string, steps: WorkflowStep[], context: WorkflowExecutionContext) {
    const machine = createWorkflowStateMachine(steps, context);
    const service = interpret(machine);
    this.machines.set(executionId, service);
    return service;
  }

  getMachine(executionId: string) {
    return this.machines.get(executionId);
  }

  removeMachine(executionId: string) {
    const machine = this.machines.get(executionId);
    if (machine) {
      machine.stop();
      this.machines.delete(executionId);
    }
  }

  getAllMachines() {
    return Array.from(this.machines.entries());
  }
}
