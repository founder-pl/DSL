// Core: Advanced projections for Read Model and Event Store

export function projectModuleActionCounts(readModel = []) {
  const byModule = {};
  readModel.filter(e => e.type === 'action').forEach(e => {
    const mod = e.module || e.context?.module || 'Default';
    byModule[mod] = (byModule[mod] || 0) + 1;
  });
  return byModule;
}

export function projectWorkflowStatuses(readModel = []) {
  // status per workflow id (created -> executed actions count)
  const statuses = {};
  readModel.forEach(e => {
    if (e.type === 'workflow') {
      statuses[e.id] = statuses[e.id] || { id: e.id, name: e.name, module: e.module, actions: 0 };
    } else if (e.type === 'action') {
      const wfId = e.context?.workflowId || 'unknown';
      statuses[wfId] = statuses[wfId] || { id: wfId, name: wfId, module: 'Default', actions: 0 };
      statuses[wfId].actions += 1;
    }
  });
  return Object.values(statuses);
}

export function projectTimeline(events = []) {
  return events
    .slice()
    .sort((a, b) => new Date(a.metadata?.timestamp || a.timestamp) - new Date(b.metadata?.timestamp || b.timestamp))
    .map(e => ({ id: e.id, type: e.type, time: e.metadata?.timestamp || e.timestamp, label: e.payload?.actionName || e.actionName || '' }));
}

export function projectOverview(events = [], readModel = []) {
  const actionsExecuted = events.filter(e => e.type === 'ActionExecuted').length;
  const actionsFailed = events.filter(e => e.type === 'ActionFailed').length;
  const workflows = events.filter(e => e.type === 'WorkflowCreated').length;
  const byModule = projectModuleActionCounts(readModel);
  return {
    actionsExecuted, actionsFailed, workflows, byModule,
    generatedAt: new Date().toISOString()
  };
}

export default { projectModuleActionCounts, projectWorkflowStatuses, projectTimeline, projectOverview };
