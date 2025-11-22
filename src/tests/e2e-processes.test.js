import { strict as assert } from 'assert';
import { test, describe, before, after } from 'node:test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import DSLServer from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

let serverInstance;
const PORT = 3101;
const base = (p) => `http://localhost:${PORT}${p}`;

async function getJSON(url, init){
  const r = await fetch(url, init);
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { raw: t, status: r.status }; }
}

describe('E2E: procesy.txt -> DSL -> artefakty + mock API', () => {
  before(async () => {
    serverInstance = new DSLServer(PORT);
    await serverInstance.start();
  });

  after(() => {
    try { serverInstance?.app?.close?.(); } catch(_) {}
  });

  test('split domains', async () => {
    const data = await getJSON(base('/api/processes/split?write=1'));
    assert(data.domains && data.domains.length > 0, 'No domains split');
  });

  test('generate artifacts from all domains', async () => {
    const data = await getJSON(base('/api/processes/generate?domain=all'), { method: 'POST' });
    assert.equal(data.success, true);
    assert(data.files && data.files.length > 0);
    // Verify presence of key categories
    const files = data.files.join('\n');
    assert(/generated\/diagrams\/.+\.mmd/.test(files), 'Missing diagrams');
    assert(/generated\/domains\/.+\.yaml/.test(files), 'Missing YAML');
    assert(/generated\/scripts\/bash\/.+\.sh/.test(files), 'Missing bash scripts');
    assert(/generated\/scripts\/node\/.+\.js/.test(files), 'Missing node scripts');
    assert(/generated\/scripts\/python\/.+\.py/.test(files), 'Missing python scripts');
    assert(/generated\/browser\/actions\.js/.test(files), 'Missing browser actions');
  });

  test('list generated files endpoint', async () => {
    const data = await getJSON(base('/api/processes/list'));
    assert(Array.isArray(data.files));
    assert(data.files.some(f => f.includes('generated/diagrams')));
  });

  test('mock APIs respond', async () => {
    const email = await getJSON(base('/api/mock/send-email'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to:'dev@example.com' }) });
    assert.equal(email.ok, true);
    const inv = await getJSON(base('/api/mock/generate-invoice'), { method:'POST' });
    assert.equal(inv.ok, true);
    const invGet = await getJSON(base('/api/mock/invoice/INV-TEST'));
    assert.equal(invGet.ok, true);
    const page = await getJSON(base('/api/mock/fetch-page?url=https%3A%2F%2Fexample.org'));
    assert.equal(page.ok, true);
    const rpt = await getJSON(base('/api/mock/generate-report'), { method:'POST' });
    assert.equal(rpt.ok, true);
  });

  test('code generator returns JS', async () => {
    const res = await fetch(base('/api/generator/js'), { method:'POST' });
    const text = await res.text();
    assert(text.includes('export async function runAction') || res.headers.get('content-type')?.includes('application/javascript'));
  });
});
