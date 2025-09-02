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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowController = void 0;
const common_1 = require("@nestjs/common");
const workflow_service_1 = require("./workflow.service");
const WorkflowExecutor_1 = require("./execution/WorkflowExecutor");
const workflow_cron_1 = require("./workflow.cron");
let WorkflowController = class WorkflowController {
    constructor(workflowService, workflowExecutor, workflowCron) {
        this.workflowService = workflowService;
        this.workflowExecutor = workflowExecutor;
        this.workflowCron = workflowCron;
    }
    findAll() {
        return this.workflowService.findAll();
    }
    findOne(id) {
        return this.workflowService.findOne(Number(id));
    }
    createOrUpdate(body) {
        return this.workflowService.createOrUpdate(body);
    }
    remove(id) {
        return this.workflowService.remove(Number(id));
    }
    async migrateOldWorkflows() {
        return this.workflowService.migrateOldWorkflows();
    }
    testJsonLogic() {
        const result = this.workflowExecutor.testJsonLogic();
        return {
            success: result,
            message: result ? 'JsonLogic is working correctly' : 'JsonLogic test failed'
        };
    }
    async getWorkflowJsonLogic(id) {
        var _a;
        const workflow = await this.workflowService.findOne(Number(id));
        if (!workflow) {
            throw new Error(`Workflow with ID ${id} not found`);
        }
        const jsonLogic = ((_a = workflow.jsonLogicRule) === null || _a === void 0 ? void 0 : _a.rule) || null;
        const validationResult = this.workflowExecutor.validateJsonLogicRule(jsonLogic);
        return {
            workflowId: workflow.id,
            name: workflow.name,
            jsonLogic: jsonLogic,
            isValid: validationResult.isValid,
            errors: validationResult.errors
        };
    }
    async testWorkflowExecution(id, testData) {
        var _a;
        const workflow = await this.workflowService.findOne(Number(id));
        if (!workflow) {
            throw new Error(`Workflow with ID ${id} not found`);
        }
        const jsonLogic = (_a = workflow.jsonLogicRule) === null || _a === void 0 ? void 0 : _a.rule;
        if (!jsonLogic) {
            throw new Error(`Workflow ${id} has no JsonLogic rule`);
        }
        const context = {
            data: testData || {
                id: 999,
                email: "test@example.com",
                subscription_package: "premium",
                subscription_status: "active",
                newsletter_subscribed: true,
                user_segment: "new_user"
            },
            metadata: {
                source: 'test',
                timestamp: new Date(),
                userId: '999'
            }
        };
        try {
            const result = await this.workflowExecutor.executeWorkflow(Number(id), jsonLogic, context);
            return {
                workflowId: Number(id),
                executionResult: result,
                success: result.success
            };
        }
        catch (error) {
            return {
                workflowId: Number(id),
                executionResult: null,
                success: false,
                error: error.message
            };
        }
    }
    getCronStatus() {
        return this.workflowCron.getCronStatus();
    }
    getCronMetrics() {
        return this.workflowCron.getCronMetrics();
    }
    async regenerateJsonLogic(id) {
        var _a;
        const workflow = await this.workflowService.findOne(Number(id));
        if (!workflow) {
            throw new Error(`Workflow with ID ${id} not found`);
        }
        const existingJsonLogic = ((_a = workflow.jsonLogicRule) === null || _a === void 0 ? void 0 : _a.rule) || null;
        const validationResult = this.workflowExecutor.validateJsonLogicRule(existingJsonLogic);
        return {
            workflowId: workflow.id,
            name: workflow.name,
            jsonLogic: existingJsonLogic,
            isValid: validationResult.isValid,
            errors: validationResult.errors,
            message: 'JsonLogic regeneration should be done from the frontend. Use the workflow editor to save and regenerate JsonLogic.'
        };
    }
};
exports.WorkflowController = WorkflowController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "createOrUpdate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('migrate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "migrateOldWorkflows", null);
__decorate([
    (0, common_1.Get)('test/jsonlogic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], WorkflowController.prototype, "testJsonLogic", null);
__decorate([
    (0, common_1.Get)(':id/jsonlogic'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "getWorkflowJsonLogic", null);
__decorate([
    (0, common_1.Post)(':id/test-execution'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "testWorkflowExecution", null);
__decorate([
    (0, common_1.Get)('cron/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], WorkflowController.prototype, "getCronStatus", null);
__decorate([
    (0, common_1.Get)('cron/metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], WorkflowController.prototype, "getCronMetrics", null);
__decorate([
    (0, common_1.Post)(':id/regenerate-jsonlogic'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "regenerateJsonLogic", null);
exports.WorkflowController = WorkflowController = __decorate([
    (0, common_1.Controller)('api/workflows'),
    __metadata("design:paramtypes", [workflow_service_1.WorkflowService,
        WorkflowExecutor_1.WorkflowExecutor,
        workflow_cron_1.WorkflowCron])
], WorkflowController);
//# sourceMappingURL=workflow.controller.js.map