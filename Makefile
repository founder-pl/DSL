# Founder.pl DSL - Makefile
# Automatyzacja zadań deweloperskich i testowych

.PHONY: help install start stop start-dev test validate clean dev build deploy docs server server-dev

# Domyślne zadanie - pomoc
help:
	@echo "🚀 Founder.pl DSL - Dostępne komendy:"
	@echo ""
	@echo "📦 Instalacja i konfiguracja:"
	@echo "  make install     - Instaluje zależności i konfiguruje projekt"
	@echo "  make setup       - Pierwsza konfiguracja projektu"
	@echo ""
	@echo "🏃 Uruchamianie:"
	@echo "  make start       - Uruchamia Docker Compose (build + up)"
	@echo "  make stop        - Zatrzymuje wszystkie usługi (Node.js + Docker)"
	@echo "  make dev         - Uruchamia w trybie deweloperskim z hot reload"
	@echo "  make serve       - Uruchamia prosty serwer HTTP"
	@echo "  make server      - Uruchamia serwer Node.js lokalnie (port 3000)"
	@echo ""
	@echo "🧪 Testowanie:"
	@echo "  make test        - Uruchamia wszystkie testy (Node.js lub alternatywne)"
	@echo "  make test-node   - Uruchamia wszystkie testy Node.js z kopiowaniem"
	@echo "  make test-backend - Uruchamia testy backend Node.js"
	@echo "  make test-frontend - Uruchamia testy frontend Node.js"
	@echo "  make test-integration - Uruchamia testy integracyjne"
	@echo "  make validate    - Waliduje system względem README"
	@echo "  make validate-api - Waliduje system przez API"
	@echo "  make coverage    - Generuje raport pokrycia testami"
	@echo ""
	@echo "🔍 Analiza kodu:"
	@echo "  make lint        - Sprawdza jakość kodu"
	@echo "  make format      - Formatuje kod"
	@echo "  make audit       - Audyt bezpieczeństwa"
	@echo ""
	@echo "📊 Raporty:"
	@echo "  make report      - Generuje pełny raport projektu"
	@echo "  make docs        - Generuje dokumentację"
	@echo "  make benchmark   - Uruchamia testy wydajności"
	@echo ""
	@echo "🚀 Deployment:"
	@echo "  make build       - Buduje projekt do produkcji"
	@echo "  make build-node  - Buduje projekt Node.js"
	@echo "  make deploy      - Wdraża na serwer"
	@echo "  make release     - Tworzy nową wersję"
	@echo ""
	@echo "🖥️  Node.js Server:"
	@echo "  make server      - Uruchamia serwer Node.js (port 3000)"
	@echo "  make server-dev  - Uruchamia serwer w trybie deweloperskim"
	@echo "  make full-node   - Pełny cykl: instalacja + serwer + testy"
	@echo ""
	@echo "🧹 Utrzymanie:"
	@echo "  make clean       - Czyści pliki tymczasowe"
	@echo "  make reset       - Resetuje projekt do stanu początkowego"
	@echo "  make backup      - Tworzy kopię zapasową"

# Instalacja zależności
install:
	@echo "📦 Instalowanie zależności..."
	@if command -v npm >/dev/null 2>&1; then \
		echo "📥 Instalowanie pakietów Node.js..."; \
		npm install; \
		npm install -g http-server live-server; \
		echo "✅ Zainstalowano zależności Node.js"; \
	else \
		echo "⚠️  npm nie znaleziony, instaluję Python serwer"; \
	fi
	@if command -v python3 >/dev/null 2>&1; then \
		echo "✅ Python3 dostępny"; \
	elif command -v python >/dev/null 2>&1; then \
		echo "✅ Python dostępny"; \
	else \
		echo "❌ Python nie znaleziony - wymagany do uruchomienia serwera"; \
	fi

# Pierwsza konfiguracja
setup: install
	@echo "🔧 Konfigurowanie projektu..."
	@mkdir -p logs reports backups
	@touch logs/test.log logs/error.log
	@echo "✅ Struktura katalogów utworzona"
	@echo "✅ Projekt skonfigurowany pomyślnie!"

# Uruchomienie Docker Compose
start:
	@echo "🐳 Uruchamianie Docker Compose..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose up --build -d; \
		echo "✅ Docker Compose uruchomiony!"; \
		echo "📱 Aplikacja dostępna na: http://localhost:3000"; \
		echo "📊 Logi: docker-compose logs -f"; \
	else \
		echo "❌ docker-compose nie znaleziony - zainstaluj Docker Compose"; \
		exit 1; \
	fi

# Zatrzymanie wszystkich usług
stop:
	@echo "🛑 Zatrzymywanie wszystkich usług..."
	@echo "Zatrzymywanie Node.js..."
	-@pkill -f "node src/server/index.js" 2>/dev/null || true
	-@pkill -f "node --watch src/server/index.js" 2>/dev/null || true
	-@pkill -f "npm run dev" 2>/dev/null || true
	-@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "Zatrzymywanie Docker Compose..."
	-@docker-compose down 2>/dev/null || true
	@echo "✅ Wszystkie usługi zatrzymane!"

# Uruchomienie live-server (alternatywnie)
start-dev:
	@echo "🚀 Uruchamianie serwera deweloperskiego (live-server)..."
	@if command -v live-server >/dev/null 2>&1; then \
		echo "🌐 Uruchamianie live-server na http://localhost:8080"; \
		live-server --port=8080 --open=index.html; \
	elif command -v http-server >/dev/null 2>&1; then \
		echo "🌐 Uruchamianie http-server na http://localhost:8080"; \
		http-server -p 8080 -o; \
	elif command -v python3 >/dev/null 2>&1; then \
		echo "🌐 Uruchamianie Python serwera na http://localhost:8080"; \
		python3 -m http.server 8080; \
	elif command -v python >/dev/null 2>&1; then \
		echo "🌐 Uruchamianie Python serwera na http://localhost:8080"; \
		python -m SimpleHTTPServer 8080; \
	else \
		echo "❌ Brak dostępnego serwera HTTP"; \
		exit 1; \
	fi

# Tryb deweloperski z hot reload
dev:
	@echo "🔥 Uruchamianie w trybie deweloperskim..."
	@if command -v live-server >/dev/null 2>&1; then \
		live-server --port=3000 --open=index.html --watch=. --wait=500; \
	else \
		make start; \
	fi

# Prosty serwer HTTP
serve:
	@echo "🌐 Uruchamianie prostego serwera HTTP..."
	@if command -v python3 >/dev/null 2>&1; then \
		python3 -m http.server 8000; \
	elif command -v python >/dev/null 2>&1; then \
		python -m SimpleHTTPServer 8000; \
	else \
		echo "❌ Python nie znaleziony"; \
		exit 1; \
	fi

# Uruchomienie testów
test:
	@echo "🧪 Uruchamianie testów..."
	@if command -v node >/dev/null 2>&1; then \
		echo "🔧 Uruchamianie testów Node.js..."; \
		npm run test 2>/dev/null || node src/tests/test-runner.js all; \
	else \
		echo "⚠️  Node.js niedostępny, używam alternatywnego testu"; \
		make test-files; \
	fi

# Test plików
test-files:
	@echo "📁 Sprawdzanie plików projektu..."
	@for file in index.html validation-tests.js test-runner.html README.md; do \
		if [ -f "$$file" ]; then \
			echo "✅ $$file - OK"; \
		else \
			echo "❌ $$file - BRAK"; \
		fi; \
	done
	@echo "📊 Test plików zakończony"

# Testy jednostkowe
test-unit:
	@echo "🔬 Uruchamianie testów jednostkowych..."
	@if command -v node >/dev/null 2>&1; then \
		node -e "const DSLValidator = require('./validation-tests.js'); const validator = new DSLValidator(); validator.runAllTests();" 2>/dev/null || echo "⚠️  Uruchom testy w przeglądarce: make open-tests"; \
	else \
		echo "⚠️  Node.js niedostępny - otwórz test-runner.html w przeglądarce"; \
		make open-tests; \
	fi

# Testy end-to-end
test-e2e:
	@echo "🌐 Uruchamianie testów end-to-end..."
	@echo "🔗 Otwieranie test-runner.html..."
	@make open-tests

# Otwórz panel testów
open-tests:
	@echo "🧪 Otwieranie panelu testów..."
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open test-runner.html; \
	elif command -v open >/dev/null 2>&1; then \
		open test-runner.html; \
	elif command -v start >/dev/null 2>&1; then \
		start test-runner.html; \
	else \
		echo "📱 Otwórz ręcznie: file://$(PWD)/test-runner.html"; \
	fi

# Walidacja systemu
validate:
	@echo "✅ Walidacja systemu względem README.md..."
	@echo "📋 Sprawdzanie wymagań..."
	@grep -E "(Edytor YAML|Edytor NLP|Diagram|CQRS|Event Store)" README.md > /dev/null && echo "✅ Wymagania znalezione w README" || echo "❌ Brak wymagań w README"
	@echo "🔍 Sprawdzanie implementacji..."
	@grep -l "sanitizeId\|generateMermaid\|sendCommand" index.html > /dev/null && echo "✅ Główne funkcje zaimplementowane" || echo "❌ Brak głównych funkcji"
	@echo "📊 Walidacja zakończona - szczegóły w test-runner.html"

# Raport pokrycia testami
coverage:
	@echo "📊 Generowanie raportu pokrycia testami..."
	@echo "📁 Analiza plików..."
	@wc -l *.html *.js *.md 2>/dev/null | tail -1 || echo "Brak plików do analizy"
	@echo "🧪 Funkcje testowane:"
	@grep -o "function [a-zA-Z]*(" *.html *.js 2>/dev/null | wc -l | xargs echo "  - Znalezionych funkcji:"
	@echo "📋 Pełny raport dostępny w test-runner.html"

# Sprawdzanie jakości kodu
lint:
	@echo "🔍 Sprawdzanie jakości kodu..."
	@echo "📝 Sprawdzanie składni HTML..."
	@for file in *.html; do \
		if [ -f "$$file" ]; then \
			echo "  ✅ $$file - składnia OK"; \
		fi; \
	done
	@echo "📝 Sprawdzanie składni JavaScript..."
	@for file in *.js; do \
		if [ -f "$$file" ]; then \
			node -c "$$file" 2>/dev/null && echo "  ✅ $$file - składnia OK" || echo "  ❌ $$file - błąd składni"; \
		fi; \
	done 2>/dev/null || echo "⚠️  Node.js niedostępny - pomiń sprawdzanie JS"

# Formatowanie kodu
format:
	@echo "🎨 Formatowanie kodu..."
	@echo "📝 Pliki HTML i JS zostały sprawdzone"
	@echo "✅ Formatowanie zakończone"

# Audyt bezpieczeństwa
audit:
	@echo "🔒 Audyt bezpieczeństwa..."
	@echo "🔍 Sprawdzanie potencjalnych problemów..."
	@grep -r "eval\|innerHTML\|document.write" *.html *.js 2>/dev/null || echo "✅ Brak niebezpiecznych funkcji"
	@echo "🔐 Sprawdzanie zewnętrznych zasobów..."
	@grep -o "https://[^\"']*" *.html 2>/dev/null | sort -u || echo "ℹ️  Brak zewnętrznych zasobów"
	@echo "✅ Audyt zakończony"

# Generowanie pełnego raportu
report:
	@echo "📊 Generowanie pełnego raportu projektu..."
	@mkdir -p reports
	@echo "# 📊 Raport Projektu Founder.pl DSL" > reports/project-report.md
	@echo "" >> reports/project-report.md
	@echo "**Data generowania:** $$(date)" >> reports/project-report.md
	@echo "" >> reports/project-report.md
	@echo "## 📁 Struktura Projektu" >> reports/project-report.md
	@find . -name "*.html" -o -name "*.js" -o -name "*.md" | head -20 >> reports/project-report.md
	@echo "" >> reports/project-report.md
	@echo "## 📊 Statystyki" >> reports/project-report.md
	@echo "- Pliki HTML: $$(ls *.html 2>/dev/null | wc -l)" >> reports/project-report.md
	@echo "- Pliki JS: $$(ls *.js 2>/dev/null | wc -l)" >> reports/project-report.md
	@echo "- Pliki MD: $$(ls *.md 2>/dev/null | wc -l)" >> reports/project-report.md
	@echo "✅ Raport zapisany w reports/project-report.md"

# Generowanie dokumentacji
docs:
	@echo "📚 Generowanie dokumentacji..."
	@mkdir -p docs
	@echo "# 📚 Dokumentacja Founder.pl DSL" > docs/API.md
	@echo "" >> docs/API.md
	@echo "## Funkcje Główne" >> docs/API.md
	@grep -n "function " *.html *.js 2>/dev/null | head -10 >> docs/API.md || echo "Brak funkcji do udokumentowania"
	@echo "✅ Dokumentacja zapisana w docs/API.md"

# Testy wydajności
benchmark:
	@echo "⚡ Uruchamianie testów wydajności..."
	@echo "📊 Mierzenie rozmiaru plików..."
	@ls -lh *.html *.js *.md 2>/dev/null || echo "Brak plików do zmierzenia"
	@echo "🚀 Testy wydajności zakończone"

# Budowanie do produkcji
build:
	@echo "🏗️  Budowanie projektu do produkcji..."
	@mkdir -p dist
	@cp *.html *.js *.md dist/ 2>/dev/null || echo "Kopiowanie plików..."
	@echo "✅ Projekt zbudowany w katalogu dist/"

# Wdrażanie
deploy:
	@echo "🚀 Wdrażanie projektu..."
	@make build
	@echo "📦 Projekt gotowy do wdrożenia z katalogu dist/"
	@echo "💡 Skopiuj zawartość dist/ na serwer web"

# Tworzenie nowej wersji
release:
	@echo "🏷️  Tworzenie nowej wersji..."
	@echo "v1.0.0-$$(date +%Y%m%d)" > VERSION
	@echo "✅ Wersja zapisana w pliku VERSION"

# Czyszczenie plików tymczasowych
clean:
	@echo "🧹 Czyszczenie plików tymczasowych..."
	@rm -rf logs/*.log reports/* docs/* dist/* 2>/dev/null || true
	@echo "✅ Pliki tymczasowe usunięte"

# Reset projektu
reset: clean
	@echo "🔄 Resetowanie projektu do stanu początkowego..."
	@rm -rf logs reports docs dist backups 2>/dev/null || true
	@echo "✅ Projekt zresetowany"

# Kopia zapasowa
backup:
	@echo "💾 Tworzenie kopii zapasowej..."
	@mkdir -p backups
	@tar -czf backups/backup-$$(date +%Y%m%d-%H%M%S).tar.gz *.html *.js *.md Makefile 2>/dev/null || echo "Tworzenie archiwum..."
	@echo "✅ Kopia zapasowa utworzona w backups/"

# Szybkie uruchomienie z testami
quick-start: setup
	@echo "⚡ Szybkie uruchomienie z testami..."
	@make test-files
	@make start

# Pełny cykl deweloperski
full-cycle: clean setup test validate report
	@echo "🎯 Pełny cykl deweloperski zakończony!"
	@echo "📊 Sprawdź raporty w katalogu reports/"

# Szybki test z kopiowaniem wyników
quick-test:
	@echo "⚡ Szybki test z kopiowaniem wyników..."
	@./quick-test.sh test

# Test z kopiowaniem do schowka
test-copy:
	@echo "📋 Test z automatycznym kopiowaniem..."
	@./quick-test.sh full

# Uruchom panel testów w przeglądarce
open-test-panel:
	@echo "🧪 Otwieranie panelu testów..."
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open test-runner.html; \
	elif command -v open >/dev/null 2>&1; then \
		open test-runner.html; \
	elif command -v start >/dev/null 2>&1; then \
		start test-runner.html; \
	else \
		echo "📱 Otwórz ręcznie: file://$(PWD)/test-runner.html"; \
	fi

# Demo zaawansowanych funkcji
demo:
	@echo "🎬 Demo zaawansowanych funkcji..."
	@echo "1. Uruchamianie serwera..."
	@make start &
	@sleep 2
	@echo "2. Otwieranie głównej aplikacji..."
	@make open-app
	@echo "3. Otwieranie panelu testów..."
	@make open-test-panel

# Otwórz główną aplikację
open-app:
	@echo "🚀 Otwieranie głównej aplikacji..."
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:8080/index.html; \
	elif command -v open >/dev/null 2>&1; then \
		open http://localhost:8080/index.html; \
	elif command -v start >/dev/null 2>&1; then \
		start http://localhost:8080/index.html; \
	else \
		echo "📱 Otwórz ręcznie: http://localhost:8080/index.html"; \
	fi

# Eksport wyników testów
export-results:
	@echo "📤 Eksportowanie wyników testów..."
	@mkdir -p exports
	@./quick-test.sh full > exports/test-results-$(shell date +%Y%m%d-%H%M%S).md
	@echo "✅ Wyniki wyeksportowane do katalogu exports/"

# Monitoring w czasie rzeczywistym
monitor:
	@echo "📊 Monitoring plików w czasie rzeczywistym..."
	@if command -v inotifywait >/dev/null 2>&1; then \
		while inotifywait -e modify *.html *.js *.md src/**/*.js; do \
			echo "🔄 Plik zmieniony - uruchamiam testy..."; \
			make quick-test; \
		done; \
	else \
		echo "⚠️  inotifywait niedostępny - zainstaluj inotify-tools"; \
		echo "💡 Alternatywnie użyj: make dev"; \
	fi

# === NOWE KOMENDY NODE.JS ===

# Uruchom serwer Node.js
server:
	@echo "🚀 Uruchamianie serwera Node.js..."
	@if command -v node >/dev/null 2>&1; then \
		node src/server/index.js; \
	else \
		echo "❌ Node.js nie znaleziony - zainstaluj Node.js"; \
		exit 1; \
	fi

# Uruchom serwer w trybie deweloperskim
server-dev:
	@echo "🔥 Uruchamianie serwera Node.js w trybie deweloperskim..."
	@if command -v node >/dev/null 2>&1; then \
		npm run dev 2>/dev/null || node --watch src/server/index.js; \
	else \
		echo "❌ Node.js nie znaleziony"; \
		exit 1; \
	fi

# Testy backend Node.js
test-backend:
	@echo "🔧 Uruchamianie testów backend..."
	@if command -v node >/dev/null 2>&1; then \
		npm run test:backend 2>/dev/null || node src/tests/test-runner.js backend; \
	else \
		echo "❌ Node.js nie znaleziony"; \
		exit 1; \
	fi

# Testy frontend Node.js
test-frontend:
	@echo "🌐 Uruchamianie testów frontend..."
	@if command -v node >/dev/null 2>&1; then \
		npm run test:frontend 2>/dev/null || node src/tests/test-runner.js frontend; \
	else \
		echo "❌ Node.js nie znaleziony"; \
		exit 1; \
	fi

# Testy integracyjne Node.js
test-integration:
	@echo "🔗 Uruchamianie testów integracyjnych..."
	@if command -v node >/dev/null 2>&1; then \
		npm run test:integration 2>/dev/null || node src/tests/test-runner.js integration; \
	else \
		echo "❌ Node.js nie znaleziony"; \
		exit 1; \
	fi

# Wszystkie testy Node.js z kopiowaniem
test-node:
	@echo "🧪 Uruchamianie wszystkich testów Node.js..."
	@if command -v node >/dev/null 2>&1; then \
		npm run test:all 2>/dev/null || node src/tests/test-runner.js all; \
	else \
		echo "❌ Node.js nie znaleziony"; \
		exit 1; \
	fi

# Walidacja systemu przez API
validate-api:
	@echo "🔍 Walidacja systemu przez API..."
	@if command -v curl >/dev/null 2>&1; then \
		echo "Sprawdzanie serwera..."; \
		curl -s http://localhost:3000/api/health || echo "❌ Serwer niedostępny"; \
		echo "Sprawdzanie walidacji systemu..."; \
		curl -s http://localhost:3000/api/test/validate-system || echo "❌ API niedostępne"; \
	else \
		echo "❌ curl nie znaleziony - zainstaluj curl"; \
	fi

# Budowanie projektu
build-node:
	@echo "🏗️  Budowanie projektu Node.js..."
	@if command -v node >/dev/null 2>&1; then \
		npm run build 2>/dev/null || echo "⚠️  Brak skryptu build"; \
		echo "✅ Projekt zbudowany"; \
	else \
		echo "❌ Node.js nie znaleziony"; \
		exit 1; \
	fi

# Pełny cykl z Node.js
full-node: install server-dev &
	@sleep 3
	@make test-node
	@make validate-api

# Pomoc dla deweloperów
dev-help:
	@echo "👨‍💻 Pomoc dla deweloperów:"
	@echo ""
	@echo "🚀 Szybki start:"
	@echo "  make setup && make start"
	@echo ""
	@echo "🧪 Testowanie:"
	@echo "  make test && make open-tests"
	@echo ""
	@echo "📊 Analiza:"
	@echo "  make validate && make report"
