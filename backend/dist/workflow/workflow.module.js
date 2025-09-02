"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const visual_workflow_entity_1 = require("./visual-workflow.entity");
const json_logic_rule_entity_1 = require("./json-logic-rule.entity");
const workflow_service_1 = require("./workflow.service");
const workflow_controller_1 = require("./workflow.controller");
const workflow_cron_1 = require("./workflow.cron");
let WorkflowModule = class WorkflowModule {
};
exports.WorkflowModule = WorkflowModule;
exports.WorkflowModule = WorkflowModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([visual_workflow_entity_1.VisualWorkflow, json_logic_rule_entity_1.JsonLogicRule])],
        providers: [workflow_service_1.WorkflowService, workflow_cron_1.WorkflowCron],
        controllers: [workflow_controller_1.WorkflowController],
    })
], WorkflowModule);
//# sourceMappingURL=workflow.module.js.map