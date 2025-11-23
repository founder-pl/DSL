# 📚 Dokumentacja DSL Founder.pl

## Struktura dokumentacji

```
docs/
├── README.md                    # Ten plik - spis treści
├── architecture/                # Architektura systemu
│   ├── overview.md             # Przegląd architektury
│   ├── event-sourcing.md       # Event Sourcing + CQRS
│   ├── database-schema.md      # Schemat bazy danych
│   └── api-architecture.md     # Architektura API
├── api/                         # Dokumentacja API
│   ├── workflow-api.md         # API workflow
│   ├── notifications-api.md    # API powiadomień
│   ├── config-api.md           # API konfiguracji
│   └── webhooks-api.md         # API webhooks
├── html-apps/                   # Dokumentacja aplikacji HTML
│   ├── index-html.md           # Główna aplikacja
│   ├── edit-html.md            # Edytor drag&drop
│   ├── manager-html.md         # Manager workflows
│   ├── config-html.md          # Panel konfiguracji
│   └── integrations-demo.md    # Demo integracji
└── tutorials/                   # Tutoriale
    ├── quick-start.md          # Szybki start
    ├── docker-setup.md         # Setup Docker
    └── creating-workflows.md   # Tworzenie workflows
```

## Quick Links

### 🏗️ Architektura
- [Przegląd architektury](architecture/overview.md)
- [Event Sourcing & CQRS](architecture/event-sourcing.md)
- [Schemat bazy danych](architecture/database-schema.md)

### 🔌 API Documentation
- [Workflow API](api/workflow-api.md) - Tworzenie i zarządzanie workflows
- [Notifications API](api/notifications-api.md) - Email, Slack, Teams
- [Config API](api/config-api.md) - Zarządzanie konfiguracją
- [Webhooks API](api/webhooks-api.md) - Integracje webhooks

### 🖥️ HTML Applications
- [index.html](html-apps/index-html.md) - Główna aplikacja
- [edit.html](html-apps/edit-html.md) - Edytor drag&drop z SVG
- [manager.html](html-apps/manager-html.md) - Manager workflows
- [config.html](html-apps/config-html.md) - Panel konfiguracji
- [integrations-demo.html](html-apps/integrations-demo.md) - Demo integracji

### 📖 Tutorials
- [Quick Start](tutorials/quick-start.md) - Uruchomienie w 5 minut
- [Docker Setup](tutorials/docker-setup.md) - Konfiguracja Docker
- [Creating Workflows](tutorials/creating-workflows.md) - Tworzenie workflows

## Główne komponenty

### Backend (Node.js)
- **Express.js** - HTTP server
- **SQLite** - Baza danych
- **Event Sourcing** - Architektura zdarzeń
- **CQRS** - Command Query Responsibility Segregation

### Frontend (HTML/JavaScript)
- **Vanilla JS** - Bez frameworków
- **ES6 Modules** - Modułowa struktura
- **SVG** - Grafika wektorowa (edit.html)
- **Mermaid.js** - Diagramy

### Integracje
- **Email (SMTP)** - Nodemailer (mock w demo)
- **Slack** - Webhook integration
- **Microsoft Teams** - Webhook integration
- **Discord** - Webhook (opcjonalnie)

### Infrastructure
- **Docker Compose** - Orkiestracja kontenerów
- **Redis** - Cache (opcjonalnie)
- **Nginx** - Reverse proxy (production)

## Kluczowe koncepty

### 1. Workflow
Workflow to proces biznesowy składający się z:
- **ID** - Unikalny identyfikator
- **Name** - Nazwa procesu (warunek "Gdy...")
- **Module** - Moduł (Finanse, Marketing, etc.)
- **Actions** - Lista akcji do wykonania

### 2. Event Sourcing
Wszystkie zmiany są zapisywane jako zdarzenia:
- **WorkflowCreated** - Utworzono workflow
- **ActionExecuted** - Wykonano akcję
- **WorkflowUpdated** - Zaktualizowano workflow

### 3. NLP Processing
System przetwarza zdania w języku polskim:
```
"Gdy wpłata klienta nastąpi, wystaw fakturę i wyślij email"
```
→ Workflow z 2 akcjami

### 4. Visual Editor
edit.html umożliwia:
- Drag & drop nodes
- SVG connections między nodes
- Real-time updates
- Zapis do bazy

## API Endpoints

### Health & Info
```
GET  /api/health              - Health check
GET  /api                     - API documentation
```

### Workflow Management
```
POST /api/workflow/nlp        - Utwórz workflow z NLP
GET  /api/workflow/workflows  - Lista workflows
POST /api/workflow/action     - Wykonaj akcję
GET  /api/workflow/db/workflows - Workflows z bazy
POST /api/workflow/db/save    - Zapisz do bazy
```

### Notifications
```
POST /api/notifications/test-email  - Test SMTP
POST /api/notifications/test-slack  - Test Slack
POST /api/notifications/test-teams  - Test Teams
POST /api/notifications/send        - Wyślij powiadomienie
```

### Configuration
```
GET  /api/config/load         - Załaduj konfigurację
POST /api/config/save         - Zapisz konfigurację
POST /api/config/reset        - Reset do defaults
```

## Uruchomienie

### Quick Start (lokalnie)
```bash
make stop
make server
# → http://localhost:3000
```

### Docker
```bash
make start
# → http://localhost:3000
```

### Development
```bash
make server-dev
# Hot reload z --watch
```

## Zmienne środowiskowe (.env)

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DB_PATH=./data/dsl.sqlite

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TEAMS_WEBHOOK_URL=https://outlook.office.com/...
```

## Testing

### Manual Testing
- **UI Tester**: http://localhost:3000/ui-tester.html
- **Test Runner**: http://localhost:3000/tests

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Create workflow
curl -X POST http://localhost:3000/api/workflow/nlp \
  -H "Content-Type: application/json" \
  -d '{"sentence": "Gdy test, wykonaj akcję testową"}'
```

## Troubleshooting

### Port 3000 zajęty
```bash
make stop
```

### Docker unhealthy
```bash
docker-compose logs dsl
make stop && make server  # Uruchom lokalnie
```

### edit.html pusty canvas
```bash
# F12 → Console → Sprawdź błędy
# Network → /api/workflow/db/workflows → Sprawdź response
```

## Contributing

### Dodawanie nowej funkcji
1. Dodaj kod w odpowiednim module (`src/`)
2. Dodaj testy w `src/tests/`
3. Zaktualizuj dokumentację w `docs/`
4. Dodaj przykład użycia

### Styl kodu
- ES6+ syntax
- Async/await (nie callbacks)
- JSDoc komentarze
- Descriptive variable names

## Support

- **Issues**: GitHub Issues
- **Documentation**: `/docs`
- **Examples**: `/examples` (TODO)
- **Tests**: `/src/tests`

## Version History

- **v1.0** - Initial release
  - Event Sourcing + CQRS
  - NLP processing
  - SQLite database
  - Basic UI (index.html)

- **v1.1** - Visual Editor
  - edit.html z drag&drop
  - SVG connections
  - Auto-layout

- **v1.2** - Integrations
  - Email (SMTP mock)
  - Slack webhooks
  - Teams webhooks
  - Config panel

- **v1.3** - Docker & Docs
  - Docker Compose
  - Redis cache
  - Full documentation

## License

MIT License - See LICENSE file

---

**🚀 Start here:** [Quick Start Tutorial](tutorials/quick-start.md)
