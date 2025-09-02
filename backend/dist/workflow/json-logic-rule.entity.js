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
exports.JsonLogicRule = void 0;
const typeorm_1 = require("typeorm");
const visual_workflow_entity_1 = require("./visual-workflow.entity");
let JsonLogicRule = class JsonLogicRule {
};
exports.JsonLogicRule = JsonLogicRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], JsonLogicRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], JsonLogicRule.prototype, "rule", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], JsonLogicRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], JsonLogicRule.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => visual_workflow_entity_1.VisualWorkflow, visualWorkflow => visualWorkflow.jsonLogicRule),
    __metadata("design:type", visual_workflow_entity_1.VisualWorkflow)
], JsonLogicRule.prototype, "visualWorkflow", void 0);
exports.JsonLogicRule = JsonLogicRule = __decorate([
    (0, typeorm_1.Entity)()
], JsonLogicRule);
//# sourceMappingURL=json-logic-rule.entity.js.map