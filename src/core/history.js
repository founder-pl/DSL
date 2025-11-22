// Core: History manager (undo/redo) based on snapshots (e.g., Engine exportState)
export class HistoryManager {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.stack = []; // past states
    this.pointer = -1; // index of current state
  }

  snapshot(state) {
    // Drop future states after pointer
    if (this.pointer < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.pointer + 1);
    }
    const snap = deepClone(state);
    this.stack.push(snap);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.pointer += 1;
    }
    return this.current();
  }

  canUndo() { return this.pointer > 0; }
  canRedo() { return this.pointer < this.stack.length - 1; }

  undo() {
    if (!this.canUndo()) return null;
    this.pointer -= 1;
    return deepClone(this.stack[this.pointer]);
  }

  redo() {
    if (!this.canRedo()) return null;
    this.pointer += 1;
    return deepClone(this.stack[this.pointer]);
  }

  current() {
    if (this.pointer < 0 || this.pointer >= this.stack.length) return null;
    return deepClone(this.stack[this.pointer]);
  }

  clear() { this.stack = []; this.pointer = -1; }
}

function deepClone(obj) { return obj == null ? obj : JSON.parse(JSON.stringify(obj)); }

export default HistoryManager;
