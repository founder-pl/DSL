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
    // Use only word-boundary, no start-of-string alternative to avoid zero-length matches
    { code:['pol'], when:/\b(gdy|kiedy|jeśli|jesli)\b/i },
    { code:['eng'], when:/\b(when|if)\b/i },
    { code:['spa'], when:/\b(cuando|si)\b/i },
    { code:['deu'], when:/\b(wenn|falls)\b/i },
    { code:['fra'], when:/\b(quand|si)\b/i },
    { code:['ita'], when:/\b(quando|se)\b/i },
    { code:['por'], when:/\b(quando|se|quando)\b/i }
  ];

  // Common action verbs (multi-language) used to find boundary without comma
  const actionVerbList = '(wyślij|wyslij|powiadom|zaktualizuj|dodaj|wystaw|uruchom|prześlij|przeslij|wykonaj|wyślij|send|notify|create|update|add|run|dispatch|email)';

  const commaIdx = s.indexOf(',');
  // Primary pattern: When/If ... , actions
  for (const m of markers) {
    if (m.code.includes(code3) || code3 === 'und') {
      // Convert any capturing groups in marker to non-capturing to keep group indices stable
      const whenNc = m.when.source.replace(/\((?!\?:)/g, '(?:');
      // Try splitting exactly at action boundary when no delimiter
      const reBoundary = new RegExp(`${whenNc}\\s+(.+?)\\s+(?=${actionVerbList}\\b)(.+)$`, 'i');
      const mb = s.match(reBoundary);
      if (mb) return { condition: mb[1], tail: mb[2] };

      // Try with explicit delimiter (, : -  wtedy | to)
      const reDelim = new RegExp(`${whenNc}\\s+(.+?)(?:,|:|-|\\s+(?:to|wtedy)\\s+)\\s*(.+)$`, 'i');
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
      const inner = m.when.source.replace('(?:^|\\b)','').replace('\\b','');
      const innerNc = inner.replace(/\((?!\?:)/g, '(?:');
      const re = new RegExp(`^(.+?)\\s+(?:${innerNc})\\s+(.+)$`, 'i');
      const mm = s.match(re);
      if (mm) return { condition: mm[2], tail: mm[1] };
    }
  }

  // Heuristic fallback: remove leading marker (any language) and split by action verbs
  const anyMarker = /^\s*(?:gdy|kiedy|jeśli|jesli|when|if|cuando|si|wenn|falls|quand|se|quando)\b\s+/i;
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
  let actions = extractActionsFromTail(tail, lang);
  if (actions.length === 0) actions = splitActionsTail(tail, lang);
  // If we accidentally captured only bare verbs, attempt to recover full tail from original text
  if (actions.length === 1) {
    const loneVerb = /^(wyślij|wyslij|powiadom|zaktualizuj|dodaj|wystaw|uruchom|prześlij|przeslij|send|notify|create|update|add|run|dispatch|email)$/i;
    if (loneVerb.test(actions[0])){
      const recoveredTail = recoverTailFromOriginal(text, condition);
      if (recoveredTail && recoveredTail.length > actions[0].length){
        let retry = extractActionsFromTail(recoveredTail, lang);
        if (retry.length === 0) retry = splitActionsTail(recoveredTail, lang);
        if (retry.length >= 1) actions = retry;
      }
    }
  }
  const numericConditions = extractNumericConditions(condition + ' ' + tail, lang);

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
    conditions: numericConditions,
    step: { id: stepId, name: result.condition, module: stepModule, actions: stepActions }
  };
}

export async function normalizeWithLLM(text, opts = {}) {
  // Simple in-memory cache to avoid repeated LLM calls
  const cache = normalizeWithLLM._cache || (normalizeWithLLM._cache = new Map());
  const key = JSON.stringify({ text, opts });
  if (cache.has(key)) return cache.get(key);

  // Provider selection
  const env = (typeof process !== 'undefined' && process?.env) ? process.env : {};
  const provider = (opts.provider || env.LLM_PROVIDER || 'ollama').toLowerCase();
  const result = await callLLMProvider(provider, text, opts, env);
  cache.set(key, result);
  if (cache.size > 100) { // rudimentary LRU-like trim
    const firstKey = cache.keys().next().value; cache.delete(firstKey);
  }
  return result;
}

export default { normalizeToWorkflow, normalizeWithLLM };

// ====== Helpers ======

function extractActionsFromTail(tail, lang){
  if (!tail || typeof tail !== 'string') return [];
  const verbsGroup = '(wyślij|wyslij|powiadom|zaktualizuj|dodaj|wystaw|uruchom|prześlij|przeslij|wykonaj|oznacz|zapisz|przekaż|przekaz|send|notify|create|update|add|run|dispatch|email)';
  const conjGroup = '(?:i|oraz|a także|następnie|then|and)';

  const parts = tail
    .split(new RegExp(`\\s+${conjGroup}\\s+`, 'i'))
    .map(s => s.trim())
    .filter(Boolean);

  const ensureVerbFirst = new RegExp('^' + verbsGroup + '\\b', 'i');
  const findVerbAnywhere = new RegExp(verbsGroup, 'i');
  const collapseDupVerb = new RegExp('^' + verbsGroup + '\\s+' + verbsGroup + '\\b', 'i');

  const actions = [];
  for (let p of parts){
    if (!ensureVerbFirst.test(p)){
      const mv = p.match(findVerbAnywhere);
      if (mv && typeof mv.index === 'number'){
        const rest = p.slice(mv.index + mv[0].length).trim();
        p = `${mv[0]} ${rest}`.trim();
      }
    }
    // collapse duplicated leading verb e.g. "wyslij wyslij fakturę" -> "wyslij fakturę"
    p = p.replace(collapseDupVerb, '$1');
    if (p) actions.push(p);
  }
  return actions;
}

function extractNumericConditions(text, lang){
  const s = normalizeWhitespace(text.toLowerCase());
  const out = [];
  const patterns = [
    // less-than / below
    { op: '<', re: /(poniżej|ponizej|mniej\s+niż|<)\s*(\d+[\,\.]?\d*)\s*(szt\.?|sztuki|sztuk|%|pcs|items)?/i },
    // greater-than / above
    { op: '>', re: /(powyżej|powyzej|więcej\s+niż|wiecej\s+niż|wiecej\s+niz|>)\s*(\d+[\,\.]?\d*)\s*(szt\.?|sztuki|sztuk|%|pcs|items)?/i },
    // equals
    { op: '==', re: /(równo|rowno|dokładnie|dokladnie|=)\s*(\d+[\,\.]?\d*)\s*(szt\.?|sztuki|sztuk|%|pcs|items)?/i }
  ];
  let field = null;
  if (/stan\s+magazynowy|zapas|inventory|stock/i.test(s)) field = 'stock';
  for (const p of patterns){
    const m = s.match(p.re);
    if (m){
      out.push({ field: field || 'value', operator: p.op, value: parseFloat(String(m[2]).replace(',', '.')), unit: m[3] || null });
    }
  }
  return out;
}

async function callLLMProvider(provider, text, opts, env){
  const schemaHint = '{"condition":"...","actions":["..."],"language":"pl|en|...","numeric_conditions":[{"field":"stock|value|...","operator":"<|>|==","value":number,"unit":"szt|%|items|null"}] }';
  const system = `You are a multilingual workflow normalizer. Given a user sentence, extract a clear CONDITION (what must be true) and a list of ACTIONS to perform. If needed, fix grammar. Respond ONLY as strict JSON matching this schema: ${schemaHint}. Do not add any extra text.`;
  const user = `Sentence: ${text}`;

  try{
    if (provider === 'openai' || provider === 'openrouter' || provider === 'azure'){ // OpenAI-compatible
      const baseUrl = opts.baseUrl || env.OPENAI_BASE_URL || env.AZURE_OPENAI_ENDPOINT || 'https://api.openai.com/v1';
      const apiKey = opts.apiKey || env.OPENAI_API_KEY || env.AZURE_OPENAI_API_KEY || env.OPENROUTER_API_KEY;
      const model = opts.model || env.OPENAI_MODEL || 'gpt-4o-mini';
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      const body = {
        model,
        messages: [ { role:'system', content: system }, { role:'user', content: user } ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      };
      const resp = await fetch(`${baseUrl}/chat/completions`, { method:'POST', headers, body: JSON.stringify(body) });
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const parsed = safeParseJSON(content);
      return buildLLMResult(parsed);
    }

    // Default: Ollama
    const baseUrl = opts.ollamaUrl || env.LLM_OLLAMA_URL || 'http://localhost:11434';
    const model = opts.model || env.LLM_MODEL || 'mistral';
    const prompt = `${system}\n${user}\nReturn only JSON.`;
    const oBody = { model, prompt, stream: false };
    // Some ollama builds support "format":"json"
    if (env.LLM_OLLAMA_FORMAT_JSON === '1') oBody.format = 'json';
    const resp = await fetch(`${baseUrl}/api/generate`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(oBody) });
    const data = await resp.json();
    const raw = data?.response || '';
    const jsonText = extractJson(raw);
    const parsed = safeParseJSON(jsonText);
    return buildLLMResult(parsed);
  }catch(e){
    return { ok:false, error: e.message };
  }
}

function extractJson(text){
  if (!text) return '{}';
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1];
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function safeParseJSON(s){
  try{ return JSON.parse(s); }catch{ return {}; }
}

function buildLLMResult(parsed){
  if (!parsed || !parsed.condition){ return { ok:false, error:'invalid_llm_json' }; }
  const cond = normalizeWhitespace(parsed.condition);
  const acts = Array.isArray(parsed.actions) ? parsed.actions.map(a=>normalizeWhitespace(String(a||''))).filter(Boolean) : [];
  // If actions came as a single string separated by commas, split
  const normActs = acts.length ? acts : splitActionsTail(String(parsed.actions||''), parsed.language||'und');
  const stepId = sanitizer.sanitizeId(cond);
  const stepModule = mapper.getModuleForKeywords(cond + ' ' + normActs.join(' '));
  const stepActions = normActs.map((a,i)=>({ id: sanitizer.sanitizeId(`${stepId}_action_${i+1}`), name:a, module: mapper.getModuleForKeywords(a) }));
  return { ok:true, llm:true, normalized:{ condition:cond, actions:normActs }, conditions: parsed.numeric_conditions||[], step:{ id: stepId, name: cond, module: stepModule, actions: stepActions } };
}

// Attempt to reconstruct the tail by locating the condition in the original text
function recoverTailFromOriginal(original, condition){
  const norm = (s)=> String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/\s+/g,' ')
    .trim();
  const o = norm(original);
  const c = norm(condition);
  const idx = o.indexOf(c);
  if (idx < 0) return '';
  const after = o.slice(idx + c.length).trim();
  // Remove leading separators or connectors like ",", ":", "-", or Polish "to", "wtedy"
  const cleaned = after.replace(/^(?:,|:|-|\s*(?:to|wtedy))\s+/i, '');
  return cleaned;
}
