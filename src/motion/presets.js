// Preset animasi masuk/keluar. apply(k, m): k = 0..1 (0 = belum muncul, 1 = tampil penuh),
// m = pengubah yang dipakai engine: { opacity, dx, dy, scale, rotation, blur, reveal }.
// Animasi keluar memakai fungsi yang sama dengan k berjalan mundur.
// Preset baru: tambahkan entri di sini, otomatis muncul di inspector.

const backOut = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

export const PRESETS = {
  none: { label: 'Tidak ada' },
  fade: { label: 'Pudar', apply: (k, m) => { m.opacity *= k; } },
  fadeUp: { label: 'Pudar + naik', apply: (k, m) => { m.opacity *= k; m.dy += (1 - k) * 70; } },
  fadeDown: { label: 'Pudar + turun', apply: (k, m) => { m.opacity *= k; m.dy -= (1 - k) * 70; } },
  slideLeft: { label: 'Geser dari kanan', apply: (k, m) => { m.opacity *= Math.min(1, k * 1.5); m.dx += (1 - k) * 260; } },
  slideRight: { label: 'Geser dari kiri', apply: (k, m) => { m.opacity *= Math.min(1, k * 1.5); m.dx -= (1 - k) * 260; } },
  pop: { label: 'Pop (membal)', apply: (k, m) => { m.opacity *= Math.min(1, k * 2.5); m.scale *= Math.max(0, 0.4 + 0.6 * backOut(k)); } },
  zoom: { label: 'Zoom mendekat', apply: (k, m) => { m.opacity *= k; m.scale *= 1.35 - 0.35 * k; } },
  blur: { label: 'Fokus dari blur', apply: (k, m) => { m.opacity *= k; m.blur += (1 - k) * 24; } },
  spin: { label: 'Putar (spin)', apply: (k, m) => { m.opacity *= k; m.rotation -= (1 - k) * 120; m.scale *= 0.3 + 0.7 * k; } },
  // transisi "mengalir": masuk dari bawah sambil menajam, keluar naik sambil memudar & blur
  flowIn: { label: 'Mengalir masuk (naik + tajam)', apply: (k, m) => { m.opacity *= k; m.dy += (1 - k) * 46; m.blur += (1 - k) * 10; } },
  flowOut: { label: 'Mengalir keluar (naik + blur)', apply: (k, m) => { m.opacity *= k; m.dy -= (1 - k) * 46; m.blur += (1 - k) * 10; } },
  words: { label: 'Per kata (teks)', textOnly: true, apply: (k, m) => { m.reveal = { mode: 'words', k }; } },
  scatter: { label: 'Kata berserakan → tersusun (teks)', textOnly: true, apply: (k, m) => { m.reveal = { mode: 'scatter', k }; } },
  typewriter: { label: 'Mesin ketik (teks)', textOnly: true, apply: (k, m) => { m.reveal = { mode: 'chars', k }; } },
  // kata demi kata naik dari balik garis baris (tertutup topeng), seperti video promo produk
  rise: { label: 'Naik per kata, bertopeng (teks)', textOnly: true, apply: (k, m) => { m.reveal = { mode: 'rise', k }; } }
};

const easeOut = (x) => 1 - Math.pow(1 - x, 3);

// anim = { in: { preset, dur }, out: { preset, dur } }, vt = detik sejak layer tampil, len = panjang layer
export function applyAnim(anim, vt, len, m) {
  const a = anim?.in;
  if (a && a.preset !== 'none' && PRESETS[a.preset]?.apply && a.dur > 0) {
    const k = Math.min(1, Math.max(0, vt / a.dur));
    if (k < 1 || PRESETS[a.preset].textOnly) PRESETS[a.preset].apply(PRESETS[a.preset].textOnly ? k : easeOut(k), m);
  }
  const b = anim?.out;
  if (b && b.preset !== 'none' && PRESETS[b.preset]?.apply && b.dur > 0) {
    const left = len - vt;
    if (left < b.dur) {
      const k = Math.min(1, Math.max(0, left / b.dur));
      // teks per kata/mesin ketik saat keluar cukup memudar
      if (PRESETS[b.preset].textOnly) m.opacity *= k;
      else PRESETS[b.preset].apply(easeOut(k), m);
    }
  }
  return m;
}
