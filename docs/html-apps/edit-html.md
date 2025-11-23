# 🎨 edit.html - Visual Workflow Editor

## Przegląd

**edit.html** to zaawansowany edytor wizualny do tworzenia i edycji workflows za pomocą drag & drop.

**URL:** `http://localhost:3000/edit.html`

## Główne funkcje

### 1. **Drag & Drop Nodes**
- Przeciąganie kroków (steps) i akcji (actions)
- Real-time positioning
- Smooth animations

### 2. **SVG Connections**
- Wizualne linie łączące steps z actions
- Zakrzywione ścieżki (bezier curves)
- Strzałki pokazujące kierunek
- Real-time update podczas drag

### 3. **Auto-Layout**
- Inteligentne układanie nodes
- Grupowanie workflow (step + actions)
- Automatyczne odstępy i kolumny

### 4. **Direct Database Integration**
- Wczytywanie workflows z SQLite
- Zapis bezpośrednio do bazy
- Synchronizacja w czasie rzeczywistym

## User Interface

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar                                                  │
│ [⬇️ Wczytaj] [⬆️ Zapisz] [➕ Dodaj] [🔍+] [🔍−] [🎯 Auto]│
├──────────────┬──────────────────────────────────────────┤
│  Sidebar     │  Canvas                                  │
│              │                                          │
│ Kroki:       │  ┌────────┐      ┌──────────┐           │
│ • Krok 1     │  │ Step 1 │─────▶│ Action 1 │           │
│ • Krok 2     │  │        │╲     └──────────┘           │
│ • Krok 3     │  │        │ ╲    ┌──────────┐           │
│              │  │        │  ╲──▶│ Action 2 │           │
│ Props:       │  └────────┘      └──────────┘           │
│ ID: ...      │                                          │
│ Name: ...    │  ┌────────┐      ┌──────────┐           │
│ Module: ...  │  │ Step 2 │─────▶│ Action 3 │           │
│ [Zapisz]     │  └────────┘      └──────────┘           │
│ [Usuń]       │                                          │
└──────────────┴──────────────────────────────────────────┘
```

## Node Types

### Step Node (niebieski 🔵)
```javascript
{
  id: "wplata_klienta",
  type: "step",
  data: {
    id: "wplata_klienta",
    name: "wpłata klienta",
    module: "Finanse"
  },
  x: 50,
  y: 50,
  element: <div>  // DOM element
}
```

**Style:**
- Background: `#e3f2fd` (light blue)
- Border: `#2196f3` (blue)
- Padding: 10px
- Min-width: 120px

### Action Node (pomarańczowy 🟠)
```javascript
{
  id: "action_wplata_1",
  type: "action",
  data: {
    id: "wplata_klienta_action_1",
    name: "wystaw fakturę",
    module: "Finanse"
  },
  parentStepId: "wplata_klienta",  // Powiązanie ze step
  x: 330,
  y: 50,
  element: <div>
}
```

**Style:**
- Background: `#fff3e0` (light orange)
- Border: `#ff9800` (orange)
- Padding: 10px
- Min-width: 120px

## SVG Connections

### Connection Line
```javascript
// Zakrzywiona linia Bezier
const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

// SVG path element
<path d="..." class="connection-line" />
```

**Style:**
- Stroke: `#2196f3` (blue)
- Stroke-width: 2px
- Fill: none

### Arrow Head
```javascript
// Trójkąt na końcu linii
<polygon points="x,y x,y x,y" class="connection-arrow" />
```

**Style:**
- Fill: `#2196f3` (blue)

## Operations

### 1. Load from Database
```javascript
document.getElementById('load-db').addEventListener('click', async () => {
  // GET /api/workflow/db/workflows
  const workflows = await fetch('/api/workflow/db/workflows');
  
  // Convert workflows → nodes
  workflows.forEach(wf => {
    // Create step node
    const stepNode = { ... };
    
    // Create action nodes
    wf.actions.forEach(action => {
      const actionNode = { ... };
    });
  });
  
  renderNodes();
  drawConnections();
});
```

**Result:**
- Workflows loaded from SQLite
- Converted to visual nodes
- Positioned with auto-layout
- SVG connections drawn

### 2. Save to Database
```javascript
document.getElementById('save-db').addEventListener('click', async () => {
  // Rebuild workflows from nodes
  const workflows = rebuildWorkflowsFromNodes();
  
  // POST /api/workflow/db/save
  await fetch('/api/workflow/db/save', {
    method: 'POST',
    body: JSON.stringify({ workflows, replace: false })
  });
});
```

**Result:**
- Nodes positions saved
- Workflow structure preserved
- Database updated

### 3. Drag & Drop
```javascript
// Mouse down - start drag
node.onmousedown = (e) => {
  dragNode = node;
  offsetX = e.clientX - node.x;
  offsetY = e.clientY - node.y;
};

// Mouse move - update position
document.onmousemove = (e) => {
  if (!dragNode) return;
  dragNode.x = e.clientX - offsetX;
  dragNode.y = e.clientY - offsetY;
  updateNodePosition(dragNode);
  drawConnections();  // Redraw lines
};

// Mouse up - end drag
document.onmouseup = () => {
  dragNode = null;
};
```

**Features:**
- Smooth dragging
- Real-time position update
- SVG connections follow nodes
- No lag

### 4. Auto-Layout
```javascript
document.getElementById('auto-layout').addEventListener('click', () => {
  // Group by workflow
  const workflows = groupNodesByWorkflow();
  
  let x = 50, y = 50;
  workflows.forEach(wf => {
    // Position step
    wf.step.x = x;
    wf.step.y = y;
    
    // Position actions vertically
    wf.actions.forEach((action, idx) => {
      action.x = x + 280;  // 280px offset
      action.y = y + (idx * 100);  // 100px spacing
    });
    
    // Move to next row
    y += maxHeight + spacing;
  });
  
  renderNodes();
});
```

**Layout Algorithm:**
```
Row 1:  [Step 1] ────▶ [Action 1]
                  ╲───▶ [Action 2]

Row 2:  [Step 2] ────▶ [Action 3]
                  ╲───▶ [Action 4]
                   ╲──▶ [Action 5]

Column 2 (if too tall):
Row 1:  [Step 3] ────▶ [Action 6]
```

**Parameters:**
- `STEP_WIDTH = 180px`
- `ACTION_OFFSET = 280px`
- `ROW_HEIGHT = 100px`
- `WORKFLOW_SPACING = 50px`
- `MAX_HEIGHT = 700px` (then wrap to new column)

### 5. Zoom
```javascript
// Zoom in
scale = Math.min(scale + 0.1, 2);  // Max 2x

// Zoom out
scale = Math.max(scale - 0.1, 0.5);  // Min 0.5x

// Apply
canvas.style.transform = `scale(${scale})`;
canvas.style.transformOrigin = 'top left';
```

**Zoom Levels:**
- 0.5x (50%)
- 1.0x (100%) - default
- 2.0x (200%)

### 6. Edit Properties
```javascript
// Select node
node.onclick = () => {
  selectedNode = node;
  node.element.classList.add('selected');
  
  // Fill props form
  document.getElementById('prop-id').value = node.data.id;
  document.getElementById('prop-name').value = node.data.name;
  document.getElementById('prop-module').value = node.data.module;
};

// Update node
document.getElementById('update-node-btn').onclick = () => {
  selectedNode.data.id = document.getElementById('prop-id').value;
  selectedNode.data.name = document.getElementById('prop-name').value;
  selectedNode.data.module = document.getElementById('prop-module').value;
  renderNodes();
};
```

### 7. Delete Node
```javascript
document.getElementById('delete-node-btn').onclick = () => {
  if (!selectedNode) return;
  
  // Remove from nodes array
  nodes = nodes.filter(n => n !== selectedNode);
  
  // Clear selection
  selectedNode = null;
  
  // Re-render
  renderNodes();
};
```

## Code Structure

```javascript
// State
let workflows = [];      // Raw workflows from DB
let nodes = [];          // Visual nodes (steps + actions)
let selectedNode = null; // Currently selected
let dragNode = null;     // Currently dragging
let scale = 1;           // Zoom level

// Core functions
function renderNodes()         // Render all nodes to canvas
function drawConnections()     // Draw SVG lines
function selectNode(node)      // Select node
function startDrag(e, node)    // Start dragging
function updateStepsList()     // Update sidebar list
function escapeHtml(str)       // XSS protection
```

## Performance

### Optimizations
- **SVG Layer:** Separate layer below nodes (z-index: 0)
- **Lazy Redraw:** Connections only redrawn when needed
- **Event Delegation:** One listener per canvas, not per node
- **Throttling:** Drag updates throttled to 60fps

### Scalability
- ✅ Good for < 100 nodes
- ⚠️ Slow for > 500 nodes (SVG performance)
- Solution: Virtual scrolling, canvas instead of SVG

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Drag & Drop | ✅ | ✅ | ✅ | ✅ |
| SVG | ✅ | ✅ | ✅ | ✅ |
| ES6 Modules | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |

## Usage Examples

### Example 1: Load and Edit
```bash
1. Open http://localhost:3000/edit.html
2. Click "⬇️ Wczytaj z bazy"
3. See workflows as visual nodes
4. Drag nodes to rearrange
5. Click node to select
6. Edit properties in sidebar
7. Click "💾 Zapisz zmiany"
8. Click "⬆️ Zapisz do bazy"
```

### Example 2: Create New Workflow
```bash
1. Open edit.html
2. Click "➕ Dodaj krok"
3. New step node appears
4. Click to select
5. Edit ID, Name, Module
6. Click "💾 Zapisz zmiany"
7. Drag to position
8. Click "⬆️ Zapisz do bazy"
```

### Example 3: Auto-Layout
```bash
1. Open edit.html
2. Click "⬇️ Wczytaj z bazy"
3. Nodes load (may overlap)
4. Click "🎯 Auto-układ"
5. Nodes rearranged in grid
6. Steps on left, actions on right
7. Vertical spacing, wrapped columns
```

## Troubleshooting

### Problem: Canvas pusty po "Wczytaj"
**Solution:** 
- F12 → Console → Sprawdź błędy
- Network → Check `/api/workflow/db/workflows`
- Verify database has workflows

### Problem: Nodes nachodzą na siebie po "Auto-układ"
**Solution:**
- **FIXED!** Nowy inteligentny auto-layout
- Większe odstępy (100px vertical, 50px spacing)
- Automatyczne kolumny gdy za wysoko

### Problem: Linie nie rysują się
**Solution:**
- Sprawdź czy `parentStepId` jest poprawny
- Console → Check `drawConnections()` errors
- Verify SVG element exists

### Problem: Drag jest laggy
**Solution:**
- Zmniejsz liczbę nodes
- Disable connections podczas drag (opcja)
- Use canvas instead of SVG for lines

## API Endpoints Used

```javascript
// Load workflows
GET /api/workflow/db/workflows
Response: { workflows: [...], count: N }

// Save workflows
POST /api/workflow/db/save
Body: { workflows: [...], replace: false }
Response: { success: true, count: N }
```

## Future Enhancements

### Planned Features
- [ ] Undo/Redo (Ctrl+Z / Ctrl+Y)
- [ ] Copy/Paste nodes
- [ ] Multi-select (Shift+Click)
- [ ] Snap to grid
- [ ] Export as image (PNG/SVG)
- [ ] Import from JSON/YAML
- [ ] Search/Filter nodes
- [ ] Minimap (overview)

### Advanced Features
- [ ] Custom node colors by module
- [ ] Node icons
- [ ] Animated connections
- [ ] Condition branches (if/else)
- [ ] Loop indicators
- [ ] Comments/annotations
- [ ] Version history
- [ ] Collaborative editing (WebSocket)

## Related Files

- `/src/core/sanitizer.js` - Text sanitization
- `/src/server/db.js` - Database operations
- `/api/workflow/*` - Workflow API endpoints

## See Also

- [index.html Documentation](index-html.md)
- [manager.html Documentation](manager-html.md)
- [API Documentation](../api/workflow-api.md)

---

**🎨 edit.html = Visual Power!**

Drag & Drop + SVG Connections + Auto-Layout = Intuitive Workflow Editor
