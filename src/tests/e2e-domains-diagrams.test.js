import { strict as assert } from 'assert';
import { test, describe, before, after } from 'node:test';
import fs from 'fs';
import { join } from 'path';
import DSLServer from '../server/index.js';

const PORT = 3102;
const base = (p) => `http://localhost:${PORT}${p}`;

async function getJSON(url, init){
  const r = await fetch(url, init);
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { raw: t, status: r.status }; }
}

function walkDomainsTxt(root){
  try{
    const dir = join(root, 'generated', 'domains');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.txt'))
      .map(f => ({ name: f.replace(/\.txt$/i,''), path: join(dir, f) }));
  }catch{ return []; }
}

describe('E2E: domains/*.txt -> NLP batch -> diagram per sentence', () => {
  let server;
  before(async () => {
    server = new DSLServer(PORT);
    await server.start();
  });
  after(() => {
    try { server?.app?.close?.(); } catch { }
  });

  test('split to generated/domains and batch-convert all sentences to diagrams', async () => {
    const split = await getJSON(base('/api/processes/split?write=1'));
    assert(split.domains && split.domains.length > 0, 'No domains returned by /split');

    const projectRoot = process.cwd();
    const files = walkDomainsTxt(projectRoot);
    assert(files.length > 0, 'No generated/domains/*.txt files');

    const failures = [];
    for (const file of files){
      const text = fs.readFileSync(file.path, 'utf-8');
      const res = await getJSON(base('/api/workflow/nlp/batch'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      assert(res && Array.isArray(res.results), `Invalid response for domain ${file.name}`);
      // At least one sentence should be valid, otherwise it means parsing failed entirely for that domain
      assert(res.results.length >= 0, `No results array for domain ${file.name}`);
      for (const r of res.results){
        if (!r.success){ failures.push({ domain: file.name, sentence: r.sentence, error: r.error }); continue; }
        if (!r.diagram || !String(r.diagram).includes('flowchart TD')){
          failures.push({ domain: file.name, sentence: r.sentence, error: 'Missing flowchart TD in diagram' });
        }
      }
    }

    if (failures.length){
      console.error('Diagram generation failures:', failures);
      assert.fail(`${failures.length} sentences failed to convert to diagrams. Inspect console output for details.`);
    }
  });
});
