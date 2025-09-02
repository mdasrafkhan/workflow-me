"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const workflow_service_1 = require("./workflow.service");
const WorkflowExecutor_1 = require("./execution/WorkflowExecutor");
const jsonLogic = require('json-logic-js');
const mockSubscribers = [
    {
        id: 1,
        email: 'user1@example.com',
        payment: 'paid',
        created_at: new Date('2023-01-01'),
        subscription_package: 'premium',
        subscription_status: 'active',
        newsletter_subscribed: true,
        user_segment: 'new_user'
    },
    {
        id: 2,
        email: 'user2@example.com',
        payment: 'unpaid',
        created_at: new Date('2024-07-01'),
        subscription_package: 'basic',
        subscription_status: 'inactive',
        newsletter_subscribed: false,
        user_segment: 'returning_user'
    },
    {
        id: 3,
        email: 'user3@example.com',
        payment: 'paid',
        created_at: new Date('2024-08-01'),
        subscription_package: 'enterprise',
        subscription_status: 'active',
        newsletter_subscribed: true,
        user_segment: 'premium_user'
    },
];
let WorkflowCron = class WorkflowCron {
    constructor(workflowService, workflowExecutor) {
        this.workflowService = workflowService;
        this.workflowExecutor = workflowExecutor;
        this.lastExecutionTime = null;
        this.executionHistory = [];
    }
    async handleCron() {
        const startTime = Date.now();
        console.log('Executing workflow cron job...');
        const jsonLogicTest = this.workflowExecutor.testJsonLogic();
        console.log(`JsonLogic test result: ${jsonLogicTest}`);
        const workflows = await this.workflowService.findAllWithJsonLogic();
        let successCount = 0;
        let errorCount = 0;
        for (const wf of workflows) {
            console.log(`Processing workflow: ${wf.name} (ID: ${wf.id})`);
            try {
                await this.executeWorkflowWithNewEngine(wf.jsonLogic, wf.id);
                successCount++;
            }
            catch (error) {
                console.error(`Error processing workflow ${wf.id}:`, error);
                errorCount++;
            }
        }
        await this.processDelayedExecutions();
        const executionTime = Date.now() - startTime;
        this.lastExecutionTime = new Date();
        this.executionHistory.push({
            timestamp: this.lastExecutionTime,
            workflowsProcessed: workflows.length,
            successCount,
            errorCount,
            executionTime
        });
        if (this.executionHistory.length > 10) {
            this.executionHistory = this.executionHistory.slice(-10);
        }
        console.log(`Cron job completed: ${workflows.length} workflows processed, ${successCount} successful, ${errorCount} errors, ${executionTime}ms`);
    }
    async processDelayedExecutions() {
        const now = new Date();
        console.log(`Checking for delayed executions ready at ${now.toISOString()}`);
        console.log('Delayed execution processing would happen here');
    }
    getCronStatus() {
        const now = new Date();
        const nextExecutionTime = new Date(now.getTime() + 60000);
        return {
            isRunning: true,
            lastExecutionTime: this.lastExecutionTime,
            executionHistory: this.executionHistory,
            nextExecutionTime,
            schedule: 'Every minute (* * * * *)'
        };
    }
    getCronMetrics() {
        const totalExecutions = this.executionHistory.length;
        const totalWorkflows = this.executionHistory.reduce((sum, exec) => sum + exec.workflowsProcessed, 0);
        const totalTime = this.executionHistory.reduce((sum, exec) => sum + exec.executionTime, 0);
        const totalSuccess = this.executionHistory.reduce((sum, exec) => sum + exec.successCount, 0);
        const totalErrors = this.executionHistory.reduce((sum, exec) => sum + exec.errorCount, 0);
        const averageExecutionTime = totalExecutions > 0 ? totalTime / totalExecutions : 0;
        const successRate = totalWorkflows > 0 ? (totalSuccess / totalWorkflows) * 100 : 0;
        const last24Hours = {
            executions: totalExecutions,
            totalWorkflows,
            averageTime: averageExecutionTime,
            successRate
        };
        return {
            totalExecutions,
            averageExecutionTime,
            successRate,
            totalWorkflowsProcessed: totalWorkflows,
            last24Hours
        };
    }
    async executeWorkflowWithNewEngine(jsonLogicRule, workflowId) {
        var _a;
        console.log(`Workflow ${workflowId}: Executing with enhanced engine`);
        console.log(`JsonLogic Rule:`, JSON.stringify(jsonLogicRule, null, 2));
        for (const subscriber of mockSubscribers) {
            try {
                const context = {
                    data: subscriber,
                    metadata: {
                        source: 'cron',
                        timestamp: new Date(),
                        userId: subscriber.id.toString()
                    }
                };
                const result = await this.workflowExecutor.executeWorkflow(workflowId, jsonLogicRule, context);
                console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Execution result:`, result);
                if (result.success && ((_a = result.result) === null || _a === void 0 ? void 0 : _a.execute)) {
                    console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Action executed successfully`);
                }
            }
            catch (error) {
                console.error(`Workflow ${workflowId}: Enhanced execution error for subscriber ${subscriber.id}:`, error);
            }
        }
    }
    async executeWorkflowWithJsonLogic(jsonLogicRule, workflowId) {
        console.log(`Workflow ${workflowId}: Executing with JsonLogic`);
        console.log(`JsonLogic Rule:`, JSON.stringify(jsonLogicRule, null, 2));
        for (const subscriber of mockSubscribers) {
            try {
                const result = jsonLogic.apply(jsonLogicRule, subscriber);
                console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Rule result: ${result}`);
                if (result === true || (typeof result === 'object' && result.execute === true)) {
                    const action = result.action || 'default_action';
                    await this.executeAction(action, subscriber, workflowId);
                }
            }
            catch (error) {
                console.error(`Workflow ${workflowId}: JsonLogic execution error for subscriber ${subscriber.id}:`, error);
            }
        }
    }
    async executeAction(action, subscriber, workflowId) {
        switch (action) {
            case 'delete':
                console.log(`Workflow ${workflowId}: ACTION - Deleting subscriber ${subscriber.id} (${subscriber.email}).`);
                break;
            case 'send_mail':
                console.log(`Workflow ${workflowId}: ACTION - Sending email to ${subscriber.email} for subscriber ${subscriber.id}.`);
                break;
            default:
                console.log(`Workflow ${workflowId}: ACTION - Executing default action for subscriber ${subscriber.id}.`);
        }
    }
};
exports.WorkflowCron = WorkflowCron;
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WorkflowCron.prototype, "handleCron", null);
exports.WorkflowCron = WorkflowCron = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [workflow_service_1.WorkflowService,
        WorkflowExecutor_1.WorkflowExecutor])
], WorkflowCron);
//# sourceMappingURL=workflow.cron.js.map