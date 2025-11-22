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
import { initSchema, saveWorkflow, saveEvent, saveWebhook, exportDatabase, importDatabase, getDBPath } from './db.js';
import fs from 'fs';

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
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
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
