import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { TextSanitizer } from '../core/sanitizer.js';
import { generateMermaid } from '../core/diagram.js';
import EventCore from '../core/event-store.js';
import { parseCondition, evaluateCondition, evaluateRuleSet } from '../core/rules.js';

describe('Core Modules', () => {
  describe('Diagram.generateMermaid', () => {
    test('generates mermaid for simple workflow', () => {
      const workflow = {
        steps: [{
          id: 'payment',
          name: 'Wpłata klienta',
          module: 'Platnosci',
          actions: [{ id: 'invoice', name: 'Wystaw fakturę' }]
        }]
      };
      const sanitizer = new TextSanitizer();
      const code = generateMermaid(workflow, sanitizer);
      assert(code.includes('flowchart TD'));
      assert(code.includes('subgraph'));
      assert(code.includes('Platnosci'));
      assert(code.includes('Wystaw fakturę'));
    });
  });

  describe('EventCore', () => {
    test('recordAction and persistence', () => {
      const ec = new EventCore();
      const ev = ec.recordAction('test action');
      assert(ev.id);
      assert.equal(ec.getEventStore().length, 1);
      assert.equal(ec.getReadModel().length, 1);

      const state = ec.toState();
      const ec2 = new EventCore();
      ec2.initFromState(state);
      assert.equal(ec2.getEventStore().length, 1);
      assert.equal(ec2.getReadModel().length, 1);
    });
  });

  describe('Rules', () => {
    test('parseCondition supports symbols and Polish phrases', () => {
      const c1 = parseCondition('kwota > 1000');
      assert.equal(c1.field, 'kwota');
      assert.equal(c1.operator, '>');
      assert.equal(c1.value, '1000');

      const c2 = parseCondition('kwota większe niż 1000');
      assert.equal(c2.operator, '>');
    });

    test('evaluateCondition works with numbers and strings', () => {
      const cond1 = parseCondition('kwota >= 100');
      assert.equal(evaluateCondition(cond1, { kwota: 150 }), true);
      assert.equal(evaluateCondition(cond1, { kwota: 50 }), false);

      const cond2 = parseCondition('status contains ok');
      assert.equal(evaluateCondition(cond2, { status: 'ok_done' }), true);
      assert.equal(evaluateCondition(cond2, { status: 'fail' }), false);
    });

    test('evaluateRuleSet all/any', () => {
      const rules = { all: ['kwota > 100', 'status zawiera ok'], any: ['typ = A', 'typ = B'] };
      const ctx = { kwota: 150, status: 'ok', typ: 'B' };
      const res = evaluateRuleSet(rules, ctx);
      assert.equal(res.passed, true);
      assert(res.details.length >= 3);
    });
  });
});
