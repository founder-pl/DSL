// Core module: Module mapping utilities
// Reusable module mapping for both frontend and backend

export class ModuleMapper {
    constructor() {
        this.moduleMap = {
            'Platnosci': [
                'wpłata', 'płatność', 'payment', 'przelew', 'karta', 'transakcja', 'płaci',
                'opłata', 'zapłata', 'należność', 'rozliczenie', 'fakturowanie'
            ],
            'Finanse': [
                'faktura', 'fakturę', 'invoice', 'księgowość', 'raport', 'finanse', 'accounting',
                'wystaw', 'wystawić', 'księgowanie', 'bilans', 'rachunek', 'kosztorys'
            ],
            'Reklama': [
                'kampania', 'kampanię', 'reklama', 'marketing', 'retargeting', 'ads',
                'uruchom', 'uruchamianie', 'promocja', 'advertise', 'bannery'
            ],
            'Marketing': [
                'newsletter', 'email', 'wiadomość', 'powitalny', 'promocja', 'wyślij', 'wysłanie',
                'komunikacja', 'mailing', 'kampania mailowa', 'powiadomienie'
            ],
            'CRM': [
                'klient', 'crm', 'kontakt', 'customer', 'relacje', 'dodaj do crm', 'dodaj',
                'zarządzanie klientami', 'baza klientów', 'lead', 'prospect'
            ],
            'eDoręczenia': [
                'doręczenie', 'e-doręczenie', 'poczta', 'mail', 'wysłanie',
                'elektroniczne doręczenie', 'epuap', 'pup'
            ],
            'Powiadomienia': [
                'powiadom', 'notification', 'alert', 'inform', 'komunikat',
                'zawiadom', 'poinformuj', 'ostrzeż', 'przypomnienie'
            ],
            'Analiza': [
                'analiza', 'raport', 'dashboard', 'statystyki', 'metrics', 'dane',
                'analytics', 'reporting', 'zestawienie', 'podsumowanie'
            ],
            'Magazyn': [
                'magazyn', 'stock', 'inventory', 'towar', 'produkt', 'zapas',
                'składnica', 'inwentarz', 'stan magazynowy'
            ],
            'Logistyka': [
                'dostawa', 'transport', 'wysyłka', 'kurier', 'shipping',
                'przesyłka', 'dystrybucja', 'dostarczenie'
            ],
            'HR': [
                'pracownik', 'employee', 'kadry', 'hr', 'human resources',
                'zatrudnienie', 'rekrutacja', 'zespół'
            ],
            'Bezpieczeństwo': [
                'security', 'bezpieczeństwo', 'autoryzacja', 'authentication',
                'login', 'hasło', 'dostęp', 'uprawnienia'
            ]
        };

        // Create reverse mapping for faster lookups
        this.keywordToModule = {};
        for (const [module, keywords] of Object.entries(this.moduleMap)) {
            keywords.forEach(keyword => {
                this.keywordToModule[keyword.toLowerCase()] = module;
            });
        }
    }

    /**
     * Get module for given text based on keywords
     * @param {string} text - Input text to analyze
     * @returns {string} - Module name or 'Default'
     */
    getModuleForKeywords(text) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return 'Default';
        }
        
        const textLower = text.toLowerCase();
        
        // First try exact keyword match (faster)
        for (const [keyword, module] of Object.entries(this.keywordToModule)) {
            if (textLower.includes(keyword)) {
                return module;
            }
        }
        
        // Fallback to original method for partial matches
        for (const [module, keywords] of Object.entries(this.moduleMap)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return module;
            }
        }
        
        return 'Default';
    }

    /**
     * Get all possible modules for text with confidence scores
     * @param {string} text - Input text to analyze
     * @returns {Array} - Array of {module, confidence, keywords} objects
     */
    getModulesWithConfidence(text) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return [{ module: 'Default', confidence: 1.0, keywords: [] }];
        }
        
        const textLower = text.toLowerCase();
        const results = [];
        
        for (const [module, keywords] of Object.entries(this.moduleMap)) {
            const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword));
            
            if (matchedKeywords.length > 0) {
                const confidence = matchedKeywords.length / keywords.length;
                results.push({
                    module,
                    confidence,
                    keywords: matchedKeywords
                });
            }
        }
        
        // Sort by confidence descending
        results.sort((a, b) => b.confidence - a.confidence);
        
        return results.length > 0 ? results : [{ module: 'Default', confidence: 1.0, keywords: [] }];
    }

    /**
     * Add new module with keywords
     * @param {string} moduleName - Name of the module
     * @param {Array} keywords - Array of keywords
     * @returns {boolean} - Success status
     */
    addModule(moduleName, keywords) {
        if (typeof moduleName !== 'string' || !Array.isArray(keywords)) {
            return false;
        }
        
        this.moduleMap[moduleName] = keywords;
        
        // Update reverse mapping
        keywords.forEach(keyword => {
            this.keywordToModule[keyword.toLowerCase()] = moduleName;
        });
        
        return true;
    }

    /**
     * Remove module
     * @param {string} moduleName - Name of the module to remove
     * @returns {boolean} - Success status
     */
    removeModule(moduleName) {
        if (!this.moduleMap[moduleName]) {
            return false;
        }
        
        // Remove from reverse mapping
        const keywords = this.moduleMap[moduleName];
        keywords.forEach(keyword => {
            delete this.keywordToModule[keyword.toLowerCase()];
        });
        
        delete this.moduleMap[moduleName];
        return true;
    }

    /**
     * Get all available modules
     * @returns {Array} - Array of module names
     */
    getAllModules() {
        return Object.keys(this.moduleMap);
    }

    /**
     * Get keywords for specific module
     * @param {string} moduleName - Name of the module
     * @returns {Array} - Array of keywords or empty array
     */
    getKeywordsForModule(moduleName) {
        return this.moduleMap[moduleName] || [];
    }

    /**
     * Validate module mapping configuration
     * @returns {object} - Validation result with errors
     */
    validate() {
        const errors = [];
        const warnings = [];
        const duplicateKeywords = {};
        
        // Basic schema checks
        if (!this.moduleMap || typeof this.moduleMap !== 'object') {
            errors.push('moduleMap is not an object');
        }
        
        // Check for duplicate keywords across modules (warning only)
        for (const [module, keywords] of Object.entries(this.moduleMap || {})) {
            if (!Array.isArray(keywords)) {
                errors.push(`Keywords for module ${module} must be an array`);
                continue;
            }
            keywords.forEach(keyword => {
                const lowerKeyword = String(keyword).toLowerCase();
                if (duplicateKeywords[lowerKeyword] && duplicateKeywords[lowerKeyword] !== module) {
                    warnings.push(`Duplicate keyword '${keyword}' in modules: ${duplicateKeywords[lowerKeyword]} and ${module}`);
                } else {
                    duplicateKeywords[lowerKeyword] = module;
                }
            });
        }
        
        return {
            isValid: errors.length === 0, // duplicates do not invalidate config
            errors,
            warnings
        };
    }

    /**
     * Export module mapping configuration
     * @returns {object} - Module mapping configuration
     */
    exportConfig() {
        return {
            moduleMap: { ...this.moduleMap },
            metadata: {
                totalModules: Object.keys(this.moduleMap).length,
                totalKeywords: Object.keys(this.keywordToModule).length,
                exportedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Import module mapping configuration
     * @param {object} config - Module mapping configuration
     * @returns {boolean} - Success status
     */
    importConfig(config) {
        if (!config || !config.moduleMap) {
            return false;
        }
        
        try {
            this.moduleMap = { ...config.moduleMap };
            
            // Rebuild reverse mapping
            this.keywordToModule = {};
            for (const [module, keywords] of Object.entries(this.moduleMap)) {
                keywords.forEach(keyword => {
                    this.keywordToModule[keyword.toLowerCase()] = module;
                });
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Default export for convenience
export default ModuleMapper;
