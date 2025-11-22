// Core module: Workflow Engine
// CQRS/Event Sourcing workflow engine for both frontend and backend

import { TextSanitizer } from './sanitizer.js';
import { ModuleMapper } from './module-mapper.js';

export class WorkflowEngine {
    constructor() {
        this._eventStore = [];
        this._readModel = [];
        this.sanitizer = new TextSanitizer();
        this.moduleMapper = new ModuleMapper();
        this.eventHandlers = new Map();
        this.commandHandlers = new Map();
        this.projections = new Map();
        
        this.setupDefaultHandlers();
    }

    // === COMMAND HANDLING ===

    /**
     * Register command handler
     * @param {string} commandType - Type of command
     * @param {Function} handler - Handler function
     */
    registerCommandHandler(commandType, handler) {
        this.commandHandlers.set(commandType, handler);
    }

    /**
     * Execute command
     * @param {object} command - Command to execute
     * @returns {Promise<object>} - Command result
     */
    async executeCommand(command) {
        const { type, payload, metadata = {} } = command;
        
        if (!this.commandHandlers.has(type)) {
            throw new Error(`No handler registered for command type: ${type}`);
        }
        
        const handler = this.commandHandlers.get(type);
        
        try {
            const events = await handler(payload, metadata);
            
            // Store events
            if (Array.isArray(events)) {
                for (const event of events) {
                    await this.storeEvent(event);
                }
            } else if (events) {
                await this.storeEvent(events);
            }
            
            return {
                success: true,
                commandId: command.id || this.generateId(),
                eventsGenerated: Array.isArray(events) ? events.length : (events ? 1 : 0)
            };
        } catch (error) {
            await this.storeEvent({
                type: 'CommandFailed',
                payload: {
                    commandType: type,
                    error: error.message,
                    originalCommand: command
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'WorkflowEngine'
                }
            });
            
            throw error;
        }
    }

    // === EVENT HANDLING ===

    /**
     * Register event handler
     * @param {string} eventType - Type of event
     * @param {Function} handler - Handler function
     */
    registerEventHandler(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    /**
     * Store event in event store
     * @param {object} event - Event to store
     * @returns {Promise<string>} - Event ID
     */
    async storeEvent(event) {
        const eventWithMetadata = {
            id: this.generateId(),
            ...event,
            metadata: {
                timestamp: new Date().toISOString(),
                version: 1,
                ...event.metadata
            }
        };
        
        this._eventStore.push(eventWithMetadata);
        
        // Process event handlers
        await this.processEvent(eventWithMetadata);
        
        return eventWithMetadata.id;
    }

    /**
     * Process event through handlers
     * @param {object} event - Event to process
     */
    async processEvent(event) {
        const handlers = this.eventHandlers.get(event.type) || [];
        
        for (const handler of handlers) {
            try {
                await handler(event);
            } catch (error) {
                console.error(`Error in event handler for ${event.type}:`, error);
            }
        }
    }

    // === PROJECTIONS ===

    /**
     * Register projection
     * @param {string} name - Projection name
     * @param {Function} projector - Projection function
     */
    registerProjection(name, projector) {
        this.projections.set(name, projector);
    }

    /**
     * Rebuild projection from events
     * @param {string} projectionName - Name of projection to rebuild
     * @returns {Promise<object>} - Rebuilt projection data
     */
    async rebuildProjection(projectionName) {
        const projector = this.projections.get(projectionName);
        if (!projector) {
            throw new Error(`Projection ${projectionName} not found`);
        }
        
        let projectionData = {};
        
        for (const event of this.eventStore) {
            projectionData = await projector(projectionData, event);
        }
        
        return projectionData;
    }

    // === WORKFLOW OPERATIONS ===

    /**
     * Create workflow from NLP sentence
     * @param {string} sentence - Natural language sentence
     * @returns {Promise<object>} - Created workflow
     */
    async createWorkflowFromNLP(sentence) {
        const command = {
            type: 'CreateWorkflowFromNLP',
            payload: { sentence },
            metadata: { source: 'NLP' }
        };
        
        return await this.executeCommand(command);
    }

    /**
     * Execute workflow action
     * @param {string} actionName - Name of action to execute
     * @param {object} context - Execution context
     * @returns {Promise<object>} - Execution result
     */
    async executeAction(actionName, context = {}) {
        const command = {
            type: 'ExecuteAction',
            payload: { actionName, context },
            metadata: { source: 'User' }
        };
        
        return await this.executeCommand(command);
    }

    /**
     * Validate workflow structure
     * @param {object} workflow - Workflow to validate
     * @returns {object} - Validation result
     */
    validateWorkflow(workflow) {
        const errors = [];
        
        if (!workflow) {
            errors.push('Workflow cannot be null');
            return { isValid: false, errors };
        }
        
        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            errors.push('Workflow must contain steps array');
            return { isValid: false, errors };
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
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // === QUERY OPERATIONS ===

    /**
     * Get events by type
     * @param {string} eventType - Type of events to retrieve
     * @returns {Array} - Filtered events
     */
    getEventsByType(eventType) {
        return this._eventStore.filter(event => event.type === eventType).map(e => deepClone(e));
    }

    /**
     * Get events in time range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} - Filtered events
     */
    getEventsByTimeRange(startDate, endDate) {
        return this._eventStore.filter(event => {
            const eventTime = new Date(event.metadata.timestamp);
            return eventTime >= startDate && eventTime <= endDate;
        }).map(e => deepClone(e));
    }

    /**
     * Get current read model state
     * @returns {Array} - Current read model
     */
    getReadModel() {
        return this._readModel.map(e => deepClone(e));
    }

    /**
     * Get workflow statistics
     * @returns {object} - Statistics object
     */
    getStatistics() {
        const actionEvents = this.getEventsByType('ActionExecuted');
        const failedEvents = this.getEventsByType('ActionFailed');
        const workflowEvents = this.getEventsByType('WorkflowCreated');
        
        return {
            totalEvents: this.eventStore.length,
            actionsExecuted: actionEvents.length,
            actionsFailed: failedEvents.length,
            workflowsCreated: workflowEvents.length,
            successRate: actionEvents.length > 0 ? 
                ((actionEvents.length - failedEvents.length) / actionEvents.length * 100).toFixed(2) + '%' : '0%',
            generatedAt: new Date().toISOString()
        };
    }

    // === UTILITY METHODS ===

    /**
     * Generate unique ID
     * @returns {string} - Unique identifier
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all data (for testing)
     */
    clear() {
        this.eventStore = [];
        this.readModel = [];
    }

    /**
     * Export engine state
     * @returns {object} - Engine state
     */
    exportState() {
        return {
            eventStore: this._eventStore.map(e => deepClone(e)),
            readModel: this._readModel.map(e => deepClone(e)),
            statistics: this.getStatistics(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import engine state
     * @param {object} state - Engine state to import
     * @returns {boolean} - Success status
     */
    importState(state) {
        try {
            if (state.eventStore) {
                this._eventStore = state.eventStore.map(e => deepClone(e));
            }
            if (state.readModel) {
                this._readModel = state.readModel.map(e => deepClone(e));
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    // === DEFAULT HANDLERS ===

    setupDefaultHandlers() {
        // Command handlers
        this.registerCommandHandler('CreateWorkflowFromNLP', async (payload) => {
            const { sentence } = payload;
            const match = sentence.match(/Gdy (.+?), (.+)/i);
            
            if (!match) {
                throw new Error('Invalid sentence format. Expected: "Gdy [condition], [actions]"');
            }
            
            const condition = match[1].trim();
            const actionsText = match[2].split(/\s+(?:i|oraz|a także|następnie)\s+/)
                .map(a => a.trim().replace(/\.$/, ''))
                .filter(a => a.length > 0);
            
            const workflowId = this.sanitizer.sanitizeId(condition);
            const module = this.moduleMapper.getModuleForKeywords(condition + ' ' + actionsText.join(' '));
            
            const actions = actionsText.map((actionText, index) => ({
                id: this.sanitizer.sanitizeId(`${workflowId}_action_${index + 1}`),
                name: actionText,
                module: this.moduleMapper.getModuleForKeywords(actionText)
            }));
            
            return {
                type: 'WorkflowCreated',
                payload: {
                    id: workflowId,
                    name: condition,
                    module,
                    actions,
                    source: 'NLP'
                }
            };
        });

        this.registerCommandHandler('ExecuteAction', async (payload) => {
            const { actionName, context } = payload;
            
            return {
                type: 'ActionExecuted',
                payload: {
                    actionName,
                    context,
                    executedAt: new Date().toISOString()
                }
            };
        });

        // Event handlers
        this.registerEventHandler('WorkflowCreated', async (event) => {
            // Update read model with new workflow
            this._readModel.push({
                type: 'workflow',
                id: event.payload.id,
                name: event.payload.name,
                module: event.payload.module,
                actions: event.payload.actions,
                status: 'created',
                createdAt: event.metadata.timestamp
            });
        });

        this.registerEventHandler('ActionExecuted', async (event) => {
            // Update read model with executed action
            this._readModel.push({
                type: 'action',
                actionName: event.payload.actionName,
                status: 'executed',
                executedAt: event.payload.executedAt,
                context: event.payload.context
            });
        });

        this.registerEventHandler('ActionFailed', async (event) => {
            // Update read model with failed action
            this._readModel.push({
                type: 'action',
                actionName: event.payload.actionName,
                status: 'failed',
                error: event.payload.error,
                failedAt: event.metadata.timestamp
            });
        });
    }
}

// Default export for convenience
export default WorkflowEngine;

// Utilities
function deepClone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

// Expose immutable properties via getters
Object.defineProperties(WorkflowEngine.prototype, {
    eventStore: {
        get() { return this._eventStore.map(e => deepClone(e)); }
    },
    readModel: {
        get() { return this._readModel.map(e => deepClone(e)); }
    }
});
