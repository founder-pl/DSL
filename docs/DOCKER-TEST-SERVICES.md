# 🐳 Docker Test Services - Pełne środowisko testowe

## Przegląd

`docker-compose.test.yml` zawiera pełną infrastrukturę do testowania wszystkich funkcji DSL, włączając:
- ✅ **MailHog** - Test SMTP server (email)
- ✅ **Webhook Proxy** - Test webhooks (Slack/Teams)
- ✅ **Redis** - Cache
- ✅ **PostgreSQL** - Production-grade database (optional)
- ✅ **Mattermost** - Chat platform (optional)
- ✅ **MinIO** - S3-compatible storage (optional)
- ✅ **Grafana** - Monitoring dashboards (optional)

## Quick Start

### 1. Uruchomienie podstawowego środowiska

```bash
# Skopiuj konfigurację testową
cp .env.test .env

# Uruchom podstawowe usługi (DSL + Redis + MailHog + Webhook Proxy)
docker-compose -f docker-compose.test.yml up -d

# Sprawdź status
docker-compose -f docker-compose.test.yml ps
```

### 2. Dostęp do usług

| Usługa | URL | Credentials |
|--------|-----|-------------|
| **DSL App** | http://localhost:3000 | - |
| **MailHog UI** | http://localhost:8025 | - |
| **Webhook Tester** | http://localhost:8080 | - |
| **Redis** | redis://localhost:6379 | - |
| **PostgreSQL** | postgresql://localhost:5432 | dsl / dsl_password |
| **Mattermost** | http://localhost:8065 | setup required |
| **MinIO** | http://localhost:9001 | dsl-admin / dsl-password-123 |
| **Grafana** | http://localhost:3001 | admin / admin |

## Usługi

### 1. MailHog - Test SMTP Server

**Opis:** Lokalny serwer SMTP do testowania wysyłki emaili

**Porty:**
- `1025` - SMTP server (DSL łączy się tutaj)
- `8025` - Web UI (przeglądaj otrzymane emaile)

**Konfiguracja DSL:**
```bash
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=test@dsl.local
SMTP_PASS=test
```

**Użycie:**
```bash
# 1. Uruchom środowisko
docker-compose -f docker-compose.test.yml up -d

# 2. Wyślij test email z DSL
curl -X POST http://localhost:3000/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "host": "mailhog",
    "port": 1025,
    "user": "test@dsl.local",
    "pass": "test",
    "to": "recipient@example.com"
  }'

# 3. Zobacz email w MailHog UI
open http://localhost:8025
```

**Screenshot:**
- Lista emaili w czasie rzeczywistym
- Preview HTML i plain text
- Headers inspection
- Download jako .eml

### 2. Webhook Proxy - Test Webhooks

**Opis:** Lokalny serwer do przechwytywania webhooks (Slack, Teams, Discord)

**Port:** `8080` - Web UI + webhook receiver

**Konfiguracja DSL:**
```bash
SLACK_WEBHOOK_URL=http://webhook-proxy:8080/slack
TEAMS_WEBHOOK_URL=http://webhook-proxy:8080/teams
DISCORD_WEBHOOK_URL=http://webhook-proxy:8080/discord
```

**Użycie:**
```bash
# 1. Uruchom środowisko
docker-compose -f docker-compose.test.yml up -d

# 2. Wyślij test webhook
curl -X POST http://localhost:3000/api/notifications/test-slack \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": "http://webhook-proxy:8080/slack",
    "channel": "#general"
  }'

# 3. Zobacz webhook w Webhook Tester UI
open http://localhost:8080
```

**Features:**
- Real-time webhook display
- Request/Response inspection
- JSON formatting
- Export history

### 3. Redis - Cache

**Opis:** In-memory cache dla szybkiego dostępu

**Port:** `6379`

**Użycie:**
```bash
# Connect z DSL
REDIS_URL=redis://redis:6379

# Test connection
docker-compose -f docker-compose.test.yml exec redis redis-cli ping
# → PONG
```

### 4. PostgreSQL - Production Database (Optional)

**Opis:** Production-grade relational database (alternatywa dla SQLite)

**Port:** `5432`

**Credentials:**
- User: `dsl`
- Password: `dsl_password`
- Database: `dsl_test`

**Uruchomienie:**
```bash
# Włącz profil postgres
docker-compose -f docker-compose.test.yml --profile postgres up -d

# Connect
psql -h localhost -U dsl -d dsl_test
```

**Migracja z SQLite:**
```bash
# Export z SQLite
sqlite3 data/dsl.sqlite .dump > dump.sql

# Import do PostgreSQL
psql -h localhost -U dsl -d dsl_test < dump.sql
```

### 5. Mattermost - Chat Platform (Optional)

**Opis:** Open-source chat (Slack alternative) do testowania integracji chat

**Port:** `8065`

**Uruchomienie:**
```bash
# Włącz profil mattermost (wymaga postgres)
docker-compose -f docker-compose.test.yml --profile postgres --profile mattermost up -d

# Setup
open http://localhost:8065
# Create admin account
# Create team & channel
```

**Integracja z DSL:**
1. Mattermost → System Console → Integrations
2. Enable Incoming Webhooks
3. Create Incoming Webhook dla kanału
4. Skopiuj URL
5. Użyj w DSL jako `SLACK_WEBHOOK_URL` (kompatybilny format)

### 6. MinIO - S3 Storage (Optional)

**Opis:** S3-compatible object storage dla uploadów

**Porty:**
- `9000` - API
- `9001` - Console UI

**Credentials:**
- Access Key: `dsl-admin`
- Secret Key: `dsl-password-123`

**Uruchomienie:**
```bash
# Włącz profil storage
docker-compose -f docker-compose.test.yml --profile storage up -d

# Open console
open http://localhost:9001
```

**Konfiguracja DSL:**
```javascript
// src/server/storage.js
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true
});
```

### 7. Grafana + Prometheus - Monitoring (Optional)

**Opis:** Monitoring stack dla metryk i dashboardów

**Porty:**
- `3001` - Grafana UI
- `9090` - Prometheus UI

**Uruchomienie:**
```bash
# Włącz profil monitoring
docker-compose -f docker-compose.test.yml --profile monitoring up -d

# Open Grafana
open http://localhost:3001
# Login: admin / admin
```

**Dashboards:**
- System metrics (CPU, RAM, Disk)
- Application metrics (requests, errors)
- Database metrics (queries, connections)
- Redis metrics (cache hits, memory)

## Profiles

Profile pozwalają uruchamiać tylko wybrane usługi:

```bash
# Podstawowe (DSL + Redis + MailHog + Webhooks)
docker-compose -f docker-compose.test.yml up -d

# + PostgreSQL
docker-compose -f docker-compose.test.yml --profile postgres up -d

# + Mattermost (chat)
docker-compose -f docker-compose.test.yml --profile postgres --profile mattermost up -d

# + MinIO (storage)
docker-compose -f docker-compose.test.yml --profile storage up -d

# + Monitoring
docker-compose -f docker-compose.test.yml --profile monitoring up -d

# Wszystko
docker-compose -f docker-compose.test.yml \
  --profile postgres \
  --profile mattermost \
  --profile storage \
  --profile monitoring \
  up -d
```

## Testowanie End-to-End

### Scenariusz 1: Email Workflow

```bash
# 1. Uruchom środowisko
docker-compose -f docker-compose.test.yml up -d

# 2. Otwórz DSL
open http://localhost:3000

# 3. Otwórz MailHog
open http://localhost:8025

# 4. Utwórz workflow w DSL
# "Gdy test email, wyślij powiadomienie"

# 5. Uruchom workflow
# → Email pojawi się w MailHog UI
```

### Scenariusz 2: Slack/Teams Webhook

```bash
# 1. Uruchom środowisko
docker-compose -f docker-compose.test.yml up -d

# 2. Otwórz Webhook Tester
open http://localhost:8080

# 3. Uruchom DSL integrations-demo
open http://localhost:3000/integrations-demo

# 4. Skonfiguruj Slack webhook: http://webhook-proxy:8080/slack
# 5. Test webhook
# → Zobaczysz request w Webhook Tester UI
```

### Scenariusz 3: Full Stack Test

```bash
# 1. Uruchom wszystko
docker-compose -f docker-compose.test.yml \
  --profile postgres \
  --profile mattermost \
  --profile storage \
  up -d

# 2. Sprawdź że wszystko działa
docker-compose -f docker-compose.test.yml ps

# 3. Test endpoints
curl http://localhost:3000/api/health          # DSL
curl http://localhost:8025                      # MailHog
curl http://localhost:8080                      # Webhooks
curl http://localhost:8065                      # Mattermost
curl http://localhost:9001                      # MinIO

# 4. Uruchom E2E tests
npm run test:e2e
```

## Konfiguracja produkcyjna vs testowa

### Development (.env)
```bash
# Używa mocków
SMTP_HOST=smtp.gmail.com  # Wymaga konfiguracji
SLACK_WEBHOOK_URL=        # Puste = mock
```

### Test (.env.test)
```bash
# Używa lokalnych usług
SMTP_HOST=mailhog
SMTP_PORT=1025
SLACK_WEBHOOK_URL=http://webhook-proxy:8080/slack
```

### Production (.env.production)
```bash
# Używa prawdziwych usług
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Makefile Commands

Dodaj do Makefile:

```makefile
# Test environment
start-test:
	@echo "🧪 Uruchamianie środowiska testowego..."
	docker-compose -f docker-compose.test.yml up -d
	@echo "✅ Środowisko testowe uruchomione!"
	@echo "📱 DSL: http://localhost:3000"
	@echo "📧 MailHog: http://localhost:8025"
	@echo "🔗 Webhooks: http://localhost:8080"

stop-test:
	@echo "🛑 Zatrzymywanie środowiska testowego..."
	docker-compose -f docker-compose.test.yml down
	@echo "✅ Zatrzymano!"

logs-test:
	docker-compose -f docker-compose.test.yml logs -f

status-test:
	docker-compose -f docker-compose.test.yml ps
```

**Użycie:**
```bash
make start-test   # Uruchom test environment
make stop-test    # Zatrzymaj
make logs-test    # Zobacz logi
make status-test  # Status usług
```

## Troubleshooting

### MailHog nie otrzymuje emaili
```bash
# Sprawdź logi
docker-compose -f docker-compose.test.yml logs mailhog

# Test SMTP connection
telnet localhost 1025
```

### Webhook Proxy nie pokazuje requestów
```bash
# Sprawdź czy URL jest poprawny
curl http://localhost:8080/health

# Test webhook
curl -X POST http://localhost:8080/test \
  -d '{"test": "data"}'
```

### PostgreSQL connection failed
```bash
# Sprawdź czy działa
docker-compose -f docker-compose.test.yml ps postgres

# Test connection
docker-compose -f docker-compose.test.yml exec postgres \
  psql -U dsl -d dsl_test -c "SELECT 1;"
```

## Clean Up

```bash
# Zatrzymaj wszystko
docker-compose -f docker-compose.test.yml down

# Usuń volumes (USUWA DANE!)
docker-compose -f docker-compose.test.yml down -v

# Usuń tylko jeden volume
docker volume rm dsl-postgres-data
```

## Podsumowanie

### ✅ Dostępne usługi testowe:

| Usługa | Status | Użycie |
|--------|--------|--------|
| **MailHog** | ✅ Ready | Test SMTP emails |
| **Webhook Proxy** | ✅ Ready | Test Slack/Teams webhooks |
| **Redis** | ✅ Ready | Cache |
| **PostgreSQL** | ⚙️ Optional | Production DB |
| **Mattermost** | ⚙️ Optional | Chat testing |
| **MinIO** | ⚙️ Optional | S3 storage |
| **Grafana** | ⚙️ Optional | Monitoring |

### 📊 Konfiguracja zgodna z .env:

✅ Wszystkie zmienne środowiskowe z `.env.test` są skonfigurowane  
✅ DSL automatycznie łączy się z usługami testowymi  
✅ Hasła i porty są już ustawione  
✅ Nie trzeba ręcznej konfiguracji  

### 🚀 Quick commands:

```bash
# Start basic test environment
docker-compose -f docker-compose.test.yml up -d

# Start with all services
docker-compose -f docker-compose.test.yml \
  --profile postgres --profile mattermost \
  --profile storage --profile monitoring up -d

# Stop
docker-compose -f docker-compose.test.yml down
```

---

**🎉 Pełne środowisko testowe gotowe!**

Email, Chat, Webhooks - wszystko działa lokalnie bez zewnętrznych usług!
