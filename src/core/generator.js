// Core: Generate JavaScript module code from DSL (YAML/JSON)
// Supports two shapes:
//  A) { workflow: <name>, steps: [{id,name,module,actions:[]}, ...] }
//  B) { workflows: [{id,name,module,actions:[]}, ...] } or { version, workflow: {workflows: [...]} }

import yaml from 'js-yaml';
import { TextSanitizer } from './sanitizer.js';

const sanitizer = new TextSanitizer();

function toWorkflows(obj){
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
