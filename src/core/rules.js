// Core: Rule parsing and evaluation utilities

/**
 * Parse human-readable condition into structured condition
 * Supported operators: >, <, =, !=, contains, !contains, >=, <=
 * Also supports Polish phrases: "większe niż", "mniejsze niż", "równe", "różne od", "zawiera", "nie zawiera"
 * @param {string} conditionText
 * @returns {{field:string, operator:string, value:string, raw:string}}
 */
export function parseCondition(conditionText) {
  const operators = [
    { key: ">=", regex: />=/ },
    { key: "<=", regex: /<=/ },
    { key: ">", regex: />/ },
    { key: "<", regex: /</ },
    { key: "=", regex: /=/ },
    { key: "!=", regex: /!=/ },
    { key: "contains", regex: /\b(?:contains|zawiera)\b/i },
    { key: "!contains", regex: /\b(?:!contains|nie\s+zawiera)\b/i },
  ];

  const polishMap = [
    { from: /większe\s+niż/i, to: ">" },
    { from: /mniejsze\s+niż/i, to: "<" },
    { from: /równe/i, to: "=" },
    { from: /różne\s+od/i, to: "!=" },
  ];

  let raw = (conditionText || '').trim();
  if (!raw) return { field: '', operator: '=', value: '', raw: '' };

  // Normalize Polish phrases to symbolic operators
  polishMap.forEach(({ from, to }) => { raw = raw.replace(from, to); });

  for (const op of operators) {
    if (op.regex.test(raw)) {
      const parts = raw.split(op.regex);
      const field = (parts[0] || '').trim();
      const value = (parts[1] || '').trim();
      return { field, operator: op.key, value, raw: conditionText };
    }
  }

  // Default fallback
  return { field: raw, operator: '=', value: '', raw: conditionText };
}

/**
 * Evaluate a single condition against context object
 * @param {{field:string, operator:string, value:string}} condition
 * @param {object} context
 * @returns {boolean}
 */
export function evaluateCondition(condition, context = {}) {
  const { field, operator, value } = condition || {};
  const fieldValue = getFieldValue(field, context);

  // Try to coerce numbers
  const nField = parseFloat(fieldValue);
  const nValue = parseFloat(value);
  const isNumberComparison = !isNaN(nField) && !isNaN(nValue);

  switch (operator) {
    case '>': return isNumberComparison ? nField > nValue : String(fieldValue) > String(value);
    case '<': return isNumberComparison ? nField < nValue : String(fieldValue) < String(value);
    case '>=': return isNumberComparison ? nField >= nValue : String(fieldValue) >= String(value);
    case '<=': return isNumberComparison ? nField <= nValue : String(fieldValue) <= String(value);
    case '=': return String(fieldValue) === String(value);
    case '!=': return String(fieldValue) !== String(value);
    case 'contains': return String(fieldValue).includes(String(value));
    case '!contains': return !String(fieldValue).includes(String(value));
    default: return false;
  }
}

/**
 * Evaluate a ruleset
 * @param {{all?:Array, any?:Array}} rules
 * @param {object} context
 * @returns {{passed:boolean, details:Array}}
 */
export function evaluateRuleSet(rules, context = {}) {
  const details = [];
  let passedAll = true;
  let passedAny = false;

  if (Array.isArray(rules?.all) && rules.all.length) {
    for (const raw of rules.all) {
      const cond = typeof raw === 'string' ? parseCondition(raw) : raw;
      const res = evaluateCondition(cond, context);
      details.push({ cond, result: res, mode: 'all' });
      if (!res) passedAll = false;
    }
  }

  if (Array.isArray(rules?.any) && rules.any.length) {
    for (const raw of rules.any) {
      const cond = typeof raw === 'string' ? parseCondition(raw) : raw;
      const res = evaluateCondition(cond, context);
      details.push({ cond, result: res, mode: 'any' });
      if (res) passedAny = true;
    }
  } else {
    // If no ANY provided, default to true
    passedAny = true;
  }

  return { passed: passedAll && passedAny, details };
}

function getFieldValue(path, context){
  if (!path) return undefined;
  const parts = String(path).split('.');
  let val = context;
  for (const p of parts) {
    if (val && Object.prototype.hasOwnProperty.call(val, p)) {
      val = val[p];
    } else {
      return undefined;
    }
  }
  return val;
}

export default { parseCondition, evaluateCondition, evaluateRuleSet };
