// E2E tests for /api/analysis/normalize – detect anomalies in condition/action split
import test from 'node:test';
import assert from 'node:assert/strict';
import DSLServer from '../server/index.js';

function ascii(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/\s+/g,' ')  // collapse spaces
    .trim();
}

async function startServer(){
  const dsl = new DSLServer(0); // ephemeral port
  const server = await dsl.start();
  const addr = server.address();
  const base = `http://127.0.0.1:${addr.port}`;
  return { server, base };
}

async function stopServer(server){
  if (server && server.close){
    await new Promise(r => server.close(r));
  }
}

async function postNormalize(baseUrl, text, llm=false){
  const resp = await fetch(`${baseUrl}/api/analysis/normalize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, llm })
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

// Case 1: "kiedy klient zapłaci wyślij fakturę i powiadom sprzedaż"
// Expect condition = "klient zapłaci", actions = ["wyślij fakturę", "powiadom sprzedaż"]

test('normalize: kiedy klient zapłaci … → correct condition/actions (heuristic, no LLM)', async (t) => {
  const { server, base } = await startServer();
  try{
    const sentence = 'kiedy klient zapłaci wyślij fakturę i powiadom sprzedaż';
    const { ok, data } = await postNormalize(base, sentence, false);
    assert.equal(ok, true, 'HTTP ok');
    assert.equal(data.success, true, 'API success');

    const step = data.step;
    assert.ok(step && step.name, 'step present');

    const nameA = ascii(step.name);
    assert.equal(nameA, 'klient zaplaci', 'condition should be "klient zapłaci"');

    const acts = (step.actions||[]).map(a=>ascii(a.name));
    assert.ok(acts.includes('wyslij fakture'), 'actions include "wyślij fakturę"');
    assert.ok(acts.includes('powiadom sprzedaz'), 'actions include "powiadom sprzedaż"');

    // Sanity: name is not just the marker word
    assert.notEqual(nameA, 'kiedy', 'condition must not be the marker');
  } finally {
    await stopServer(server);
  }
});

// Case 2: "jesli stan magazynowy poniżej 1 sztuki wyslij email do działu zamowien"
// Expect condition ≈ "stan magazynowy poniżej 1 sztuki"; actions contain "email"

test('normalize: jesli stan magazynowy … → correct condition/action (heuristic, no LLM)', async (t) => {
  const { server, base } = await startServer();
  try{
    const sentence = 'jesli stan magazynowy ponizej 1 sztuki wyslij email do działu zamowien';
    const { ok, data } = await postNormalize(base, sentence, false);
    assert.equal(ok, true, 'HTTP ok');
    assert.equal(data.success, true, 'API success');

    const step = data.step;
    assert.ok(step && step.name, 'step present');

    const nameA = ascii(step.name);
    assert.ok(nameA.includes('stan magazynowy') && nameA.includes('1 sztuki'), 'condition should capture stock threshold');

    const acts = (step.actions||[]).map(a=>ascii(a.name));
    const hasEmail = acts.some(a => a.includes('email'));
    assert.ok(hasEmail, 'actions include sending email');

    // Sanity: name is not just the marker word
    assert.notEqual(nameA, 'jesli', 'condition must not be the marker');
  } finally {
    await stopServer(server);
  }
});
