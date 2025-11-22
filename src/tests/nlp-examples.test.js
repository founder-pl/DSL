import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { WorkflowEngine } from '../core/workflow-engine.js';
import { generateMermaid } from '../core/diagram.js';

const MORE_SENTENCES = [
  'Gdy termin płatności minie, wyślij ponaglenie i utwórz zadanie w CRM',
  'Gdy zapas magazynowy spadnie poniżej progu, zamów towar i powiadom dział zakupów',
  'Gdy klient odwoła subskrypcję, wyślij ankietę satysfakcji i zaktualizuj CRM',
  'Gdy zgłoszenie serwisowe wpłynie, przypisz je do zespołu i powiadom klienta'
];

describe('NLP: dodatkowe przykłady', () => {
  test('Engine tworzy workflow i generuje poprawny Mermaid', async () => {
    const engine = new WorkflowEngine();

    for (const sentence of MORE_SENTENCES) {
      const result = await engine.createWorkflowFromNLP(sentence);
      assert.equal(result.success, true, `Engine failed for: ${sentence}`);

      const wfEvent = engine.getEventsByType('WorkflowCreated').slice(-1)[0];
      assert(wfEvent && wfEvent.payload, 'Missing workflow event payload');
      const payload = wfEvent.payload;

      const workflow = { steps: [{
        id: payload.id,
        name: payload.name,
        module: payload.module,
        actions: payload.actions
      }] };

      const diagram = generateMermaid(workflow);
      assert(diagram.includes('flowchart TD'), 'Diagram missing header');
      assert(!diagram.includes('Error['), 'Diagram contains error block');
      for (const action of payload.actions) {
        assert(diagram.includes(action.name), `Diagram missing action label: ${action.name}`);
      }
    }
  });
});
