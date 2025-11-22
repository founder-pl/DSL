import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { WorkflowEngine } from '../core/workflow-engine.js';
import { generateMermaid } from '../core/diagram.js';
import { parseMultipleSentences } from '../core/nlp.js';

const SAMPLE_SENTENCES = [
  'Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową',
  'Gdy nadejdzie nowe e-Doręczenie, powiadom zespół i zaktualizuj raporty księgowe',
  'Gdy nowy klient zapisze się na newsletter, wyślij wiadomość powitalną i dodaj go do CRM',
  'Gdy faktura zostanie opłacona, wygeneruj raport sprzedaży i zaktualizuj dashboard finansowy'
];

describe('Visual Workflow Generation from NLP', () => {
  test('Generate Mermaid for sample sentences', async () => {
    const engine = new WorkflowEngine();

    for (const sentence of SAMPLE_SENTENCES) {
      const result = await engine.createWorkflowFromNLP(sentence);
      assert.equal(result.success, true, `Engine failed for: ${sentence}`);

      const wfEvent = engine.getEventsByType('WorkflowCreated').slice(-1)[0];
      assert(wfEvent && wfEvent.payload, 'Missing workflow event payload');
      const payload = wfEvent.payload;

      // Build a simple workflow for diagram
      const workflow = { steps: [{
        id: payload.id,
        name: payload.name,
        module: payload.module,
        actions: payload.actions
      }] };

      const diagram = generateMermaid(workflow);
      assert(diagram.includes('flowchart TD'), 'Diagram missing header');
      assert(!diagram.includes('Error['), 'Diagram contains error block');

      // Check that action names appear in diagram text (labels)
      for (const action of payload.actions) {
        assert(diagram.includes(action.name), `Diagram missing action label: ${action.name}`);
      }
    }
  });

  test('parseMultipleSentences extracts valid sentences', () => {
    const blob = `Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową.\n\n`+
                 `Gdy nadejdzie nowe e-Doręczenie, powiadom zespół i zaktualizuj raporty księgowe.\n`+
                 `To zdanie nie jest poprawne.\n`+
                 `Gdy nowy klient zapisze się na newsletter, wyślij wiadomość powitalną i dodaj go do CRM.`;
    const sentences = parseMultipleSentences(blob);
    assert.equal(sentences.length >= 2, true);
    assert(sentences[0].startsWith('Gdy'));
  });
});
