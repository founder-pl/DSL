// Core: Suggestions for modules and structure based on text and context
import { ModuleMapper } from './module-mapper.js';
import { TextSanitizer } from './sanitizer.js';
import { parseSentence } from './nlp.js';

export function suggestModulesForText(text, mapper = new ModuleMapper()) {
  return mapper.getModulesWithConfidence(text).map(r => ({ module: r.module, confidence: r.confidence }));
}

export function analyzeSentenceAndSuggest(sentence, mapper = new ModuleMapper(), sanitizer = new TextSanitizer()) {
  const suggestions = { step: null, actions: [] };
  try {
    const parsed = parseSentence(sentence);
    const stepModule = mapper.getModuleForKeywords(parsed.condition + ' ' + parsed.actions.join(' '));
    const stepId = sanitizer.sanitizeId(parsed.condition);
    suggestions.step = { id: stepId, name: parsed.condition, module: stepModule };
    parsed.actions.forEach(a => {
      suggestions.actions.push({ name: a, module: mapper.getModuleForKeywords(a) });
    });
  } catch (e) {
    suggestions.error = e.message;
  }
  return suggestions;
}

export default { suggestModulesForText, analyzeSentenceAndSuggest };
