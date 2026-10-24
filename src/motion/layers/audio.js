// Audio (musik, VO, efek). Tidak digambar; diputar & ikut diekspor.
// props.in = detik awal di file audio; panjang yang diputar = layer.dur × speed.
export default {
  type: 'audio',
  name: 'Audio',
  icon: '♪',
  category: 'Media',
  order: 11,
  audio: true,
  defaults: { url: '', in: 0, speed: 1, volume: 100 },
  schema: [
    { key: 'url', label: 'File audio', kind: 'asset', accept: 'audio/*,video/*' },
    { key: 'volume', label: 'Volume %', kind: 'number', min: 0, max: 200, step: 1 },
    { key: 'speed', label: 'Kecepatan × (mengubah nada)', kind: 'number', min: 0.25, max: 4, step: 0.05 },
    { key: 'in', label: 'Mulai dari detik ke-', kind: 'number', min: 0, step: 0.1 }
  ],
  size: () => ({ w: 0, h: 0 })
};
