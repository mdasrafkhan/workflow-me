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
exports.WorkflowService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const visual_workflow_entity_1 = require("./visual-workflow.entity");
const json_logic_rule_entity_1 = require("./json-logic-rule.entity");
let WorkflowService = class WorkflowService {
    constructor(visualWorkflowRepo, jsonLogicRuleRepo) {
        this.visualWorkflowRepo = visualWorkflowRepo;
        this.jsonLogicRuleRepo = jsonLogicRuleRepo;
    }
    async findAll() {
        return this.visualWorkflowRepo.find({
            relations: ['jsonLogicRule']
        });
    }
    async findOne(id) {
        return this.visualWorkflowRepo.findOne({
            where: { id },
            relations: ['jsonLogicRule']
        });
    }
    async createOrUpdate(data) {
        if (data.id) {
            const existingWorkflow = await this.visualWorkflowRepo.findOne({
                where: { id: data.id },
                relations: ['jsonLogicRule']
            });
            if (existingWorkflow) {
                existingWorkflow.name = data.name;
                existingWorkflow.nodes = data.nodes;
                existingWorkflow.edges = data.edges;
                existingWorkflow.updatedAt = new Date();
                if (data.jsonLogic) {
                    if (existingWorkflow.jsonLogicRule) {
                        existingWorkflow.jsonLogicRule.rule = data.jsonLogic;
                        existingWorkflow.jsonLogicRule.updatedAt = new Date();
                    }
                    else {
                        existingWorkflow.jsonLogicRule = this.jsonLogicRuleRepo.create({
                            rule: data.jsonLogic
                        });
                    }
                }
                return this.visualWorkflowRepo.save(existingWorkflow);
            }
        }
        const visualWorkflow = this.visualWorkflowRepo.create({
            name: data.name,
            nodes: data.nodes,
            edges: data.edges
        });
        if (data.jsonLogic) {
            visualWorkflow.jsonLogicRule = this.jsonLogicRuleRepo.create({
                rule: data.jsonLogic
            });
        }
        return this.visualWorkflowRepo.save(visualWorkflow);
    }
    async remove(id) {
        await this.visualWorkflowRepo.delete(id);
    }
    async findAllWithJsonLogic() {
        const workflows = await this.visualWorkflowRepo.find({
            relations: ['jsonLogicRule']
        });
        return workflows
            .filter(wf => wf.jsonLogicRule)
            .map(wf => ({
            id: wf.id,
            name: wf.name,
            jsonLogic: wf.jsonLogicRule.rule
        }));
    }
    async migrateOldWorkflows() {
        try {
            const oldWorkflows = await this.visualWorkflowRepo.manager.query('SELECT id, name, "jsonLogic" FROM workflow WHERE "jsonLogic" IS NOT NULL');
            let migrated = 0;
            for (const oldWf of oldWorkflows) {
                const existing = await this.visualWorkflowRepo.findOne({
                    where: { name: oldWf.name }
                });
                if (!existing) {
                    const visualWorkflow = this.visualWorkflowRepo.create({
                        name: oldWf.name,
                        nodes: [],
                        edges: []
                    });
                    visualWorkflow.jsonLogicRule = this.jsonLogicRuleRepo.create({
                        rule: oldWf.jsonLogic
                    });
                    await this.visualWorkflowRepo.save(visualWorkflow);
                    migrated++;
                }
            }
            return {
                migrated,
                message: `Successfully migrated ${migrated} workflows to new structure`
            };
        }
        catch (error) {
            return {
                migrated: 0,
                message: `Migration failed: ${error.message}`
            };
        }
    }
};
exports.WorkflowService = WorkflowService;
exports.WorkflowService = WorkflowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(visual_workflow_entity_1.VisualWorkflow)),
    __param(1, (0, typeorm_1.InjectRepository)(json_logic_rule_entity_1.JsonLogicRule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WorkflowService);
//# sourceMappingURL=workflow.service.js.map