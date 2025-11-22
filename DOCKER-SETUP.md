# 🐳 Docker Setup - Founder.pl DSL

## Szybki Start

### 1. Uruchomienie z Docker Compose

```bash
# Sklonuj repozytorium
cd /home/tom/github/founder-pl/DSL

# Skopiuj przykładową konfigurację
cp .env.example .env

# Edytuj .env według potrzeb
nano .env

# Uruchom wszystkie usługi
docker-compose up -d

# Sprawdź status
docker-compose ps

# Sprawdź logi
docker-compose logs -f dsl
```

### 2. Dostęp do aplikacji

- **Główna aplikacja:** http://localhost:3000
- **Panel konfiguracji:** http://localhost:3000/config
- **Demo integracji:** http://localhost:3000/integrations-demo
- **Test runner:** http://localhost:3000/tests
- **API docs:** http://localhost:3000/api
- **Health check:** http://localhost:3000/api/health

## Struktura Docker Compose

### Usługi

#### 1. DSL Server (Node.js)
```yaml
dsl:
  - Port: 3000
  - Environment: Czyta z .env
  - Volumes: 
    - ./generated (do generowanych skryptów)
    - ./data (baza SQLite)
    - ./domains (procesy biznesowe)
  - Health check: co 10s
```

#### 2. Redis (Cache)
```yaml
redis:
  - Port: 6379
  - Persistence: appendonly.aof
  - Volume: redis-data
  - Health check: redis-cli ping
```

#### 3. E2E Tests
```yaml
e2e:
  - Uruchamia się po starcie DSL
  - Wykonuje testy end-to-end
  - Logs: docker-compose logs e2e
```

#### 4. Nginx (opcjonalne - production profile)
```yaml
nginx:
  - Porty: 80, 443
  - Reverse proxy dla DSL
  - SSL termination
  - Profile: production
```

## Konfiguracja środowiska

### Plik .env

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
SMTP_FROM=noreply@founder.pl
EMAIL_TO=admin@example.com

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#general

# Teams
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# API
API_BASE_URL=http://localhost:3000
API_TIMEOUT=30000

# Security
CORS_ORIGIN=*
HELMET_ENABLED=true

# Features
ENABLE_NOTIFICATIONS=true
ENABLE_WEBHOOKS=true
ENABLE_ANALYTICS=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Panel Konfiguracji (http://localhost:3000/config)

1. Otwórz http://localhost:3000/config w przeglądarce
2. Wypełnij formularze dla:
   - Serwer (port, host, baza danych)
   - Email (SMTP)
   - Integracje (Slack, Teams)
   - Zaawansowane (API, security, logging)
3. Kliknij "💾 Zapisz Konfigurację"
4. Restart serwera: `docker-compose restart dsl`

## Komendy Docker

### Podstawowe operacje

```bash
# Uruchom wszystkie usługi
docker-compose up -d

# Uruchom tylko DSL (bez Redis)
docker-compose up -d --no-deps dsl

# Zatrzymaj wszystkie usługi
docker-compose down

# Restart usługi
docker-compose restart dsl

# Rebuild i restart
docker-compose up -d --build

# Usuń wszystko (włącznie z volumes)
docker-compose down -v
```

### Logi

```bash
# Wszystkie logi
docker-compose logs -f

# Tylko DSL
docker-compose logs -f dsl

# Tylko Redis
docker-compose logs -f redis

# E2E tests
docker-compose logs e2e

# Ostatnie 100 linii
docker-compose logs --tail=100 dsl
```

### Monitoring

```bash
# Status usług
docker-compose ps

# Statystyki zasobów
docker stats dsl-server dsl-redis

# Health checks
docker-compose exec dsl wget -qO- http://localhost:3000/api/health
docker-compose exec redis redis-cli ping
```

### Dostęp do kontenerów

```bash
# Shell w kontenerze DSL
docker-compose exec dsl sh

# Shell w Redis
docker-compose exec redis sh

# Redis CLI
docker-compose exec redis redis-cli

# Sprawdź zmienne środowiskowe
docker-compose exec dsl printenv
```

## Volumes i Persystencja

### Dane aplikacji

```
./data/dsl.sqlite         # Baza danych (mapowana 1:1)
./generated/              # Generowane skrypty
./uploads/                # Przesłane pliki
```

### Redis

```
redis-data                # Named volume dla Redis
```

### Backup

```bash
# Backup bazy danych
docker-compose exec dsl cp /app/data/dsl.sqlite /app/data/dsl.sqlite.backup
docker cp dsl-server:/app/data/dsl.sqlite.backup ./backup_$(date +%Y%m%d).sqlite

# Backup Redis
docker-compose exec redis redis-cli SAVE
docker cp dsl-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### Restore

```bash
# Restore bazy danych
docker cp ./backup.sqlite dsl-server:/app/data/dsl.sqlite
docker-compose restart dsl

# Restore Redis
docker cp ./redis_backup.rdb dsl-redis:/data/dump.rdb
docker-compose restart redis
```

## Production Deployment

### 1. Przygotowanie

```bash
# Ustaw NODE_ENV=production w .env
NODE_ENV=production

# Wyłącz debug logging
LOG_LEVEL=error

# Ustaw bezpieczne CORS
CORS_ORIGIN=https://your-domain.com

# Włącz SSL w Nginx
docker-compose --profile production up -d
```

### 2. SSL/TLS (Nginx)

```bash
# Utwórz katalog SSL
mkdir -p ssl

# Wygeneruj self-signed cert (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key -out ssl/certificate.crt

# Lub użyj Let's Encrypt (production)
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/*.pem ssl/
```

### 3. Nginx Config

Utwórz `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream dsl {
        server dsl:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;

        location / {
            proxy_pass http://dsl;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 4. Uruchomienie production

```bash
docker-compose --profile production up -d
```

## Troubleshooting

### DSL nie startuje

```bash
# Sprawdź logi
docker-compose logs dsl

# Sprawdź czy port 3000 jest wolny
lsof -i :3000

# Sprawdź health check
docker inspect dsl-server | grep -A 5 Health

# Restart z rebuild
docker-compose up -d --build --force-recreate dsl
```

### Redis connection failed

```bash
# Sprawdź czy Redis działa
docker-compose exec redis redis-cli ping

# Sprawdź logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis

# Wyczyść dane Redis
docker-compose exec redis redis-cli FLUSHALL
```

### Permission issues

```bash
# Fix permissions dla volumes
sudo chown -R $USER:$USER ./data ./generated ./uploads

# Wewnątrz kontenera
docker-compose exec dsl chown -R node:node /app/data
```

### Port już zajęty

```bash
# Zmień port w .env
PORT=3001

# Lub zatrzymaj proces na porcie 3000
lsof -ti :3000 | xargs kill -9

# Restart
docker-compose down && docker-compose up -d
```

### Database locked

```bash
# Zatrzymaj wszystkie procesy używające bazy
docker-compose down

# Sprawdź czy plik nie jest otwarty
lsof ./data/dsl.sqlite

# Usuń lock file jeśli istnieje
rm -f ./data/dsl.sqlite-shm ./data/dsl.sqlite-wal

# Restart
docker-compose up -d
```

## Health Checks

### Endpoint /api/health

```bash
curl http://localhost:3000/api/health
```

Odpowiedź:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-22T15:00:00.000Z",
  "version": "1.0.0",
  "uptime": 123.45
}
```

### Docker health check

```bash
# Status health check
docker inspect dsl-server --format='{{json .State.Health}}'

# Historia health checks
docker inspect dsl-server | jq '.[0].State.Health.Log'
```

## Performance Tuning

### Node.js

```bash
# Zwiększ memory limit
NODE_OPTIONS=--max-old-space-size=4096

# Worker threads
UV_THREADPOOL_SIZE=8
```

### Redis

```bash
# Maksymalna pamięć
docker-compose exec redis redis-cli CONFIG SET maxmemory 256mb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Docker

```bash
# Limit zasobów dla kontenera
docker-compose.yml:
  dsl:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

## Monitoring & Logging

### Loki + Grafana (opcjonalne)

```yaml
# Dodaj do docker-compose.yml
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
```

### Prometheus metrics (opcjonalne)

Dodaj do `src/server/index.js`:
```javascript
const prometheus = require('prom-client');
const register = new prometheus.Registry();

this.app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

## Update & Maintenance

### Aktualizacja aplikacji

```bash
# Pull latest changes
git pull origin main

# Rebuild i restart
docker-compose up -d --build

# Sprawdź logi
docker-compose logs -f dsl
```

### Czyszczenie

```bash
# Usuń nieużywane obrazy
docker image prune -a

# Usuń nieużywane volumes
docker volume prune

# Usuń wszystko Docker
docker system prune -a --volumes
```

## FAQ

**Q: Czy mogę uruchomić bez Redis?**  
A: Tak, usuń `depends_on: redis` z docker-compose.yml i ustaw `ENABLE_CACHE=false` w .env

**Q: Jak zmienić port?**  
A: Zmień `PORT=3000` w .env i `ports: "3000:3000"` w docker-compose.yml na wybrany port

**Q: Czy działa na Windows?**  
A: Tak, Docker Desktop dla Windows wspiera docker-compose

**Q: Jak dodać własne zmienne środowiskowe?**  
A: Dodaj do .env i zrestartuj serwer

## Support

- Issues: https://github.com/founder-pl/DSL/issues
- Dokumentacja: /home/tom/github/founder-pl/DSL/README.md
- Health check: http://localhost:3000/api/health

---

**Powodzenia z Docker! 🐳**
