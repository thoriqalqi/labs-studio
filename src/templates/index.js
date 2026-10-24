// Semua template proyek: setiap file di src/templates/*.js (selain index.js) otomatis muncul di beranda.
const modules = import.meta.glob(['./*.js', '!./index.js'], { eager: true });

export const TEMPLATES = Object.values(modules)
  .map((m) => m.default)
  .filter((t) => t && t.id && t.create)
  .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
