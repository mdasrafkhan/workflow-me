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
exports.VisualWorkflow = void 0;
const typeorm_1 = require("typeorm");
const json_logic_rule_entity_1 = require("./json-logic-rule.entity");
let VisualWorkflow = class VisualWorkflow {
};
exports.VisualWorkflow = VisualWorkflow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], VisualWorkflow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VisualWorkflow.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], VisualWorkflow.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], VisualWorkflow.prototype, "edges", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], VisualWorkflow.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], VisualWorkflow.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => json_logic_rule_entity_1.JsonLogicRule, jsonLogicRule => jsonLogicRule.visualWorkflow, {
        cascade: true,
        onDelete: 'CASCADE'
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", json_logic_rule_entity_1.JsonLogicRule)
], VisualWorkflow.prototype, "jsonLogicRule", void 0);
exports.VisualWorkflow = VisualWorkflow = __decorate([
    (0, typeorm_1.Entity)()
], VisualWorkflow);
//# sourceMappingURL=visual-workflow.entity.js.map