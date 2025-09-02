import { JsonLogicRule } from './json-logic-rule.entity';
export declare class VisualWorkflow {
    id: number;
    name: string;
    nodes: any;
    edges: any;
    createdAt: Date;
    updatedAt: Date;
    jsonLogicRule: JsonLogicRule;
}
