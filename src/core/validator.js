// Core: Workflow validator
// Provides reusable validation for workflow structures

/**
 * Validate workflow structure
 * @param {object} workflow - Workflow object to validate
 * @returns {Array<string>} - List of validation error messages
 */
export function validateWorkflow(workflow) {
  const errors = [];

  if (!workflow) {
    errors.push('Workflow cannot be null');
    return errors;
  }

  if (!workflow.steps || !Array.isArray(workflow.steps)) {
    errors.push('Workflow must contain steps array');
    return errors;
  }

  workflow.steps.forEach((step, index) => {
    if (!step.id) {
      errors.push(`Step ${index}: missing ID`);
    }
    if (!step.name) {
      errors.push(`Step ${index}: missing name`);
    }
    if (!step.actions || !Array.isArray(step.actions)) {
      errors.push(`Step ${index}: missing actions array`);
    } else {
      step.actions.forEach((action, actionIndex) => {
        if (!action.id) {
          errors.push(`Step ${index}, Action ${actionIndex}: missing ID`);
        }
        if (!action.name) {
          errors.push(`Step ${index}, Action ${actionIndex}: missing name`);
        }
      });
    }
  });

  return errors;
}

// Detect duplicate workflows by id; accepts array of workflow payloads
export function findDuplicateWorkflows(workflows = []){
  const map = new Map();
  const dups = [];
  workflows.forEach(w => {
    const id = w && (w.id || w.workflowId) || '';
    if (!id) return;
    const entry = map.get(id) || { count: 0, names: new Set(), modules: new Set() };
    entry.count += 1;
    if (w.name) entry.names.add(w.name);
    if (w.module) entry.modules.add(w.module);
    map.set(id, entry);
  });
  for (const [id, info] of map.entries()){
    if (info.count > 1){
      dups.push({ id, count: info.count, names: Array.from(info.names), modules: Array.from(info.modules) });
    }
  }
  return { duplicates: dups, total: workflows.length, unique: map.size };
}

export default validateWorkflow;
