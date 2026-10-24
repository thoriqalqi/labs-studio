// Satu sumber data untuk studio: dokumen episode, pilihan aktif, undo/redo.
// Event ke pendengar: 'load' (episode dibuka), 'change' (editan tersimpan ke riwayat),
// 'preview' (sedang diseret, belum masuk riwayat), 'select' (pilihan berubah).

export function createStore() {
  let doc = null;
  let sel = null;
  const undoStack = [];
  const redoStack = [];
  const listeners = new Set();
  const emit = (kind) => listeners.forEach((fn) => fn(kind));
  const snap = () => JSON.stringify(doc);

  const store = {
    get doc() { return doc; },
    get sel() { return sel; },
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    on(fn) { listeners.add(fn); },

    load(d) {
      doc = d;
      sel = null;
      undoStack.length = 0;
      redoStack.length = 0;
      emit('load');
    },

    snapshot: snap,

    // ubah dokumen; fn boleh memanggil store.setSel(...) untuk memilih hasilnya
    mutate(fn) {
      const before = snap();
      fn(doc);
      store.commit(before);
    },

    commit(before) {
      if (before === snap()) return emit('select');
      undoStack.push(before);
      if (undoStack.length > 200) undoStack.shift();
      redoStack.length = 0;
      emit('change');
    },

    preview() { emit('preview'); },

    undo() {
      if (!undoStack.length) return;
      redoStack.push(snap());
      doc = JSON.parse(undoStack.pop());
      emit('change');
    },

    redo() {
      if (!redoStack.length) return;
      undoStack.push(snap());
      doc = JSON.parse(redoStack.pop());
      emit('change');
    },

    setSel(s) { sel = s; },
    select(s) {
      sel = s;
      emit('select');
    }
  };
  return store;
}
