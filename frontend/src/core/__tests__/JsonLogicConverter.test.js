import { JsonLogicConverter } from '../JsonLogicConverter';

describe('JsonLogicConverter', () => {
  describe('convertWorkflow', () => {
    it('should convert a simple workflow with trigger and action', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'subscription-trigger',
          data: {
            triggerEvent: 'user_buys_subscription',
            reEntryRule: 'once_per_product'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'Welcome Email',
            actionData: '{"subject": "Welcome!"}'
          }
        }
      ];

      const edges = [
        {
          id: 'edge-1',
          source: 'trigger-1',
          target: 'action-1'
        }
      ];

      const result = JsonLogicConverter.convertWorkflow(nodes, edges);

      expect(result).toBeDefined();
      expect(result.and).toBeDefined();
      expect(Array.isArray(result.and)).toBe(true);
    });

    it('should handle empty workflow', () => {
      const result = JsonLogicConverter.convertWorkflow([], []);

      expect(result).toEqual({ always: true });
    });

    it('should handle workflow with no edges', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'subscription-trigger',
          data: {
            triggerEvent: 'user_buys_subscription',
            reEntryRule: 'once_per_product'
          }
        }
      ];

      const result = JsonLogicConverter.convertWorkflow(nodes, []);

      expect(result).toBeDefined();
      expect(result.trigger).toBeDefined();
      expect(result.trigger.event).toBe('user_buys_subscription');
    });
  });

  describe('hasCustomOperations', () => {
    it('should detect custom operations', () => {
      const ruleWithCustom = {
        and: [
          { trigger: 'subscription', event: 'user_buys_subscription' },
          { delay: { type: 'fixed', hours: 24 } }
        ]
      };

      const ruleWithoutCustom = {
        and: [
          { '==': [{ var: 'name' }, 'John'] },
          { '>': [{ var: 'age' }, 18] }
        ]
      };

      expect(JsonLogicConverter.hasCustomOperations(ruleWithCustom)).toBe(true);
      expect(JsonLogicConverter.hasCustomOperations(ruleWithoutCustom)).toBe(false);
    });

    it('should handle nested custom operations', () => {
      const rule = {
        and: [
          { '==': [{ var: 'name' }, 'John'] },
          {
            or: [
              { delay: { type: 'fixed', hours: 24 } },
              { always: true }
            ]
          }
        ]
      };

      expect(JsonLogicConverter.hasCustomOperations(rule)).toBe(true);
    });
  });

  describe('testRule', () => {
    it('should test custom operations with mock results', () => {
      const customRule = {
        trigger: 'subscription',
        event: 'user_buys_subscription',
        execute: true
      };

      const result = JsonLogicConverter.testRule(customRule);

      expect(result.success).toBe(true);
      expect(result.note).toContain('Custom operations detected');
      expect(result.result.execute).toBe(true);
      expect(result.result.trigger).toBe('subscription');
    });

    it('should test standard JsonLogic rules', () => {
      const standardRule = {
        and: [
          { '==': [{ var: 'name' }, 'John'] },
          { '>': [{ var: 'age' }, 18] }
        ]
      };

      const result = JsonLogicConverter.testRule(standardRule, { name: 'John', age: 25 });

      expect(result.success).toBe(true);
      expect(result.note).toBeUndefined();
    });
  });

  describe('mockCustomOperationResult', () => {
    it('should mock trigger results', () => {
      const rule = {
        trigger: 'subscription',
        event: 'user_buys_subscription',
        execute: true
      };

      const result = JsonLogicConverter.mockCustomOperationResult(rule);

      expect(result.execute).toBe(true);
      expect(result.trigger).toBe('subscription');
      expect(result.event).toBe('user_buys_subscription');
    });

    it('should mock delay results', () => {
      const rule = {
        delay: {
          type: 'fixed',
          hours: 24
        }
      };

      const result = JsonLogicConverter.mockCustomOperationResult(rule);

      expect(result.execute).toBe(false);
      expect(result.workflowSuspended).toBe(true);
      expect(result.delay).toEqual(rule.delay);
    });

    it('should mock always results', () => {
      const rule = { always: true };
      const result = JsonLogicConverter.mockCustomOperationResult(rule);

      expect(result.execute).toBe(true);
      expect(result.always).toBe(true);
    });
  });
});
