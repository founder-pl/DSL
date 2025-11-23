# 🏗️ Architektura Systemu DSL Founder.pl

## Przegląd

DSL (Domain-Specific Language) Founder.pl to system do automatyzacji procesów biznesowych oparty na Event Sourcing i CQRS.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │ index.html │  │ edit.html  │  │ integrations-   │   │
│  │ (Main UI)  │  │ (Editor)   │  │ demo.html       │   │
│  └────────────┘  └────────────┘  └─────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────▼────────────────────────────────┐
│                    Express.js Server                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Routes & Controllers                    │   │
│  │  /api/workflow  /api/notifications  /api/config │   │
│  └─────────────────────┬────────────────────────────┘   │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────────┐ │
│  │            Business Logic Layer                    │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │ Workflow     │  │ Notification │               │ │
│  │  │ Engine       │  │ Manager      │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  └─────────────────────┬──────────────────────────────┘ │
└────────────────────────┼────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼──────┐ ┌──────▼────────┐
│  SQLite DB     │ │  Redis    │ │  External     │
│  (Event Store) │ │  (Cache)  │ │  Services     │
│                │ │           │ │  - SMTP       │
│  - workflows   │ │  Optional │ │  - Slack      │
│  - events      │ │           │ │  - Teams      │
│  - actions     │ │           │ │               │
└────────────────┘ └───────────┘ └───────────────┘
```

## Core Components

### 1. Frontend Applications

#### index.html - Main Application
- **Funkcja:** Główny interfejs użytkownika
- **Technologie:** Vanilla JS, Mermaid.js, YAML
- **Features:**
  - NLP Editor (zdania polskie → workflows)
  - YAML Editor
  - Mermaid Diagrams
  - CQRS Diagram
  - Batch Processing

#### edit.html - Visual Editor
- **Funkcja:** Edytor drag & drop
- **Technologie:** Vanilla JS, SVG
- **Features:**
  - Drag & drop nodes
  - SVG connections
  - Auto-layout
  - Direct DB integration
  - Real-time editing

#### manager.html - Workflow Manager
- **Funkcja:** Zarządzanie workflows z bazy
- **Technologie:** Vanilla JS
- **Features:**
  - Lista wszystkich workflows
  - Edycja inline
  - Filtrowanie
  - Export/Import

#### config.html - Configuration Panel
- **Funkcja:** Panel konfiguracji .env
- **Technologie:** Vanilla JS
- **Features:**
  - GUI dla .env
  - Testowanie połączeń
  - Preview konfiguracji
  - Export .env

#### integrations-demo.html - Integrations Demo
- **Funkcja:** Demo integracji powiadomień
- **Technologie:** Vanilla JS
- **Features:**
  - Email/Slack/Teams config
  - Symulacja procesów
  - Statystyki
  - Real-time logs

### 2. Backend (Node.js/Express)

#### Server (src/server/index.js)
```javascript
class DSLServer {
  - setupWorkflowRoutes()      // Workflow CRUD
  - setupNotificationsRoutes() // Email/Slack/Teams
  - setupConfigRoutes()         // Config management
  - setupAnalysisRoutes()       // Deep analysis
  - setupProcessesRoutes()      // Process generation
}
```

#### Workflow Engine (src/core/workflow-engine.js)
```javascript
class WorkflowEngine {
  - createWorkflowFromNLP()    // NLP → Workflow
  - executeAction()            // Execute action
  - validateWorkflow()         // Validation
  - getStatistics()            // Stats
}
```

#### Event Sourcing
```javascript
EventStore {
  - events: []                 // All events
  - handlers: Map()            // Event handlers
  - publish()                  // Publish event
  - replay()                   // Replay events
}
```

### 3. Database Layer

#### SQLite Schema
```sql
-- Workflows table
CREATE TABLE workflows(
  id TEXT PRIMARY KEY,
  name TEXT,
  module TEXT,
  created_at TEXT
);

-- Steps table (synthetic)
CREATE TABLE steps(
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  name TEXT,
  module TEXT,
  order_index INTEGER,
  FOREIGN KEY(workflow_id) REFERENCES workflows(id)
);

-- Actions table
CREATE TABLE actions(
  id TEXT PRIMARY KEY,
  step_id TEXT,
  name TEXT,
  module TEXT,
  order_index INTEGER,
  FOREIGN KEY(step_id) REFERENCES steps(id)
);

-- Events table (Event Sourcing)
CREATE TABLE events(
  id TEXT PRIMARY KEY,
  type TEXT,
  action_name TEXT,
  payload TEXT,
  timestamp TEXT,
  metadata TEXT
);
```

### 4. External Integrations

#### Email (SMTP)
- **Provider:** Nodemailer
- **Mode:** Mock (demo) / Production
- **Config:** SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

#### Slack
- **Type:** Webhook
- **Config:** SLACK_WEBHOOK_URL, SLACK_CHANNEL

#### Microsoft Teams
- **Type:** Webhook
- **Config:** TEAMS_WEBHOOK_URL

## Design Patterns

### 1. Event Sourcing
Wszystkie zmiany stanu są zapisywane jako sekwencja zdarzeń.

```
Event Store:
  1. WorkflowCreated { id, name, module, actions }
  2. ActionExecuted { workflowId, actionName, result }
  3. WorkflowUpdated { id, changes }
```

**Zalety:**
- Pełna historia zmian
- Audit trail
- Time travel (replay)
- Event replay

### 2. CQRS (Command Query Responsibility Segregation)

**Commands (Write Side):**
- `createWorkflowFromNLP(sentence)`
- `executeAction(actionName, context)`
- `updateWorkflow(id, changes)`

**Queries (Read Side):**
- `getWorkflows()`
- `getStatistics()`
- `getEventsByType(type)`

**Read Model:**
Projekcja eventów do optymalizowanego formatu do odczytu.

### 3. Repository Pattern

```javascript
class WorkflowRepository {
  async save(workflow)
  async findById(id)
  async findAll()
  async delete(id)
}
```

### 4. Module Mapper

```javascript
class ModuleMapper {
  keywordToModule = {
    'faktura': 'Finanse',
    'email': 'Powiadomienia',
    'kampania': 'Marketing'
  }
  
  getModuleForKeywords(text)
}
```

## Data Flow

### 1. Creating Workflow (NLP)

```
User Input (NLP)
  ↓
"Gdy wpłata nastąpi, wystaw fakturę"
  ↓
NLP Parser (src/core/nlp.js)
  ↓
{
  condition: "wpłata nastąpi",
  actions: ["wystaw fakturę"]
}
  ↓
Workflow Engine
  ↓
Event: WorkflowCreated
  ↓
Event Store → SQLite
  ↓
Read Model Updated
  ↓
Response to Client
```

### 2. Executing Action

```
User Clicks "Execute"
  ↓
POST /api/workflow/action
  ↓
Workflow Engine.executeAction()
  ↓
Action Executor
  ↓
Event: ActionExecuted
  ↓
Event Store → SQLite
  ↓
Notification (if configured)
  ↓
Response to Client
```

### 3. Visual Editor Flow

```
User Opens edit.html
  ↓
Click "Wczytaj z bazy"
  ↓
GET /api/workflow/db/workflows
  ↓
Convert workflows → nodes
  ↓
Render nodes + SVG connections
  ↓
User drags nodes
  ↓
Real-time SVG update
  ↓
Click "Zapisz do bazy"
  ↓
POST /api/workflow/db/save
  ↓
SQLite Update
```

## Scalability Considerations

### Current Architecture (Single Instance)
- ✅ SQLite - Good for < 100k workflows
- ✅ In-memory event store
- ✅ No horizontal scaling

### Future Scaling Options

#### 1. Database
- PostgreSQL for more concurrent writes
- Separate read/write databases (CQRS)
- Connection pooling

#### 2. Caching
- Redis for read model
- Cache frequently accessed workflows
- Session store

#### 3. Message Queue
- RabbitMQ / Kafka for events
- Async processing
- Event replay from queue

#### 4. Microservices
```
API Gateway
  ├─ Workflow Service
  ├─ Notification Service
  ├─ Analytics Service
  └─ Config Service
```

## Security

### Current
- Helmet.js for HTTP headers
- CORS configuration
- Input sanitization (TextSanitizer)
- No authentication (local use)

### Production Requirements
- [ ] JWT authentication
- [ ] Role-based access control
- [ ] API rate limiting
- [ ] HTTPS only
- [ ] Secrets management (vault)
- [ ] SQL injection protection (prepared statements)

## Performance

### Optimizations
- Event store in memory (fast reads)
- SQLite with indexes
- Lazy loading for large datasets
- SVG rendering throttling

### Bottlenecks
- ⚠️ SQLite write lock (concurrent writes)
- ⚠️ In-memory event store (memory usage)
- ⚠️ No caching layer

## Monitoring & Observability

### Current
- Console logging
- Error messages to client
- Health check endpoint

### Future
- [ ] Structured logging (Winston)
- [ ] Metrics (Prometheus)
- [ ] Tracing (OpenTelemetry)
- [ ] Alerting (Grafana)

## Technology Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Database:** SQLite3
- **Cache:** Redis (optional)

### Frontend
- **Language:** JavaScript ES6+
- **Libraries:** Mermaid.js, js-yaml
- **Graphics:** SVG (native)
- **Modules:** ES6 imports

### Infrastructure
- **Container:** Docker
- **Orchestration:** Docker Compose
- **Reverse Proxy:** Nginx (optional)
- **CI/CD:** (TODO)

## Deployment

### Development
```bash
make server
# Single Node.js process
```

### Production (Docker)
```bash
make start
# Docker Compose with Redis
```

### Production (Manual)
```bash
NODE_ENV=production node src/server/index.js
# With PM2: pm2 start src/server/index.js
```

## Next Steps

### Short Term
- [ ] Fix Docker health checks
- [ ] Add E2E tests (Playwright)
- [ ] WebSocket for real-time updates
- [ ] Production nodemailer setup

### Medium Term
- [ ] PostgreSQL support
- [ ] Authentication & Authorization
- [ ] API versioning
- [ ] GraphQL API

### Long Term
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Multi-tenancy
- [ ] SaaS offering

---

**See also:**
- [Event Sourcing Details](event-sourcing.md)
- [Database Schema](database-schema.md)
- [API Architecture](api-architecture.md)
