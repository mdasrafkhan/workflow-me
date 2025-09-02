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
const jsonLogic = require('json-logic-js');
const mockSubscribers = [
    { id: 1, email: 'user1@example.com', payment: 'paid', created_at: new Date('2023-01-01') },
    { id: 2, email: 'user2@example.com', payment: 'unpaid', created_at: new Date('2024-07-01') },
    { id: 3, email: 'user3@example.com', payment: 'paid', created_at: new Date('2024-08-01') },
];
let WorkflowCron = class WorkflowCron {
    constructor(workflowService) {
        this.workflowService = workflowService;
    }
    async handleCron() {
        console.log('Executing workflow cron job...');
        const workflows = await this.workflowService.findAllWithJsonLogic();
        for (const wf of workflows) {
            console.log(`Processing workflow: ${wf.name} (ID: ${wf.id})`);
            await this.executeWorkflowWithJsonLogic(wf.jsonLogic, wf.id);
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
    __metadata("design:paramtypes", [workflow_service_1.WorkflowService])
], WorkflowCron);
//# sourceMappingURL=workflow.cron.js.map