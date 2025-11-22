// Node.js server for Founder.pl DSL
// Provides REST API for workflow management and testing

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WorkflowEngine } from '../core/workflow-engine.js';
import { TextSanitizer } from '../core/sanitizer.js';
import { ModuleMapper } from '../core/module-mapper.js';
import { generateMermaid } from '../core/diagram.js';
import { parseMultipleSentences } from '../core/nlp.js';
import { exportWorkflowToJSON, exportWorkflowToYAML, importWorkflowFromJSON, importWorkflowFromYAML } from '../core/serializer.js';
import { projectOverview, projectTimeline, projectWorkflowStatuses } from '../core/projections.js';
import { suggestModulesForText, analyzeSentenceAndSuggest } from '../core/suggestions.js';
import { HistoryManager } from '../core/history.js';
import { initSchema, saveWorkflow, saveEvent, saveWebhook, exportDatabase, importDatabase, getDBPath } from './db.js';
import fs from 'fs';
import { spawn } from 'child_process';
import { findDuplicateWorkflows } from '../core/validator.js';
import { generateJSFromDSL, buildScaffolds, toWorkflows } from '../core/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

class DSLServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.engine = new WorkflowEngine();
        this.sanitizer = new TextSanitizer();
        this.mapper = new ModuleMapper();
        
        this.setupMiddleware();
        initSchema();
        this.history = new HistoryManager();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                    styleSrcAttr: ["'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                    scriptSrcAttr: ["'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));
        
        // CORS configuration
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? false : true,
            credentials: true
        }));
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Static files
        this.app.use(express.static(projectRoot));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: process.uptime()
            });
        });
        
        // Workflow management routes
        this.setupWorkflowRoutes();
        
        // Utility routes
        this.setupUtilityRoutes();
        // Processes & scaffolds routes
        this.setupProcessesRoutes();
        // Mock endpoints used by generated scripts
        this.setupMockRoutes();
        // Exec generated scripts
        this.setupExecRoutes();
        
        // Testing routes
        this.setupTestingRoutes();
        
        // Frontend routes
        this.setupFrontendRoutes();
    }
    
    setupWorkflowRoutes() {
        const router = express.Router();
        
        // Create workflow from NLP
        router.post('/nlp', async (req, res) => {
            try {
                const { sentence } = req.body;
                
                if (!sentence || typeof sentence !== 'string') {
                    return res.status(400).json({
                        error: 'Invalid sentence provided',
                        message: 'Sentence must be a non-empty string'
                    });
                }
                
                const result = await this.engine.createWorkflowFromNLP(sentence);
                // persist last workflow event
                const workflowEvent = this.engine.getEventsByType('WorkflowCreated').slice(-1)[0];
                if (workflowEvent?.payload) {
                    await saveWorkflow(workflowEvent.payload);
                }
                // snapshot history
                this.history.snapshot(this.engine.exportState());
                res.json({
                    success: true,
                    result,
                    workflow: workflowEvent
                });
            } catch (error) {
                res.status(400).json({
                    error: 'Failed to create workflow',
                    message: error.message
                });
            }
        });
        
        // Create workflows from multiple sentences (extract and process)
        router.post('/nlp/batch', async (req, res) => {
            try {
                const { text, sentences } = req.body || {};
                const list = Array.isArray(sentences) && sentences.length ? sentences : parseMultipleSentences(String(text || ''));
                if (!Array.isArray(list) || list.length === 0) {
                    return res.status(400).json({ error: 'No valid sentences provided' });
                }
                const results = [];
                for (const s of list) {
                    try {
                        const r = await this.engine.createWorkflowFromNLP(s);
                        const wfEvent = this.engine.getEventsByType('WorkflowCreated').slice(-1)[0];
                        if (wfEvent?.payload) await saveWorkflow(wfEvent.payload);
                        // Generate diagram for a single-step workflow
                        const diagram = generateMermaid({ steps: [{
                            id: wfEvent.payload.id,
                            name: wfEvent.payload.name,
                            module: wfEvent.payload.module,
                            actions: wfEvent.payload.actions
                        }]});
                        results.push({ sentence: s, success: true, diagram, workflow: wfEvent.payload });
                    } catch (e) {
                        results.push({ sentence: s, success: false, error: e.message });
                    }
                }
                // snapshot history
                this.history.snapshot(this.engine.exportState());
                res.json({ processed: results.length, results });
            } catch (error) {
                res.status(400).json({ error: 'Batch NLP failed', message: error.message });
            }
        });
        
        // Execute action
        router.post('/action', async (req, res) => {
            try {
                const { actionName, context = {} } = req.body;
                
                if (!actionName || typeof actionName !== 'string') {
                    return res.status(400).json({
                        error: 'Invalid action name provided'
                    });
                }
                
                const result = await this.engine.executeAction(actionName, context);
                // persist last action event
                const actEvent = this.engine.getEventsByType('ActionExecuted').slice(-1)[0];
                if (actEvent) await saveEvent(actEvent);
                // snapshot history
                this.history.snapshot(this.engine.exportState());
                res.json({
                    success: true,
                    result,
                    statistics: this.engine.getStatistics()
                });
            } catch (error) {
                res.status(400).json({
                    error: 'Failed to execute action',
                    message: error.message
                });
            }
        });
        
        // Get workflows
        router.get('/workflows', (req, res) => {
            const workflows = this.engine.getEventsByType('WorkflowCreated');
            res.json({
                workflows: workflows.map(event => event.payload),
                count: workflows.length
            });
        });

        // Find duplicate workflows by id
        router.get('/duplicates', (req, res) => {
            const workflows = this.engine.getEventsByType('WorkflowCreated').map(e => e.payload);
            const result = findDuplicateWorkflows(workflows);
            res.json(result);
        });
        
        // Get events
        router.get('/events', (req, res) => {
            const { type, limit = 100 } = req.query;
            
            let events = type ? 
                this.engine.getEventsByType(type) : 
                this.engine.eventStore;
            
            // Apply limit
            if (limit && !isNaN(limit)) {
                events = events.slice(-parseInt(limit));
            }
            
            res.json({
                events,
                count: events.length,
                totalEvents: this.engine.eventStore.length
            });
        });
        
        // Get read model
        router.get('/readmodel', (req, res) => {
            const readModel = this.engine.getReadModel();
            res.json({
                readModel,
                count: readModel.length
            });
        });
        
        // Get statistics
        router.get('/statistics', (req, res) => {
            const stats = this.engine.getStatistics();
            res.json(stats);
        });
        
        // Validate workflow
        router.post('/validate', (req, res) => {
            try {
                const { workflow } = req.body;
                const validation = this.engine.validateWorkflow(workflow);
                
                res.json({
                    isValid: validation.isValid,
                    errors: validation.errors,
                    workflow
                });
            } catch (error) {
                res.status(400).json({
                    error: 'Validation failed',
                    message: error.message
                });
            }
        });
        
        // Persist conditions
        router.post('/conditions', async (req, res) => {
            try {
                const { conditions = [] } = req.body || {};
                if (!Array.isArray(conditions)) return res.status(400).json({ error: 'conditions must be an array' });
                const { saveConditions } = await import('./db.js');
                const saved = await saveConditions(conditions);
                res.json({ success: true, count: saved.length, saved });
            } catch (e) {
                res.status(400).json({ error: 'Save conditions failed', message: e.message });
            }
        });

        // Clear data (for testing)
        router.delete('/clear', (req, res) => {
            this.engine.clear();
            res.json({
                success: true,
                message: 'All data cleared'
            });
        });
        
        this.app.use('/api/workflow', router);
    }
    
    setupUtilityRoutes() {
        const router = express.Router();
        
        // Text sanitization
        router.post('/sanitize', (req, res) => {
            try {
                const { text, method = 'id' } = req.body;
                
                if (!text || typeof text !== 'string') {
                    return res.status(400).json({
                        error: 'Invalid text provided'
                    });
                }
                
                let result;
                switch (method) {
                    case 'id':
                        result = this.sanitizer.sanitizeId(text);
                        break;
                    case 'slug':
                        result = this.sanitizer.sanitizeSlug(text);
                        break;
                    case 'display':
                        result = this.sanitizer.sanitizeDisplay(text);
                        break;
                    case 'email':
                        result = this.sanitizer.sanitizeEmail(text);
                        break;
                    default:
                        return res.status(400).json({
                            error: 'Invalid sanitization method',
                            validMethods: ['id', 'slug', 'display', 'email']
                        });
                }
                
                res.json({
                    original: text,
                    sanitized: result,
                    method
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Sanitization failed',
                    message: error.message
                });
            }
        });
        
        // Module mapping
        router.post('/module', (req, res) => {
            try {
                const { text } = req.body;
                
                if (!text || typeof text !== 'string') {
                    return res.status(400).json({
                        error: 'Invalid text provided'
                    });
                }
                
                const module = this.mapper.getModuleForKeywords(text);
                const modulesWithConfidence = this.mapper.getModulesWithConfidence(text);
                
                res.json({
                    text,
                    primaryModule: module,
                    allModules: modulesWithConfidence,
                    availableModules: this.mapper.getAllModules()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Module mapping failed',
                    message: error.message
                });
            }
        });
        
        // Batch processing
        router.post('/batch', async (req, res) => {
            try {
                const { sentences } = req.body;
                
                if (!Array.isArray(sentences)) {
                    return res.status(400).json({
                        error: 'Sentences must be an array'
                    });
                }
                
                const results = [];
                for (const sentence of sentences) {
                    try {
                        const result = await this.engine.createWorkflowFromNLP(sentence);
                        results.push({
                            sentence,
                            success: true,
                            result
                        });
                    } catch (error) {
                        results.push({
                            sentence,
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                res.json({
                    results,
                    processed: results.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Batch processing failed',
                    message: error.message
                });
            }
        });
        
        this.app.use('/api/utils', router);

        // Serializer routes
        const serRouter = express.Router();
        serRouter.get('/export', (req, res) => {
            const { format = 'json', dedupe = 'false' } = req.query;
            let workflows = this.engine.getEventsByType('WorkflowCreated').map(e => e.payload);
            if (String(dedupe).toLowerCase() === 'true' || dedupe === '1'){
                const map = new Map();
                for (const wf of workflows){ if (!map.has(wf.id)) map.set(wf.id, wf); }
                workflows = Array.from(map.values());
            }
            try {
                if (String(format).toLowerCase() === 'yaml') {
                    const y = exportWorkflowToYAML({ workflows });
                    res.setHeader('Content-Type', 'text/yaml');
                    return res.send(y);
                }
                const j = exportWorkflowToJSON({ workflows });
                res.setHeader('Content-Type', 'application/json');
                return res.send(j);
            } catch (e) {
                return res.status(400).json({ error: 'Export failed', message: e.message });
            }
        });
        serRouter.post('/import', async (req, res) => {
            const { format = 'json', data } = req.body || {};
            if (!data) return res.status(400).json({ error: 'Missing data' });
            try {
                let obj;
                if (String(format).toLowerCase() === 'yaml') obj = importWorkflowFromYAML(String(data));
                else obj = importWorkflowFromJSON(String(data));
                const workflows = Array.isArray(obj.workflows) ? obj.workflows : (Array.isArray(obj) ? obj : [obj]);
                for (const wf of workflows) {
                    await saveWorkflow(wf);
                }
                // snapshot history
                this.history.snapshot(this.engine.exportState());
                res.json({ success: true, count: workflows.length });
            } catch (e) {
                res.status(400).json({ error: 'Import failed', message: e.message });
            }
        });
        this.app.use('/api/serializer', serRouter);

        // Code generator routes
        const genRouter = express.Router();
        genRouter.post('/js', (req, res) => {
            try{
                const { yaml: yamlText, json: jsonText } = req.body || {};
                let input;
                if (yamlText) input = String(yamlText);
                else if (jsonText) input = String(jsonText);
                else {
                    const workflows = this.engine.getEventsByType('WorkflowCreated').map(e => e.payload);
                    input = { workflows };
                }
                const code = generateJSFromDSL(input);
                res.setHeader('Content-Type', 'application/javascript');
                return res.send(code);
            }catch(e){
                return res.status(400).json({ error: 'Generation failed', message: e.message });
            }
        });
        this.app.use('/api/generator', genRouter);

        // Projections routes
        const projRouter = express.Router();
        projRouter.get('/overview', (req, res) => {
            res.json(projectOverview(this.engine.eventStore, this.engine.getReadModel()));
        });
        projRouter.get('/timeline', (req, res) => {
            res.json(projectTimeline(this.engine.eventStore));
        });
        projRouter.get('/workflows', (req, res) => {
            res.json(projectWorkflowStatuses(this.engine.getReadModel()));
        });
        this.app.use('/api/projections', projRouter);

        // Suggestions routes
        const sugRouter = express.Router();
        sugRouter.post('/modules', (req, res) => {
            const { text } = req.body || {};
            if (!text) return res.status(400).json({ error: 'text required' });
            res.json({ suggestions: suggestModulesForText(text) });
        });
        sugRouter.post('/sentence', (req, res) => {
            const { sentence } = req.body || {};
            if (!sentence) return res.status(400).json({ error: 'sentence required' });
            res.json(analyzeSentenceAndSuggest(sentence));
        });
        this.app.use('/api/suggestions', sugRouter);

        // Database routes
        const dbRouter = express.Router();
        // Download DB
        dbRouter.get('/download', async (req, res) => {
            try {
                const buf = exportDatabase();
                res.setHeader('Content-Type', 'application/x-sqlite3');
                res.setHeader('Content-Disposition', 'attachment; filename="dsl.sqlite"');
                res.send(buf);
            } catch (e) {
                res.status(500).json({ error: 'DB download failed', message: e.message });
            }
        });
        // Upload DB (JSON {data: base64})
        dbRouter.post('/upload', async (req, res) => {
            try {
                const { data } = req.body || {};
                if (!data || typeof data !== 'string') return res.status(400).json({ error: 'Missing base64 data' });
                const buffer = Buffer.from(data, 'base64');
                importDatabase(buffer);
                res.json({ success: true });
            } catch (e) {
                res.status(400).json({ error: 'DB upload failed', message: e.message });
            }
        });
        // Validate DB
        dbRouter.get('/validate', async (req, res) => {
            try {
                const path = getDBPath();
                const exists = fs.existsSync(path);
                res.json({ exists, path });
            } catch (e) {
                res.status(500).json({ error: 'DB validate failed', message: e.message });
            }
        });
        this.app.use('/api/db', dbRouter);
    }
    
    setupTestingRoutes() {
        const router = express.Router();
        
        // Run backend tests
        router.post('/backend', async (req, res) => {
            try {
                // Import and run backend tests
                const { runBackendTests } = await import('../tests/test-runner.js');
                const results = await runBackendTests();
                
                res.json({
                    testType: 'backend',
                    results,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Backend tests failed',
                    message: error.message
                });
            }
        });
        
        // Run integration tests
        router.post('/integration', async (req, res) => {
            try {
                const { runIntegrationTests } = await import('../tests/test-runner.js');
                const results = await runIntegrationTests();
                
                res.json({
                    testType: 'integration',
                    results,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Integration tests failed',
                    message: error.message
                });
            }
        });
        
        // System validation
        router.get('/validate-system', (req, res) => {
            const validation = {
                sanitizer: {
                    available: !!this.sanitizer,
                    methods: ['sanitizeId', 'sanitizeSlug', 'sanitizeDisplay', 'sanitizeEmail']
                },
                mapper: {
                    available: !!this.mapper,
                    modules: this.mapper.getAllModules(),
                    totalKeywords: Object.keys(this.mapper.keywordToModule || {}).length
                },
                engine: {
                    available: !!this.engine,
                    eventStoreSize: this.engine.eventStore.length,
                    readModelSize: this.engine.readModel.length,
                    statistics: this.engine.getStatistics()
                }
            };
            
            const isHealthy = validation.sanitizer.available && 
                            validation.mapper.available && 
                            validation.engine.available;
            
            res.json({
                healthy: isHealthy,
                validation,
                timestamp: new Date().toISOString()
            });
        });
        
        this.app.use('/api/test', router);

        // History routes
        const histRouter = express.Router();
        histRouter.post('/snapshot', (req, res) => {
            const snap = this.history.snapshot(this.engine.exportState());
            res.json({ success: true, size: this.history.stack.length });
        });
        histRouter.post('/undo', (req, res) => {
            const prev = this.history.undo();
            if (!prev) return res.status(400).json({ error: 'Nothing to undo' });
            this.engine.importState(prev);
            res.json({ success: true });
        });
        histRouter.post('/redo', (req, res) => {
            const next = this.history.redo();
            if (!next) return res.status(400).json({ error: 'Nothing to redo' });
            this.engine.importState(next);
            res.json({ success: true });
        });
        histRouter.get('/current', (req, res) => {
            res.json({ state: this.history.current() });
        });
        this.app.use('/api/history', histRouter);
        
        // Webhooks route (persist)
        const webhooksRouter = express.Router();
        webhooksRouter.post('/', async (req, res) => {
            try {
                const { url, events = [], config = {}, status = 'active' } = req.body || {};
                if (!url) return res.status(400).json({ error: 'url required' });
                const webhook = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
                    url, events, config, status,
                    createdAt: new Date().toISOString(),
                    lastTriggered: null,
                    triggerCount: 0
                };
                await saveWebhook(webhook);
                res.json({ success: true, webhook });
            } catch (e) {
                res.status(400).json({ error: 'Save webhook failed', message: e.message });
            }
        });
        this.app.use('/api/webhooks', webhooksRouter);
    }

    // Parse procesy.txt, split by domain and optionally write files; generate YAML, diagrams, scaffolds
    setupProcessesRoutes(){
        const router = express.Router();

        const domainsMap = [
            { match: /Procesy\s+finansowe/i, key: 'Finanse' },
            { match: /^\s*2\./i, key: 'Marketing' },
            { match: /^\s*3\./i, key: 'CRM' },
            { match: /^\s*4\./i, key: 'Obsługa' },
            { match: /^\s*5\./i, key: 'Sprzedaż' },
            { match: /^\s*6\./i, key: 'HR' },
            { match: /^\s*7\./i, key: 'Administracja' },
            { match: /^\s*8\./i, key: 'Logistyka' },
            { match: /^\s*9\./i, key: 'IT' },
        ];

        const ensureDir = (p) => { try { fs.mkdirSync(p, { recursive: true }); } catch(_){} };
        const writeFile = (p, data) => fs.writeFileSync(p, data);
        const processesPath = join(projectRoot, 'procesy.txt');

        const splitDomains = (content) => {
            const lines = String(content||'').split(/\r?\n/);
            let current = 'Finanse';
            const buckets = new Map();
            const setCur = (k)=>{ current = k; if (!buckets.has(k)) buckets.set(k, []); };
            setCur(current);
            for (const raw of lines){
                const line = raw.trim();
                if (!line){ buckets.get(current).push(''); continue; }
                const found = domainsMap.find(d => d.match.test(line));
                if (found){ setCur(found.key); continue; }
                buckets.get(current).push(raw);
            }
            return buckets;
        };

        // Split procesy.txt by domain
        router.get('/split', (req, res) => {
            try{
                const { write = '1' } = req.query || {};
                if (!fs.existsSync(processesPath)) return res.status(404).json({ error:'procesy.txt not found' });
                const content = fs.readFileSync(processesPath, 'utf-8');
                const buckets = splitDomains(content);
                const outDir = join(projectRoot, 'generated', 'domains');
                if (String(write) !== '0'){ ensureDir(outDir); }
                const files = [];
                for (const [k, arr] of buckets.entries()){
                    if (String(write) !== '0'){
                        const file = join(outDir, `${k}.txt`);
                        writeFile(file, arr.join('\n'));
                        files.push(file);
                    }
                }
                res.json({ domains: Array.from(buckets.keys()), files });
            }catch(e){ res.status(400).json({ error: 'split failed', message: e.message }); }
        });

        // Generate DSL, diagrams, scaffolds for a domain or all
        router.post('/generate', async (req, res) => {
            try{
                const { domain = 'all', baseUrl = '' } = req.query || {};
                const buckets = splitDomains(fs.readFileSync(processesPath, 'utf-8'));
                const selected = domain === 'all' ? Array.from(buckets.keys()) : [domain];
                const files = [];
                const diagramDir = join(projectRoot, 'generated', 'diagrams'); ensureDir(diagramDir);
                const yamlDir = join(projectRoot, 'generated', 'domains'); ensureDir(yamlDir);
                const scriptsRoot = join(projectRoot, 'generated', 'scripts'); ensureDir(scriptsRoot);
                const browserRoot = join(projectRoot, 'generated', 'browser'); ensureDir(browserRoot);
                let totalActions = 0;
                const results = [];

                for (const key of selected){
                    const text = (buckets.get(key) || []).join('\n');
                    // Extract sentences
                    const list = parseMultipleSentences(text);
                    const workflows = [];
                    for (const s of list){
                        try{
                            await this.engine.createWorkflowFromNLP(s);
                            const wfEvent = this.engine.getEventsByType('WorkflowCreated').slice(-1)[0];
                            if (wfEvent?.payload) workflows.push(wfEvent.payload);
                        }catch(_){ }
                    }
                    // Write YAML
                    const y = exportWorkflowToYAML({ workflows });
                    const yfile = join(yamlDir, `${key}.yaml`); writeFile(yfile, y); files.push(yfile);
                    // Write Mermaid diagram (one merged diagram)
                    const steps = workflows.map(w => ({ id: w.id, name: w.name, module: w.module, actions: w.actions }));
                    const mmd = generateMermaid({ steps });
                    const dfile = join(diagramDir, `${key}.mmd`); writeFile(dfile, mmd); files.push(dfile);
                    // Build scaffolds
                    const scaff = buildScaffolds({ workflows }, String(baseUrl||''));
                    totalActions += scaff.count;
                    const writeScaff = (arr)=>{ for (const f of arr){ const full = join(projectRoot, f.filename); ensureDir(dirname(full)); writeFile(full, f.content); try{ if (full.endsWith('.sh')) fs.chmodSync(full, 0o755); }catch(_){} files.push(full); } };
                    writeScaff(scaff.bash); writeScaff(scaff.node); writeScaff(scaff.browser);
                    writeScaff(scaff.python);
                    results.push({ domain: key, workflows: workflows.length, actions: scaff.count });
                }
                res.json({ success:true, domains: selected, files, totalActions, results });
            }catch(e){ res.status(400).json({ error: 'generate failed', message: e.message }); }
        });

        // List generated artifacts
        router.get('/list', (req, res) => {
            try{
                const base = join(projectRoot, 'generated');
                const walk = (p)=>{ let out=[]; if (!fs.existsSync(p)) return out; for (const n of fs.readdirSync(p)){ const fp = join(p,n); const st = fs.statSync(fp); if (st.isDirectory()) out=out.concat(walk(fp)); else out.push(fp); } return out; };
                res.json({ files: walk(base) });
            }catch(e){ res.status(400).json({ error:'list failed', message:e.message }); }
        });

        // Archive generated as tar.gz
        router.get('/archive', (req, res) => {
            try{
                const genDir = join(projectRoot, 'generated');
                if (!fs.existsSync(genDir)) return res.status(404).json({ error: 'nothing generated' });
                res.setHeader('Content-Type', 'application/gzip');
                res.setHeader('Content-Disposition', 'attachment; filename="generated.tar.gz"');
                const p = spawn('tar', ['-czf', '-', '.'], { cwd: genDir });
                p.stdout.pipe(res);
                p.stderr.on('data', d => console.error('tar:', d.toString()));
                p.on('error', err => res.status(500).end(String(err)));
            }catch(e){ res.status(500).json({ error: 'archive failed', message: e.message }); }
        });

        this.app.use('/api/processes', router);
    }

    // Simple mock endpoints for generated scripts/APIs
    setupMockRoutes(){
        const router = express.Router();
        router.post('/send-email', (req,res)=>{ res.json({ ok:true, kind:'email', to: req.body?.to || 'someone@example.com', ts: new Date().toISOString() }); });
        router.post('/generate-invoice', (req,res)=>{ res.json({ ok:true, invoiceId: 'INV-'+Date.now(), ts: new Date().toISOString() }); });
        router.get('/invoice/:id', (req,res)=>{ res.json({ ok:true, invoice: { id: req.params.id, amount: 123.45, currency:'PLN' } }); });
        router.get('/fetch-page', (req,res)=>{ const url = req.query.url || 'https://example.org'; res.json({ ok:true, url, pageTitle:'Example Page' }); });
        router.post('/generate-report', (req,res)=>{ res.json({ ok:true, reportId: 'RPT-'+Date.now() }); });
        router.post('/action', (req,res)=>{ res.json({ ok:true, action: req.body?.action || 'generic' }); });
        this.app.use('/api/mock', router);
    }

    // Execute generated scripts via API (bash/node/python)
    setupExecRoutes(){
        const router = express.Router();
        const baseDir = join(projectRoot, 'generated', 'scripts');
        const sanitize = (s)=> String(s||'').replace(/[^a-zA-Z0-9_\-]/g,'');
        const run = (cmd, args, cwd) => new Promise((resolve)=>{
            try{
                const p = spawn(cmd, args, { cwd, env: process.env });
                let out=''; let err='';
                p.stdout.on('data',d=>out+=d.toString());
                p.stderr.on('data',d=>err+=d.toString());
                p.on('close',code=>resolve({ code, out, err }));
            }catch(e){ resolve({ code:-1, out:'', err: e.message }); }
        });

        router.post('/:lang/:action', async (req,res)=>{
            try{
                const lang = sanitize(req.params.lang);
                const action = sanitize(req.params.action);
                let file, cmd, args;
                if (lang === 'bash'){ file = join(baseDir, 'bash', `${action}.sh`); cmd='bash'; args=[file]; }
                else if (lang === 'node'){ file = join(baseDir, 'node', `${action}.js`); cmd='node'; args=[file]; }
                else if (lang === 'python'){ file = join(baseDir, 'python', `${action}.py`); cmd='python3'; args=[file]; }
                else return res.status(400).json({ error:'invalid lang' });
                if (!fs.existsSync(file)) return res.status(404).json({ error:'script not found', file });
                const r = await run(cmd, args, projectRoot);
                res.json({ ok: r.code===0, code: r.code, stdout: r.out, stderr: r.err, file });
            }catch(e){ res.status(400).json({ error:'exec failed', message: e.message }); }
        });

        this.app.use('/api/exec', router);
    }
    
    setupFrontendRoutes() {
        // Serve main application
        this.app.get('/', (req, res) => {
            res.sendFile(join(projectRoot, 'index.html'));
        });
        
        // Serve test runner
        this.app.get('/tests', (req, res) => {
            res.sendFile(join(projectRoot, 'test-runner.html'));
        });
        
        // API documentation
        this.app.get('/api', (req, res) => {
            const apiDocs = {
                title: 'Founder.pl DSL API',
                version: '1.0.0',
                endpoints: {
                    workflow: {
                        'POST /api/workflow/nlp': 'Create workflow from NLP sentence',
                        'POST /api/workflow/action': 'Execute workflow action',
                        'GET /api/workflow/workflows': 'Get all workflows',
                        'GET /api/workflow/events': 'Get events (optionally filtered by type)',
                        'GET /api/workflow/readmodel': 'Get current read model',
                        'GET /api/workflow/statistics': 'Get system statistics',
                        'POST /api/workflow/validate': 'Validate workflow structure',
                        'DELETE /api/workflow/clear': 'Clear all data (testing only)'
                    },
                    utilities: {
                        'POST /api/utils/sanitize': 'Sanitize text (id, slug, display, email)',
                        'POST /api/utils/module': 'Get module mapping for text',
                        'POST /api/utils/batch': 'Process multiple sentences'
                    },
                    testing: {
                        'POST /api/test/backend': 'Run backend tests',
                        'POST /api/test/integration': 'Run integration tests',
                        'GET /api/test/validate-system': 'Validate system health'
                    }
                },
                examples: {
                    createWorkflow: {
                        url: 'POST /api/workflow/nlp',
                        body: {
                            sentence: 'Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową'
                        }
                    },
                    executeAction: {
                        url: 'POST /api/workflow/action',
                        body: {
                            actionName: 'wystaw fakturę',
                            context: { customerId: 'CUST_123', amount: 1500 }
                        }
                    }
                }
            };
            
            res.json(apiDocs);
        });
    }
    
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
                availableRoutes: [
                    'GET /',
                    'GET /tests',
                    'GET /api',
                    'GET /api/health',
                    'POST /api/workflow/nlp',
                    'POST /api/workflow/action',
                    'GET /api/workflow/statistics'
                ]
            });
        });
        
        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'production' ? 
                    'Something went wrong' : error.message,
                timestamp: new Date().toISOString()
            });
        });
    }
    
    start() {
        return new Promise((resolve) => {
            const server = this.app.listen(this.port, () => {
                console.log(`🚀 DSL Server running on port ${this.port}`);
                console.log(`📱 Web interface: http://localhost:${this.port}`);
                console.log(`🧪 Test runner: http://localhost:${this.port}/tests`);
                console.log(`📚 API docs: http://localhost:${this.port}/api`);
                resolve(server);
            });
        });
    }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.env.PORT || 3000;
    const server = new DSLServer(port);
    
    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully');
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully');
        process.exit(0);
    });
}

export default DSLServer;
