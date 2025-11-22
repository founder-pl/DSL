// Core: Mermaid diagram generation
// Exports a reusable function to generate Mermaid code from a workflow structure

import { TextSanitizer } from './sanitizer.js';

/**
 * Generate Mermaid flowchart for a given workflow
 * @param {object} workflow - Workflow object with steps
 * @param {TextSanitizer} sanitizerInstance - Optional sanitizer instance
 * @returns {string} Mermaid code
 */
export function generateMermaid(workflow, sanitizerInstance) {
  const sanitizer = sanitizerInstance || new TextSanitizer();

  if (!workflow || !Array.isArray(workflow.steps)) {
    return 'flowchart TD\n    Error["Invalid workflow"]';
  }

  let code = 'flowchart TD\n';
  const modules = {};

  workflow.steps.forEach(step => {
    const mod = step.module || 'Default';
    if (!modules[mod]) modules[mod] = [];
    modules[mod].push(step);
  });

  Object.keys(modules).forEach(mod => {
    code += `    subgraph ${sanitizer.sanitizeId(mod)}[${mod}]\n`;
    modules[mod].forEach(step => {
      const stepId = sanitizer.sanitizeId(step.id);
      code += `        ${stepId}["${step.name}"]:::action-node\n`;
      (step.actions || []).forEach(action => {
        const actionId = sanitizer.sanitizeId(action.id);
        code += `        ${actionId}["${action.name}"]:::action-node\n`;
        code += `        ${stepId} --> ${actionId}\n`;
      });
    });
    code += '    end\n';
  });

  code += 'classDef action-node fill:#f9f,stroke:#333,stroke-width:1px;\n';
  return code;
}

export default generateMermaid;
