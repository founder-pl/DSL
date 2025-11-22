// Test runner for coordinating all tests
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestRunner {
    constructor() {
        this.results = {
            backend: null,
            frontend: null,
            integration: null
        };
    }
    
    async runBackendTests() {
        console.log('🔧 Running Backend Tests...');
        
        try {
            const testFile = join(__dirname, 'backend.test.js');
            const result = await this.runNodeTest(testFile);
            
            this.results.backend = {
                success: result.success,
                output: result.output,
                errors: result.errors,
                timestamp: new Date().toISOString()
            };
            
            return this.results.backend;
        } catch (error) {
            this.results.backend = {
                success: false,
                output: '',
                errors: [error.message],
                timestamp: new Date().toISOString()
            };
            return this.results.backend;
        }
    }
    
    async runFrontendTests() {
        console.log('🌐 Running Frontend Tests...');
        
        try {
            const testFile = join(__dirname, 'frontend.test.js');
            const result = await this.runNodeTest(testFile);
            
            this.results.frontend = {
                success: result.success,
                output: result.output,
                errors: result.errors,
                timestamp: new Date().toISOString()
            };
            
            return this.results.frontend;
        } catch (error) {
            this.results.frontend = {
                success: false,
                output: '',
                errors: [error.message],
                timestamp: new Date().toISOString()
            };
            return this.results.frontend;
        }
    }
    
    async runIntegrationTests() {
        console.log('🔗 Running Integration Tests...');
        
        try {
            const testFile = join(__dirname, 'integration.test.js');
            const result = await this.runNodeTest(testFile);
            
            this.results.integration = {
                success: result.success,
                output: result.output,
                errors: result.errors,
                timestamp: new Date().toISOString()
            };
            
            return this.results.integration;
        } catch (error) {
            this.results.integration = {
                success: false,
                output: '',
                errors: [error.message],
                timestamp: new Date().toISOString()
            };
            return this.results.integration;
        }
    }
    
    async runAllTests() {
        console.log('🧪 Running All Tests...');
        
        const startTime = Date.now();
        
        // Run tests in sequence to avoid conflicts
        await this.runBackendTests();
        await this.runFrontendTests();
        await this.runIntegrationTests();
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const summary = this.generateSummary();
        summary.totalTime = totalTime;
        
        console.log('📊 Test Summary:');
        console.log(`   Backend: ${summary.backend.success ? '✅' : '❌'}`);
        console.log(`   Frontend: ${summary.frontend.success ? '✅' : '❌'}`);
        console.log(`   Integration: ${summary.integration.success ? '✅' : '❌'}`);
        console.log(`   Total time: ${totalTime}ms`);
        
        return summary;
    }
    
    async runNodeTest(testFile) {
        return new Promise((resolve) => {
            const child = spawn('node', ['--test', testFile], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let errors = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                errors += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output,
                    errors: errors ? [errors] : [],
                    exitCode: code
                });
            });
            
            child.on('error', (error) => {
                resolve({
                    success: false,
                    output: '',
                    errors: [error.message],
                    exitCode: -1
                });
            });
        });
    }
    
    generateSummary() {
        const summary = {
            backend: this.results.backend || { success: false, errors: ['Not run'] },
            frontend: this.results.frontend || { success: false, errors: ['Not run'] },
            integration: this.results.integration || { success: false, errors: ['Not run'] },
            overall: {
                success: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0
            },
            timestamp: new Date().toISOString()
        };
        
        // Calculate overall success
        const testResults = [summary.backend, summary.frontend, summary.integration];
        summary.overall.totalTests = testResults.length;
        summary.overall.passedTests = testResults.filter(r => r.success).length;
        summary.overall.failedTests = summary.overall.totalTests - summary.overall.passedTests;
        summary.overall.success = summary.overall.failedTests === 0;
        
        return summary;
    }
    
    generateReport(format = 'markdown') {
        const summary = this.generateSummary();
        
        if (format === 'markdown') {
            return this.generateMarkdownReport(summary);
        } else if (format === 'json') {
            return JSON.stringify(summary, null, 2);
        } else if (format === 'html') {
            return this.generateHTMLReport(summary);
        }
        
        return summary;
    }
    
    generateMarkdownReport(summary) {
        const timestamp = new Date().toLocaleString('pl-PL');
        
        let report = `# 🧪 Raport Testów Modularnych - Founder.pl DSL\n\n`;
        report += `**Data wygenerowania:** ${timestamp}\n\n`;
        
        // Overall summary
        report += `## 📊 Podsumowanie Ogólne\n\n`;
        report += `- **Status:** ${summary.overall.success ? '✅ SUKCES' : '❌ BŁĘDY'}\n`;
        report += `- **Łączna liczba grup testów:** ${summary.overall.totalTests}\n`;
        report += `- **Grupy zakończone sukcesem:** ${summary.overall.passedTests}\n`;
        report += `- **Grupy z błędami:** ${summary.overall.failedTests}\n`;
        report += `- **Procent sukcesu:** ${Math.round((summary.overall.passedTests / summary.overall.totalTests) * 100)}%\n\n`;
        
        // Backend tests
        report += `## 🔧 Testy Backend (Node.js)\n\n`;
        report += `**Status:** ${summary.backend.success ? '✅ Sukces' : '❌ Błędy'}\n\n`;
        if (summary.backend.output) {
            report += `**Wyniki:**\n\`\`\`\n${summary.backend.output}\n\`\`\`\n\n`;
        }
        if (summary.backend.errors && summary.backend.errors.length > 0) {
            report += `**Błędy:**\n`;
            summary.backend.errors.forEach(error => {
                report += `- ${error}\n`;
            });
            report += `\n`;
        }
        
        // Frontend tests
        report += `## 🌐 Testy Frontend (Symulowane)\n\n`;
        report += `**Status:** ${summary.frontend.success ? '✅ Sukces' : '❌ Błędy'}\n\n`;
        if (summary.frontend.output) {
            report += `**Wyniki:**\n\`\`\`\n${summary.frontend.output}\n\`\`\`\n\n`;
        }
        if (summary.frontend.errors && summary.frontend.errors.length > 0) {
            report += `**Błędy:**\n`;
            summary.frontend.errors.forEach(error => {
                report += `- ${error}\n`;
            });
            report += `\n`;
        }
        
        // Integration tests
        report += `## 🔗 Testy Integracyjne\n\n`;
        report += `**Status:** ${summary.integration.success ? '✅ Sukces' : '❌ Błędy'}\n\n`;
        if (summary.integration.output) {
            report += `**Wyniki:**\n\`\`\`\n${summary.integration.output}\n\`\`\`\n\n`;
        }
        if (summary.integration.errors && summary.integration.errors.length > 0) {
            report += `**Błędy:**\n`;
            summary.integration.errors.forEach(error => {
                report += `- ${error}\n`;
            });
            report += `\n`;
        }
        
        // Recommendations
        report += `## 💡 Rekomendacje\n\n`;
        if (summary.overall.success) {
            report += `✅ **Wszystkie testy przeszły pomyślnie!**\n\n`;
            report += `- System jest gotowy do użycia\n`;
            report += `- Wszystkie moduły działają poprawnie\n`;
            report += `- Integracja frontend-backend działa\n`;
        } else {
            report += `⚠️ **Wykryto problemy wymagające uwagi:**\n\n`;
            
            if (!summary.backend.success) {
                report += `- **Backend:** Napraw błędy w modułach Node.js\n`;
            }
            if (!summary.frontend.success) {
                report += `- **Frontend:** Sprawdź kompatybilność funkcji przeglądarki\n`;
            }
            if (!summary.integration.success) {
                report += `- **Integracja:** Rozwiąż problemy komunikacji między modułami\n`;
            }
        }
        
        report += `\n---\n*Wygenerowano przez TestRunner v1.0.0*`;
        
        return report;
    }
    
    generateHTMLReport(summary) {
        const timestamp = new Date().toLocaleString('pl-PL');
        
        return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Raport Testów DSL</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .summary { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .test-section { margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; }
        .test-success { border-left-color: #28a745; }
        .test-error { border-left-color: #dc3545; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-item { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 5px; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Raport Testów Modularnych - Founder.pl DSL</h1>
        <p><strong>Data wygenerowania:</strong> ${timestamp}</p>
        
        <div class="summary">
            <h2>📊 Podsumowanie</h2>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number ${summary.overall.success ? 'success' : 'error'}">${summary.overall.success ? '✅' : '❌'}</div>
                    <div>Status Ogólny</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${summary.overall.totalTests}</div>
                    <div>Grupy Testów</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number success">${summary.overall.passedTests}</div>
                    <div>Sukces</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number error">${summary.overall.failedTests}</div>
                    <div>Błędy</div>
                </div>
            </div>
        </div>
        
        <div class="test-section ${summary.backend.success ? 'test-success' : 'test-error'}">
            <h3>🔧 Testy Backend</h3>
            <p><strong>Status:</strong> <span class="${summary.backend.success ? 'success' : 'error'}">${summary.backend.success ? '✅ Sukces' : '❌ Błędy'}</span></p>
            ${summary.backend.output ? `<pre>${summary.backend.output}</pre>` : ''}
            ${summary.backend.errors && summary.backend.errors.length > 0 ? 
                `<div><strong>Błędy:</strong><ul>${summary.backend.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
        </div>
        
        <div class="test-section ${summary.frontend.success ? 'test-success' : 'test-error'}">
            <h3>🌐 Testy Frontend</h3>
            <p><strong>Status:</strong> <span class="${summary.frontend.success ? 'success' : 'error'}">${summary.frontend.success ? '✅ Sukces' : '❌ Błędy'}</span></p>
            ${summary.frontend.output ? `<pre>${summary.frontend.output}</pre>` : ''}
            ${summary.frontend.errors && summary.frontend.errors.length > 0 ? 
                `<div><strong>Błędy:</strong><ul>${summary.frontend.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
        </div>
        
        <div class="test-section ${summary.integration.success ? 'test-success' : 'test-error'}">
            <h3>🔗 Testy Integracyjne</h3>
            <p><strong>Status:</strong> <span class="${summary.integration.success ? 'success' : 'error'}">${summary.integration.success ? '✅ Sukces' : '❌ Błędy'}</span></p>
            ${summary.integration.output ? `<pre>${summary.integration.output}</pre>` : ''}
            ${summary.integration.errors && summary.integration.errors.length > 0 ? 
                `<div><strong>Błędy:</strong><ul>${summary.integration.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
        </div>
    </div>
</body>
</html>`;
    }
}

// Standalone functions for server use
export async function runBackendTests() {
    const runner = new TestRunner();
    return await runner.runBackendTests();
}

export async function runFrontendTests() {
    const runner = new TestRunner();
    return await runner.runFrontendTests();
}

export async function runIntegrationTests() {
    const runner = new TestRunner();
    return await runner.runIntegrationTests();
}

export async function runAllTests() {
    const runner = new TestRunner();
    return await runner.runAllTests();
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new TestRunner();
    const command = process.argv[2] || 'all';
    
    console.log('🚀 Starting Test Runner...');
    
    let result;
    switch (command) {
        case 'backend':
            result = await runner.runBackendTests();
            break;
        case 'frontend':
            result = await runner.runFrontendTests();
            break;
        case 'integration':
            result = await runner.runIntegrationTests();
            break;
        case 'all':
        default:
            result = await runner.runAllTests();
            break;
    }
    
    // Generate and save report
    const report = runner.generateReport('markdown');
    
    // Copy to clipboard if possible
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Try different clipboard commands
        const clipboardCommands = [
            'xclip -selection clipboard',
            'pbcopy',
            'clip'
        ];
        
        for (const cmd of clipboardCommands) {
            try {
                await execAsync(`echo "${report.replace(/"/g, '\\"')}" | ${cmd}`);
                console.log('📋 Raport skopiowany do schowka!');
                break;
            } catch (e) {
                // Try next command
            }
        }
    } catch (e) {
        console.log('⚠️  Nie udało się skopiować do schowka');
    }
    
    console.log('\n' + report);
    
    // Exit with appropriate code
    process.exit(result.overall?.success ? 0 : 1);
}
