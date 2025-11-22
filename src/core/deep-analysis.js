// Core: Deep analysis for flexible NLP beyond the strict "Gdy ..., ..." format
// Heuristic, rule-based intent extraction with suggestions for modules, workflows, and scaffolds

import { TextSanitizer } from './sanitizer.js';
import { ModuleMapper } from './module-mapper.js';
import { buildScaffolds } from './generator.js';

const sanitizer = new TextSanitizer();
const mapper = new ModuleMapper();

function includesAny(text, arr){
  const t = text.toLowerCase();
  return arr.some(k => t.includes(k));
}

export function deepAnalyze(text, options = {}){
  if (typeof text !== 'string' || !text.trim()){
    return { success:false, error:'Text must be a non-empty string' };
  }

  const raw = text.trim();
  const low = raw.toLowerCase();

  // Detect intent: generate actions via scripts and browser
  const wantsGeneration = includesAny(low, ['generowan', 'utwórz', 'stwórz', 'dodaj możliwość', 'dodaj mozliwosc', 'dodaj funkcje']);
  const mentionsScripts = includesAny(low, ['skrypt', 'script', 'bash', 'python', 'node']);
  const mentionsComputer = includesAny(low, ['komputer', 'serwer', 'backend', 'konsole']);
  const mentionsBrowser = includesAny(low, ['przeglądar', 'przegladar', 'browser', 'frontend']);

  const intents = [];
  if (wantsGeneration && (mentionsScripts || mentionsComputer || mentionsBrowser)){
    const targets = [];
    if (mentionsComputer || mentionsScripts) targets.push('computer');
    if (mentionsBrowser) targets.push('browser');
    const languages = [];
    if (includesAny(low, ['bash'])) languages.push('bash');
    if (includesAny(low, ['python'])) languages.push('python');
    if (includesAny(low, ['node', 'javascript', 'js'])) languages.push('node');
    if (languages.length === 0) languages.push('bash','node','python');
    intents.push({ type:'generate_actions', targets, languages, justification: 'Wykryto prośbę o generowanie akcji/skryptów dla komputera i/lub przeglądarki.' });
  }

  // Determine module/domain suggestion
  const modulesSuggested = [];
  if (intents.length){
    modulesSuggested.push('IT');
    modulesSuggested.push('Integracje');
    modulesSuggested.push('Automatyzacja');
  }

  // Build a suggested workflow (single-step)
  let suggestedWorkflow = null;
  if (intents.length){
    const cond = 'wymagane generowanie akcji przez skrypty i przeglądarkę';
    const id = sanitizer.sanitizeId(cond);
    const acts = [];
    if (intents[0].targets.includes('computer')){
      acts.push({ id: sanitizer.sanitizeId(id+'_bash'), name: 'wygeneruj skrypty bash/node/python', module: 'IT' });
    }
    if (intents[0].targets.includes('browser')){
      acts.push({ id: sanitizer.sanitizeId(id+'_browser'), name: 'wygeneruj funkcje w przeglądarce', module: 'Integracje' });
    }
    suggestedWorkflow = { id, name: cond, module: modulesSuggested[0] || 'IT', actions: acts };
  }

  // Scaffolds preview (filenames only)
  let scaffoldsPreview = null;
  try{
    if (suggestedWorkflow){
      const scaff = buildScaffolds({ workflows: [ suggestedWorkflow ] }, String(options.baseUrl || ''));
      scaffoldsPreview = {
        bash: scaff.bash.map(f => f.filename),
        node: scaff.node.map(f => f.filename),
        python: scaff.python.map(f => f.filename),
        browser: scaff.browser.map(f => f.filename)
      };
    }
  }catch(_){ /* ignore preview failure */ }

  const confidence = Math.min(0.95, 0.5 + (intents.length ? 0.3 : 0));
  const recommendedEndpoints = [
    { method:'POST', path:'/api/processes/generate', query:{ baseUrl: options.baseUrl || 'http://localhost:3000', domain:'all' } },
    { method:'POST', path:'/api/generator/js' }
  ];

  return {
    success: true,
    text: raw,
    intents,
    modulesSuggested,
    domain: modulesSuggested[0] || 'Default',
    confidence,
    recommendedEndpoints,
    suggestedWorkflow,
    scaffoldsPreview
  };
}

export default { deepAnalyze };
