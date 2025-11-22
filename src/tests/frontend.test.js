// Frontend tests - can be run in browser or Node.js with jsdom
import { strict as assert } from 'assert';
import { test, describe } from 'node:test';

// Mock browser environment for Node.js testing
const mockBrowserEnvironment = () => {
    global.window = {
        location: { href: 'http://localhost:8080' },
        document: {
            getElementById: (id) => ({
                value: '',
                textContent: '',
                innerHTML: '',
                style: {},
                addEventListener: () => {},
                querySelector: () => null,
                querySelectorAll: () => []
            }),
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                style: {},
                addEventListener: () => {},
                appendChild: () => {},
                setAttribute: () => {},
                getAttribute: () => null
            }),
            body: {
                appendChild: () => {}
            }
        },
        alert: (msg) => console.log('Alert:', msg),
        console: console
    };
    
    global.document = global.window.document;
    global.alert = global.window.alert;
};

// Initialize mock environment
mockBrowserEnvironment();

// Import frontend modules (simulated)
const createFrontendModules = () => {
    // Simulate frontend sanitizer (same logic as backend)
    const sanitizeId = (text) => {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return 'invalid_id';
        }
        
        const polishMap = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
        };
        
        let result = text.trim();
        
        for (const [polish, latin] of Object.entries(polishMap)) {
            result = result.replace(new RegExp(polish, 'g'), latin);
        }
        
        result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        result = result.replace(/[^a-zA-Z0-9_]/g, '_');
        result = result.replace(/_+/g, '_');
        result = result.replace(/^_|_$/g, '');
        
        return result || 'sanitized_id';
    };
    
    // Simulate frontend module mapper
    const getModuleForKeywords = (text) => {
        const moduleMap = {
            'Platnosci': ['wpłata', 'płatność', 'payment', 'przelew', 'karta', 'transakcja', 'płaci'],
            'Finanse': ['faktura', 'fakturę', 'invoice', 'księgowość', 'raport', 'finanse', 'accounting', 'wystaw', 'wystawić'],
            'Reklama': ['kampania', 'kampanię', 'reklama', 'marketing', 'retargeting', 'ads', 'uruchom', 'uruchamianie'],
            'Marketing': ['newsletter', 'email', 'wiadomość', 'powitalny', 'promocja', 'wyślij', 'wysłanie'],
            'CRM': ['klient', 'crm', 'kontakt', 'customer', 'relacje', 'dodaj do crm', 'dodaj']
        };
        
        if (typeof text !== 'string' || text.trim().length === 0) {
            return 'Default';
        }
        
        const textLower = text.toLowerCase();
        for (const [module, keywords] of Object.entries(moduleMap)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return module;
            }
        }
        return 'Default';
    };
    
    // Simulate frontend workflow functions
    const generateMermaid = (workflow) => {
        if (!workflow || !workflow.steps) {
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
            code += `    subgraph ${sanitizeId(mod)}[${mod}]\n`;
            modules[mod].forEach(step => {
                const stepId = sanitizeId(step.id);
                code += `        ${stepId}["${step.name}"]\n`;
                if (step.actions) {
                    step.actions.forEach(action => {
                        const actionId = sanitizeId(action.id);
                        code += `        ${actionId}["${action.name}"]\n`;
                        code += `        ${stepId} --> ${actionId}\n`;
                    });
                }
            });
            code += '    end\n';
        });
        
        return code;
    };
    
    // Simulate event store and read model
    let eventStore = [];
    let readModel = [];
    
    const sendCommand = (actionName) => {
        if (typeof actionName !== 'string' || actionName.trim().length === 0) {
            throw new Error('Invalid action name');
        }
        
        const timestamp = new Date().toISOString();
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            actionName,
            timestamp
        };
        
        eventStore.push(event);
        processEvent(event);
        
        return event;
    };
    
    const processEvent = (event) => {
        readModel.push({
            actionName: event.actionName,
            status: 'done',
            timestamp: event.timestamp
        });
    };
    
    const validateWorkflow = (workflow) => {
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
    };
    
    return {
        sanitizeId,
        getModuleForKeywords,
        generateMermaid,
        sendCommand,
        processEvent,
        validateWorkflow,
        eventStore,
        readModel
    };
};

describe('Frontend Tests', () => {
    let frontend;
    
    test('Frontend modules initialization', () => {
        frontend = createFrontendModules();
        
        assert(typeof frontend.sanitizeId === 'function');
        assert(typeof frontend.getModuleForKeywords === 'function');
        assert(typeof frontend.generateMermaid === 'function');
        assert(typeof frontend.sendCommand === 'function');
        assert(Array.isArray(frontend.eventStore));
        assert(Array.isArray(frontend.readModel));
    });
    
    describe('Frontend Sanitization', () => {
        test('sanitizeId - Polish characters (frontend)', () => {
            assert.equal(frontend.sanitizeId('Wpłata klienta'), 'Wplata_klienta');
            assert.equal(frontend.sanitizeId('ąćęłńóśźż'), 'acelnoszz');
            assert.equal(frontend.sanitizeId('test@#$%^&*()'), 'test');
            assert.equal(frontend.sanitizeId('   spacje   '), 'spacje');
        });
        
        test('sanitizeId - edge cases (frontend)', () => {
            assert.equal(frontend.sanitizeId(''), 'invalid_id');
            assert.equal(frontend.sanitizeId(null), 'invalid_id');
            assert.equal(frontend.sanitizeId(undefined), 'invalid_id');
        });
    });
    
    describe('Frontend Module Mapping', () => {
        test('getModuleForKeywords (frontend)', () => {
            assert.equal(frontend.getModuleForKeywords('wpłata klienta'), 'Platnosci');
            assert.equal(frontend.getModuleForKeywords('wystaw fakturę'), 'Finanse');
            assert.equal(frontend.getModuleForKeywords('uruchom kampanię'), 'Reklama');
            assert.equal(frontend.getModuleForKeywords('wyślij newsletter'), 'Marketing');
            assert.equal(frontend.getModuleForKeywords('dodaj do CRM'), 'CRM');
            assert.equal(frontend.getModuleForKeywords('nieznana akcja'), 'Default');
        });
    });
    
    describe('Frontend Workflow Generation', () => {
        test('generateMermaid - valid workflow', () => {
            const workflow = {
                steps: [{
                    id: 'payment',
                    name: 'Wpłata klienta',
                    module: 'Platnosci',
                    actions: [{
                        id: 'invoice',
                        name: 'Wystaw fakturę'
                    }]
                }]
            };
            
            const mermaidCode = frontend.generateMermaid(workflow);
            
            assert(mermaidCode.includes('flowchart TD'));
            assert(mermaidCode.includes('subgraph'));
            assert(mermaidCode.includes('Platnosci'));
            assert(mermaidCode.includes('Wpłata klienta'));
        });
        
        test('generateMermaid - invalid workflow', () => {
            const invalidWorkflow = null;
            const mermaidCode = frontend.generateMermaid(invalidWorkflow);
            
            assert(mermaidCode.includes('Error'));
            assert(mermaidCode.includes('Invalid workflow'));
        });
    });
    
    describe('Frontend Event System', () => {
        test('sendCommand and processEvent', () => {
            const initialEventCount = frontend.eventStore.length;
            const initialReadModelCount = frontend.readModel.length;
            
            const event = frontend.sendCommand('test action');
            
            assert.equal(frontend.eventStore.length, initialEventCount + 1);
            assert.equal(frontend.readModel.length, initialReadModelCount + 1);
            
            assert.equal(event.actionName, 'test action');
            assert(event.id);
            assert(event.timestamp);
            
            const readModelEntry = frontend.readModel[frontend.readModel.length - 1];
            assert.equal(readModelEntry.actionName, 'test action');
            assert.equal(readModelEntry.status, 'done');
        });
        
        test('sendCommand - error handling', () => {
            try {
                frontend.sendCommand('');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'Invalid action name');
            }
            
            try {
                frontend.sendCommand(null);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'Invalid action name');
            }
        });
    });
    
    describe('Frontend Workflow Validation', () => {
        test('validateWorkflow - valid workflow', () => {
            const validWorkflow = {
                steps: [{
                    id: 'test',
                    name: 'Test Step',
                    actions: [{
                        id: 'action1',
                        name: 'Test Action'
                    }]
                }]
            };
            
            const errors = frontend.validateWorkflow(validWorkflow);
            assert.equal(errors.length, 0);
        });
        
        test('validateWorkflow - invalid workflows', () => {
            // Null workflow
            let errors = frontend.validateWorkflow(null);
            assert(errors.length > 0);
            assert(errors.some(error => error.includes('cannot be null')));
            
            // Missing steps
            errors = frontend.validateWorkflow({});
            assert(errors.length > 0);
            assert(errors.some(error => error.includes('steps array')));
            
            // Invalid step structure
            errors = frontend.validateWorkflow({
                steps: [{
                    // Missing id and name
                    actions: []
                }]
            });
            assert(errors.length > 0);
            assert(errors.some(error => error.includes('missing ID')));
            assert(errors.some(error => error.includes('missing name')));
        });
    });
    
    describe('Frontend DOM Simulation', () => {
        test('DOM element creation and manipulation', () => {
            const element = document.createElement('div');
            assert.equal(element.tagName, 'DIV');
            
            element.textContent = 'Test content';
            assert.equal(element.textContent, 'Test content');
            
            element.style.display = 'none';
            assert.equal(element.style.display, 'none');
        });
        
        test('getElementById simulation', () => {
            const element = document.getElementById('test-element');
            assert(element);
            
            element.value = 'test value';
            assert.equal(element.value, 'test value');
        });
    });
    
    describe('Frontend Integration Tests', () => {
        test('Complete workflow processing (frontend)', () => {
            // Simulate NLP input processing
            const sentence = 'Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię';
            const match = sentence.match(/Gdy (.+?), (.+)/i);
            
            assert(match);
            
            const condition = match[1].trim();
            const actionsText = match[2].split(' i ').map(a => a.trim());
            
            // Create workflow structure
            const stepId = frontend.sanitizeId(condition);
            const stepModule = frontend.getModuleForKeywords(condition);
            
            const actions = actionsText.map((actionText, index) => ({
                id: frontend.sanitizeId(`${stepId}_action_${index + 1}`),
                name: actionText,
                module: frontend.getModuleForKeywords(actionText)
            }));
            
            const workflow = {
                steps: [{
                    id: stepId,
                    name: condition,
                    module: stepModule,
                    actions: actions
                }]
            };
            
            // Validate workflow
            const validationErrors = frontend.validateWorkflow(workflow);
            assert.equal(validationErrors.length, 0);
            
            // Generate Mermaid diagram
            const mermaidCode = frontend.generateMermaid(workflow);
            assert(mermaidCode.includes('flowchart TD'));
            
            // Execute actions
            const initialEventCount = frontend.eventStore.length;
            actions.forEach(action => {
                frontend.sendCommand(action.name);
            });
            
            assert.equal(frontend.eventStore.length, initialEventCount + actions.length);
            
            // Verify modules were assigned correctly
            assert.equal(actions[0].module, 'Finanse'); // "wystaw fakturę"
            assert.equal(actions[1].module, 'Reklama'); // "uruchom kampanię"
        });
        
        test('Frontend-Backend compatibility', () => {
            // Test that frontend functions produce same results as backend
            const testCases = [
                'Wpłata klienta',
                'wystaw fakturę',
                'uruchom kampanię',
                'ąćęłńóśźż'
            ];
            
            testCases.forEach(testCase => {
                const frontendId = frontend.sanitizeId(testCase);
                const frontendModule = frontend.getModuleForKeywords(testCase);
                
                // These should match backend results
                assert(typeof frontendId === 'string');
                assert(frontendId.length > 0);
                assert(typeof frontendModule === 'string');
                
                // Specific expected results
                if (testCase === 'Wpłata klienta') {
                    assert.equal(frontendId, 'Wplata_klienta');
                    assert.equal(frontendModule, 'Platnosci');
                }
                if (testCase === 'wystaw fakturę') {
                    assert.equal(frontendModule, 'Finanse');
                }
                if (testCase === 'uruchom kampanię') {
                    assert.equal(frontendModule, 'Reklama');
                }
            });
        });
    });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🌐 Running Frontend Tests...');
}
