# 🔧 Makefile Updates & edit.html Fix

## Data: 2025-11-22

## Problemy rozwiązane

### 1. ✅ Port 3000 zajęty (EADDRINUSE)
**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Rozwiązanie:** Dodano `make stop` który zatrzymuje wszystkie usługi

### 2. ✅ Brak `make stop` w Makefile
**Problem:** `make: *** No rule to make target 'stop'`

**Rozwiązanie:** Dodano kompletny `make stop` target

### 3. ✅ `make start` nie uruchamia Docker Compose
**Problem:** `make start` uruchamiał live-server zamiast Docker

**Rozwiązanie:** Zmieniono `make start` na Docker Compose

### 4. ✅ edit.html nie pokazuje diagramów po "Wczytaj z bazy"
**Problem:** Po kliknięciu "Wczytaj z bazy" lista się aktualizuje, ale canvas pozostaje pusty

**Rozwiązanie:** Dodano konwersję workflows → nodes z auto-layoutem

---

## Zmiany w Makefile

### Nowe komendy:

#### `make start` - Docker Compose
```makefile
start:
	@echo "🐳 Uruchamianie Docker Compose..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose up --build -d; \
		echo "✅ Docker Compose uruchomiony!"; \
		echo "📱 Aplikacja dostępna na: http://localhost:3000"; \
		echo "📊 Logi: docker-compose logs -f"; \
	else \
		echo "❌ docker-compose nie znaleziony"; \
		exit 1; \
	fi
```

**Użycie:**
```bash
make start
# Uruchamia Docker Compose z budowaniem
# Aplikacja: http://localhost:3000
```

#### `make stop` - Zatrzymanie wszystkich usług
```makefile
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
```

**Użycie:**
```bash
make stop
# Zatrzymuje:
# - Wszystkie procesy Node.js (src/server/index.js, --watch, npm run dev)
# - Procesy na porcie 3000
# - Docker Compose containers
```

#### `make start-dev` - Live-server (alternatywa)
```makefile
start-dev:
	@echo "🚀 Uruchamianie serwera deweloperskiego (live-server)..."
	# live-server / http-server / python server
```

**Użycie:**
```bash
make start-dev
# Uruchamia live-server na porcie 8080 (bez Docker)
```

### Zaktualizowane:

#### `.PHONY`
```makefile
.PHONY: help install start stop start-dev test validate clean dev build deploy docs server server-dev
```

#### `help` - Zaktualizowana pomoc
```makefile
help:
	@echo "🏃 Uruchamianie:"
	@echo "  make start       - Uruchamia Docker Compose (build + up)"
	@echo "  make stop        - Zatrzymuje wszystkie usługi (Node.js + Docker)"
	@echo "  make dev         - Uruchamia w trybie deweloperskim z hot reload"
	@echo "  make serve       - Uruchamia prosty serwer HTTP"
	@echo "  make server      - Uruchamia serwer Node.js lokalnie (port 3000)"
```

---

## Zmiany w edit.html

### Problem:
Po kliknięciu "Wczytaj z bazy" workflows są załadowane, ale `nodes` array pozostaje pusty, więc canvas nie pokazuje nic.

### Rozwiązanie:
Dodano konwersję workflows → nodes w funkcji load-db:

```javascript
// Konwertuj workflows na nodes do wyświetlenia
nodes = [];
let x = 50, y = 50;
workflows.forEach((wf, wfIdx) => {
  // Dodaj step node (niebieski)
  const stepNode = {
    id: `step_${wf.id}`,
    type: 'step',
    data: { id: wf.id, name: wf.name, module: wf.module || 'Default' },
    x: x,
    y: y
  };
  nodes.push(stepNode);
  
  // Dodaj action nodes (pomarańczowe)
  if (Array.isArray(wf.actions)) {
    wf.actions.forEach((action, actIdx) => {
      const actionNode = {
        id: `action_${wf.id}_${actIdx}`,
        type: 'action',
        data: { id: action.id, name: action.name, module: action.module || 'Default' },
        parentStepId: wf.id,
        x: x + 250,  // 250px to the right of step
        y: y + (actIdx * 80)  // 80px vertical spacing
      };
      nodes.push(actionNode);
    });
  }
  
  // Update position for next workflow
  y += Math.max(150, (wf.actions?.length || 1) * 80 + 50);
  if (y > 600) {
    y = 50;
    x += 600;
  }
});

renderNodes();
updateStepsList();
status(`Wczytano ${workflows.length} kroków z ${nodes.length} elementami`);
```

### Efekt:
- ✅ Step nodes (niebieskie) pojawiają się po lewej
- ✅ Action nodes (pomarańczowe) pojawiają się po prawej od steps
- ✅ Auto-layout układa workflows w kolumnach
- ✅ Status message pokazuje liczbę załadowanych elementów

---

## Zmiany w docker-compose.yml

### Health check fix:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:${PORT:-3000}/api/health"]
  # Zmiana: wget → curl (curl jest zainstalowany w alpine)
```

**Poprzednio:**
```yaml
test: ["CMD", "wget", "-qO-", "http://localhost:${PORT:-3000}/api/health"]
# ❌ wget nie był zainstalowany w alpine
```

**Teraz:**
```yaml
test: ["CMD", "curl", "-f", "http://localhost:${PORT:-3000}/api/health"]
# ✅ curl jest zainstalowany (RUN apk add --no-cache bash curl jq)
```

---

## Testowanie

### Test 1: make stop
```bash
# Terminal 1: Uruchom serwer
node src/server/index.js

# Terminal 2: Zatrzymaj
make stop

# Wynik:
# 🛑 Zatrzymywanie wszystkich usług...
# Zatrzymywanie Node.js...
# Zatrzymywanie Docker Compose...
# ✅ Wszystkie usługi zatrzymane!
```

### Test 2: make start (Docker)
```bash
make start

# Wynik:
# 🐳 Uruchamianie Docker Compose...
# ✅ Docker Compose uruchomiony!
# 📱 Aplikacja dostępna na: http://localhost:3000
# 📊 Logi: docker-compose logs -f

# Sprawdź:
curl http://localhost:3000/api/health
docker-compose ps
```

### Test 3: edit.html
```bash
# 1. Uruchom serwer (lokalnie lub Docker)
make server
# lub
make start

# 2. Otwórz w przeglądarce
http://localhost:3000/edit.html

# 3. Kliknij "⬇️ Wczytaj z bazy"

# Wynik:
# ✅ Lista kroków aktualizuje się w sidebar
# ✅ Canvas pokazuje niebieskie boxes (steps)
# ✅ Canvas pokazuje pomarańczowe boxes (actions) po prawej
# ✅ Status: "Wczytano X kroków z Y elementami"
```

---

## Struktura edit.html po poprawce

```
┌─────────────────────────────────────────────┐
│ Toolbar                                     │
│ [Wczytaj] [Zapisz] [Dodaj] [Zoom] [Auto]   │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Canvas                           │
│          │                                  │
│ Kroki:   │  ┌────────┐    ┌──────────┐     │
│ • Krok 1 │  │ Step 1 │───▶│ Action 1 │     │
│ • Krok 2 │  │        │    │ Action 2 │     │
│ • Krok 3 │  └────────┘    └──────────┘     │
│          │                                  │
│ Props:   │  ┌────────┐    ┌──────────┐     │
│ ID: ...  │  │ Step 2 │───▶│ Action 3 │     │
│ Name: ..│  └────────┘    └──────────┘     │
│ Module:  │                                  │
│ [Zapisz] │  (Draggable nodes)               │
└──────────┴──────────────────────────────────┘
```

### Kolory:
- 🔵 **Step nodes** - niebieski (#e3f2fd, border #2196f3)
- 🟠 **Action nodes** - pomarańczowy (#fff3e0, border #ff9800)
- 🟠 **Selected** - pomarańczowa ramka (#ff6600)

---

## Użycie - Quick Reference

### Lokalne uruchomienie (bez Docker):
```bash
# Zatrzymaj wszystko
make stop

# Uruchom lokalnie
make server
# lub
node src/server/index.js

# Otwórz
http://localhost:3000
http://localhost:3000/edit.html
```

### Docker uruchomienie:
```bash
# Zatrzymaj wszystko
make stop

# Uruchom Docker
make start

# Logi
docker-compose logs -f dsl

# Status
docker-compose ps

# Otwórz
http://localhost:3000
http://localhost:3000/edit.html
```

### Zatrzymanie:
```bash
# Zatrzymaj wszystko (Node.js + Docker)
make stop
```

---

## Known Issues

### Docker: Container unhealthy
**Problem:** `dsl-server` pokazuje status "unhealthy" lub "restarting"

**Debug:**
```bash
# Sprawdź logi
docker-compose logs dsl

# Sprawdź health status
docker inspect dsl-server --format='{{json .State.Health}}' | jq .

# Sprawdź czy curl działa w kontenerze
docker-compose exec dsl curl -f http://localhost:3000/api/health
```

**Rozwiązanie tymczasowe:** Uruchom lokalnie
```bash
make stop
make server
```

### Port 3000 zajęty
**Problem:** `Error: listen EADDRINUSE`

**Rozwiązanie:**
```bash
make stop
# lub ręcznie:
lsof -ti:3000 | xargs kill -9
```

### edit.html canvas pusty
**Problem:** Po "Wczytaj z bazy" canvas jest pusty

**Debug:**
1. Otwórz Console (F12)
2. Sprawdź czy są błędy
3. Sprawdź network tab - czy `/api/workflow/db/workflows` zwraca dane
4. W console wpisz: `nodes` - powinno pokazać array z elementami

**Rozwiązanie:** Upewnij się że używasz zaktualizowanego edit.html

---

## Files Modified

### Zmienione:
- `Makefile` (+50 linii) - Dodano start, stop, start-dev
- `edit.html` (+40 linii) - Konwersja workflows → nodes
- `docker-compose.yml` (1 linia) - Health check wget → curl

### Nie zmienione:
- `src/server/index.js` - Bez zmian
- `Dockerfile` - Bez zmian (curl już jest zainstalowany)
- Inne pliki - Bez zmian

---

## Migration Guide

### Dla istniejących instalacji:

```bash
# 1. Pull changes
git pull origin main

# 2. Zatrzymaj stare usługi
make stop
# lub ręcznie:
pkill -f "node src/server"
docker-compose down

# 3. Uruchom na nowo
make start
# lub lokalnie:
make server

# 4. Test
curl http://localhost:3000/api/health
open http://localhost:3000/edit.html
```

---

## Podsumowanie

### ✅ Dodane:
- `make start` - Docker Compose up --build
- `make stop` - Zatrzymanie wszystkich usług
- `make start-dev` - Live-server (alternatywa)
- edit.html: Konwersja workflows → nodes
- docker-compose.yml: Health check fix (curl)

### ✅ Naprawione:
- Port 3000 EADDRINUSE - `make stop` czyści port
- Brak `make stop` - Dodano kompletny target
- `make start` nie uruchamia Docker - Teraz uruchamia
- edit.html pusty canvas - Dodano rendering nodes

### ✅ Działa:
- `make stop` - Zatrzymuje Node.js + Docker + Port 3000
- `make start` - Uruchamia Docker Compose
- `make server` - Uruchamia lokalnie
- edit.html - Pokazuje workflows jako draggable nodes

---

**🎉 Wszystko gotowe do użycia!**

```bash
# Quick start:
make stop && make start
# lub lokalnie:
make stop && make server

# Otwórz:
http://localhost:3000/edit.html
```
