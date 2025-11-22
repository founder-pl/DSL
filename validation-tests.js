// Founder.pl DSL - System walidacji i testów
// Plik zawiera funkcje walidacyjne i testy dla wszystkich komponentów systemu

class DSLValidator {
    constructor() {
        this.validationErrors = [];
        this.testResults = [];
        this.moduleMap = {
            'Platnosci': ['wpłata', 'płatność', 'payment', 'przelew', 'karta'],
            'Finanse': ['faktura', 'invoice', 'księgowość', 'raport', 'finanse', 'accounting'],
            'Reklama': ['kampania', 'reklama', 'marketing', 'retargeting', 'ads'],
            'Marketing': ['newsletter', 'email', 'wiadomość', 'powitalny', 'promocja'],
            'CRM': ['klient', 'crm', 'kontakt', 'customer', 'relacje'],
            'eDoręczenia': ['doręczenie', 'e-doręczenie', 'poczta', 'mail'],
            'Powiadomienia': ['powiadom', 'notification', 'alert', 'inform'],
            'Analiza': ['analiza', 'raport', 'dashboard', 'statystyki', 'metrics']
        };
    }

    // === FUNKCJE WALIDACYJNE ===

    validateInput(value, type, fieldName) {
        const errors = [];
        
        if (value === null || value === undefined) {
            errors.push(`${fieldName} nie może być null lub undefined`);
            return errors;
        }
        
        switch(type) {
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`${fieldName} musi być stringiem`);
                }
                if (value.trim().length === 0) {
                    errors.push(`${fieldName} nie może być pusty`);
                }
                break;
            case 'object':
                if (typeof value !== 'object' || Array.isArray(value)) {
                    errors.push(`${fieldName} musi być obiektem`);
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    errors.push(`${fieldName} musi być tablicą`);
                }
                break;
        }
        
        return errors;
    }

    validateWorkflow(workflow) {
        const errors = [];
        
        if (!workflow) {
            errors.push('Workflow nie może być null');
            return errors;
        }
        
        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            errors.push('Workflow musi zawierać tablicę steps');
            return errors;
        }
        
        workflow.steps.forEach((step, index) => {
            if (!step.id) {
                errors.push(`Step ${index}: brak ID`);
            }
            if (!step.name) {
                errors.push(`Step ${index}: brak nazwy`);
            }
            if (!step.actions || !Array.isArray(step.actions)) {
                errors.push(`Step ${index}: brak tablicy actions`);
            } else {
                step.actions.forEach((action, actionIndex) => {
                    if (!action.id) {
                        errors.push(`Step ${index}, Action ${actionIndex}: brak ID`);
                    }
                    if (!action.name) {
                        errors.push(`Step ${index}, Action ${actionIndex}: brak nazwy`);
                    }
                });
            }
        });
        
        return errors;
    }

    validateNLPSentence(sentence) {
        const errors = [];
        
        const validation = this.validateInput(sentence, 'string', 'sentence');
        if (validation.length > 0) {
            return validation;
        }
        
        // Sprawdź format zdania NLP
        const match = sentence.match(/Gdy (.+?), (.+)/i);
        if (!match) {
            errors.push('Zdanie musi mieć format: "Gdy [warunek], [akcje]"');
        }
        
        return errors;
    }

    validateEventStore(eventStore) {
        const errors = [];
        
        if (!Array.isArray(eventStore)) {
            errors.push('Event Store musi być tablicą');
            return errors;
        }
        
        eventStore.forEach((event, index) => {
            if (!event.actionName) {
                errors.push(`Event ${index}: brak actionName`);
            }
            if (!event.timestamp) {
                errors.push(`Event ${index}: brak timestamp`);
            }
            if (event.timestamp && !this.isValidTimestamp(event.timestamp)) {
                errors.push(`Event ${index}: nieprawidłowy format timestamp`);
            }
        });
        
        return errors;
    }

    isValidTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date instanceof Date && !isNaN(date);
    }

    // === ROZSZERZONE MAPOWANIE MODUŁÓW ===

    getModuleForKeywords(text) {
        const textLower = text.toLowerCase();
        for (const [module, keywords] of Object.entries(this.moduleMap)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return module;
            }
        }
        return 'Default';
    }

    validateModuleMapping(text, expectedModule) {
        const actualModule = this.getModuleForKeywords(text);
        return actualModule === expectedModule;
    }

    // === SYSTEM TESTÓW ===

    runAllTests() {
        this.testResults = [];
        console.log('🧪 Rozpoczynam testy systemu DSL...');
        
        this.testSanitizeId();
        this.testWorkflowValidation();
        this.testNLPParsing();
        this.testModuleMapping();
        this.testEventStore();
        this.testCQRSFlow();
        
        this.displayTestResults();
        return this.testResults;
    }

    testSanitizeId() {
        const testCases = [
            { input: 'Wpłata klienta', expected: 'Wplata_klienta' },
            { input: 'test@#$%^&*()', expected: 'test' },
            { input: '   spacje   ', expected: 'spacje' },
            { input: 'ąćęłńóśźż', expected: 'acelnoszz' }
        ];

        testCases.forEach(testCase => {
            try {
                const result = this.sanitizeIdTest(testCase.input);
                const passed = result === testCase.expected;
                this.testResults.push({
                    test: 'sanitizeId',
                    input: testCase.input,
                    expected: testCase.expected,
                    actual: result,
                    passed: passed
                });
            } catch (error) {
                this.testResults.push({
                    test: 'sanitizeId',
                    input: testCase.input,
                    error: error.message,
                    passed: false
                });
            }
        });
    }

    sanitizeIdTest(text) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return 'invalid_id';
        }
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
            .replace(/[^a-zA-Z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
    }

    testWorkflowValidation() {
        const testCases = [
            {
                name: 'Valid workflow',
                workflow: {
                    steps: [{
                        id: 'test',
                        name: 'Test Step',
                        actions: [{id: 'action1', name: 'Test Action'}]
                    }]
                },
                shouldPass: true
            },
            {
                name: 'Invalid workflow - no steps',
                workflow: {},
                shouldPass: false
            },
            {
                name: 'Invalid workflow - empty steps',
                workflow: { steps: [] },
                shouldPass: true
            }
        ];

        testCases.forEach(testCase => {
            const errors = this.validateWorkflow(testCase.workflow);
            const passed = testCase.shouldPass ? errors.length === 0 : errors.length > 0;
            
            this.testResults.push({
                test: 'validateWorkflow',
                name: testCase.name,
                errors: errors,
                passed: passed
            });
        });
    }

    testNLPParsing() {
        const testCases = [
            {
                sentence: 'Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową.',
                shouldPass: true
            },
            {
                sentence: 'Nieprawidłowe zdanie bez struktury',
                shouldPass: false
            },
            {
                sentence: '',
                shouldPass: false
            }
        ];

        testCases.forEach(testCase => {
            const errors = this.validateNLPSentence(testCase.sentence);
            const passed = testCase.shouldPass ? errors.length === 0 : errors.length > 0;
            
            this.testResults.push({
                test: 'validateNLPSentence',
                sentence: testCase.sentence,
                errors: errors,
                passed: passed
            });
        });
    }

    testModuleMapping() {
        const testCases = [
            { text: 'wpłata klienta', expected: 'Platnosci' },
            { text: 'wystaw fakturę', expected: 'Finanse' },
            { text: 'uruchom kampanię', expected: 'Reklama' },
            { text: 'wyślij newsletter', expected: 'Marketing' },
            { text: 'dodaj do CRM', expected: 'CRM' },
            { text: 'nieznana akcja', expected: 'Default' }
        ];

        testCases.forEach(testCase => {
            const result = this.getModuleForKeywords(testCase.text);
            const passed = result === testCase.expected;
            
            this.testResults.push({
                test: 'moduleMapping',
                text: testCase.text,
                expected: testCase.expected,
                actual: result,
                passed: passed
            });
        });
    }

    testEventStore() {
        const validEventStore = [
            { actionName: 'test action', timestamp: new Date().toISOString() }
        ];
        
        const invalidEventStore = [
            { actionName: '', timestamp: 'invalid' }
        ];

        const validErrors = this.validateEventStore(validEventStore);
        const invalidErrors = this.validateEventStore(invalidEventStore);

        this.testResults.push({
            test: 'validateEventStore',
            name: 'Valid event store',
            errors: validErrors,
            passed: validErrors.length === 0
        });

        this.testResults.push({
            test: 'validateEventStore',
            name: 'Invalid event store',
            errors: invalidErrors,
            passed: invalidErrors.length > 0
        });
    }

    testCQRSFlow() {
        // Test symulacji przepływu CQRS
        const mockEventStore = [];
        const mockReadModel = [];
        
        try {
            // Symulacja komendy
            const command = { actionName: 'test action', timestamp: new Date().toISOString() };
            mockEventStore.push(command);
            
            // Symulacja aktualizacji Read Model
            mockReadModel.push({ actionName: command.actionName, status: 'done', timestamp: command.timestamp });
            
            const passed = mockEventStore.length === 1 && mockReadModel.length === 1;
            
            this.testResults.push({
                test: 'CQRSFlow',
                name: 'Command -> Event -> ReadModel flow',
                passed: passed,
                eventStoreSize: mockEventStore.length,
                readModelSize: mockReadModel.length
            });
        } catch (error) {
            this.testResults.push({
                test: 'CQRSFlow',
                name: 'Command -> Event -> ReadModel flow',
                passed: false,
                error: error.message
            });
        }
    }

    displayTestResults() {
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        
        console.log(`\n📊 Wyniki testów: ${passed}/${total} przeszło pomyślnie`);
        
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.name || result.input || 'Test'}`);
            
            if (!result.passed && result.errors) {
                result.errors.forEach(error => console.log(`   - ${error}`));
            }
            if (!result.passed && result.error) {
                console.log(`   - ${result.error}`);
            }
        });
    }

    // === FUNKCJE POMOCNICZE ===

    generateValidationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passedTests: this.testResults.filter(r => r.passed).length,
            failedTests: this.testResults.filter(r => !r.passed).length,
            validationErrors: this.validationErrors,
            testResults: this.testResults
        };
        
        return report;
    }

    clearErrors() {
        this.validationErrors = [];
        this.testResults = [];
    }
}

// Eksport dla użycia w przeglądarce
if (typeof window !== 'undefined') {
    window.DSLValidator = DSLValidator;
}

// Eksport dla Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSLValidator;
}
