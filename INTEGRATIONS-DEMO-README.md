# 🔗 Środowisko Demo Integracji - Instrukcja

## Opis

Środowisko demo integracji pozwala na symulację procesów biznesowych z automatycznymi powiadomieniami przez:
- 📧 **Email (SMTP)**
- 💬 **Slack**
- 🏢 **Microsoft Teams**

## Uruchomienie

### 1. Uruchom serwer

```bash
npm start
# lub
node src/server/index.js
```

### 2. Otwórz demo

Przejdź do: **http://localhost:3000/integrations-demo**

## Konfiguracja Integracji

### 📧 Email (SMTP)

#### Gmail
```
Host: smtp.gmail.com
Port: 587
User: twoj-email@gmail.com
Pass: hasło-aplikacji
To: odbiorca@example.com
```

**Uwaga:** Dla Gmail musisz utworzyć "hasło aplikacji":
1. Przejdź do https://myaccount.google.com/security
2. Włącz weryfikację dwuetapową
3. Utwórz hasło aplikacji (App Password)
4. Użyj wygenerowanego hasła zamiast normalnego hasła

#### Inne providery SMTP
- **Outlook/Office365:**
  - Host: `smtp-mail.outlook.com`
  - Port: `587`
- **SendGrid:**
  - Host: `smtp.sendgrid.net`
  - Port: `587`
  - User: `apikey`
  - Pass: `{Twój_API_Key}`
- **Mailgun:**
  - Host: `smtp.mailgun.org`
  - Port: `587`

### 💬 Slack

1. Utwórz Incoming Webhook:
   - Przejdź do https://api.slack.com/apps
   - Wybierz workspace lub utwórz nową aplikację
   - Włącz "Incoming Webhooks"
   - Dodaj nowy webhook do kanału
   - Skopiuj URL webhooka (np. `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

2. W demo:
   ```
   Webhook URL: https://hooks.slack.com/services/...
   Channel: #general (lub inny kanał)
   ```

### 🏢 Microsoft Teams

1. Utwórz Incoming Webhook w Teams:
   - Otwórz Teams i wybierz kanał
   - Kliknij "..." obok nazwy kanału → Connectors
   - Znajdź "Incoming Webhook"
   - Skonfiguruj webhook (nadaj nazwę i opcjonalnie obrazek)
   - Skopiuj URL webhooka

2. W demo:
   ```
   Webhook URL: https://outlook.office.com/webhook/...
   ```

## Użycie

### Krok 1: Konfiguracja integracji

1. W lewym panelu wypełnij dane dla wybranych integracji
2. Kliknij **"🧪 Test"** aby sprawdzić połączenie
3. Kliknij **"💾 Zapisz"** aby zachować konfigurację

### Krok 2: Załaduj procesy

W głównym panelu wybierz jedno z:
- **🗄️ Z Bazy** - załaduj procesy z bazy danych SQLite
- **📁 Z Domains** - załaduj przykładowe procesy z plików `domains/*.txt`

### Krok 3: Uruchom symulację

1. Wybierz proces z listy (lub z dropdown "Proces")
2. Zaznacz kanały powiadomień (Email, Slack, Teams)
3. Kliknij **"🚀 Uruchom"**
4. Obserwuj logi w czasie rzeczywistym

### Krok 4: Analiza wyników

- **Statystyki** pokazują liczbę uruchomionych symulacji, sukcesów i błędów
- **Logi** zawierają szczegółowe informacje o każdym kroku
- Powiadomienia są wysyłane dla każdej akcji w procesie

## Przykładowe Procesy

### Procesy Finansowe
```
Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową
```
Akcje:
1. Wystaw fakturę
2. Uruchom kampanię retargetingową

### Procesy IT
```
Gdy system zgłosi błąd krytyczny, otwórz ticket i powiadom administratora
```
Akcje:
1. Otwórz ticket
2. Powiadom administratora

### Procesy HR
```
Gdy nowy pracownik dołączy, przydziel sprzęt i utwórz konto
```
Akcje:
1. Przydziel sprzęt
2. Utwórz konto

## Format Powiadomień

Każde powiadomienie zawiera:
```
Proces: [Nazwa procesu]
Akcja: [Nazwa akcji]
Moduł: [Moduł, np. Finanse, IT, HR]
Krok: [X/Y]
```

## API Endpoints

### Testowanie integracji
```bash
# Test Email
POST /api/notifications/test-email
{
  "host": "smtp.gmail.com",
  "port": 587,
  "user": "user@example.com",
  "pass": "password",
  "to": "recipient@example.com"
}

# Test Slack
POST /api/notifications/test-slack
{
  "webhook": "https://hooks.slack.com/services/...",
  "channel": "#general"
}

# Test Teams
POST /api/notifications/test-teams
{
  "webhook": "https://outlook.office.com/webhook/..."
}
```

### Wysyłanie powiadomień
```bash
POST /api/notifications/send
{
  "channel": "email|slack|teams",
  "config": {
    # Konfiguracja dla wybranego kanału
  },
  "subject": "Tytuł (opcjonalnie)",
  "message": "Treść wiadomości"
}
```

## Tryb Demo vs Produkcja

### Demo Mode (obecny)
- Email jest mockowany (nie wysyła faktycznych maili)
- Zwracany jest mock response z messageId
- Idealny do testowania bez konfiguracji SMTP

### Production Mode
Aby włączyć faktyczne wysyłanie emaili:

1. Zainstaluj nodemailer:
```bash
npm install nodemailer
```

2. W `src/server/index.js` odkomentuj kod produkcyjny w endpoint `/api/notifications/send` (linie 1000-1002)

3. Restart serwera

## Troubleshooting

### Email nie działa
- Sprawdź czy używasz hasła aplikacji (nie zwykłego hasła)
- Dla Gmail: włącz dostęp dla mniej bezpiecznych aplikacji lub użyj OAuth2
- Sprawdź port (587 dla TLS, 465 dla SSL)
- Sprawdź firewall/antivirus

### Slack nie działa
- Upewnij się że URL webhooka jest poprawny
- Sprawdź czy aplikacja ma dostęp do kanału
- Webhook musi zaczynać się od `https://hooks.slack.com/`

### Teams nie działa
- Upewnij się że connector jest aktywny
- Webhook musi zawierać `office.com` lub `office365.com`
- Sprawdź czy nie wygasł webhook (można go odświeżyć w ustawieniach kanału)

### Procesy nie ładują się z domains
- Upewnij się że pliki `domains/*.txt` istnieją
- Sprawdź czy serwer ma dostęp do tych plików
- Sprawdź logi w konsoli przeglądarki (F12)

## Struktura Projektu

```
DSL/
├── integrations-demo.html        # Interfejs demo
├── integrations-demo.js          # Logika JavaScript
├── domains/                      # Przykładowe procesy
│   ├── Finanse.txt
│   ├── Marketing.txt
│   ├── IT.txt
│   └── ...
├── src/server/
│   ├── index.js                  # Serwer z endpointami
│   └── db.js                     # Baza danych
└── INTEGRATIONS-DEMO-README.md   # Ten plik
```

## Roadmap

- [ ] Dodanie wsparcia dla Discord webhooks
- [ ] Integracja z Telegram Bot API
- [ ] Szablony powiadomień (template engine)
- [ ] Planowanie powiadomień (scheduled notifications)
- [ ] Historia wysłanych powiadomień
- [ ] Export logów do CSV/JSON
- [ ] Webhook retry logic
- [ ] Rate limiting dla powiadomień

## Wsparcie

Jeśli napotkasz problemy:
1. Sprawdź logi w konsoli przeglądarki (F12 → Console)
2. Sprawdź logi serwera w terminalu
3. Upewnij się że wszystkie zależności są zainstalowane: `npm install`
4. Zrestartuj serwer

## Licencja

Ten projekt jest częścią DSL Founder.pl
