// Core: Workflow serializer (JSON/YAML) with basic versioning/migrations
// Supports export/import of workflow payloads: {id,name,module,actions[]}
import yaml from 'js-yaml';

const VERSION = '1.0.0';

export function exportWorkflowToJSON(workflow) {
  return JSON.stringify({ version: VERSION, workflow }, null, 2);
}

export function exportWorkflowToYAML(workflow) {
  const data = { version: VERSION, workflow };
  return yaml.dump(data);
}

export function importWorkflowFromJSON(jsonText) {
  const data = JSON.parse(jsonText);
  const migrated = migrateWorkflow(data);
  return migrated.workflow;
}

export function importWorkflowFromYAML(yamlText) {
  const data = yaml.load(yamlText);
  const migrated = migrateWorkflow(data);
  return migrated.workflow;
}

// Basic migration pipeline
export function migrateWorkflow(data) {
  if (!data) throw new Error('No data');
  const version = data.version || '1.0.0';
  let workflow = data.workflow || data;

  // Example migrations (no-op for now)
  // if (version === '0.9.0') { workflow = migrateFrom_0_9_0(workflow); }

  return { version: VERSION, workflow };
}

export default {
  VERSION,
  exportWorkflowToJSON,
  exportWorkflowToYAML,
  importWorkflowFromJSON,
  importWorkflowFromYAML,
  migrateWorkflow
};
