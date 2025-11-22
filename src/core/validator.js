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

export default validateWorkflow;
