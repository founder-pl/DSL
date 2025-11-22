// Backend tests for Node.js modules
import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { TextSanitizer } from '../core/sanitizer.js';
import { ModuleMapper } from '../core/module-mapper.js';
import { WorkflowEngine } from '../core/workflow-engine.js';

describe('Backend Core Modules Tests', () => {
    
    describe('TextSanitizer', () => {
        const sanitizer = new TextSanitizer();
        
        test('sanitizeId - Polish characters', () => {
            assert.equal(sanitizer.sanitizeId('Wpłata klienta'), 'Wplata_klienta');
            assert.equal(sanitizer.sanitizeId('ąćęłńóśźż'), 'acelnoszz');
            assert.equal(sanitizer.sanitizeId('test@#$%^&*()'), 'test');
            assert.equal(sanitizer.sanitizeId('   spacje   '), 'spacje');
        });
        
        test('sanitizeId - edge cases', () => {
            assert.equal(sanitizer.sanitizeId(''), 'invalid_id');
            assert.equal(sanitizer.sanitizeId(null), 'invalid_id');
            assert.equal(sanitizer.sanitizeId(undefined), 'invalid_id');
            assert.equal(sanitizer.sanitizeId('___'), 'sanitized_id');
        });
        
        test('sanitizeSlug', () => {
            assert.equal(sanitizer.sanitizeSlug('Wpłata Klienta'), 'wplata-klienta');
            assert.equal(sanitizer.sanitizeSlug('Test@#$%Space'), 'test----space');
        });
        
        test('sanitizeEmail', () => {
            const result1 = sanitizer.sanitizeEmail('TEST@EXAMPLE.COM');
            assert.equal(result1.isValid, true);
            assert.equal(result1.sanitized, 'test@example.com');
            
            const result2 = sanitizer.sanitizeEmail('invalid-email');
            assert.equal(result2.isValid, false);
        });
        
        test('batchSanitize', () => {
            const texts = ['Wpłata klienta', 'Faktura VAT', 'Kampania reklamowa'];
            const results = sanitizer.batchSanitize(texts, 'id');
            
            assert.equal(results.length, 3);
            assert.equal(results[0], 'Wplata_klienta');
            assert.equal(results[1], 'Faktura_VAT');
            assert.equal(results[2], 'Kampania_reklamowa');
        });
    });
    
    describe('ModuleMapper', () => {
        const mapper = new ModuleMapper();
        
        test('getModuleForKeywords - basic mapping', () => {
            assert.equal(mapper.getModuleForKeywords('wpłata klienta'), 'Platnosci');
            assert.equal(mapper.getModuleForKeywords('wystaw fakturę'), 'Finanse');
            assert.equal(mapper.getModuleForKeywords('uruchom kampanię'), 'Reklama');
            assert.equal(mapper.getModuleForKeywords('wyślij newsletter'), 'Marketing');
            assert.equal(mapper.getModuleForKeywords('dodaj do CRM'), 'CRM');
            assert.equal(mapper.getModuleForKeywords('nieznana akcja'), 'Default');
        });
        
        test('getModulesWithConfidence', () => {
            const results = mapper.getModulesWithConfidence('wpłata i faktura');
            
            assert(results.length >= 2);
            assert(results.some(r => r.module === 'Platnosci'));
            assert(results.some(r => r.module === 'Finanse'));
            assert(results[0].confidence > 0);
        });
        
        test('addModule and removeModule', () => {
            const success1 = mapper.addModule('TestModule', ['test', 'testing']);
            assert.equal(success1, true);
            assert.equal(mapper.getModuleForKeywords('test action'), 'TestModule');
            
            const success2 = mapper.removeModule('TestModule');
            assert.equal(success2, true);
            assert.equal(mapper.getModuleForKeywords('test action'), 'Default');
        });
        
        test('validate configuration', () => {
            const validation = mapper.validate();
            assert.equal(validation.isValid, true);
            assert.equal(validation.errors.length, 0);
        });
        
        test('export and import config', () => {
            const config = mapper.exportConfig();
            assert(config.moduleMap);
            assert(config.metadata);
            assert(config.metadata.totalModules > 0);
            
            const newMapper = new ModuleMapper();
            const importSuccess = newMapper.importConfig(config);
            assert.equal(importSuccess, true);
            
            assert.equal(
                newMapper.getModuleForKeywords('wpłata'),
                mapper.getModuleForKeywords('wpłata')
            );
        });
    });
    
    describe('WorkflowEngine', () => {
        let engine;
        
        test('initialization', () => {
            engine = new WorkflowEngine();
            assert(engine.eventStore);
            assert(engine.readModel);
            assert(engine.sanitizer);
            assert(engine.moduleMapper);
        });
        
        test('command and event handling', async () => {
            const command = {
                type: 'ExecuteAction',
                payload: { actionName: 'test action', context: { test: true } }
            };
            
            const result = await engine.executeCommand(command);
            
            assert.equal(result.success, true);
            assert.equal(result.eventsGenerated, 1);
            assert.equal(engine.eventStore.length, 1);
            
            const event = engine.eventStore[0];
            assert.equal(event.type, 'ActionExecuted');
            assert.equal(event.payload.actionName, 'test action');
        });
        
        test('NLP workflow creation', async () => {
            const result = await engine.createWorkflowFromNLP(
                'Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową'
            );
            
            assert.equal(result.success, true);
            
            const workflowEvent = engine.getEventsByType('WorkflowCreated')[0];
            assert(workflowEvent);
            assert.equal(workflowEvent.payload.name, 'wpłata klienta nastąpi');
            assert.equal(workflowEvent.payload.actions.length, 2);
            assert.equal(workflowEvent.payload.actions[0].name, 'wystaw fakturę');
            assert.equal(workflowEvent.payload.actions[1].name, 'uruchom kampanię retargetingową');
        });
        
        test('workflow validation', () => {
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
            
            const validation = engine.validateWorkflow(validWorkflow);
            assert.equal(validation.isValid, true);
            assert.equal(validation.errors.length, 0);
            
            const invalidWorkflow = { steps: [] };
            const invalidValidation = engine.validateWorkflow(invalidWorkflow);
            assert.equal(invalidValidation.isValid, true); // Empty steps is valid
        });
        
        test('statistics and queries', async () => {
            // Execute some actions to generate statistics
            await engine.executeAction('action1');
            await engine.executeAction('action2');
            
            const stats = engine.getStatistics();
            assert(stats.totalEvents > 0);
            assert(stats.actionsExecuted >= 2);
            assert(stats.successRate);
            
            const actionEvents = engine.getEventsByType('ActionExecuted');
            assert(actionEvents.length >= 2);
        });
        
        test('state export and import', () => {
            const state = engine.exportState();
            assert(state.eventStore);
            assert(state.readModel);
            assert(state.statistics);
            
            const newEngine = new WorkflowEngine();
            const importSuccess = newEngine.importState(state);
            assert.equal(importSuccess, true);
            
            assert.equal(newEngine.eventStore.length, engine.eventStore.length);
        });
        
        test('custom handlers registration', async () => {
            let handlerCalled = false;
            
            engine.registerCommandHandler('CustomCommand', async (payload) => {
                handlerCalled = true;
                return {
                    type: 'CustomEvent',
                    payload: { processed: true }
                };
            });
            
            await engine.executeCommand({
                type: 'CustomCommand',
                payload: { test: 'data' }
            });
            
            assert.equal(handlerCalled, true);
            
            const customEvents = engine.getEventsByType('CustomEvent');
            assert.equal(customEvents.length, 1);
        });
        
        test('error handling', async () => {
            engine.registerCommandHandler('FailingCommand', async () => {
                throw new Error('Test error');
            });
            
            try {
                await engine.executeCommand({
                    type: 'FailingCommand',
                    payload: {}
                });
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'Test error');
                
                // Check that failure event was stored
                const failureEvents = engine.getEventsByType('CommandFailed');
                assert(failureEvents.length > 0);
            }
        });
    });
    
    describe('Integration Tests', () => {
        test('full workflow processing pipeline', async () => {
            const engine = new WorkflowEngine();
            
            // 1. Create workflow from NLP
            const nlpResult = await engine.createWorkflowFromNLP(
                'Gdy nowe zamówienie wpłynie, wyślij potwierdzenie i zaktualizuj magazyn'
            );
            
            assert.equal(nlpResult.success, true);
            
            // 2. Verify workflow was created
            const workflowEvents = engine.getEventsByType('WorkflowCreated');
            assert.equal(workflowEvents.length, 1);
            
            const workflow = workflowEvents[0].payload;
            assert.equal(workflow.actions.length, 2);
            
            // 3. Execute actions from workflow
            for (const action of workflow.actions) {
                await engine.executeAction(action.name, { workflowId: workflow.id });
            }
            
            // 4. Verify all actions were executed
            const actionEvents = engine.getEventsByType('ActionExecuted');
            assert.equal(actionEvents.length, 2);
            
            // 5. Check read model state
            const readModel = engine.getReadModel();
            const workflowEntries = readModel.filter(entry => entry.type === 'workflow');
            const actionEntries = readModel.filter(entry => entry.type === 'action');
            
            assert.equal(workflowEntries.length, 1);
            assert.equal(actionEntries.length, 2);
            
            // 6. Verify statistics
            const stats = engine.getStatistics();
            assert.equal(stats.actionsExecuted, 2);
            assert.equal(stats.workflowsCreated, 1);
        });
        
        test('module mapping integration', () => {
            const engine = new WorkflowEngine();
            const sanitizer = engine.sanitizer;
            const mapper = engine.moduleMapper;
            
            // Test integration between components
            const text = 'Wystaw fakturę dla klienta';
            const sanitizedId = sanitizer.sanitizeId(text);
            const module = mapper.getModuleForKeywords(text);
            
            assert.equal(sanitizedId, 'Wystaw_fakture_dla_klienta');
            assert.equal(module, 'Finanse');
        });
    });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🧪 Running Backend Tests...');
}
