// Core: Event store and read model utilities
// Provides reusable event recording and read model projection

export class EventCore {
  constructor() {
    this.eventStore = [];
    this.readModel = [];
  }

  /**
   * Record an action as an event and update read model
   * @param {string} actionName - Name of the action
   * @param {object} metadata - Optional metadata
   * @returns {object} - Created event
   */
  recordAction(actionName, metadata = {}) {
    if (typeof actionName !== 'string' || actionName.trim().length === 0) {
      throw new Error('Invalid action name');
    }
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'ActionExecuted',
      actionName,
      timestamp: new Date().toISOString(),
      metadata
    };
    this.eventStore.push(event);
    this._processEvent(event);
    return event;
  }

  _processEvent(event) {
    if (event.type === 'ActionExecuted') {
      this.readModel.push({
        type: 'action',
        actionName: event.actionName,
        status: 'done',
        timestamp: event.timestamp,
        metadata: event.metadata
      });
    }
  }

  getEventStore() {
    return [...this.eventStore];
  }

  getReadModel() {
    return [...this.readModel];
  }

  clear() {
    this.eventStore = [];
    this.readModel = [];
  }

  /**
   * Initialize from persisted state
   * @param {{eventStore?: Array, readModel?: Array}} state
   */
  initFromState(state = {}) {
    const { eventStore = [], readModel = null } = state;
    this.eventStore = [...eventStore];
    this.readModel = [];
    // Rebuild read model if not provided
    if (Array.isArray(readModel) && readModel.length) {
      this.readModel = [...readModel];
    } else {
      this.eventStore.forEach(ev => this._processEvent(ev));
    }
  }

  /**
   * Export current state (for persistence)
   */
  toState() {
    return {
      eventStore: [...this.eventStore],
      readModel: [...this.readModel],
      exportedAt: new Date().toISOString()
    };
  }
}

export default EventCore;
