# 🚀 Quick Start - Po Poprawkach NLP i Docker

## ✅ Co zostało naprawione?

### Problem:
❌ Błąd: "Brak sugerowanego workflow z analizy" przy przetwarzaniu zdań NLP

### Rozwiązanie:
✅ 3-poziomowy fallback system NLP  
✅ Lokalny parser jako ostateczny fallback  
✅ Lepsze komunikaty błędów  
✅ Panel konfiguracji .env przez GUI  
✅ Pełne środowisko Docker  

## 🎯 Testowanie poprawki NLP

### Przykładowe zdanie (wcześniej powodowało błąd):

```
Gdy nadejdzie nowe e-Doręczenie, przypisz dokument do sprawy i powiadom właściwy dział
```

### Test przez API:

```bash
curl -X POST http://localhost:3000/api/workflow/nlp \
  -H "Content-Type: application/json" \
  -d '{"sentence": "Gdy nadejdzie nowe e-Doręczenie, przypisz dokument do sprawy i powiadom właściwy dział"}'
```

**Rezultat:**
```json
{
  "success": true,
  "workflow": {
    "payload": {
      "id": "nadejdzie_nowe_e_Doreczenie",
      "name": "nadejdzie nowe e-Doręczenie",
      "module": "eDoręczenia",
      "actions": [
        {"name": "przypisz dokument do sprawy", "module": "Default"},
        {"name": "powiadom właściwy dział", "module": "Powiadomienia"}
      ]
    }
  }
}
```

### Test przez UI:

1. Otwórz: **http://localhost:3000**
2. W polu "Edytor NLP" wpisz:
   ```
   Gdy nadejdzie nowe e-Doręczenie, przypisz dokument do sprawy i powiadom właściwy dział
   ```
3. Kliknij **"Dodaj z NLP"**
4. **Workflow zostanie utworzony bez błędów!**

### Zobacz logi (F12 → Console):

```
✓ Workflow utworzony przez /api/workflow/nlp
```

## 🛠️ Nowe możliwości

### 1. Panel Konfiguracji

**URL:** http://localhost:3000/config

**Co możesz zrobić:**
- ⚙️ Konfigurować serwer (port, host, środowisko)
- 📧 Ustawić SMTP dla emaili
- 💬 Podłączyć Slack webhook
- 🏢 Podłączyć Teams webhook
- 🔧 Zaawansowane ustawienia (API, security, rate limiting)
- 👁️ Podgląd .env w czasie rzeczywistym
- 💾 Zapisać konfigurację do .env
- 📥 Eksportować .env do pliku

**Przykład:**
```bash
1. Otwórz http://localhost:3000/config
2. Zakładka "🔗 Integracje"
3. Wklej Slack Webhook URL
4. Wybierz kanał: #general
5. Kliknij "💾 Zapisz Konfigurację"
6. Restart serwera (ctrl+C, node src/server/index.js)
7. Gotowe! Slack działa
```

### 2. Docker Environment

**Uruchomienie:**
```bash
# Edytuj konfigurację
nano .env

# Uruchom wszystko (DSL + Redis)
docker-compose up -d

# Sprawdź status
docker-compose ps

# Logi
docker-compose logs -f dsl
```

**Usługi:**
- 🖥️ **DSL Server** (port 3000) - Główna aplikacja
- 🗄️ **Redis** (port 6379) - Cache
- 🧪 **E2E Tests** - Automatyczne testy
- 🌐 **Nginx** (opcjonalnie, production) - Reverse proxy

**Dostęp:**
- http://localhost:3000 - Główna aplikacja
- http://localhost:3000/config - Panel konfiguracji
- http://localhost:3000/integrations-demo - Demo integracji
- http://localhost:3000/tests - Test runner
- http://localhost:3000/api - API docs

### 3. API Endpoints dla Konfiguracji

```bash
# Załaduj aktualną konfigurację
GET http://localhost:3000/api/config/load

# Zapisz konfigurację
POST http://localhost:3000/api/config/save
Body: {"PORT": "8080", "NODE_ENV": "production"}

# Reset do domyślnych
POST http://localhost:3000/api/config/reset
```

## 📂 Nowe Pliki

```
DSL/
├── .env                       # ✨ Konfiguracja środowiska
├── .env.example               # ✨ Szablon konfiguracji
├── config.html                # ✨ Panel konfiguracji GUI
├── docker-compose.yml         # ✨ Zaktualizowany (Redis, .env)
├── DOCKER-SETUP.md            # ✨ Dokumentacja Docker
├── CHANGELOG-NLP-FIX.md       # ✨ Lista zmian
└── QUICK-START-AFTER-FIX.md   # ✨ Ten plik
```

## 🎬 Demo - Krok po Kroku

### Scenariusz 1: Test NLP (bez Docker)

```bash
# 1. Uruchom serwer
node src/server/index.js

# 2. Otwórz przeglądarkę
http://localhost:3000

# 3. Wpisz w "Edytor NLP":
Gdy nadejdzie nowe e-Doręczenie, przypisz dokument do sprawy i powiadom właściwy dział

# 4. Kliknij "Dodaj z NLP"

# 5. Zobacz wynik w diagramie!
```

### Scenariusz 2: Konfiguracja przez Panel

```bash
# 1. Otwórz panel
http://localhost:3000/config

# 2. Zakładka "📧 Email"
#    - SMTP Host: smtp.gmail.com
#    - Port: 587
#    - User: your-email@gmail.com
#    - Pass: your-app-password

# 3. Kliknij "💾 Zapisz Konfigurację"

# 4. Restart serwera
ctrl+C
node src/server/index.js

# 5. Test email w integrations-demo
http://localhost:3000/integrations-demo
```

### Scenariusz 3: Docker Full Stack

```bash
# 1. Edytuj .env
nano .env
# Ustaw SLACK_WEBHOOK_URL, TEAMS_WEBHOOK_URL, etc.

# 2. Uruchom Docker
docker-compose up -d

# 3. Sprawdź logi
docker-compose logs -f

# 4. Test health check
curl http://localhost:3000/api/health

# 5. Test Redis
docker-compose exec redis redis-cli ping
# Odpowiedź: PONG

# 6. Otwórz aplikację
http://localhost:3000

# 7. Test integracji
http://localhost:3000/integrations-demo
```

## 🧪 Testy

### NLP - Różne formaty

```javascript
// ✅ Format podstawowy
"Gdy wpłata nastąpi, wystaw fakturę"

// ✅ Wiele akcji (i)
"Gdy wpłata nastąpi, wystaw fakturę i wyślij email"

// ✅ Wiele akcji (oraz)
"Gdy błąd wystąpi, zaloguj błąd oraz powiadom administratora"

// ✅ Skomplikowane zdanie
"Gdy nadejdzie nowe e-Doręczenie, przypisz dokument do sprawy i powiadom właściwy dział"

// ✅ Z kropką na końcu
"Gdy klient się zarejestruje, wyślij email powitalny."
```

### Config API

```bash
# Test 1: Load
curl http://localhost:3000/api/config/load | jq .PORT

# Test 2: Save
curl -X POST http://localhost:3000/api/config/save \
  -H "Content-Type: application/json" \
  -d '{"PORT":"8080"}'

# Test 3: Verify
cat .env | grep PORT
```

### Docker

```bash
# Health checks
docker-compose ps
# Wszystkie powinny być "healthy"

# DSL health
curl http://localhost:3000/api/health

# Redis health
docker-compose exec redis redis-cli ping

# E2E tests results
docker-compose logs e2e
```

## 📊 Monitoring

### Logi serwera

```bash
# Lokalnie
tail -f /var/log/dsl/server.log

# Docker
docker-compose logs -f dsl
```

### Health Check

```bash
# HTTP check
curl http://localhost:3000/api/health

# Odpowiedź:
{
  "status": "healthy",
  "timestamp": "2025-11-22T15:30:00.000Z",
  "version": "1.0.0",
  "uptime": 123.45
}
```

### Metryki

```bash
# Workflow statistics
curl http://localhost:3000/api/workflow/statistics | jq .

# Config values
curl http://localhost:3000/api/config/load | jq .

# Workflows count
curl http://localhost:3000/api/workflow/db/workflows | jq .count
```

## 🔧 Troubleshooting

### Problem: NLP nadal pokazuje błąd

**Rozwiązanie:**
1. Sprawdź format zdania: "Gdy [warunek], [akcje]"
2. Otwórz konsolę przeglądarki (F12)
3. Zobacz który parser był użyty
4. Jeśli lokalny parser zawiódł, sprawdź separatory akcji: "i", "oraz", "a także"

### Problem: Config nie zapisuje się

**Rozwiązanie:**
1. Sprawdź uprawnienia do .env: `ls -la .env`
2. Dodaj uprawnienia: `chmod 644 .env`
3. Sprawdź czy serwer ma dostęp do zapisu
4. Sprawdź logi: `docker-compose logs dsl` lub console serwera

### Problem: Docker nie startuje

**Rozwiązanie:**
```bash
# Sprawdź logi
docker-compose logs dsl

# Sprawdź czy port 3000 jest wolny
lsof -i :3000

# Rebuild
docker-compose down
docker-compose up -d --build

# Sprawdź .env
cat .env
```

### Problem: Redis connection failed

**Rozwiązanie:**
```bash
# Sprawdź Redis
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis

# Sprawdź network
docker network ls
docker network inspect dsl-network
```

## 📚 Dokumentacja

- **README.md** - Główna dokumentacja projektu
- **DOCKER-SETUP.md** - Szczegółowa dokumentacja Docker
- **CHANGELOG-NLP-FIX.md** - Lista wszystkich zmian
- **INTEGRATIONS-DEMO-README.md** - Dokumentacja demo integracji
- **INTEGRATIONS-QUICKSTART.md** - Szybki start integracji

## 🎉 Podsumowanie

### Co działa:
✅ NLP poprawnie przetwarza zdania (3-poziomowy fallback)  
✅ Panel konfiguracji .env przez GUI  
✅ Docker environment (DSL + Redis + E2E + Nginx)  
✅ API endpoints dla konfiguracji  
✅ Automatyczne testy E2E  
✅ Health checks dla wszystkich usług  
✅ Kompletna dokumentacja  

### Następne kroki:

1. **Przetestuj NLP:**
   ```
   http://localhost:3000
   Wpisz: "Gdy nadejdzie nowe e-Doręczenie, przypisz dokument do sprawy i powiadom właściwy dział"
   ```

2. **Skonfiguruj integracje:**
   ```
   http://localhost:3000/config
   Dodaj Slack/Teams webhooks
   Zapisz i restart
   ```

3. **Uruchom Docker:**
   ```bash
   docker-compose up -d
   docker-compose logs -f
   ```

4. **Test demo:**
   ```
   http://localhost:3000/integrations-demo
   Załaduj procesy i uruchom symulację
   ```

---

**Wszystko działa! 🚀 Ciesz się nowym środowiskiem!**
