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

To jest dokładnie to, co powinno być w panelu administracyjnym Twojego systemu automatyzacji.


# 🧠 **Jak edytować procesy DSL w tabeli?**

Rozwiązanie składa się z **3 warstw**:

---

# **1) Warstwa danych – DSL jako JS obiekt**

Twoje DSL (YAML) konwertujemy na obiekt JS:

```js
let workflow = {
  workflow: "Przykładowy workflow",
  steps: [
    {
      id: "payment",
      name: "Wpłata klienta",
      module: "Platnosci",
      actions: [
        { id: "invoice", name: "Wystaw fakturę", module: "Finanse" },
        { id: "run_campaign", name: "Uruchom kampanię retargetingową", module: "Reklama" }
      ]
    },
    {
      id: "wplata_klienta_nastapi",
      name: "wpłata klienta nastąpi",
      module: "Platnosci",
      actions: [
        { id: "wplata_klienta_nastapi_action1", name: "wystaw fakturę", module: "Finanse" },
        { id: "wplata_klienta_nastapi_action2", name: "uruchom kampanię retargetingową", module: "Reklama" }
      ]
    },
    {
      id: "faktura_zostanie_oplacona",
      name: "faktura zostanie opłacona",
      module: "Finanse",
      actions: [
        { id: "faktura_zostanie_oplacona_action1", name: "wygeneruj raport sprzedaży", module: "Finanse" },
        { id: "faktura_zostanie_oplacona_action2", name: "zaktualizuj dashboard finansowy", module: "Analiza" }
      ]
    }
  ]
};
```

---

# **2) Warstwa prezentacji – tabela HTML z możliwością edycji**

To jest gotowy widok HTML, który możesz wkleić do panelu:

```html
<table id="workflowTable" border="1">
  <thead>
    <tr>
      <th>Step ID</th>
      <th>Step Name</th>
      <th>Module</th>
      <th>Actions</th>
      <th>Opcje</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<button onclick="addStep()">Dodaj nowy krok</button>

<pre id="output"></pre>
```

---

# **3) Warstwa logiki – dynamiczna edycja kroków i akcji**

Poniżej pełny kod JS do renderowania, edycji i generowania DSL:

```js
function renderTable() {
  const tbody = document.querySelector("#workflowTable tbody");
  tbody.innerHTML = "";

  workflow.steps.forEach((step, stepIndex) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input value="${step.id}" onchange="updateStep(${stepIndex}, 'id', this.value)" /></td>
      <td><input value="${step.name}" onchange="updateStep(${stepIndex}, 'name', this.value)" /></td>
      <td><input value="${step.module}" onchange="updateStep(${stepIndex}, 'module', this.value)" /></td>

      <td>
        ${step.actions
          .map(
            (a, actionIndex) => `
          <div>
            <input value="${a.id}" onchange="updateAction(${stepIndex}, ${actionIndex}, 'id', this.value)" />
            <input value="${a.name}" onchange="updateAction(${stepIndex}, ${actionIndex}, 'name', this.value)" />
            <input value="${a.module}" onchange="updateAction(${stepIndex}, ${actionIndex}, 'module', this.value)" />
            <button onclick="removeAction(${stepIndex}, ${actionIndex})">Usuń</button>
          </div>
        `
          )
          .join("")}

        <button onclick="addAction(${stepIndex})">+ Dodaj akcję</button>
      </td>

      <td>
        <button onclick="removeStep(${stepIndex})">Usuń krok</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  regenerateDSL();
}

function updateStep(stepIndex, field, value) {
  workflow.steps[stepIndex][field] = value;
  regenerateDSL();
}

function updateAction(stepIndex, actionIndex, field, value) {
  workflow.steps[stepIndex].actions[actionIndex][field] = value;
  regenerateDSL();
}

function addStep() {
  workflow.steps.push({
    id: "new_step",
    name: "Nowy krok",
    module: "Nowy",
    actions: []
  });
  renderTable();
}

function removeStep(stepIndex) {
  workflow.steps.splice(stepIndex, 1);
  renderTable();
}

function addAction(stepIndex) {
  workflow.steps[stepIndex].actions.push({
    id: "new_action",
    name: "Nowa akcja",
    module: "Moduł"
  });
  renderTable();
}

function removeAction(stepIndex, actionIndex) {
  workflow.steps[stepIndex].actions.splice(actionIndex, 1);
  renderTable();
}

function regenerateDSL() {
  document.getElementById("output").textContent = yaml.stringify(workflow);
}

renderTable();
```

---

# ⭐ Efekt końcowy

### W jednym widoku możesz:

✔ edytować pola kroków
✔ edytować pola akcji
✔ dodawać kroki
✔ usuwać kroki
✔ dodawać akcje
✔ usuwać akcje
✔ generować nowy DSL na żywo


------

dane do http://localhost:3000/manager.html
powinny być wczytywane bezpośrednio z bazy danych
