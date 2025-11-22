// Integration tests - testing frontend-backend communication and full workflows
import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { TextSanitizer } from '../core/sanitizer.js';
import { ModuleMapper } from '../core/module-mapper.js';
import { WorkflowEngine } from '../core/workflow-engine.js';

describe('Integration Tests', () => {
    
    describe('Cross-Module Compatibility', () => {
        let sanitizer, mapper, engine;
        
        test('Initialize all modules', () => {
            sanitizer = new TextSanitizer();
            mapper = new ModuleMapper();
            engine = new WorkflowEngine();
            
            assert(sanitizer instanceof TextSanitizer);
            assert(mapper instanceof ModuleMapper);
            assert(engine instanceof WorkflowEngine);
        });
        
        test('Sanitizer-Mapper integration', () => {
            const testTexts = [
                'Wpłata klienta za fakturę',
                'Uruchom kampanię marketingową',
                'Dodaj kontakt do CRM-a',
                'Wyślij e-doręczenie'
            ];
            
            testTexts.forEach(text => {
                const sanitizedId = sanitizer.sanitizeId(text);
                const module = mapper.getModuleForKeywords(text);
                
                // Verify sanitized ID is valid
                assert(typeof sanitizedId === 'string');
                assert(sanitizedId.length > 0);
                assert(!sanitizedId.includes(' '));
                assert(!/[^a-zA-Z0-9_]/.test(sanitizedId));
                
                // Verify module mapping is logical
                assert(typeof module === 'string');
                assert(module.length > 0);
                
                console.log(`"${text}" -> ID: "${sanitizedId}", Module: "${module}"`);
            });
        });
        
        test('Engine-Sanitizer-Mapper integration', async () => {
            const sentence = 'Gdy nowa wpłata wpłynie, wystaw fakturę VAT i wyślij potwierdzenie';
            
            // Process through engine (which uses sanitizer and mapper internally)
            const result = await engine.createWorkflowFromNLP(sentence);
            
            assert.equal(result.success, true);
            
            // Verify the workflow was created with proper sanitization and mapping
            const workflowEvents = engine.getEventsByType('WorkflowCreated');
            assert.equal(workflowEvents.length, 1);
            
            const workflow = workflowEvents[0].payload;
            
            // Check that IDs are properly sanitized
            assert(workflow.id);
            assert(!workflow.id.includes(' '));
            assert(!/[ąćęłńóśźż]/i.test(workflow.id));
            
            // Check that modules are properly mapped
            workflow.actions.forEach(action => {
                assert(action.module);
                assert(action.module !== 'Default' || action.name.includes('nieznana'));
                
                if (action.name.includes('faktur')) {
                    assert.equal(action.module, 'Finanse');
                }
                if (action.name.includes('potwierdzenie')) {
                    assert(['Marketing', 'eDoręczenia', 'Powiadomienia'].includes(action.module));
                }
            });
        });
    });
    
    describe('End-to-End Workflow Processing', () => {
        let engine;
        
        test('Complete e-commerce workflow', async () => {
            engine = new WorkflowEngine();
            
            // Step 1: Create workflow from business requirement
            const businessRequirement = 'Gdy zamówienie zostanie złożone, sprawdź płatność i wyślij potwierdzenie oraz zaktualizuj magazyn';
            
            const workflowResult = await engine.createWorkflowFromNLP(businessRequirement);
            assert.equal(workflowResult.success, true);
            
            // Step 2: Verify workflow structure
            const workflows = engine.getEventsByType('WorkflowCreated');
            assert.equal(workflows.length, 1);
            
            const workflow = workflows[0].payload;
            assert.equal(workflow.actions.length, 3);
            
            // Step 3: Execute workflow actions in sequence
            const executionResults = [];
            for (const action of workflow.actions) {
                const result = await engine.executeAction(action.name, {
                    workflowId: workflow.id,
                    orderId: 'ORDER_123',
                    customerId: 'CUSTOMER_456'
                });
                executionResults.push(result);
            }
            
            // Step 4: Verify all actions executed successfully
            assert.equal(executionResults.length, 3);
            executionResults.forEach(result => {
                assert.equal(result.success, true);
            });
            
            // Step 5: Check final state
            const stats = engine.getStatistics();
            assert.equal(stats.workflowsCreated, 1);
            assert.equal(stats.actionsExecuted, 3);
            assert.equal(stats.actionsFailed, 0);
            
            const readModel = engine.getReadModel();
            const workflowEntries = readModel.filter(entry => entry.type === 'workflow');
            const actionEntries = readModel.filter(entry => entry.type === 'action');
            
            assert.equal(workflowEntries.length, 1);
            assert.equal(actionEntries.length, 3);
        });
        
        test('Multi-workflow scenario', async () => {
            engine = new WorkflowEngine();
            
            const scenarios = [
                'Gdy klient się zarejestruje, wyślij email powitalny i dodaj do CRM',
                'Gdy faktura zostanie opłacona, zaktualizuj księgowość i wyślij potwierdzenie',
                'Gdy kampania się zakończy, wygeneruj raport i powiadom zespół'
            ];
            
            // Create multiple workflows
            const workflowResults = [];
            for (const scenario of scenarios) {
                const result = await engine.createWorkflowFromNLP(scenario);
                workflowResults.push(result);
            }
            
            // Verify all workflows created
            assert.equal(workflowResults.length, 3);
            workflowResults.forEach(result => {
                assert.equal(result.success, true);
            });
            
            // Execute actions from all workflows
            const allWorkflows = engine.getEventsByType('WorkflowCreated');
            assert.equal(allWorkflows.length, 3);
            
            let totalActions = 0;
            for (const workflowEvent of allWorkflows) {
                const workflow = workflowEvent.payload;
                totalActions += workflow.actions.length;
                
                for (const action of workflow.actions) {
                    await engine.executeAction(action.name, { workflowId: workflow.id });
                }
            }
            
            // Verify final statistics
            const finalStats = engine.getStatistics();
            assert.equal(finalStats.workflowsCreated, 3);
            assert.equal(finalStats.actionsExecuted, totalActions);
        });
    });
    
    describe('Error Handling and Recovery', () => {
        let engine;
        
        test('Invalid NLP input handling', async () => {
            engine = new WorkflowEngine();
            
            const invalidInputs = [
                '',
                'Nieprawidłowe zdanie bez struktury',
                'Gdy brak przecinka to błąd',
                null,
                undefined
            ];
            
            for (const input of invalidInputs) {
                try {
                    await engine.createWorkflowFromNLP(input);
                    assert.fail(`Should have failed for input: ${input}`);
                } catch (error) {
                    assert(error.message.includes('Invalid sentence format') || 
                           error.message.includes('Cannot read properties'));
                }
            }
            
            // Verify error events were stored
            const errorEvents = engine.getEventsByType('CommandFailed');
            assert(errorEvents.length > 0);
        });
        
        test('Action execution failure recovery', async () => {
            engine = new WorkflowEngine();
            
            // Register a failing action handler
            engine.registerCommandHandler('FailingAction', async () => {
                throw new Error('Simulated action failure');
            });
            
            // Try to execute failing action
            try {
                await engine.executeCommand({
                    type: 'FailingAction',
                    payload: { test: 'data' }
                });
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'Simulated action failure');
            }
            
            // Verify system is still functional after failure
            const validResult = await engine.createWorkflowFromNLP(
                'Gdy test się powiedzie, wykonaj akcję testową'
            );
            assert.equal(validResult.success, true);
            
            // Check that both failure and success are recorded
            const allEvents = engine.eventStore;
            const failureEvents = allEvents.filter(e => e.type === 'CommandFailed');
            const successEvents = allEvents.filter(e => e.type === 'WorkflowCreated');
            
            assert(failureEvents.length > 0);
            assert(successEvents.length > 0);
        });
    });
    
    describe('Performance and Scalability', () => {
        let engine;
        
        test('Large workflow processing', async () => {
            engine = new WorkflowEngine();
            
            const startTime = Date.now();
            
            // Create 50 workflows
            const promises = [];
            for (let i = 0; i < 50; i++) {
                const sentence = `Gdy zdarzenie ${i} wystąpi, wykonaj akcję ${i} i powiadom zespół`;
                promises.push(engine.createWorkflowFromNLP(sentence));
            }
            
            const results = await Promise.all(promises);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // Verify all workflows created successfully
            assert.equal(results.length, 50);
            results.forEach(result => {
                assert.equal(result.success, true);
            });
            
            // Performance check - should process 50 workflows in reasonable time
            assert(processingTime < 5000, `Processing took too long: ${processingTime}ms`);
            
            // Verify event store integrity
            const workflowEvents = engine.getEventsByType('WorkflowCreated');
            assert.equal(workflowEvents.length, 50);
            
            console.log(`Processed 50 workflows in ${processingTime}ms`);
        });
        
        test('Memory usage with large event store', async () => {
            engine = new WorkflowEngine();
            
            // Generate many events
            for (let i = 0; i < 1000; i++) {
                await engine.executeAction(`action_${i}`, { iteration: i });
            }
            
            // Verify event store size
            assert.equal(engine.eventStore.length, 1000);
            
            // Test querying performance
            const startQuery = Date.now();
            const actionEvents = engine.getEventsByType('ActionExecuted');
            const queryTime = Date.now() - startQuery;
            
            assert.equal(actionEvents.length, 1000);
            assert(queryTime < 100, `Query took too long: ${queryTime}ms`);
            
            // Test statistics generation performance
            const startStats = Date.now();
            const stats = engine.getStatistics();
            const statsTime = Date.now() - startStats;
            
            assert.equal(stats.actionsExecuted, 1000);
            assert(statsTime < 50, `Statistics generation took too long: ${statsTime}ms`);
            
            console.log(`Query: ${queryTime}ms, Stats: ${statsTime}ms`);
        });
    });
    
    describe('Data Consistency and Integrity', () => {
        let engine;
        
        test('Event store immutability', async () => {
            engine = new WorkflowEngine();
            
            // Create initial event
            await engine.executeAction('test action');
            
            const initialEventStore = [...engine.eventStore];
            const firstEvent = initialEventStore[0];
            
            // Attempt to modify event (should not affect stored event)
            firstEvent.payload = { modified: true };
            firstEvent.type = 'ModifiedEvent';
            
            // Verify original event is unchanged
            const currentEventStore = engine.eventStore;
            assert.notEqual(currentEventStore[0].type, 'ModifiedEvent');
            assert(!currentEventStore[0].payload.modified);
        });
        
        test('Read model consistency', async () => {
            engine = new WorkflowEngine();
            
            // Create workflow and execute actions
            await engine.createWorkflowFromNLP('Gdy test rozpocznie się, wykonaj akcję A i akcję B');
            
            const workflow = engine.getEventsByType('WorkflowCreated')[0].payload;
            
            for (const action of workflow.actions) {
                await engine.executeAction(action.name);
            }
            
            // Verify read model reflects all events
            const readModel = engine.getReadModel();
            const workflowEntries = readModel.filter(entry => entry.type === 'workflow');
            const actionEntries = readModel.filter(entry => entry.type === 'action');
            
            assert.equal(workflowEntries.length, 1);
            assert.equal(actionEntries.length, workflow.actions.length);
            
            // Verify timestamps are consistent
            actionEntries.forEach(entry => {
                assert(entry.executedAt);
                assert(new Date(entry.executedAt).getTime() > 0);
            });
        });
        
        test('State export and import integrity', async () => {
            engine = new WorkflowEngine();
            
            // Create complex state
            await engine.createWorkflowFromNLP('Gdy export test, wykonaj akcję eksportu');
            await engine.executeAction('test action 1');
            await engine.executeAction('test action 2');
            
            const originalStats = engine.getStatistics();
            
            // Export state
            const exportedState = engine.exportState();
            
            // Create new engine and import state
            const newEngine = new WorkflowEngine();
            const importSuccess = newEngine.importState(exportedState);
            
            assert.equal(importSuccess, true);
            
            // Verify imported state matches original
            const importedStats = newEngine.getStatistics();
            assert.equal(importedStats.totalEvents, originalStats.totalEvents);
            assert.equal(importedStats.actionsExecuted, originalStats.actionsExecuted);
            assert.equal(importedStats.workflowsCreated, originalStats.workflowsCreated);
            
            // Verify event store integrity
            assert.equal(newEngine.eventStore.length, engine.eventStore.length);
            
            // Verify read model integrity
            assert.equal(newEngine.readModel.length, engine.readModel.length);
        });
    });
    
    describe('Real-world Scenarios', () => {
        test('Customer onboarding workflow', async () => {
            const engine = new WorkflowEngine();
            
            // Simulate customer onboarding process
            const onboardingSteps = [
                'Gdy nowy klient się zarejestruje, wyślij email powitalny',
                'Gdy email zostanie wysłany, dodaj klienta do CRM',
                'Gdy klient zostanie dodany do CRM, przypisz opiekuna klienta',
                'Gdy opiekun zostanie przypisany, zaplanuj spotkanie wprowadzające'
            ];
            
            const results = [];
            for (const step of onboardingSteps) {
                const result = await engine.createWorkflowFromNLP(step);
                results.push(result);
                
                // Execute the workflow immediately
                const workflows = engine.getEventsByType('WorkflowCreated');
                const latestWorkflow = workflows[workflows.length - 1].payload;
                
                for (const action of latestWorkflow.actions) {
                    await engine.executeAction(action.name, {
                        customerId: 'CUST_001',
                        step: onboardingSteps.indexOf(step)
                    });
                }
            }
            
            // Verify complete onboarding process
            assert.equal(results.length, 4);
            results.forEach(result => assert.equal(result.success, true));
            
            const finalStats = engine.getStatistics();
            assert.equal(finalStats.workflowsCreated, 4);
            assert(finalStats.actionsExecuted >= 4); // At least one action per workflow
        });
        
        test('Invoice processing workflow', async () => {
            const engine = new WorkflowEngine();
            
            // Simulate invoice processing
            const invoiceWorkflow = 'Gdy faktura wpłynie, sprawdź dane klienta i zatwierdź płatność oraz wyślij potwierdzenie';
            
            const result = await engine.createWorkflowFromNLP(invoiceWorkflow);
            assert.equal(result.success, true);
            
            const workflow = engine.getEventsByType('WorkflowCreated')[0].payload;
            
            // Execute with realistic context
            const invoiceContext = {
                invoiceId: 'INV_2025_001',
                customerId: 'CUST_123',
                amount: 1500.00,
                currency: 'PLN',
                dueDate: '2025-12-01'
            };
            
            for (const action of workflow.actions) {
                await engine.executeAction(action.name, invoiceContext);
            }
            
            // Verify processing completed
            const actionEvents = engine.getEventsByType('ActionExecuted');
            assert.equal(actionEvents.length, workflow.actions.length);
            
            // Check that all actions have proper context
            actionEvents.forEach(event => {
                assert.equal(event.payload.context.invoiceId, 'INV_2025_001');
                assert.equal(event.payload.context.amount, 1500.00);
            });
        });
    });
});

// Performance monitoring utilities
export class PerformanceMonitor {
    constructor() {
        this.metrics = [];
    }
    
    startTimer(operation) {
        return {
            operation,
            startTime: Date.now(),
            end: () => {
                const endTime = Date.now();
                const duration = endTime - this.startTime;
                this.metrics.push({
                    operation,
                    duration,
                    timestamp: new Date().toISOString()
                });
                return duration;
            }
        };
    }
    
    getMetrics() {
        return [...this.metrics];
    }
    
    getAverageTime(operation) {
        const operationMetrics = this.metrics.filter(m => m.operation === operation);
        if (operationMetrics.length === 0) return 0;
        
        const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
        return total / operationMetrics.length;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🔗 Running Integration Tests...');
}
