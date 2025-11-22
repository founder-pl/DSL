# 🚀 Szybki Start - Środowisko Demo Integracji

## 1. Uruchom serwer

```bash
cd /home/tom/github/founder-pl/DSL
node src/server/index.js
```

## 2. Otwórz demo

Otwórz w przeglądarce: **http://localhost:3000/integrations-demo**

## 3. Przetestuj w 2 minuty

### Scenariusz A: Test z mockowanymi powiadomieniami

1. **Załaduj procesy z bazy:**
   - Kliknij **"🗄️ Z Bazy"**
   - Procesy pojawią się na liście (obecnie: 32 procesy)
doda
2. **Wybierz proces:**
   - Kliknij na dowolny proces z listy
   - Automatycznie przejdziesz do sekcji symulacji

3. **Uruchom symulację:**
   - Zaznacz **Email** (mockowany, nie wymaga konfiguracji)
   - Kliknij **"🚀 Uruchom"**
   - Obserwuj logi w czasie rzeczywistym

### Scenariusz B: Test z prawdziwym Slack

1. **Skonfiguruj Slack:**
   - W lewym panelu wklej swój Slack Webhook URL
   - Podaj kanał (np. `#general`)
   - Kliknij **"🧪 Test"** aby sprawdzić połączenie
   - Kliknij **"💾 Zapisz"**

2. **Uruchom symulację:**
   - Załaduj procesy (🗄️ Z Bazy lub 📁 Z Domains)
   - Wybierz proces
   - Zaznacz **Slack**
   - Kliknij **"🚀 Uruchom"**
   - Sprawdź swój kanał Slack - powiadomienia pojawią się tam!

### Scenariusz C: Multi-channel notification

1. **Skonfiguruj wszystkie kanały:**
   - Email: wypełnij dane SMTP (lub zostaw domyślne dla mocka)
   - Slack: wklej webhook URL
   - Teams: wklej webhook URL

2. **Uruchom symulację:**
   - Załaduj procesy
   - Wybierz proces z wieloma akcjami
   - Zaznacz **wszystkie 3 kanały** (Email, Slack, Teams)
   - Kliknij **"🚀 Uruchom"**
   - Każda akcja wygeneruje powiadomienia na wszystkich kanałach!

## 4. Przykładowe procesy do przetestowania

### Proces Finansowy
```
Gdy wpłata klienta nastąpi, wystaw fakturę i uruchom kampanię retargetingową
```
- 2 akcje → 2 powiadomienia na każdy kanał

### Proces IT
```
Gdy system zgłosi błąd krytyczny, otwórz ticket i powiadom administratora
```
- 2 akcje → 2 powiadomienia na każdy kanał

### Proces z wieloma akcjami
```
Gdy nowy klient zapisze się na newsletter, wyślij wiadomość powitalną i dodaj go do CRM
```

## 5. Co zobaczyć w interfejsie

### Panel boczny (Konfiguracja)
- ✅ Zielony status = połączenie OK
- ❌ Czerwony status = błąd połączenia
- ⏳ Status testowania

### Główny panel - Procesy
- Lista wszystkich załadowanych procesów
- Moduł i liczba akcji dla każdego procesu
- Kliknij proces aby go wybrać

### Główny panel - Symulacja
- Dropdown do wyboru procesu
- Checkboxy dla kanałów
- Przycisk uruchomienia
- Wyniki symulacji w czasie rzeczywistym
- Statystyki: Uruchomione / Sukces / Błędy

### Główny panel - Logi
- Wszystkie zdarzenia z timestampami
- Kolory: zielony (sukces), czerwony (błąd), niebieski (info)
- Auto-scroll do najnowszych logów

## 6. Testowanie API bezpośrednio

### Test Email endpoint
```bash
curl -X POST http://localhost:3000/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"host":"smtp.gmail.com","port":587,"user":"test@example.com","pass":"test","to":"user@example.com"}'
```

### Wysłanie powiadomienia
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "config": {
      "host": "smtp.gmail.com",
      "port": 587,
      "user": "test@example.com",
      "pass": "test",
      "to": "user@example.com"
    },
    "subject": "Test Notification",
    "message": "Hello from DSL!"
  }'
```

### Załaduj procesy z bazy
```bash
curl http://localhost:3000/api/workflow/db/workflows | jq .
```

## 7. Tips & Tricks

### Szybkie testowanie bez konfiguracji
- Email jest automatycznie mockowany - nie musisz nic konfigurować
- Wybierz tylko checkbox "Email" i testuj od razu

### Testowanie z prawdziwymi integracjami
- Slack i Teams działają z prawdziwymi webhookami
- Możesz zobaczyć powiadomienia w czasie rzeczywistym w swoich kanałach

### Masowe testowanie
1. Załaduj wszystkie procesy z Domains (📁 Z Domains)
2. Dla każdego procesu uruchom symulację
3. Sprawdź statystyki - ile sukces, ile błędów

### Export logów
- Logi są w formacie czytelnym dla człowieka
- Możesz skopiować je z panelu logów
- W przyszłości będzie przycisk export do CSV

## 8. Problemy?

### Demo nie ładuje się
```bash
# Sprawdź czy serwer działa
lsof -i :3000

# Jeśli nie, uruchom ponownie
node src/server/index.js
```

### Procesy nie ładują się
- Sprawdź konsolę przeglądarki (F12 → Console)
- Sprawdź czy baza danych istnieje: `ls -la data/dsl.sqlite`
- Sprawdź czy pliki domains/*.txt istnieją

### Powiadomienia nie wysyłają się
- Sprawdź logi w przeglądarce
- Dla Slack/Teams: sprawdź czy webhook URL jest poprawny
- Dla Email: w trybie demo zawsze zwraca sukces (mock)

## 9. Następne kroki

- Przeczytaj pełną dokumentację: `INTEGRATIONS-DEMO-README.md`
- Skonfiguruj produkcyjny SMTP (nodemailer)
- Dodaj własne procesy do bazy danych
- Testuj różne scenariusze powiadomień

## 10. Dostępne URL

- **Demo integracji:** http://localhost:3000/integrations-demo
- **Główna aplikacja:** http://localhost:3000/
- **Test runner:** http://localhost:3000/tests
- **API docs:** http://localhost:3000/api
- **Health check:** http://localhost:3000/api/health

---

**Miłego testowania! 🚀**
