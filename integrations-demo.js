// Integrations Demo - JavaScript Logic
// State management and API interactions

const state = {
  workflows: [],
  config: {
    email: {},
    slack: {},
    teams: {}
  },
  stats: { total: 0, success: 0, errors: 0 }
};

// Log management
function addLog(message, type = 'info') {
  const log = document.getElementById('log-container');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// API helper
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(endpoint, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'API failed');
    return data;
  } catch (e) {
    addLog(`API Error (${endpoint}): ${e.message}`, 'error');
    throw e;
  }
}

// Update stats display
function updateStats() {
  document.getElementById('stat-total').textContent = state.stats.total;
  document.getElementById('stat-success').textContent = state.stats.success;
  document.getElementById('stat-errors').textContent = state.stats.errors;
}

// Load workflows from database
window.loadFromDB = async () => {
  try {
    addLog('Ładowanie procesów z bazy danych...', 'info');
    const data = await apiCall('/api/workflow/db/workflows');
    state.workflows = data.workflows || [];
    renderWorkflows();
    updateSimulationSelect();
    addLog(`Załadowano ${state.workflows.length} procesów z bazy`, 'success');
  } catch (e) {
    addLog(`Błąd ładowania z bazy: ${e.message}`, 'error');
  }
};

// Load workflows from domain files
window.loadFromDomains = async () => {
  try {
    addLog('Ładowanie procesów z domains/*.txt...', 'info');
    const domains = ['Finanse', 'Marketing', 'CRM', 'IT', 'HR', 'Logistyka', 'Administracja', 'Obsługa', 'Sprzedaż'];
    let totalLoaded = 0;
    
    for (const domain of domains) {
      try {
        const response = await fetch(`/domains/${domain}.txt`);
        if (!response.ok) continue;
        
        const text = await response.text();
        const sentences = text.split('\n').filter(s => s.trim().startsWith('Gdy'));
        
        for (const sentence of sentences.slice(0, 3)) { // Limit to 3 per domain for demo
          try {
            const result = await apiCall('/api/workflow/nlp', 'POST', { sentence: sentence.trim() });
            if (result.success && result.workflow?.payload) {
              state.workflows.push(result.workflow.payload);
              totalLoaded++;
            }
          } catch (e) {
            // Skip failed sentences
          }
        }
      } catch (e) {
        console.log(`Pominięto ${domain}: ${e.message}`);
      }
    }
    
    renderWorkflows();
    updateSimulationSelect();
    addLog(`Załadowano ${totalLoaded} procesów z plików`, 'success');
  } catch (e) {
    addLog(`Błąd ładowania: ${e.message}`, 'error');
  }
};

// Render workflows list
function renderWorkflows() {
  const list = document.getElementById('workflows-list');
  if (state.workflows.length === 0) {
    list.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Brak procesów</p>';
    return;
  }
  
  list.innerHTML = state.workflows.map(wf => `
    <div class="workflow-item" onclick="selectWorkflow('${wf.id}')">
      <h4>${wf.name}</h4>
      <p><strong>${wf.module || 'Default'}</strong></p>
      <p>${wf.actions.length} akcji: ${wf.actions.map(a => a.name).slice(0, 2).join(', ')}${wf.actions.length > 2 ? '...' : ''}</p>
    </div>
  `).join('');
}

// Update simulation select dropdown
function updateSimulationSelect() {
  const select = document.getElementById('sim-workflow');
  select.innerHTML = '<option value="">-- Wybierz proces --</option>' + 
    state.workflows.map(wf => `<option value="${wf.id}">${wf.name}</option>`).join('');
}

// Select workflow for simulation
window.selectWorkflow = (id) => {
  document.getElementById('sim-workflow').value = id;
  addLog(`Wybrano: ${state.workflows.find(w => w.id === id)?.name}`, 'info');
};

// Clear workflows
window.clearWorkflows = () => {
  state.workflows = [];
  renderWorkflows();
  updateSimulationSelect();
  addLog('Wyczyszczono procesy', 'info');
};

// Email configuration
window.saveEmailConfig = () => {
  state.config.email = {
    host: document.getElementById('email-host').value,
    port: parseInt(document.getElementById('email-port').value),
    user: document.getElementById('email-user').value,
    pass: document.getElementById('email-pass').value,
    to: document.getElementById('email-to').value
  };
  document.getElementById('email-status').innerHTML = '<span class="status configured">✅ Zapisano</span>';
  addLog('Zapisano konfigurację Email', 'success');
};

window.testEmail = async () => {
  try {
    document.getElementById('email-status').innerHTML = '<span class="status">⏳ Test...</span>';
    addLog('Testowanie Email...', 'info');
    
    const result = await apiCall('/api/notifications/test-email', 'POST', {
      host: document.getElementById('email-host').value || 'smtp.gmail.com',
      port: parseInt(document.getElementById('email-port').value) || 587,
      user: document.getElementById('email-user').value || 'demo@example.com',
      pass: document.getElementById('email-pass').value || 'password',
      to: document.getElementById('email-to').value || 'test@example.com'
    });
    
    document.getElementById('email-status').innerHTML = '<span class="status configured">✅ OK</span>';
    addLog('Email: Test OK', 'success');
  } catch (e) {
    document.getElementById('email-status').innerHTML = '<span class="status not-configured">❌ Błąd</span>';
    addLog(`Email: ${e.message}`, 'error');
  }
};

// Slack configuration
window.saveSlackConfig = () => {
  state.config.slack = {
    webhook: document.getElementById('slack-webhook').value,
    channel: document.getElementById('slack-channel').value
  };
  document.getElementById('slack-status').innerHTML = '<span class="status configured">✅ Zapisano</span>';
  addLog('Zapisano konfigurację Slack', 'success');
};

window.testSlack = async () => {
  try {
    document.getElementById('slack-status').innerHTML = '<span class="status">⏳ Test...</span>';
    addLog('Testowanie Slack...', 'info');
    
    const webhook = document.getElementById('slack-webhook').value;
    if (!webhook || !webhook.startsWith('https://hooks.slack.com')) {
      throw new Error('Podaj poprawny Slack webhook URL');
    }
    
    const result = await apiCall('/api/notifications/test-slack', 'POST', {
      webhook: webhook,
      channel: document.getElementById('slack-channel').value || '#general'
    });
    
    document.getElementById('slack-status').innerHTML = '<span class="status configured">✅ OK</span>';
    addLog('Slack: Test OK', 'success');
  } catch (e) {
    document.getElementById('slack-status').innerHTML = '<span class="status not-configured">❌ Błąd</span>';
    addLog(`Slack: ${e.message}`, 'error');
  }
};

// Teams configuration
window.saveTeamsConfig = () => {
  state.config.teams = {
    webhook: document.getElementById('teams-webhook').value
  };
  document.getElementById('teams-status').innerHTML = '<span class="status configured">✅ Zapisano</span>';
  addLog('Zapisano konfigurację Teams', 'success');
};

window.testTeams = async () => {
  try {
    document.getElementById('teams-status').innerHTML = '<span class="status">⏳ Test...</span>';
    addLog('Testowanie Teams...', 'info');
    
    const webhook = document.getElementById('teams-webhook').value;
    if (!webhook || !webhook.includes('office.com')) {
      throw new Error('Podaj poprawny Teams webhook URL');
    }
    
    const result = await apiCall('/api/notifications/test-teams', 'POST', {
      webhook: webhook
    });
    
    document.getElementById('teams-status').innerHTML = '<span class="status configured">✅ OK</span>';
    addLog('Teams: Test OK', 'success');
  } catch (e) {
    document.getElementById('teams-status').innerHTML = '<span class="status not-configured">❌ Błąd</span>';
    addLog(`Teams: ${e.message}`, 'error');
  }
};

// Run simulation
window.runSimulation = async () => {
  const workflowId = document.getElementById('sim-workflow').value;
  if (!workflowId) {
    addLog('Wybierz proces do symulacji', 'error');
    return;
  }
  
  const workflow = state.workflows.find(w => w.id === workflowId);
  if (!workflow) {
    addLog('Nie znaleziono procesu', 'error');
    return;
  }
  
  const useEmail = document.getElementById('sim-email').checked;
  const useSlack = document.getElementById('sim-slack').checked;
  const useTeams = document.getElementById('sim-teams').checked;
  
  if (!useEmail && !useSlack && !useTeams) {
    addLog('Wybierz przynajmniej jeden kanał', 'error');
    return;
  }
  
  addLog(`🚀 Start symulacji: ${workflow.name}`, 'info');
  const resultDiv = document.getElementById('sim-result');
  resultDiv.innerHTML = '<div class="alert alert-info">⏳ Symulacja w toku...</div>';
  
  state.stats.total++;
  updateStats();
  
  let successCount = 0;
  let errorCount = 0;
  
  // Execute each action and send notifications
  for (let i = 0; i < workflow.actions.length; i++) {
    const action = workflow.actions[i];
    addLog(`Akcja ${i+1}/${workflow.actions.length}: ${action.name}`, 'info');
    
    const message = `Proces: ${workflow.name}\nAkcja: ${action.name}\nModuł: ${action.module || 'Default'}\nKrok: ${i+1}/${workflow.actions.length}`;
    
    // Send to selected channels
    if (useEmail && state.config.email.to) {
      try {
        await apiCall('/api/notifications/send', 'POST', {
          channel: 'email',
          config: state.config.email,
          subject: `DSL: ${workflow.name}`,
          message: message
        });
        addLog(`✉️ Email wysłany dla: ${action.name}`, 'success');
        successCount++;
      } catch (e) {
        addLog(`❌ Email failed: ${e.message}`, 'error');
        errorCount++;
      }
    }
    
    if (useSlack && state.config.slack.webhook) {
      try {
        await apiCall('/api/notifications/send', 'POST', {
          channel: 'slack',
          config: state.config.slack,
          message: message
        });
        addLog(`💬 Slack wysłany dla: ${action.name}`, 'success');
        successCount++;
      } catch (e) {
        addLog(`❌ Slack failed: ${e.message}`, 'error');
        errorCount++;
      }
    }
    
    if (useTeams && state.config.teams.webhook) {
      try {
        await apiCall('/api/notifications/send', 'POST', {
          channel: 'teams',
          config: state.config.teams,
          message: message
        });
        addLog(`🏢 Teams wysłany dla: ${action.name}`, 'success');
        successCount++;
      } catch (e) {
        addLog(`❌ Teams failed: ${e.message}`, 'error');
        errorCount++;
      }
    }
    
    // Small delay between actions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  state.stats.success += successCount;
  state.stats.errors += errorCount;
  updateStats();
  
  const total = workflow.actions.length * [useEmail, useSlack, useTeams].filter(x => x).length;
  resultDiv.innerHTML = `
    <div class="alert ${errorCount > 0 ? 'alert-error' : 'alert-success'}">
      ✅ Symulacja zakończona!<br>
      Proces: <strong>${workflow.name}</strong><br>
      Akcje: ${workflow.actions.length}<br>
      Powiadomienia wysłane: ${successCount}/${total}<br>
      Błędy: ${errorCount}
    </div>
  `;
  
  addLog(`✅ Symulacja zakończona: ${successCount} sukces, ${errorCount} błędów`, successCount > errorCount ? 'success' : 'error');
};

// Clear logs
window.clearLogs = () => {
  document.getElementById('log-container').innerHTML = '<div class="log-entry info">Logi wyczyszczone...</div>';
  addLog('System gotowy', 'info');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  addLog('Środowisko demo załadowane', 'success');
  addLog('Skonfiguruj integracje i załaduj procesy aby rozpocząć', 'info');
});
