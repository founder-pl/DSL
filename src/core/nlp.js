// Core: NLP helpers for parsing natural language instructions
// Provides reusable parsing utilities for sentences like:
// "Gdy [warunek], [akcja 1] i [akcja 2] oraz [akcja 3]."

import { TextSanitizer } from './sanitizer.js';
import { ModuleMapper } from './module-mapper.js';

/**
 * Parse a Polish sentence into condition and actions
 * @param {string} sentence - Input sentence, e.g. "Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię"
 * @returns {{condition: string, actions: string[]}} Parsed structure
 * @throws {Error} when sentence format is invalid
 */
export function parseSentence(sentence) {
  if (typeof sentence !== 'string' || sentence.trim().length === 0) {
    throw new Error('Sentence must be a non-empty string');
  }
  const match = sentence.match(/Gdy\s+(.+?),\s+(.+)/i);
  if (!match) {
    throw new Error('Invalid sentence format. Expected: "Gdy [warunek], [akcje]"');
  }
  const condition = match[1].trim();
  const actionsText = match[2]
    .split(/\s+(?:i|oraz|a także|następnie)\s+/i)
    .map(a => a.trim().replace(/\.$/, ''))
    .filter(a => a.length > 0);
  return { condition, actions: actionsText };
}

/**
 * Build a workflow step object from parsed NLP
 * @param {string} condition - Condition text
 * @param {string[]} actions - Actions array
 * @param {TextSanitizer} [sanitizer] - Optional sanitizer instance
 * @param {ModuleMapper} [mapper] - Optional module mapper instance
 * @returns {{id:string,name:string,module:string,actions:Array}} Step object
 */
export function buildStep(condition, actions, sanitizer = new TextSanitizer(), mapper = new ModuleMapper()) {
  const stepId = sanitizer.sanitizeId(condition);
  const stepModule = mapper.getModuleForKeywords(condition + ' ' + actions.join(' '));
  const stepActions = actions.map((a, i) => ({
    id: sanitizer.sanitizeId(`${stepId}_action_${i + 1}`),
    name: a,
    module: mapper.getModuleForKeywords(a)
  }));
  return {
    id: stepId,
    name: condition,
    module: stepModule,
    actions: stepActions
  };
}

export default { parseSentence, buildStep };
