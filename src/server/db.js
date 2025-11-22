// SQLite database layer for Founder.pl DSL
// Stores workflows, steps, actions, events, conditions, webhooks

import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'dsl.sqlite');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let dbInstance = null;

function hasValidSqliteHeader(filePath) {
  try {
    if (!fs.existsSync(filePath)) return true; // no file yet -> ok
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return true; // empty -> will be created
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    return buf.toString('utf8', 0, 16) === 'SQLite format 3\0';
  } catch (_) {
    return false;
  }
}

function backupCorrupt(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const backup = filePath + '.corrupt.' + Date.now();
      fs.copyFileSync(filePath, backup);
      fs.unlinkSync(filePath);
    }
  } catch (_) {}
}

export function getDB() {
  if (dbInstance) return dbInstance;
  // Validate header before opening
  if (!hasValidSqliteHeader(DB_PATH)) {
    backupCorrupt(DB_PATH);
  }
  dbInstance = new sqlite3.Database(DB_PATH);
  return dbInstance;
}

export function getDBPath() { return DB_PATH; }

export function initSchema() {
  const db = getDB();
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS workflows(
      id TEXT PRIMARY KEY,
      name TEXT,
      module TEXT,
      created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS steps(
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      name TEXT,
      module TEXT,
      order_index INTEGER,
      FOREIGN KEY(workflow_id) REFERENCES workflows(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS actions(
      id TEXT PRIMARY KEY,
      step_id TEXT,
      name TEXT,
      module TEXT,
      order_index INTEGER,
      FOREIGN KEY(step_id) REFERENCES steps(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS events(
      id TEXT PRIMARY KEY,
      type TEXT,
      action_name TEXT,
      payload TEXT,
      timestamp TEXT,
      metadata TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS conditions(
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      step_id TEXT,
      field TEXT,
      operator TEXT,
      value TEXT,
      raw TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS webhooks(
      id TEXT PRIMARY KEY,
      url TEXT,
      events TEXT,
      config TEXT,
      status TEXT,
      created_at TEXT,
      last_triggered TEXT,
      trigger_count INTEGER
    )`);
  });
}

export function saveWorkflow(workflow) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `INSERT OR REPLACE INTO workflows(id, name, module, created_at) VALUES(?,?,?,?)`,
        [workflow.id, workflow.name, workflow.module, new Date().toISOString()]
      );
      (workflow.actions || []).forEach((action, idx) => {
        // Create synthetic step and action rows if not present
        const stepId = workflow.id; // single-step per workflow from NLP
        db.run(
          `INSERT OR REPLACE INTO steps(id, workflow_id, name, module, order_index) VALUES(?,?,?,?,?)`,
          [stepId, workflow.id, workflow.name, workflow.module, 0]
        );
        db.run(
          `INSERT OR REPLACE INTO actions(id, step_id, name, module, order_index) VALUES(?,?,?,?,?)`,
          [action.id, stepId, action.name, action.module || 'Default', idx]
        );
      });
      resolve(true);
    });
  });
}

export function saveEvent(event) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO events(id, type, action_name, payload, timestamp, metadata) VALUES(?,?,?,?,?,?)`,
      [
        event.id,
        event.type || 'ActionExecuted',
        event.payload?.actionName || event.actionName || null,
        JSON.stringify(event.payload || {}),
        event.metadata?.timestamp || event.timestamp || new Date().toISOString(),
        JSON.stringify(event.metadata || {})
      ],
      (err) => (err ? reject(err) : resolve(true))
    );
  });
}

export function saveWebhook(webhook) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO webhooks(id, url, events, config, status, created_at, last_triggered, trigger_count)
       VALUES(?,?,?,?,?,?,?,?)`,
      [
        webhook.id,
        webhook.url,
        JSON.stringify(webhook.events || []),
        JSON.stringify(webhook.config || {}),
        webhook.status || 'active',
        webhook.createdAt || new Date().toISOString(),
        webhook.lastTriggered || null,
        webhook.triggerCount || 0
      ],
      (err) => (err ? reject(err) : resolve(true))
    );
  });
}

export function exportDatabase() {
  return fs.readFileSync(DB_PATH);
}

export function importDatabase(buffer) {
  // Validate header of incoming buffer
  const header = buffer.subarray(0, 16).toString('utf8');
  if (header !== 'SQLite format 3\0') {
    throw new Error('Uploaded file is not a valid SQLite database');
  }
  // Backup current DB
  if (fs.existsSync(DB_PATH)) {
    const backup = DB_PATH + '.' + Date.now() + '.bak';
    fs.copyFileSync(DB_PATH, backup);
  }
  fs.writeFileSync(DB_PATH, buffer);
  // Validate by opening
  try {
    const test = new sqlite3.Database(DB_PATH);
    // simple pragma
    test.get('PRAGMA user_version;', (err) => { /* ignore */ });
    test.close();
  } catch (e) {
    backupCorrupt(DB_PATH);
    throw e;
  }
  // Reset singleton to ensure new handle uses new file
  dbInstance = null;
  return true;
}

export function saveCondition(condition) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const id = condition.id || `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    db.run(
      `INSERT OR REPLACE INTO conditions(id, workflow_id, step_id, field, operator, value, raw)
       VALUES(?,?,?,?,?,?,?)`,
      [
        id,
        condition.workflowId || null,
        condition.stepId || null,
        condition.field || '',
        condition.operator || '=',
        condition.value || '',
        condition.raw || ''
      ],
      (err) => (err ? reject(err) : resolve({ ...condition, id }))
    );
  });
}

export async function saveConditions(conditions = []) {
  const results = [];
  for (const c of conditions) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await saveCondition(c));
  }
  return results;
}
