po wygenerowaniu DSL i diagramów dla procesów obsłuż je poprzez rózne skrypty  shell i w innych językach oraz poprzez różne API
np wysyłka emaila, pobranie danych z konkretnej strony, pobranie faktruy, wygenerowanie faktury, itd


Czy wszystkie procesy i funkcjonalności z README.md zostały poprawnie zaimplementowane?
zaktualizuj readme

dodaj import różnych procesów w różnych formatach poprzez okno tekstowe lub przyciski z file w celu konwersji do DSL i mermaid oraz
w celu implementacji w aktualnym oknie projektu


Dodaj możliwość generowania akcji poprzez skrypt w komputerze, przeglądarce
Wykorzystaj aktualną listę w procesy.txt
podziel je na mniejsze pliki pod kątem domeny w której są zdefiniowane podpunkty i procesuj kolejne pliki w testach e2e, ktore beda testowaly czy proces został'poprawnie przetworzony i wygenerował oczekiwane endpointy oraz skrypty, dodatkowo stworz na podstawie tych skryptów oczekiwane endpointy w docker w celu testowania i rozbudowy

Czy komenda make test
prowadzi testy e2e w celu przetestowania każdego zdania z plików domains/*.txt poprzez kownersje do diagramu jeden po drugim i sygnalizowanie błędów



Jak można wiele różnych procesów kontrolować w jednym miejscu na jednym widoku?

Stwórz na bazie tego przykładu nowy widok manager.html z funkcjami:

✅ wyświetlać kroki i akcje
✅ edytować pola (name, module, id)
✅ dodawać nowe kroki
✅ dodawać nowe akcje
✅ usuwać kroki
✅ usuwać akcje
✅ generować zmodyfikowany DSL automatycznie



dane do http://localhost:3000/manager.html
powinny być wczytywane bezpośrednio z bazy danych



Czy projekt jest zbudowany zgodnie z CQRS i Event sourcing z zachowaniem modularnej architektury i komplmenetarneych reużywalnych funkcji?


zaimplmentuj tester UI, który sprawdzi wszystkie buttony, akcje, pola

Wdróż Zaawansowana edycja drag&drop dla diagramów w widoku edycji bezpośredni z bazy danych za pomocą edit.html

w index.html dodaj Powiadomienia produkcyjne (obecnie mock + webhooki podstawowe).



Testy E2E dla ui-tester/edit/manager (Playwright/Puppeteer)
Nodemailer integracja dla produkcyjnych emaili
Drag&drop connections (linie między węzłami) w edit.html
Real-time collaboration (WebSocket) dla manager.html