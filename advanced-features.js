// Founder.pl DSL - Zaawansowane funkcje
// Dodatkowe funkcjonalności dla systemu workflow

class AdvancedWorkflowFeatures {
    constructor() {
        this.workflowHistory = [];
        this.scheduledTasks = [];
        this.webhooks = [];
        this.conditions = [];
        this.metrics = {
            executedActions: 0,
            failedActions: 0,
            totalWorkflowRuns: 0,
            averageExecutionTime: 0
        };
    }

    // === ZAAWANSOWANE NLP ===
    
    parseComplexSentence(sentence) {
        const patterns = {
            // Warunki czasowe
            temporal: /(?:gdy|kiedy|po|przed|za|w ciągu)\s+(.+?),\s*(.+)/i,
            // Warunki logiczne
            conditional: /(?:jeśli|jeżeli|gdy)\s+(.+?)\s+(?:to|wtedy)\s+(.+)/i,
            // Sekwencje akcji
            sequence: /(?:najpierw|następnie|potem|na końcu)\s+(.+)/i,
            // Warunki wartości
            value: /(?:gdy|jeśli)\s+(.+?)\s*(?:>|<|=|>=|<=)\s*(.+?),\s*(.+)/i,
            // Pętle i powtórzenia
            loop: /(?:powtarzaj|wykonuj)\s+(.+?)\s+(?:dopóki|aż|przez)\s+(.+)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = sentence.match(pattern);
            if (match) {
                return this.processAdvancedPattern(type, match);
            }
        }

        // Fallback do podstawowego parsera
        return this.parseBasicSentence(sentence);
    }

    processAdvancedPattern(type, match) {
        switch (type) {
            case 'temporal':
                return this.createTemporalWorkflow(match[1], match[2]);
            case 'conditional':
                return this.createConditionalWorkflow(match[1], match[2]);
            case 'value':
                return this.createValueBasedWorkflow(match[1], match[2], match[3]);
            case 'loop':
                return this.createLoopWorkflow(match[1], match[2]);
            default:
                return this.parseBasicSentence(match[0]);
        }
    }

    createTemporalWorkflow(condition, actions) {
        return {
            type: 'temporal',
            condition: condition.trim(),
            actions: this.parseActions(actions),
            schedule: this.extractTimeInfo(condition),
            module: this.getModuleForKeywords(condition + ' ' + actions)
        };
    }

    createConditionalWorkflow(condition, actions) {
        return {
            type: 'conditional',
            condition: this.parseCondition(condition),
            actions: this.parseActions(actions),
            module: this.getModuleForKeywords(condition + ' ' + actions)
        };
    }

    // === SYSTEM WARUNKÓW ===

    parseCondition(conditionText) {
        const operators = {
            'większe niż': '>',
            'mniejsze niż': '<',
            'równe': '=',
            'różne od': '!=',
            'zawiera': 'contains',
            'nie zawiera': '!contains'
        };

        let parsedCondition = {
            field: '',
            operator: '=',
            value: '',
            raw: conditionText
        };

        // Parsowanie warunków z operatorami
        for (const [polish, operator] of Object.entries(operators)) {
            if (conditionText.includes(polish)) {
                const parts = conditionText.split(polish);
                parsedCondition.field = parts[0].trim();
                parsedCondition.operator = operator;
                parsedCondition.value = parts[1] ? parts[1].trim() : '';
                break;
            }
        }

        return parsedCondition;
    }

    evaluateCondition(condition, context = {}) {
        const { field, operator, value } = condition;
        const fieldValue = this.getFieldValue(field, context);

        switch (operator) {
            case '>':
                return parseFloat(fieldValue) > parseFloat(value);
            case '<':
                return parseFloat(fieldValue) < parseFloat(value);
            case '=':
                return fieldValue === value;
            case '!=':
                return fieldValue !== value;
            case 'contains':
                return String(fieldValue).includes(value);
            case '!contains':
                return !String(fieldValue).includes(value);
            default:
                return false;
        }
    }

    // === HARMONOGRAM ZADAŃ ===

    scheduleTask(task, schedule) {
        const scheduledTask = {
            id: this.generateId(),
            task: task,
            schedule: schedule,
            nextRun: this.calculateNextRun(schedule),
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };

        this.scheduledTasks.push(scheduledTask);
        return scheduledTask;
    }

    calculateNextRun(schedule) {
        const now = new Date();
        
        if (schedule.type === 'interval') {
            return new Date(now.getTime() + schedule.minutes * 60000);
        } else if (schedule.type === 'daily') {
            const nextRun = new Date(now);
            nextRun.setHours(schedule.hour, schedule.minute, 0, 0);
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            return nextRun;
        } else if (schedule.type === 'weekly') {
            const nextRun = new Date(now);
            const daysUntilTarget = (schedule.dayOfWeek - now.getDay() + 7) % 7;
            nextRun.setDate(now.getDate() + daysUntilTarget);
            nextRun.setHours(schedule.hour, schedule.minute, 0, 0);
            return nextRun;
        }

        return new Date(now.getTime() + 3600000); // Domyślnie za godzinę
    }

    // === WEBHOOKS I INTEGRACJE ===

    registerWebhook(url, events, config = {}) {
        const webhook = {
            id: this.generateId(),
            url: url,
            events: Array.isArray(events) ? events : [events],
            config: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...config
            },
            status: 'active',
            createdAt: new Date().toISOString(),
            lastTriggered: null,
            triggerCount: 0
        };

        this.webhooks.push(webhook);
        return webhook;
    }

    async triggerWebhooks(eventType, data) {
        const relevantWebhooks = this.webhooks.filter(
            webhook => webhook.events.includes(eventType) && webhook.status === 'active'
        );

        const results = [];
        for (const webhook of relevantWebhooks) {
            try {
                const result = await this.callWebhook(webhook, eventType, data);
                webhook.lastTriggered = new Date().toISOString();
                webhook.triggerCount++;
                results.push({ webhook: webhook.id, success: true, result });
            } catch (error) {
                results.push({ webhook: webhook.id, success: false, error: error.message });
            }
        }

        return results;
    }

    async callWebhook(webhook, eventType, data) {
        const payload = {
            event: eventType,
            timestamp: new Date().toISOString(),
            data: data,
            webhook_id: webhook.id
        };

        // Symulacja wywołania webhook (w rzeczywistości użyj fetch)
        console.log(`🔗 Webhook ${webhook.id}: ${webhook.url}`, payload);
        return { status: 'sent', payload };
    }

    // === METRYKI I ANALITYKA ===

    recordMetric(type, value, metadata = {}) {
        const metric = {
            type: type,
            value: value,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };

        // Aktualizuj metryki główne
        switch (type) {
            case 'action_executed':
                this.metrics.executedActions++;
                break;
            case 'action_failed':
                this.metrics.failedActions++;
                break;
            case 'workflow_run':
                this.metrics.totalWorkflowRuns++;
                break;
        }

        return metric;
    }

    getMetricsSummary() {
        const successRate = this.metrics.executedActions > 0 
            ? ((this.metrics.executedActions - this.metrics.failedActions) / this.metrics.executedActions * 100).toFixed(2)
            : 0;

        return {
            ...this.metrics,
            successRate: `${successRate}%`,
            generatedAt: new Date().toISOString()
        };
    }

    // === WORKFLOW TEMPLATES ===

    createWorkflowTemplate(name, description, steps) {
        return {
            id: this.generateId(),
            name: name,
            description: description,
            steps: steps,
            category: this.categorizeWorkflow(steps),
            createdAt: new Date().toISOString(),
            usageCount: 0
        };
    }

    getWorkflowTemplates() {
        return [
            {
                name: 'E-commerce Order Processing',
                description: 'Automatyczny proces obsługi zamówień',
                steps: [
                    { name: 'Weryfikacja płatności', module: 'Platnosci' },
                    { name: 'Aktualizacja magazynu', module: 'Magazyn' },
                    { name: 'Wysłanie potwierdzenia', module: 'Marketing' },
                    { name: 'Generowanie faktury', module: 'Finanse' }
                ]
            },
            {
                name: 'Customer Onboarding',
                description: 'Proces wdrażania nowych klientów',
                steps: [
                    { name: 'Wysłanie powitalnej wiadomości', module: 'Marketing' },
                    { name: 'Dodanie do CRM', module: 'CRM' },
                    { name: 'Przypisanie opiekuna', module: 'CRM' },
                    { name: 'Zaplanowanie spotkania', module: 'Kalendarz' }
                ]
            },
            {
                name: 'Invoice Processing',
                description: 'Automatyczne przetwarzanie faktur',
                steps: [
                    { name: 'Walidacja danych', module: 'Finanse' },
                    { name: 'Księgowanie', module: 'Finanse' },
                    { name: 'Wysłanie do klienta', module: 'eDoręczenia' },
                    { name: 'Monitoring płatności', module: 'Platnosci' }
                ]
            }
        ];
    }

    // === FUNKCJE POMOCNICZE ===

    parseActions(actionsText) {
        return actionsText.split(/\s+(?:i|oraz|a także|następnie)\s+/)
            .map(action => action.trim().replace(/\.$/, ''))
            .filter(action => action.length > 0)
            .map(action => ({
                id: this.generateId(),
                name: action,
                module: this.getModuleForKeywords(action)
            }));
    }

    extractTimeInfo(text) {
        const timePatterns = {
            minutes: /(\d+)\s*minut/i,
            hours: /(\d+)\s*godzin/i,
            days: /(\d+)\s*dni/i,
            daily: /codziennie|każdego dnia/i,
            weekly: /co tydzień|tygodniowo/i,
            monthly: /co miesiąc|miesięcznie/i
        };

        for (const [type, pattern] of Object.entries(timePatterns)) {
            const match = text.match(pattern);
            if (match) {
                return {
                    type: type,
                    value: match[1] ? parseInt(match[1]) : 1,
                    raw: match[0]
                };
            }
        }

        return { type: 'immediate', value: 0 };
    }

    getModuleForKeywords(text) {
        const moduleMap = {
            'Platnosci': ['wpłata', 'płatność', 'payment', 'przelew', 'karta', 'transakcja'],
            'Finanse': ['faktura', 'invoice', 'księgowość', 'raport', 'finanse', 'accounting', 'VAT'],
            'Reklama': ['kampania', 'reklama', 'marketing', 'retargeting', 'ads', 'promocja'],
            'Marketing': ['newsletter', 'email', 'wiadomość', 'powitalny', 'komunikacja'],
            'CRM': ['klient', 'crm', 'kontakt', 'customer', 'relacje', 'opiekun'],
            'eDoręczenia': ['doręczenie', 'e-doręczenie', 'poczta', 'mail', 'wysłanie'],
            'Powiadomienia': ['powiadom', 'notification', 'alert', 'inform', 'komunikat'],
            'Analiza': ['analiza', 'raport', 'dashboard', 'statystyki', 'metrics', 'dane'],
            'Magazyn': ['magazyn', 'stock', 'inventory', 'towar', 'produkt'],
            'Kalendarz': ['spotkanie', 'termin', 'kalendarz', 'planowanie', 'rezerwacja']
        };
        
        const textLower = text.toLowerCase();
        for (const [module, keywords] of Object.entries(moduleMap)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return module;
            }
        }
        return 'Default';
    }

    getFieldValue(field, context) {
        // Pobierz wartość pola z kontekstu
        const fieldPath = field.split('.');
        let value = context;
        
        for (const part of fieldPath) {
            value = value && value[part];
        }
        
        return value !== undefined ? value : '';
    }

    categorizeWorkflow(steps) {
        const categories = {
            'ecommerce': ['zamówienie', 'płatność', 'magazyn', 'dostawa'],
            'marketing': ['kampania', 'newsletter', 'klient', 'promocja'],
            'finance': ['faktura', 'księgowość', 'raport', 'VAT'],
            'crm': ['klient', 'kontakt', 'relacje', 'sprzedaż']
        };

        const stepText = steps.map(s => s.name).join(' ').toLowerCase();
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => stepText.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    parseBasicSentence(sentence) {
        // Fallback do podstawowego parsera
        const match = sentence.match(/Gdy (.+?), (.+)/i);
        if (match) {
            return {
                type: 'basic',
                condition: match[1].trim(),
                actions: this.parseActions(match[2]),
                module: this.getModuleForKeywords(match[1] + ' ' + match[2])
            };
        }
        return null;
    }
}

// === ROZSZERZENIA DIAGRAMU ===

class DiagramEnhancements {
    constructor() {
        this.nodeStyles = {
            'Platnosci': { fill: '#28a745', stroke: '#1e7e34' },
            'Finanse': { fill: '#007bff', stroke: '#0056b3' },
            'Reklama': { fill: '#fd7e14', stroke: '#e55a00' },
            'Marketing': { fill: '#e83e8c', stroke: '#d91a72' },
            'CRM': { fill: '#6f42c1', stroke: '#59359a' },
            'eDoręczenia': { fill: '#20c997', stroke: '#17a085' },
            'Powiadomienia': { fill: '#ffc107', stroke: '#e0a800' },
            'Analiza': { fill: '#6c757d', stroke: '#545b62' }
        };
    }

    generateEnhancedMermaid(workflow) {
        let code = "flowchart TD\n";
        
        // Dodaj style dla modułów
        Object.entries(this.nodeStyles).forEach(([module, style]) => {
            code += `    classDef ${module.toLowerCase()} fill:${style.fill},stroke:${style.stroke},stroke-width:2px,color:#fff;\n`;
        });
        
        // Generuj węzły z kolorami
        const modules = {};
        workflow.steps.forEach(step => {
            const mod = step.module || "Default";
            if (!modules[mod]) modules[mod] = [];
            modules[mod].push(step);
        });

        Object.keys(modules).forEach(mod => {
            code += `    subgraph ${mod}[${mod}]\n`;
            modules[mod].forEach(step => {
                const stepId = this.sanitizeId(step.id);
                const className = mod.toLowerCase();
                code += `        ${stepId}["${step.name}"]:::${className}\n`;
                
                step.actions.forEach((action, i) => {
                    const actionId = this.sanitizeId(action.id);
                    const actionClass = action.module ? action.module.toLowerCase() : 'default';
                    code += `        ${actionId}["${action.name}"]:::${actionClass}\n`;
                    code += `        ${stepId} --> ${actionId}\n`;
                });
            });
            code += `    end\n`;
        });

        return code;
    }

    sanitizeId(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
            .replace(/[^a-zA-Z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
    }
}

// Eksport dla użycia w przeglądarce
if (typeof window !== 'undefined') {
    window.AdvancedWorkflowFeatures = AdvancedWorkflowFeatures;
    window.DiagramEnhancements = DiagramEnhancements;
}

// Eksport dla Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedWorkflowFeatures, DiagramEnhancements };
}
