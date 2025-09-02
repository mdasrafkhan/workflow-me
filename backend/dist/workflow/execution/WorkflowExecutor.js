"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WorkflowExecutor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowExecutor = void 0;
const common_1 = require("@nestjs/common");
const jsonLogic = require('json-logic-js');
let WorkflowExecutor = WorkflowExecutor_1 = class WorkflowExecutor {
    constructor() {
        this.logger = new common_1.Logger(WorkflowExecutor_1.name);
    }
    async executeWorkflow(workflowId, jsonLogicRule, context) {
        const startTime = Date.now();
        const executionId = this.generateExecutionId();
        this.logger.log(`Starting workflow execution ${executionId} for workflow ${workflowId}`);
        try {
            this.logger.log(`Executing workflow ${workflowId} with rule: ${JSON.stringify(jsonLogicRule, null, 2)}`);
            if (!jsonLogicRule) {
                this.logger.warn(`Workflow ${workflowId} has no JsonLogic rule, skipping execution`);
                return {
                    executionId,
                    workflowId,
                    success: true,
                    result: { execute: false, reason: 'No rule defined' },
                    executionTime: Date.now() - startTime,
                    steps: [],
                    timestamp: new Date()
                };
            }
            const validationResult = this.validateJsonLogicRule(jsonLogicRule);
            if (!validationResult.isValid) {
                this.logger.warn(`Invalid JsonLogic rule for workflow ${workflowId}: ${validationResult.errors.join(', ')}`);
            }
            const result = await this.executeJsonLogicRule(jsonLogicRule, context, executionId);
            const executionTime = Date.now() - startTime;
            this.logger.log(`Workflow execution ${executionId} completed in ${executionTime}ms`);
            return {
                executionId,
                workflowId,
                success: true,
                result,
                executionTime,
                steps: result.steps || [],
                timestamp: new Date()
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`Workflow execution ${executionId} failed: ${error.message}`, error.stack);
            return {
                executionId,
                workflowId,
                success: false,
                error: error.message,
                executionTime,
                steps: [],
                timestamp: new Date()
            };
        }
    }
    async executeJsonLogicRule(rule, context, executionId) {
        const steps = [];
        try {
            const result = await this.executeRuleRecursively(rule, context, steps, executionId);
            return Object.assign(Object.assign({}, result), { steps });
        }
        catch (error) {
            this.logger.error(`JsonLogic execution failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async executeRuleRecursively(rule, context, steps, executionId) {
        if (!rule || typeof rule !== 'object') {
            this.logger.debug(`Rule is not an object or is null/undefined: ${rule}`);
            return rule;
        }
        this.logger.debug(`Executing rule recursively: ${JSON.stringify(rule)}`);
        if (rule.trigger) {
            return this.executeTriggerRule(rule, context, steps, executionId);
        }
        else if (rule.action) {
            return this.executeActionRule(rule, context, steps, executionId);
        }
        else if (rule.delay) {
            return this.executeDelayRule(rule, context, steps, executionId);
        }
        else if (rule.if) {
            return this.executeConditionalRule(rule, context, steps, executionId);
        }
        else if (rule.and || rule.or) {
            return this.executeLogicalRule(rule, context, steps, executionId);
        }
        else if (rule.parallel) {
            return this.executeParallelRule(rule, context, steps, executionId);
        }
        else {
            return this.executeStandardJsonLogic(rule, context, steps, executionId);
        }
    }
    async executeTriggerRule(rule, context, steps, executionId) {
        const step = {
            id: this.generateStepId(),
            type: 'trigger',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            const triggerMet = this.checkTriggerConditions(rule, context);
            step.result = { triggerMet };
            step.status = 'completed';
            step.endTime = Date.now();
            if (triggerMet) {
                this.logger.log(`Trigger ${rule.event} met for execution ${executionId}`);
                return { execute: true, trigger: rule.trigger, event: rule.event };
            }
            else {
                this.logger.log(`Trigger ${rule.event} not met for execution ${executionId}`);
                return { execute: false };
            }
        }
        catch (error) {
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    async executeActionRule(rule, context, steps, executionId) {
        const step = {
            id: this.generateStepId(),
            type: 'action',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            const actionResult = await this.executeAction(rule.action, rule, context);
            step.result = actionResult;
            step.status = 'completed';
            step.endTime = Date.now();
            this.logger.log(`Action ${rule.action} executed successfully for execution ${executionId}`);
            return {
                execute: true,
                action: rule.action,
                result: actionResult
            };
        }
        catch (error) {
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    async executeDelayRule(rule, context, steps, executionId) {
        var _a, _b;
        const step = {
            id: this.generateStepId(),
            type: 'delay',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            const delay = rule.delay;
            const scheduledAt = new Date();
            let delayHours = 0;
            if (delay.type === 'fixed') {
                delayHours = delay.hours || 0;
            }
            else if (delay.type === 'random') {
                const minHours = delay.min_hours || 0;
                const maxHours = delay.max_hours || minHours;
                delayHours = Math.random() * (maxHours - minHours) + minHours;
            }
            const executeAt = new Date(scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));
            const delayResult = {
                execute: false,
                workflowSuspended: true,
                delay: {
                    type: delay.type,
                    hours: delayHours,
                    scheduledAt: scheduledAt.toISOString(),
                    executeAt: executeAt.toISOString(),
                    workflowId: ((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.workflowId) || 0,
                    executionId: executionId,
                    userId: ((_b = context.metadata) === null || _b === void 0 ? void 0 : _b.userId) || 'unknown',
                    status: 'pending'
                }
            };
            this.logger.log(`Workflow suspended: ${delayHours} hours delay for execution ${executionId}, resume at ${executeAt.toISOString()}`);
            step.result = delayResult;
            step.status = 'completed';
            step.endTime = Date.now();
            return delayResult;
        }
        catch (error) {
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    async executeConditionalRule(rule, context, steps, executionId) {
        const step = {
            id: this.generateStepId(),
            type: 'conditional',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            const [condition, trueBranch, falseBranch] = rule.if;
            const conditionResult = await this.executeRuleRecursively(condition, context, steps, executionId);
            let result;
            if (conditionResult) {
                result = await this.executeRuleRecursively(trueBranch, context, steps, executionId);
            }
            else {
                result = await this.executeRuleRecursively(falseBranch, context, steps, executionId);
            }
            step.result = { conditionResult, result };
            step.status = 'completed';
            step.endTime = Date.now();
            return result;
        }
        catch (error) {
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    async executeLogicalRule(rule, context, steps, executionId) {
        const step = {
            id: this.generateStepId(),
            type: 'logical',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            const operator = rule.and ? 'and' : 'or';
            const operands = rule[operator];
            if (!operands || !Array.isArray(operands)) {
                throw new Error(`Invalid operands for ${operator} operation: ${operands}`);
            }
            const results = [];
            for (const operand of operands) {
                if (operand === undefined || operand === null) {
                    this.logger.warn(`Skipping undefined/null operand in ${operator} operation`);
                    continue;
                }
                const result = await this.executeRuleRecursively(operand, context, steps, executionId);
                if (result && typeof result === 'object' && result.workflowSuspended) {
                    this.logger.log(`Workflow suspended at delay, stopping ${operator} operation`);
                    return result;
                }
                results.push(result);
            }
            let finalResult;
            if (operator === 'and') {
                finalResult = results.every(r => r && r !== false);
            }
            else {
                finalResult = results.some(r => r && r !== false);
            }
            step.result = { operator, results, finalResult };
            step.status = 'completed';
            step.endTime = Date.now();
            return finalResult;
        }
        catch (error) {
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    async executeParallelRule(rule, context, steps, executionId) {
        const step = {
            id: this.generateStepId(),
            type: 'parallel',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            const { trigger, branches } = rule.parallel;
            const triggerResult = await this.executeRuleRecursively(trigger, context, steps, executionId);
            if (!triggerResult) {
                step.result = { triggerResult, branchesExecuted: 0 };
                step.status = 'completed';
                step.endTime = Date.now();
                return { execute: false };
            }
            const branchPromises = branches.map(branch => this.executeRuleRecursively(branch, context, steps, executionId));
            const branchResults = await Promise.all(branchPromises);
            step.result = { triggerResult, branchResults };
            step.status = 'completed';
            step.endTime = Date.now();
            return {
                execute: true,
                parallel: true,
                results: branchResults
            };
        }
        catch (error) {
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    async executeStandardJsonLogic(rule, context, steps, executionId) {
        const step = {
            id: this.generateStepId(),
            type: 'jsonlogic',
            rule,
            startTime: Date.now(),
            status: 'running'
        };
        steps.push(step);
        try {
            this.logger.debug(`Executing standard JsonLogic rule: ${JSON.stringify(rule)}`);
            this.logger.debug(`With data: ${JSON.stringify(context.data)}`);
            if (!jsonLogic || typeof jsonLogic.apply !== 'function') {
                throw new Error('jsonLogic is not properly imported or apply method is not available');
            }
            const result = jsonLogic.apply(rule, context.data);
            step.result = result;
            step.status = 'completed';
            step.endTime = Date.now();
            this.logger.debug(`JsonLogic result: ${JSON.stringify(result)}`);
            return result;
        }
        catch (error) {
            this.logger.error(`JsonLogic execution error: ${error.message}`, error.stack);
            step.error = error.message;
            step.status = 'failed';
            step.endTime = Date.now();
            throw error;
        }
    }
    checkTriggerConditions(rule, context) {
        this.logger.debug(`Checking trigger conditions for rule: ${JSON.stringify(rule)}`);
        this.logger.debug(`Context data: ${JSON.stringify(context.data)}`);
        if (rule.trigger === 'subscription') {
            const hasSubscription = context.data.subscription_package !== undefined;
            this.logger.debug(`Subscription trigger check: ${hasSubscription} (subscription_package: ${context.data.subscription_package})`);
            return hasSubscription;
        }
        else if (rule.trigger === 'newsletter') {
            const hasNewsletter = context.data.newsletter_subscribed === true;
            this.logger.debug(`Newsletter trigger check: ${hasNewsletter} (newsletter_subscribed: ${context.data.newsletter_subscribed})`);
            return hasNewsletter;
        }
        this.logger.debug(`Unknown trigger type: ${rule.trigger}, defaulting to true`);
        return true;
    }
    async executeAction(action, rule, context) {
        switch (action) {
            case 'send_email':
                return this.executeSendEmailAction(rule, context);
            case 'update_user':
                return this.executeUpdateUserAction(rule, context);
            case 'create_task':
                return this.executeCreateTaskAction(rule, context);
            default:
                this.logger.warn(`Unknown action: ${action}`);
                return { action, status: 'unknown' };
        }
    }
    async executeSendEmailAction(rule, context) {
        this.logger.log(`Sending email: ${rule.template} to ${context.data.email}`);
        return {
            action: 'send_email',
            template: rule.template,
            recipient: context.data.email,
            status: 'sent',
            timestamp: new Date()
        };
    }
    async executeUpdateUserAction(rule, context) {
        this.logger.log(`Updating user: ${context.data.id}`);
        return {
            action: 'update_user',
            userId: context.data.id,
            status: 'updated',
            timestamp: new Date()
        };
    }
    async executeCreateTaskAction(rule, context) {
        this.logger.log(`Creating task for user: ${context.data.id}`);
        return {
            action: 'create_task',
            userId: context.data.id,
            status: 'created',
            timestamp: new Date()
        };
    }
    validateJsonLogicRule(rule) {
        const errors = [];
        if (!rule || typeof rule !== 'object') {
            errors.push('Rule must be an object');
            return { isValid: false, errors };
        }
        if (rule.trigger && !rule.event) {
            errors.push('Trigger rules must have an event field');
        }
        if (rule.action && typeof rule.action !== 'string') {
            errors.push('Action must be a string');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateStepId() {
        return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    testJsonLogic() {
        try {
            this.logger.log('Testing JsonLogic import...');
            if (!jsonLogic) {
                this.logger.error('jsonLogic is undefined');
                return false;
            }
            if (typeof jsonLogic.apply !== 'function') {
                this.logger.error('jsonLogic.apply is not a function');
                return false;
            }
            const testRule = { "==": [1, 1] };
            const testData = {};
            const result = jsonLogic.apply(testRule, testData);
            this.logger.log(`JsonLogic test result: ${result}`);
            const complexRule = {
                "trigger": "subscription",
                "event": "user_buys_subscription",
                "execute": true
            };
            const complexResult = jsonLogic.apply(complexRule, testData);
            this.logger.log(`Complex JsonLogic test result: ${complexResult}`);
            return result === true;
        }
        catch (error) {
            this.logger.error(`JsonLogic test failed: ${error.message}`, error.stack);
            return false;
        }
    }
};
exports.WorkflowExecutor = WorkflowExecutor;
exports.WorkflowExecutor = WorkflowExecutor = WorkflowExecutor_1 = __decorate([
    (0, common_1.Injectable)()
], WorkflowExecutor);
//# sourceMappingURL=WorkflowExecutor.js.map