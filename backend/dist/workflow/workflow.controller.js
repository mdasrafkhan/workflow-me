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
let WorkflowController = class WorkflowController {
    constructor(workflowService, workflowExecutor) {
        this.workflowService = workflowService;
        this.workflowExecutor = workflowExecutor;
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
exports.WorkflowController = WorkflowController = __decorate([
    (0, common_1.Controller)('api/workflows'),
    __metadata("design:paramtypes", [workflow_service_1.WorkflowService,
        WorkflowExecutor_1.WorkflowExecutor])
], WorkflowController);
//# sourceMappingURL=workflow.controller.js.map