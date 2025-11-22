import { strict as assert } from 'assert';
import { test, describe, before, after } from 'node:test';
import DSLServer from '../server/index.js';

const PORT = 3103;
const base = (p) => `http://localhost:${PORT}${p}`;

async function getJSON(url, init){
  const r = await fetch(url, init);
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { raw: t, status: r.status }; }
}

describe('DB Workflows API Tests', () => {
  let server;

  before(async () => {
    server = new DSLServer(PORT);
    await server.start();
  });

  after(() => {
    try { server?.app?.close?.(); } catch(_) {}
  });

  test('GET /api/workflow/db/workflows - returns empty or workflows', async () => {
    const data = await getJSON(base('/api/workflow/db/workflows'));
    assert(data.workflows !== undefined, 'workflows field missing');
    assert(Array.isArray(data.workflows), 'workflows should be an array');
    assert(typeof data.count === 'number', 'count should be a number');
  });

  test('POST /api/workflow/db/save - save single workflow', async () => {
    const workflows = [{
      id: 'test_workflow_1',
      name: 'Test Workflow 1',
      module: 'TestModule',
      actions: [
        { id: 'test_action_1', name: 'Test Action', module: 'TestModule' }
      ]
    }];
    const data = await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows, replace: false })
    });
    assert.equal(data.success, true, 'save should succeed');
    assert.equal(data.count, 1, 'should save 1 workflow');
  });

  test('POST /api/workflow/db/save - save multiple workflows', async () => {
    const workflows = [
      { id: 'test_wf_2', name: 'Workflow 2', module: 'Module1', actions: [{ id: 'a1', name: 'Action 1', module: 'Module1' }] },
      { id: 'test_wf_3', name: 'Workflow 3', module: 'Module2', actions: [{ id: 'a2', name: 'Action 2', module: 'Module2' }] }
    ];
    const data = await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows, replace: false })
    });
    assert.equal(data.success, true);
    assert.equal(data.count, 2);
  });

  test('POST /api/workflow/db/save - replace=true clears existing', async () => {
    const workflows = [{ id: 'only_one', name: 'Only One', module: 'Default', actions: [] }];
    const data = await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows, replace: true })
    });
    assert.equal(data.success, true);
    assert.equal(data.count, 1);
    
    // Verify only this workflow exists
    const readData = await getJSON(base('/api/workflow/db/workflows'));
    assert(readData.workflows.some(w => w.id === 'only_one'), 'saved workflow should exist');
  });

  test('POST /api/workflow/db/save - validation error for invalid input', async () => {
    const data = await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows: 'not-an-array' })
    });
    assert.equal(data.error, 'workflows must be an array');
  });

  test('GET /api/workflow/db/workflows - read saved workflows', async () => {
    // Save a known workflow
    const testWf = { id: 'read_test', name: 'Read Test', module: 'Test', actions: [{ id: 'act1', name: 'Action', module: 'Test' }] };
    await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows: [testWf], replace: false })
    });
    
    // Read back
    const data = await getJSON(base('/api/workflow/db/workflows'));
    const found = data.workflows.find(w => w.id === 'read_test');
    assert(found, 'saved workflow should be readable');
    assert.equal(found.name, 'Read Test');
    assert.equal(found.module, 'Test');
    assert.equal(found.actions.length, 1);
    assert.equal(found.actions[0].name, 'Action');
  });

  test('POST /api/workflow/db/save - workflows without actions', async () => {
    const workflows = [{ id: 'no_actions', name: 'No Actions', module: 'Default', actions: [] }];
    const data = await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows })
    });
    assert.equal(data.success, true);
    
    const readData = await getJSON(base('/api/workflow/db/workflows'));
    const found = readData.workflows.find(w => w.id === 'no_actions');
    assert(found, 'workflow without actions should be saved');
    assert.equal(found.actions.length, 0);
  });

  test('POST /api/workflow/db/save - idempotent updates', async () => {
    const wf1 = { id: 'update_test', name: 'Original Name', module: 'Module1', actions: [] };
    await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows: [wf1], replace: false })
    });
    
    // Update same id with new name
    const wf2 = { id: 'update_test', name: 'Updated Name', module: 'Module2', actions: [{ id: 'new_act', name: 'New Action', module: 'Module2' }] };
    await getJSON(base('/api/workflow/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows: [wf2], replace: false })
    });
    
    const readData = await getJSON(base('/api/workflow/db/workflows'));
    const found = readData.workflows.find(w => w.id === 'update_test');
    assert.equal(found.name, 'Updated Name', 'should update existing workflow');
    assert.equal(found.actions.length, 1);
  });
});
