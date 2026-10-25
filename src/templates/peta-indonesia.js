// "Membangun Indonesia": satu shot tanpa potongan di dalam editor level (konsep & timing dari prompt pack
// "Opus Replaced Unreal Engine", versi Indonesia). Konsol mengetik perintah → panel bergeser keluar → satu puncak
// menembus lantai grid jauh di depan, lalu dataran tinggi Toba terangkat di sekitar kamera (grid → tanah liat → laterit)
// → Danau Toba terisi air, sungai menyala → hutan tumbuh berkelompok → kota Balige menjulang di tepi danau →
// kamera menukik dan menyusuri jalan di antara menara → keluar di atas danau → naik ke orbit → dunianya kepulauan Indonesia → lampu kota berkedip → kembali ke viewport editor,
// Outliner dibanjiri 17.504 pulau. Setiap tahap adalah front (jari-jari) di layer worldbuild; suara mengikuti waktu yang sama.
// Kamera memakai easing 'flow' (spline lewat keyframe) supaya terbang mengalir tanpa berhenti di tiap titik.
import { newMotionDoc, newLayer } from '../motion/doc.js';
import { TOBA_INFO } from '../motion/layers/worldbuild.js';

const k = (list) => list.map(([t, v, ease]) => ({ t, v, ease: ease || 'easeInOut' }));
const f = (list) => list.map(([t, v, ease]) => ({ t, v, ease: ease || 'flow' }));
const none = { preset: 'none', dur: 0.3 };

const [CX, CY] = TOBA_INFO.city; // Balige, ujung tenggara Danau Toba
const [PX, PY] = TOBA_INFO.firstPeak; // titik awal front: puncak pertama di bibir kaldera
// jalan kota yang disusuri kamera: blok 1/6 px, jalan tiap blok ke-3 → poros jalan di y = 0,5·m + 1/12 (dekat pusat kota)
const STREET = Math.round((CY - 1 / 12) * 2) / 2 + 1 / 12;
const D = 3.5; // semua tahap setelah terbang di dalam kota bergeser sejauh ini
const L = (t) => Math.round((t + D) * 100) / 100;
const DUR = 23.5;

// [detik, suara, volume %, nama, durasi, jumlah] — mengikuti tabel "Every beat on its frame" (+ adegan di dalam kota)
const SFX = [
  [0.3, 'tick', 28, 'Ketikan konsol', 1.2, 34],
  [1.8, 'bass', 72, 'Enter (thock)'], [1.82, 'sub', 62, 'Enter (sub drop)'],
  [1.86, 'whoosh', 55, 'Panel bergeser'],
  [2.4, 'drone', 48, 'Gemuruh tektonik', 3.0],
  [2.9, 'bass', 36, 'Denyut 1'], [3.5, 'bass', 40, 'Denyut 2'], [4.1, 'bass', 44, 'Denyut 3'], [4.7, 'bass', 46, 'Denyut 4'],
  [5.6, 'sub', 74, 'Banjir (dentum)'], [5.62, 'whoosh', 72, 'Banjir (deru air)'], [5.7, 'wind', 34, 'Air mengalir', 2.0],
  [6.6, 'shimmer', 46, 'Sungai berkilau'], [7.6, 'shimmer', 34, 'Sungai berkilau 2'],
  [7.9, 'tick', 16, 'Pohon tumbuh (pop kecil)', 3.6, 60], [8.2, 'pop', 26, 'Pohon 1'], [8.7, 'pop', 28, 'Pohon 2'], [9.3, 'pop', 26, 'Pohon 3'],
  [10.1, 'tick', 42, 'Kota (gerigi logam)', 2.1, 32], [10.8, 'click', 40, 'Kota 2'], [11.5, 'click', 42, 'Kota 3'],
  [12.0, 'whoosh', 50, 'Menukik ke kota'], [12.8, 'wind', 30, 'Angin di antara gedung', 2.6],
  [13.4, 'whoosh', 32, 'Gedung lewat 1'], [14.1, 'whoosh', 36, 'Gedung lewat 2'], [14.8, 'whoosh', 34, 'Gedung lewat 3'],
  [L(12.3), 'riser', 64, 'Naik ke orbit (riser)', 2.63], [L(12.9), 'whooshUp', 50, 'Menembus kabut'],
  [L(15.0), 'sub', 94, 'Terungkap: Indonesia'], [L(15.0), 'bass', 84, 'Terungkap (timpani)'], [L(15.01), 'chime', 72, 'Terungkap (chime)'], [L(15.03), 'shimmer', 52, 'Terungkap (kilau)'],
  [L(16.09), 'pop', 46, 'Kedip lampu 1'], [L(16.3), 'pop', 42, 'Kedip lampu 2'],
  [L(16.7), 'whoosh', 52, 'Kembali ke editor'],
  [L(17.0), 'tick', 36, 'Outliner membanjir', 0.9, 40],
  [L(17.85), 'chime', 58, 'Build selesai']
];

export default {
  id: 'peta-indonesia',
  name: 'Membangun Indonesia (editor level)',
  description: 'Satu shot ±23 detik: perintah di konsol editor, dataran tinggi Toba terangkat, danau terisi, hutan, kamera masuk menyusuri jalan kota di tepi danau, lalu naik ke orbit — dunianya kepulauan Indonesia.',
  kind: 'motion',
  order: 5,
  create({ id, name }) {
    const doc = newMotionDoc({ id, name, size: 'landscape', duration: DUR, fps: 30, background: '#1a1a1a' });
    const c = doc.comp;

    const ui = newLayer('editorui', c, { name: 'Editor level', start: 0, dur: DUR, anim: { in: none, out: none } });
    ui.props.log = [
      'LogInit: Display: Engine is initialized. (2.31s)',
      'LogWorld: Bringing World /Game/Maps/Untitled.Untitled up for editing',
      'LogShaderCompilers: Display: 0 shader jobs remaining',
      'Claude: bangun dunia. buat seperti rumahku',
      'LogClaude: building world…',
      'LogClaude: world built · 17.504 pulau · 894.863 pohon · 4.861 gedung ✓'
    ].join('\n');
    ui.keys = {
      frame: k([[0, 1], [1.86, 1], [2.4, 0], [L(16.7), 0], [L(17.25), 1]]),
      typed: k([[0.3, 0, 'linear'], [1.5, 1], [1.8, 1, 'hold'], [1.82, 0]]),
      caret: k([[0, 1, 'hold'], [1.8, 0, 'hold']]),
      logShown: k([[0, 3, 'hold'], [1.8, 5, 'hold'], [L(17.85), 6, 'hold']]),
      actors: k([[L(17.0), 7, 'easeIn'], [L(17.9), 17504]]),
      stats: k([[2.3, 0], [2.5, 1], [L(16.6), 1], [L(16.75), 0]]),
      statActors: k([[2.4, 7, 'easeIn'], [5.4, 210], [9, 2400], [12.2, 9100], [L(14), 17504]]),
      statInstances: k([[7.9, 0, 'easeOut'], [11.5, 894863], [12.2, 899724]]),
      statTris: k([[2.4, 0.3], [5.4, 1.2], [10, 1.9], [12.2, 2.6]])
    };
    // notifikasi tiap tahap (toast editor): detik|judul|keterangan
    ui.props.toasts = [
      '2.9|Landscape generated|4096 × 4096 heightfield · eroded',
      '5.8|Water bodies: 3|Danau Toba · Selat Malaka · Samudra Hindia',
      '6.9|Rivers: 214|flow-routed from the peaks',
      '8.1|PCG Forest: 894.863 instances|hutan hujan tropis',
      '10.2|City: 4.861 buildings|Balige, di tepi Danau Toba',
      `${L(11.9)}|World Partition: streaming|17.504 pulau`
    ].join('\n');
    ui.props.level = 'Untitled';
    ui.props.actorWord = 'actors';

    const w = newLayer('worldbuild', c, { name: 'Dunia: Indonesia', start: 0, dur: DUR, anim: { in: none, out: none } });
    w.props.frontX = PX;
    w.props.frontY = PY;
    w.props.rWater = 5000;
    w.keys = {
      frame: k([[0, 1], [1.86, 1], [2.4, 0], [L(16.7), 0], [L(17.25), 1]]),
      // TERRAIN 2.4: satu puncak menembus lantai grid jauh di depan, lalu dataran tinggi terangkat sampai ke sekitar kamera
      rTerrain: k([[2.5, 0, 'easeIn'], [3.4, 30, 'flow'], [4.4, 52, 'flow'], [5.4, 86, 'flow'], [7, 160, 'flow'], [10, 620, 'flow'], [12.6, 3200]]),
      rFull: k([[3.6, 0, 'easeIn'], [4.6, 8, 'flow'], [5.5, 34, 'flow'], [6.6, 82, 'flow'], [9, 320, 'flow'], [12.4, 3200]]),
      sky: k([[3.2, 0], [6.2, 1]]),
      // WATER 5.6: danau & laut terisi · RIVERS 6.6–9.0
      water: k([[5.6, 0, 'easeOut'], [6.9, 1]]),
      riverLevel: k([[6.6, 0.8], [9.0, 0.02]]),
      // FOREST 7.9 · CITY 10.1 (jari-jari kota dihitung dari pusat Balige)
      rForest: k([[7.9, 0, 'easeIn'], [9.0, 30, 'flow'], [10.5, 90, 'flow'], [12.6, 3000]]),
      rCity: k([[10.1, 0, 'easeOut'], [11.8, 8]]),
      // KAMERA: dari timur menuju barat, dataran tinggi terangkat di sekitar kamera; danau di kanan, lalu berbelok ke danau,
      // kota di depan dengan danau di belakangnya → MENUKIK MASUK KOTA (12–12.9) → menyusuri jalan di antara menara
      // (12.9–15.2) → keluar di atas danau → naik ke orbit
      camX: f([[0, 446, 'hold'], [2.4, 446], [4.4, 441], [5.4, 436], [6.6, 430], [7.6, 425], [8.8, 419.5], [9.8, 414.5], [10.8, 408],
        [11.6, 403], [12.4, 398.4], [12.9, 396], [13.7, 393], [14.5, 390], [15.2, 387], [15.8, 384.8], [16.7, 383], [17.7, 381.5], [18.3, 380.5]]),
      camY: f([[0, 305, 'hold'], [2.4, 305], [4.4, 304.2], [5.4, 302.6], [6.6, 301], [7.6, 300], [8.8, 297.6], [9.8, 294], [10.8, 288.5],
        [11.6, 281.5], [12.4, STREET], [12.9, STREET], [13.7, STREET], [14.5, STREET], [15.2, STREET], [15.8, STREET - 0.4], [16.7, 276], [17.7, 273], [18.3, 271]]),
      camZ: f([[0, 6.8, 'hold'], [2.4, 6.8], [4.4, 7.8], [5.4, 11], [6.6, 12.9], [7.6, 13.3], [8.8, 13.7], [9.8, 13.6], [10.8, 12.8],
        [11.6, 9.6], [12.4, 6.3], [12.9, 5.45], [13.7, 5.3], [14.5, 5.25], [15.2, 5.4], [15.8, 7.2, 'easeIn'], [16.7, 30, 'easeIn'], [17.6, 130], [18.0, 520], [18.4, 950]]),
      yaw: f([[0, 186, 'hold'], [4.4, 186], [5.4, 187], [6.6, 191], [7.6, 196], [8.8, 203], [9.8, 209], [10.8, 213], [11.6, 222], [12.4, 188],
        [12.9, 180], [15.2, 180], [15.8, 186], [16.7, 246], [17.7, 263], [18.3, 270]]),
      roll: f([[5.4, 0], [6.6, -1.5], [7.6, -2.5], [8.8, -3.5], [9.8, -2.5], [10.8, -1.5], [11.6, -2], [12.4, 3], [12.9, 0], [13.7, 0.8], [14.5, -0.8],
        [15.2, 0], [15.8, -3], [16.7, -3], [17.7, 0]]),
      fov: f([[0, 66], [5.4, 68], [11.6, 72], [12.9, 78], [15.2, 78], [15.8, 72]]),
      horizon: f([[0, 0.47], [4.4, 0.46], [5.4, 0.42], [6.6, 0.36], [8.8, 0.34], [10.8, 0.32], [11.6, 0.38], [12.4, 0.46], [12.9, 0.48], [15.2, 0.48],
        [15.8, 0.36], [16.4, 0.14], [16.9, 0.06], [17.7, -0.12]]),
      haze: f([[0, 1.05], [15.8, 1], [17.1, 0.4], [18.0, 0.08]]),
      space: k([[0, 0], [15.9, 0], [17.5, 0.55], [18.3, 1]]),
      blur: k([[15.8, 0], [16.4, 2], [17.1, 2.5], [17.8, 1], [18.1, 1.8], [18.5, 0]]),
      tiltDown: f([[15.8, 0, 'hold'], [15.9, 0], [17.1, 28], [17.9, 60], [18.3, 64]]),
      // NAIK (15.8–18.3): kamera 3D naik sambil menunduk; ORBIT (18–18.5): berpindah ke bola dunia, lalu mundur
      // sampai seluruh kepulauan & lengkung planet terlihat
      view: k([[18.0, 0], [18.35, 1]]),
      orbitX: k([[18.0, 381, 'easeIn'], [18.5, 1300]]),
      orbitY: k([[18.0, 272, 'easeIn'], [18.5, 520]]),
      alt: k([[18.0, 72, 'easeIn'], [18.35, 130, 'easeIn'], [18.5, 320, 'easeOut'], [20.1, 312]]),
      tilt: k([[18.0, 0], [18.35, 10], [18.5, 52], [20.1, 53]]),
      gfov: k([[18.0, 43], [18.5, 42]]),
      lookAhead: k([[18.35, 0], [18.5, 0.25]]),
      // klimaks kecil: lampu kota berkedip (0,17 dtk), lalu tetap menyala lembut
      night: k([[L(16.0), 0], [L(16.09), 0.85], [L(16.2), 0.1], [L(16.26), 0.85], [L(16.45), 0.3], [L(16.7), 0.4]]),
      lights: k([[L(16.0), 0], [L(16.09), 1], [L(16.2), 0.15], [L(16.26), 1], [L(16.5), 0.7]])
    };

    const sfx = SFX.map(([t, sound, volume, label, dur, count]) =>
      newLayer('sfx', c, { name: `SFX · ${label}`, start: t, dur: dur || 1, props: { sound, volume, ...(count ? { count } : {}) }, anim: { in: none, out: none } }));
    doc.layers = [ui, w, ...sfx];
    return doc;
  }
};
