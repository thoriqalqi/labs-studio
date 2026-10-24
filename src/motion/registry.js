// Registry jenis layer. Setiap file di src/motion/layers/*.js otomatis terdaftar
// (lihat CLAUDE.md untuk bentuk definisinya). Tambah file baru = jenis layer baru.

const modules = import.meta.glob('./layers/*.js', { eager: true });

export const LAYER_TYPES = Object.values(modules)
  .map((m) => m.default)
  .filter((d) => d && d.type)
  .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

const byType = new Map(LAYER_TYPES.map((d) => [d.type, d]));

// nama properti layer tidak boleh sama dengan properti umum (x, y, scale, opacity, …)
const COMMON_KEYS = new Set(['x', 'y', 'scale', 'rotation', 'opacity', 'blur', 'shadow', 'shadowColor', 'blend', 'cropTop', 'cropBottom', 'cropLeft', 'cropRight']);
for (const d of LAYER_TYPES) {
  for (const f of d.schema || []) {
    if (COMMON_KEYS.has(f.key)) console.warn(`Layer "${d.type}": properti "${f.key}" bentrok dengan properti umum. Ganti namanya.`);
  }
}
export const getLayerDef = (type) => byType.get(type);

// properti yang dimiliki semua layer (di luar properti khusus jenisnya)
export const COMMON_DEFAULTS = { x: 960, y: 540, scale: 100, rotation: 0, opacity: 100, blur: 0, shadow: 0, shadowColor: '#000000', blend: 'source-over', cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };

export const COMMON_SCHEMA = [
  { group: 'Transform', key: 'x', label: 'Posisi X', kind: 'number', step: 1, animatable: true },
  { group: 'Transform', key: 'y', label: 'Posisi Y', kind: 'number', step: 1, animatable: true },
  { group: 'Transform', key: 'scale', label: 'Skala %', kind: 'number', step: 1, animatable: true },
  { group: 'Transform', key: 'rotation', label: 'Rotasi °', kind: 'number', step: 1, animatable: true },
  { group: 'Transform', key: 'opacity', label: 'Opacity %', kind: 'number', min: 0, max: 100, step: 1, animatable: true },
  // crop dalam persen dari sisi masing-masing (bisa juga diseret lewat titik tengah sisi di kanvas)
  { group: 'Crop', key: 'cropTop', label: 'Atas %', kind: 'number', min: 0, max: 100, step: 0.5, animatable: true },
  { group: 'Crop', key: 'cropBottom', label: 'Bawah %', kind: 'number', min: 0, max: 100, step: 0.5, animatable: true },
  { group: 'Crop', key: 'cropLeft', label: 'Kiri %', kind: 'number', min: 0, max: 100, step: 0.5, animatable: true },
  { group: 'Crop', key: 'cropRight', label: 'Kanan %', kind: 'number', min: 0, max: 100, step: 0.5, animatable: true },
  { group: 'Efek', key: 'blur', label: 'Blur', kind: 'number', min: 0, max: 100, step: 0.5, animatable: true },
  { group: 'Efek', key: 'shadow', label: 'Bayangan / glow', kind: 'number', min: 0, max: 200, step: 1, animatable: true },
  { group: 'Efek', key: 'shadowColor', label: 'Warna bayangan', kind: 'color', animatable: true },
  {
    group: 'Efek', key: 'blend', label: 'Mode campur', kind: 'select',
    options: { 'source-over': 'Normal', screen: 'Screen', multiply: 'Multiply', overlay: 'Overlay', lighter: 'Add (terang)', 'soft-light': 'Soft light' }
  }
];
