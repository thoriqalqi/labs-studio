// Kamera 2D: tidak digambar, tapi menggerakkan semua layer yang ada DI BAWAHNYA di daftar layer selama
// layer kamera ini aktif (lihat cameraList di engine.js). Beri keyframe dengan easing "Mengalir" supaya
// kamera terus bergerak halus melewati tiap titik. Latar layar penuh ikut sebagian saja (Kedalaman latar).
export default {
  type: 'camera',
  name: 'Kamera',
  icon: '⌖',
  category: 'Dasar',
  order: 4,
  noTransform: true,
  defaults: { zoom: 100, panX: 0, panY: 0, roll: 0, shake: 0, bgDepth: 0.35 },
  schema: [
    { key: 'zoom', label: 'Zoom kamera %', kind: 'number', min: 10, max: 800, step: 0.5, animatable: true },
    { key: 'panX', label: 'Geser kamera kanan (px)', kind: 'number', step: 1, animatable: true },
    { key: 'panY', label: 'Geser kamera bawah (px)', kind: 'number', step: 1, animatable: true },
    { key: 'roll', label: 'Miring kamera °', kind: 'number', step: 0.1, animatable: true },
    { key: 'shake', label: 'Getar halus (0–3)', kind: 'number', min: 0, max: 3, step: 0.05, animatable: true },
    { key: 'bgDepth', label: 'Kedalaman latar (0 diam – 1 ikut penuh)', kind: 'number', min: 0, max: 1, step: 0.05 }
  ],
  size: () => ({ w: 0, h: 0 })
};
