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
var DelayScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelayScheduler = void 0;
const common_1 = require("@nestjs/common");
let DelayScheduler = DelayScheduler_1 = class DelayScheduler {
    constructor() {
        this.logger = new common_1.Logger(DelayScheduler_1.name);
    }
    async scheduleDelay(workflowId, executionId, userId, delayConfig, context) {
        const delayHours = this.calculateDelayHours(delayConfig);
        const scheduledAt = new Date();
        const executeAt = new Date(scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));
        const delayExecution = {
            id: `delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            workflowId,
            executionId,
            userId,
            delayType: delayConfig.type,
            delayHours,
            scheduledAt,
            executeAt,
            status: 'pending',
            context,
            createdAt: scheduledAt,
            updatedAt: scheduledAt
        };
        this.logger.log(`Scheduled delay: ${delayHours} hours for execution ${executionId}, execute at ${executeAt.toISOString()}`);
        return delayExecution;
    }
    async getPendingDelays() {
        const now = new Date();
        return [];
    }
    async markDelayExecuted(delayId) {
        this.logger.log(`Marking delay ${delayId} as executed`);
    }
    calculateDelayHours(delayConfig) {
        if (delayConfig.type === 'fixed') {
            return delayConfig.hours || 0;
        }
        else if (delayConfig.type === 'random') {
            const minHours = delayConfig.min_hours || 0;
            const maxHours = delayConfig.max_hours || minHours;
            return Math.random() * (maxHours - minHours) + minHours;
        }
        return 0;
    }
    static createEnhancedDelayLogic(delayConfig, executionContext) {
        const delayHours = delayConfig.type === 'fixed'
            ? delayConfig.hours || 0
            : Math.random() * ((delayConfig.max_hours || 0) - (delayConfig.min_hours || 0)) + (delayConfig.min_hours || 0);
        const executeAt = new Date(executionContext.scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));
        return {
            "delay": {
                "type": delayConfig.type,
                "hours": delayHours,
                "scheduledAt": executionContext.scheduledAt.toISOString(),
                "executeAt": executeAt.toISOString(),
                "workflowId": executionContext.workflowId,
                "executionId": executionContext.executionId,
                "userId": executionContext.userId,
                "status": "pending"
            }
        };
    }
};
exports.DelayScheduler = DelayScheduler;
exports.DelayScheduler = DelayScheduler = DelayScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DelayScheduler);
//# sourceMappingURL=DelayScheduler.js.map