// Multi-language sentence normalizer → { condition, actions[] }
// - Heuristic rules for common languages (pl, en, es, de, fr, it, pt)
// - Optional language detection via 'franc' if installed
// - Optional LLM fallback via Ollama (mistral/llama 7B) when enabled

import { TextSanitizer } from './sanitizer.js';
import { ModuleMapper } from './module-mapper.js';

const sanitizer = new TextSanitizer();
const mapper = new ModuleMapper();

// Try to import 'franc' lazily (optional dependency)
async function tryDetectLang(text) {
  try {
    const { franc } = await import('franc');
    const code3 = franc(String(text || ''), { minLength: 5 });
    return code3; // ISO 639-3 (e.g., 'pol','eng','spa','deu','fra','ita','por')
  } catch (_) {
    return 'und';
  }
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// Split actions by language-specific conjunctions
function splitActionsTail(t, lang) {
  const patterns = [
    /\s+(?:i|oraz|a także|następnie)\s+/i, // pl
    /\s+(?:and|then)\s+/i,                 // en
    /\s+(?:y|entonces|luego)\s+/i,        // es
    /\s+(?:und|dann)\s+/i,                // de
    /\s+(?:et|puis|alors)\s+/i,           // fr
    /\s+(?:e|poi|allora)\s+/i,            // it
    /\s+(?:e|então|depois)\s+/i           // pt
  ];
  let parts = [t];
  for (const re of patterns) {
    const tmp = t.split(re).map(s => normalizeWhitespace(s));
    if (tmp.length > 1) { parts = tmp; break; }
  }
  return parts.filter(Boolean).map(a => a.replace(/[.]+$/,'').trim());
}

// Extract condition & tail using language markers
function extractByMarkers(text, code3) {
  const s = normalizeWhitespace(text);
  const markers = [
    // Polish: include both diacritic and no-diacritic forms
    { code:['pol'], when:/(?:^|\b)(gdy|kiedy|jeśli|jesli)\b/i },
    { code:['eng'], when:/(?:^|\b)(when|if)\b/i },
    { code:['spa'], when:/(?:^|\b)(cuando|si)\b/i },
    { code:['deu'], when:/(?:^|\b)(wenn|falls)\b/i },
    { code:['fra'], when:/(?:^|\b)(quand|si)\b/i },
    { code:['ita'], when:/(?:^|\b)(quando|se)\b/i },
    { code:['por'], when:/(?:^|\b)(quando|se|quando)\b/i }
  ];

  // Common action verbs (multi-language) used to find boundary without comma
  const actionVerbList = '(wyślij|wyslij|powiadom|zaktualizuj|dodaj|wystaw|uruchom|prześlij|przeslij|wykonaj|wyślij|send|notify|create|update|add|run|dispatch|email)';

  const commaIdx = s.indexOf(',');
  // Primary pattern: When/If ... , actions
  for (const m of markers) {
    if (m.code.includes(code3) || code3 === 'und') {
      // Try splitting exactly at action boundary when no delimiter
      const reBoundary = new RegExp(`${m.when.source}\\s+(.+?)\\s+(?=${actionVerbList}\\b)(.+)$`, 'i');
      const mb = s.match(reBoundary);
      if (mb) return { condition: mb[1], tail: mb[2] };

      // Try with explicit delimiter (, : -  wtedy | to)
      const reDelim = new RegExp(`${m.when.source}\\s+(.+?)(?:,|:|-|\\s+(?:to|wtedy)\\s+)\\s*(.+)$`, 'i');
      const md = s.match(reDelim);
      if (md) return { condition: md[1], tail: md[2] };
    }
  }

  // If there's a comma, assume left=condition, right=tail
  if (commaIdx > 0) {
    return { condition: s.slice(0, commaIdx), tail: s.slice(commaIdx + 1) };
  }

  // Reverse pattern: action ... when/if condition
  for (const m of markers) {
    if (m.code.includes(code3) || code3 === 'und') {
      const re = new RegExp(`^(.+?)\\s+(?:${m.when.source.replace('(?:^|\\b)','').replace('\\b','')})\\s+(.+)$`, 'i');
      const mm = s.match(re);
      if (mm) return { condition: mm[2], tail: mm[1] };
    }
  }

  // Heuristic fallback: remove leading marker (any language) and split by action verbs
  const anyMarker = /^(gdy|kiedy|jeśli|jesli|when|if|cuando|si|wenn|falls|quand|se|quando)\s+/i;
  const stripped = s.replace(anyMarker, '');
  const actionVerbs = /(wyślij|wyslij|powiadom|zaktualizuj|dodaj|wystaw|uruchom|prześlij|przeslij|send|notify|create|update|add|run|dispatch|email)\b/i;
  const mverb = stripped.match(actionVerbs);
  if (mverb && mverb.index > 3){
    const idx = mverb.index;
    return { condition: stripped.slice(0, idx).trim(), tail: stripped.slice(idx).trim() };
  }

  // Last resort: treat whole sentence as a single action
  return { condition: 'na żądanie', tail: stripped || s };
}

export async function normalizeToWorkflow(text, opts = {}) {
  const lang = (opts.lang || await tryDetectLang(text) || 'und');
  const { condition, tail } = extractByMarkers(text, lang);
  const actions = splitActionsTail(tail, lang);

  // Build step structure
  const stepId = sanitizer.sanitizeId(condition);
  const stepModule = mapper.getModuleForKeywords(condition + ' ' + actions.join(' '));
  const stepActions = actions.map((a, i) => ({
    id: sanitizer.sanitizeId(`${stepId}_action_${i+1}`),
    name: a,
    module: mapper.getModuleForKeywords(a)
  }));

  const result = { condition: normalizeWhitespace(condition), actions: stepActions.map(a => a.name), lang };
  return {
    ok: true,
    lang,
    normalized: result,
    step: { id: stepId, name: result.condition, module: stepModule, actions: stepActions }
  };
}

export async function normalizeWithLLM(text, opts = {}) {
  const baseUrl = opts.ollamaUrl || process.env.LLM_OLLAMA_URL || 'http://localhost:11434';
  const model = opts.model || process.env.LLM_MODEL || 'mistral';
  const prompt = `You are a helpful assistant. Extract a condition and a list of actions from the following sentence. If needed, correct the sentence. Respond ONLY with a compact JSON object of the form {"condition":"...","actions":["..."]}. Keep language consistent with the input.\nSentence: ${text}`;
  try {
    const resp = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    const data = await resp.json();
    const raw = data?.response || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    if (!parsed || !parsed.condition) throw new Error('LLM parse failed');
    // Build step
    const cond = normalizeWhitespace(parsed.condition);
    const acts = (parsed.actions || []).map(s => normalizeWhitespace(String(s||''))).filter(Boolean);
    const stepId = sanitizer.sanitizeId(cond);
    const stepModule = mapper.getModuleForKeywords(cond + ' ' + acts.join(' '));
    const stepActions = acts.map((a,i)=>({ id: sanitizer.sanitizeId(`${stepId}_action_${i+1}`), name:a, module: mapper.getModuleForKeywords(a) }));
    return { ok:true, llm:true, normalized:{ condition:cond, actions:acts }, step:{ id:stepId, name:cond, module:stepModule, actions:stepActions } };
  } catch (e) {
    return { ok:false, error:e.message };
  }
}

export default { normalizeToWorkflow, normalizeWithLLM };
