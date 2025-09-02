import { Repository } from 'typeorm';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';
export declare class WorkflowService {
    private visualWorkflowRepo;
    private jsonLogicRuleRepo;
    constructor(visualWorkflowRepo: Repository<VisualWorkflow>, jsonLogicRuleRepo: Repository<JsonLogicRule>);
    findAll(): Promise<VisualWorkflow[]>;
    findOne(id: number): Promise<VisualWorkflow>;
    createOrUpdate(data: {
        id?: number;
        name: string;
        nodes: any;
        edges: any;
        jsonLogic?: any;
    }): Promise<VisualWorkflow>;
    remove(id: number): Promise<void>;
    findAllWithJsonLogic(): Promise<Array<{
        id: number;
        name: string;
        jsonLogic: any;
    }>>;
    migrateOldWorkflows(): Promise<{
        migrated: number;
        message: string;
    }>;
}
