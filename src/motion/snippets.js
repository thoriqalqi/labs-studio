// Rakitan siap pakai (beberapa layer sekaligus) untuk panel "Tambah".
// Tambah rakitan baru: tambahkan entri di SNIPPETS. create(comp, t) → array layer.
import { newLayer } from './doc.js';

const portrait = (comp) => comp.height > comp.width;

export const SNIPPETS = [
  {
    id: 'judul',
    name: 'Judul + subjudul',
    create(comp, t) {
      const y = comp.height * 0.45;
      return [
        newLayer('text', comp, {
          name: 'Subjudul', start: t + 0.3, dur: 4,
          props: { text: 'Subjudul di sini', font: 'Plus Jakarta Sans', weight: 600, size: portrait(comp) ? 48 : 42, color: '#c9c1b3', y: y + (portrait(comp) ? 170 : 120) },
          anim: { in: { preset: 'fadeUp', dur: 0.6 }, out: { preset: 'fade', dur: 0.4 } }
        }),
        newLayer('text', comp, {
          name: 'Judul', start: t, dur: 4.3,
          props: { text: 'Judul *besar*', size: portrait(comp) ? 130 : 150, y, boxWidth: comp.width * 0.85 },
          anim: { in: { preset: 'words', dur: 0.9 }, out: { preset: 'fade', dur: 0.4 } }
        })
      ];
    }
  },
  {
    id: 'lowerthird',
    name: 'Lower third (nama + jabatan)',
    create(comp, t) {
      const x = portrait(comp) ? comp.width / 2 : 420;
      const y = comp.height - (portrait(comp) ? 420 : 200);
      return [
        newLayer('text', comp, {
          name: 'Jabatan', start: t + 0.35, dur: 4.65,
          props: { text: 'Keterangan singkat', font: 'Plus Jakarta Sans', weight: 600, size: 30, color: '#141416', align: 'left', boxWidth: 560, x: x + 10, y: y + 34 },
          anim: { in: { preset: 'slideRight', dur: 0.5 }, out: { preset: 'fade', dur: 0.3 } }
        }),
        newLayer('text', comp, {
          name: 'Nama', start: t + 0.2, dur: 4.8,
          props: { text: 'Nama Orang', font: 'Baloo 2', size: 54, color: '#141416', align: 'left', boxWidth: 560, x: x + 10, y: y - 16 },
          anim: { in: { preset: 'slideRight', dur: 0.5 }, out: { preset: 'fade', dur: 0.3 } }
        }),
        newLayer('shape', comp, {
          name: 'Kotak lower third', start: t, dur: 5,
          props: { w: 620, h: 130, radius: 18, fill: '#f3ede2', x: x + 10, y },
          anim: { in: { preset: 'slideRight', dur: 0.45 }, out: { preset: 'fade', dur: 0.3 } }
        })
      ];
    }
  },
  {
    id: 'subtitle',
    name: 'Subtitle bawah',
    create(comp, t) {
      return [newLayer('text', comp, {
        name: 'Subtitle', start: t, dur: 3,
        props: { text: 'Tulis subtitle di sini', font: 'Plus Jakarta Sans', weight: 600, size: portrait(comp) ? 52 : 40, pill: true, boxWidth: comp.width * 0.8, y: comp.height - (portrait(comp) ? 380 : 110) },
        anim: { in: { preset: 'fade', dur: 0.2 }, out: { preset: 'fade', dur: 0.2 } }
      })];
    }
  },
  {
    id: 'kutipan',
    name: 'Kartu kutipan',
    create(comp, t) {
      const w = Math.min(comp.width * 0.82, 1400);
      return [
        newLayer('text', comp, {
          name: 'Kutipan', start: t + 0.3, dur: 5.7,
          props: { text: '“Kalimat yang *nampar* tapi jujur.”', font: 'Playfair Display', weight: 700, size: portrait(comp) ? 76 : 70, color: '#141416', accent: '#b4561a', boxWidth: w - 140 },
          anim: { in: { preset: 'words', dur: 1.2 }, out: { preset: 'fade', dur: 0.4 } }
        }),
        newLayer('shape', comp, {
          name: 'Kartu', start: t, dur: 6,
          props: { w, h: portrait(comp) ? 760 : 520, radius: 36, fill: '#f3ede2', shadow: 60, shadowColor: '#000000' },
          anim: { in: { preset: 'pop', dur: 0.6 }, out: { preset: 'fade', dur: 0.4 } }
        })
      ];
    }
  }
];
