// Core module: Text sanitization utilities
// Reusable sanitization functions for both frontend and backend

export class TextSanitizer {
    constructor() {
        this.polishMap = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
        };
    }

    /**
     * Sanitizes text for use as ID
     * @param {string} text - Input text
     * @returns {string} - Sanitized ID
     */
    sanitizeId(text) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return 'invalid_id';
        }
        
        let result = text.trim();
        
        // Replace Polish characters
        for (const [polish, latin] of Object.entries(this.polishMap)) {
            result = result.replace(new RegExp(polish, 'g'), latin);
        }
        
        // Normalize and remove diacritics
        result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Replace invalid characters with underscores
        result = result.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Remove multiple underscores
        result = result.replace(/_+/g, '_');
        
        // Remove leading and trailing underscores
        result = result.replace(/^_|_$/g, '');
        
        return result || 'sanitized_id';
    }

    /**
     * Sanitizes text for display
     * @param {string} text - Input text
     * @returns {string} - Sanitized display text
     */
    sanitizeDisplay(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        return text
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/\s+/g, ' '); // Normalize whitespace
    }

    /**
     * Sanitizes text for URL slug
     * @param {string} text - Input text
     * @returns {string} - URL-safe slug
     */
    sanitizeSlug(text) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return 'slug';
        }
        
        let result = text.toLowerCase().trim();
        
        // Replace Polish characters
        for (const [polish, latin] of Object.entries(this.polishMap)) {
            result = result.replace(new RegExp(polish.toLowerCase(), 'g'), latin);
        }
        
        // Normalize and remove diacritics
        result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Replace spaces and invalid characters with hyphens
        result = result.replace(/[^a-z0-9-]/g, '-');
        
        // Remove leading and trailing hyphens
        result = result.replace(/^-|-$/g, '');
        
        return result || 'slug';
    }

    /**
     * Validates and sanitizes email
     * @param {string} email - Input email
     * @returns {object} - {isValid: boolean, sanitized: string}
     */
    sanitizeEmail(email) {
        if (typeof email !== 'string') {
            return { isValid: false, sanitized: '' };
        }
        
        const sanitized = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        return {
            isValid: emailRegex.test(sanitized),
            sanitized: sanitized
        };
    }

    /**
     * Batch sanitization for multiple texts
     * @param {Array} texts - Array of texts to sanitize
     * @param {string} method - Sanitization method ('id', 'display', 'slug')
     * @returns {Array} - Array of sanitized texts
     */
    batchSanitize(texts, method = 'id') {
        if (!Array.isArray(texts)) {
            return [];
        }
        
        const methodMap = {
            'id': this.sanitizeId.bind(this),
            'display': this.sanitizeDisplay.bind(this),
            'slug': this.sanitizeSlug.bind(this)
        };
        
        const sanitizeFunc = methodMap[method] || this.sanitizeId.bind(this);
        
        return texts.map(text => sanitizeFunc(text));
    }
}

// Default export for convenience
export default TextSanitizer;
