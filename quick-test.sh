#!/bin/bash

# Quick Test Script for Founder.pl DSL
# Szybki skrypt testowy z możliwością kopiowania wyników

echo "🧪 Founder.pl DSL - Szybki Test"
echo "================================"

# Kolory dla output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcja do logowania
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Sprawdź czy jesteśmy w odpowiednim katalogu
if [ ! -f "index.html" ]; then
    error "Nie znaleziono index.html - uruchom skrypt w katalogu projektu DSL"
    exit 1
fi

# Funkcja do kopiowania do schowka (cross-platform)
copy_to_clipboard() {
    local content="$1"
    
    if command -v xclip >/dev/null 2>&1; then
        echo "$content" | xclip -selection clipboard
        log "Wyniki skopiowane do schowka (xclip)"
    elif command -v pbcopy >/dev/null 2>&1; then
        echo "$content" | pbcopy
        log "Wyniki skopiowane do schowka (pbcopy)"
    elif command -v clip >/dev/null 2>&1; then
        echo "$content" | clip
        log "Wyniki skopiowane do schowka (clip)"
    else
        warning "Brak narzędzia do kopiowania - zapisuję do pliku test-results.txt"
        echo "$content" > test-results.txt
        info "Wyniki zapisane w test-results.txt"
    fi
}

# Główna funkcja testowa
run_tests() {
    local results=""
    local passed=0
    local failed=0
    local total=0
    
    results+="# 🧪 Wyniki Testów Founder.pl DSL\n"
    results+="**Data:** $(date)\n\n"
    results+="## 📊 Testy Plików\n\n"
    
    # Test 1: Sprawdź główne pliki
    log "Sprawdzanie głównych plików..."
    local files=("index.html" "validation-tests.js" "test-runner.html" "advanced-features.js" "Makefile")
    
    for file in "${files[@]}"; do
        total=$((total + 1))
        if [ -f "$file" ]; then
            results+="✅ $file - OK\n"
            passed=$((passed + 1))
        else
            results+="❌ $file - BRAK\n"
            failed=$((failed + 1))
        fi
    done
    
    results+="\n## 🔍 Testy Funkcjonalności\n\n"
    
    # Test 2: Sprawdź funkcje JavaScript
    log "Sprawdzanie funkcji JavaScript..."
    
    total=$((total + 1))
    if grep -q "sanitizeId" index.html; then
        results+="✅ Funkcja sanitizeId - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Funkcja sanitizeId - BRAK\n"
        failed=$((failed + 1))
    fi
    
    total=$((total + 1))
    if grep -q "generateMermaid" index.html; then
        results+="✅ Funkcja generateMermaid - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Funkcja generateMermaid - BRAK\n"
        failed=$((failed + 1))
    fi
    
    total=$((total + 1))
    if grep -q "sendCommand" index.html; then
        results+="✅ Funkcja sendCommand - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Funkcja sendCommand - BRAK\n"
        failed=$((failed + 1))
    fi
    
    total=$((total + 1))
    if grep -q "AdvancedWorkflowFeatures" advanced-features.js 2>/dev/null; then
        results+="✅ Zaawansowane funkcje - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Zaawansowane funkcje - BRAK\n"
        failed=$((failed + 1))
    fi
    
    # Test 3: Sprawdź strukturę HTML
    log "Sprawdzanie struktury HTML..."
    
    total=$((total + 1))
    if grep -q "yaml-editor" index.html; then
        results+="✅ Edytor YAML - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Edytor YAML - BRAK\n"
        failed=$((failed + 1))
    fi
    
    total=$((total + 1))
    if grep -q "sentence-editor" index.html; then
        results+="✅ Edytor NLP - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Edytor NLP - BRAK\n"
        failed=$((failed + 1))
    fi
    
    total=$((total + 1))
    if grep -q "advanced-panel" index.html; then
        results+="✅ Panel zaawansowany - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Panel zaawansowany - BRAK\n"
        failed=$((failed + 1))
    fi
    
    # Test 4: Sprawdź Makefile
    log "Sprawdzanie Makefile..."
    
    total=$((total + 1))
    if [ -f "Makefile" ] && grep -q "help:" Makefile; then
        results+="✅ Makefile z pomocą - OK\n"
        passed=$((passed + 1))
    else
        results+="❌ Makefile z pomocą - BRAK\n"
        failed=$((failed + 1))
    fi
    
    # Podsumowanie
    results+="\n## 📈 Podsumowanie\n\n"
    results+="- **Łącznie testów:** $total\n"
    results+="- **Zakończone sukcesem:** $passed\n"
    results+="- **Nieudane:** $failed\n"
    
    local success_rate=$((passed * 100 / total))
    results+="- **Wskaźnik sukcesu:** ${success_rate}%\n\n"
    
    if [ $success_rate -ge 80 ]; then
        results+="🎉 **Status:** PROJEKT GOTOWY\n"
    elif [ $success_rate -ge 60 ]; then
        results+="⚠️ **Status:** WYMAGA POPRAWEK\n"
    else
        results+="❌ **Status:** WYMAGA ZNACZNYCH POPRAWEK\n"
    fi
    
    results+="\n---\n*Wygenerowano przez quick-test.sh*"
    
    # Wyświetl wyniki
    echo -e "$results"
    
    # Skopiuj do schowka
    copy_to_clipboard "$(echo -e "$results")"
    
    return $failed
}

# Funkcja do testowania wydajności
performance_test() {
    log "Uruchamianie testów wydajności..."
    
    local results=""
    results+="# ⚡ Test Wydajności\n\n"
    
    # Rozmiary plików
    results+="## 📁 Rozmiary Plików\n\n"
    for file in *.html *.js *.md; do
        if [ -f "$file" ]; then
            local size=$(du -h "$file" | cut -f1)
            results+="- $file: $size\n"
        fi
    done
    
    # Liczba linii kodu
    results+="\n## 📊 Statystyki Kodu\n\n"
    local html_lines=$(find . -name "*.html" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    local js_lines=$(find . -name "*.js" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    local total_lines=$((html_lines + js_lines))
    
    results+="- Linie HTML: $html_lines\n"
    results+="- Linie JavaScript: $js_lines\n"
    results+="- Łącznie: $total_lines\n"
    
    echo -e "$results"
    copy_to_clipboard "$(echo -e "$results")"
}

# Funkcja do generowania raportu README
generate_readme_compliance() {
    log "Sprawdzanie zgodności z README.md..."
    
    local results=""
    results+="# 📋 Zgodność z README.md\n\n"
    
    # Wymagania z README
    local requirements=(
        "Edytor YAML:yaml-editor"
        "Edytor NLP:sentence-editor"
        "Diagram Mermaid:mermaid"
        "CQRS:sendCommand"
        "Event Store:eventStore"
        "Read Model:readModel"
        "Mapowanie modułów:getModuleForKeywords"
        "Interaktywność:onclick"
    )
    
    local compliant=0
    local total_req=${#requirements[@]}
    
    for req in "${requirements[@]}"; do
        local name=$(echo "$req" | cut -d: -f1)
        local pattern=$(echo "$req" | cut -d: -f2)
        
        if grep -q "$pattern" index.html 2>/dev/null; then
            results+="✅ $name - ZAIMPLEMENTOWANE\n"
            compliant=$((compliant + 1))
        else
            results+="❌ $name - BRAK\n"
        fi
    done
    
    local compliance_rate=$((compliant * 100 / total_req))
    results+="\n**Zgodność z README:** ${compliance_rate}%\n"
    
    echo -e "$results"
    copy_to_clipboard "$(echo -e "$results")"
}

# Menu główne
show_menu() {
    echo ""
    echo "Wybierz opcję:"
    echo "1) 🧪 Uruchom wszystkie testy"
    echo "2) ⚡ Test wydajności"
    echo "3) 📋 Sprawdź zgodność z README"
    echo "4) 🚀 Uruchom serwer"
    echo "5) 📊 Pełny raport"
    echo "6) 🔄 Makefile help"
    echo "0) Wyjście"
    echo ""
    read -p "Wybór: " choice
    
    case $choice in
        1)
            run_tests
            ;;
        2)
            performance_test
            ;;
        3)
            generate_readme_compliance
            ;;
        4)
            log "Uruchamianie serwera..."
            make start 2>/dev/null || {
                warning "Makefile niedostępny, używam Python serwera"
                python3 -m http.server 8080 2>/dev/null || python -m SimpleHTTPServer 8080
            }
            ;;
        5)
            log "Generowanie pełnego raportu..."
            run_tests
            echo ""
            performance_test
            echo ""
            generate_readme_compliance
            ;;
        6)
            make help 2>/dev/null || error "Makefile niedostępny"
            ;;
        0)
            log "Do widzenia!"
            exit 0
            ;;
        *)
            error "Nieprawidłowy wybór"
            ;;
    esac
}

# Sprawdź argumenty linii poleceń
if [ $# -eq 0 ]; then
    # Tryb interaktywny
    while true; do
        show_menu
        echo ""
        read -p "Naciśnij Enter aby kontynuować..."
    done
else
    # Tryb wsadowy
    case $1 in
        "test")
            run_tests
            ;;
        "performance")
            performance_test
            ;;
        "compliance")
            generate_readme_compliance
            ;;
        "full")
            run_tests
            echo ""
            performance_test
            echo ""
            generate_readme_compliance
            ;;
        "server")
            make start 2>/dev/null || python3 -m http.server 8080
            ;;
        *)
            echo "Użycie: $0 [test|performance|compliance|full|server]"
            echo "Lub uruchom bez argumentów dla trybu interaktywnego"
            exit 1
            ;;
    esac
fi
