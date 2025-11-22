// Core: Generate JavaScript module code from DSL (YAML/JSON)
// Supports two shapes:
//  A) { workflow: <name>, steps: [{id,name,module,actions:[]}, ...] }
//  B) { workflows: [{id,name,module,actions:[]}, ...] } or { version, workflow: {workflows: [...]} }

import yaml from 'js-yaml';
import { TextSanitizer } from './sanitizer.js';

const sanitizer = new TextSanitizer();

export function toWorkflows(obj){
  if (!obj) return [];
  if (Array.isArray(obj.workflows)) return obj.workflows;
  if (obj.workflow && Array.isArray(obj.workflow.workflows)) return obj.workflow.workflows;
  if (Array.isArray(obj.steps)){
    // Map steps -> workflows (single-step workflows)
    return obj.steps.map(s => ({ id: s.id, name: s.name, module: s.module, actions: s.actions || [] }));
  }
  return [];
}

function sanitizeConst(name){
  return sanitizer.sanitizeId(String(name || '')) || 'unnamed';
}

export function generateJSFromDSL(input){
  let obj = input;
  if (typeof input === 'string'){
    try { obj = yaml.load(input); } catch(_){ try { obj = JSON.parse(input); } catch(_) { obj = {}; } }
  }
  const workflows = toWorkflows(obj);

  const actionSet = new Map();
  workflows.forEach(wf => (wf.actions || []).forEach(a => {
    const key = sanitizeConst(a.name);
    if (!actionSet.has(key)) actionSet.set(key, a.name);
  }));

  const wfJson = JSON.stringify(workflows, null, 2);

  const actionsCode = Array.from(actionSet.entries()).map(([key, original]) => (
`export async function ${key}(ctx = {}) {
  // TODO: implement action: ${original}
  return { ok: true, action: '${original}', ctx };
}`)).join('\n\n');

  const switchCases = Array.from(actionSet.entries()).map(([key, original]) => (
`    case '${original}': return ${key}(ctx);`)).join('\n');

  const moduleCode = `// Generated from DSL
export const workflows = ${wfJson};

${actionsCode}

export async function runAction(name, ctx = {}) {
  switch (name) {
${switchCases}
    default: throw new Error('Unknown action: ' + name);
  }
}

export async function runWorkflow(id, ctx = {}) {
  const wf = workflows.find(w => w.id === id);
  if (!wf) throw new Error('Unknown workflow id: ' + id);
  const results = [];
  for (const a of (wf.actions || [])){
    results.push(await runAction(a.name, ctx));
  }
  return { id: wf.id, name: wf.name, results };
}
`;

  return moduleCode;
}

export default generateJSFromDSL;

// Heuristics to map action label to a mockable target
function guessTarget(actionName){
  const s = String(actionName || '').toLowerCase();
  if (s.includes('email') || s.includes('mail') || s.includes('wiadomo')) return { type: 'send_email', method:'POST', path:'/api/mock/send-email' };
  if (s.includes('faktur') && (s.includes('wygener') || s.includes('wystaw'))) return { type: 'generate_invoice', method:'POST', path:'/api/mock/generate-invoice' };
  if (s.includes('faktur') && (s.includes('pobierz') || s.includes('pobr'))) return { type: 'fetch_invoice', method:'GET', path:'/api/mock/invoice/INV-123' };
  if (s.includes('pobierz') && (s.includes('stron') || s.includes('www') || s.includes('page'))) return { type: 'fetch_page', method:'GET', path:'/api/mock/fetch-page?url=https%3A%2F%2Fexample.org' };
  if (s.includes('raport')) return { type:'report', method:'POST', path:'/api/mock/generate-report' };
  return { type: 'generic', method:'POST', path:'/api/mock/action' };
}

export function buildScaffolds(input, baseUrl = ''){
  const workflows = Array.isArray(input) ? input : toWorkflows(input);
  const sanitizer = new TextSanitizer();
  const bash = [];
  const node = [];
  const browserFns = [];
  const python = [];
  const actions = new Map();
  workflows.forEach(wf => (wf.actions || []).forEach(a => { const key = sanitizer.sanitizeId(a.name); if (!actions.has(key)) actions.set(key, a.name); }));

  // normalize baseUrl
  const BASE = String(baseUrl || '').replace(/\/$/, '');

  for (const [key, original] of actions){
    const t = guessTarget(original);
    // bash script
    bash.push({
      filename: `generated/scripts/bash/${key}.sh`,
      content: `#!/usr/bin/env bash\nset -euo pipefail\n# Action: ${original}\n# Target: ${t.path}\n\ncurl -s -S -X ${t.method} '${BASE || 'http://localhost:3000'}${t.path}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"action":"${original}","ts":"'"$(date -Iseconds)"'"}' | jq . || true\n`
    });
    // node script
    node.push({
      filename: `generated/scripts/node/${key}.js`,
      content: `// Auto-generated for action: ${original}\nexport default async function ${key}(ctx={}){\n  const res = await fetch('${BASE || 'http://localhost:3000'}${t.path}', { method:'${t.method}', headers:{'Content-Type':'application/json'}, body: ${t.method==='GET' ? 'undefined' : `JSON.stringify({ action: '${original}', ctx })`} });\n  const data = await res.json().catch(()=>({ ok:false }));\n  return { ok: res.ok, status: res.status, data };\n}\nif (import.meta.url === 'file://' + process.argv[1]){ ${key}().then(r=>console.log(JSON.stringify(r,null,2))); }\n`
    });
    // python script (no external deps)
    python.push({
      filename: `generated/scripts/python/${key}.py`,
      content: `# Auto-generated for action: ${original}\nimport json, urllib.request\nreq = urllib.request.Request('${BASE || 'http://localhost:3000'}${t.path}', method='${t.method}')\nreq.add_header('Content-Type','application/json')\nbody = ${t.method==='GET' ? 'None' : `json.dumps({'action': '${original}', 'ctx': {}}).encode('utf-8')`}\ntry:\n    with urllib.request.urlopen(req, data=body) as r:\n        print(r.read().decode('utf-8'))\nexcept Exception as e:\n    print(json.dumps({'ok': False, 'error': str(e)}))\n`
    });
    // browser function
    browserFns.push(`export async function ${key}(ctx={}){ const res = await fetch('${BASE || 'http://localhost:3000'}${t.path}', { method:'${t.method}', headers:{'Content-Type':'application/json'}, body: ${t.method==='GET' ? 'undefined' : `JSON.stringify({ action: '${original}', ctx })`} }); return await res.json(); }`);
  }

  const browser = [{ filename: 'generated/browser/actions.js', content: `${browserFns.join('\n')}\n` }];
  return { bash, node, python, browser, count: actions.size };
}
