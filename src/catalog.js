// Daftar pilihan yang tampil di inspector (nilai → label).

export const EXPRS = {
  normal: 'Normal (senyum tipis)',
  senyum: 'Senyum',
  serius: 'Serius',
  sinis: 'Sinis',
  marah: 'Marah',
  tertawa: 'Tertawa',
  sedih: 'Sedih',
  kaget: 'Kaget'
};

export const POSES = {
  idle: 'Berdiri santai',
  explain: 'Menjelaskan',
  point: 'Menunjuk',
  control: 'Mengendalikan',
  think: 'Mikir',
  shrug: 'Angkat bahu',
  heart: 'Tangan di dada',
  doa: 'Berdoa',
  sit: 'Duduk di singgasana',
  lookBack: 'Membelakangi',
  float: 'Melayang'
};

export const SHOTS_LABEL = {
  medium: 'Medium',
  close: 'Close-up',
  wide: 'Lebar',
  low: 'Low angle',
  side: 'Samping'
};

export const PROPS = {
  '': 'Tidak ada',
  hp: 'HP + notifikasi',
  jam: 'Jam',
  uang: 'Koin / uang',
  masjid: 'Masjid',
  hati: 'Hati',
  kalender: 'Kalender',
  kitab: 'Kitab'
};

export const MOODS_LABEL = {
  hook: 'Amber (pembuka)',
  tegas: 'Merah (tegas)',
  lembut: 'Hangat (lembut)',
  malam: 'Biru malam (emosional)',
  fajar: 'Fajar (penutup)'
};

export const SFX_LIST = {
  whoosh: 'Whoosh',
  whooshUp: 'Whoosh naik',
  bass: 'Bass hit',
  pop: 'Pop',
  tick: 'Jam berdetak',
  coin: 'Koin',
  notif: 'Notifikasi',
  message: 'Pesan masuk',
  chime: 'Chime',
  heart: 'Detak jantung',
  drone: 'Dengung rendah',
  wind: 'Angin malam',
  click: 'Klik UI',
  shimmer: 'Kilau',
  riser: 'Riser (naik)',
  sub: 'Dentum lembut',
  pad: 'Pad ambient (latar)',
  glassTap: 'Ketuk kaca',
  scrollTick: 'Tik gulir',
  azan: 'Azan (perlu azan.mp3)'
};

// "nama@detik*ulang:durasi" ⇄ objek
export function parseSfx(spec) {
  const m = String(spec).match(/^(\w+)(?:@([\d.]+))?(?:\*(\d+))?(?::([\d.]+))?$/);
  if (!m) return { name: 'pop', at: 0, count: 1, length: 0 };
  return { name: m[1], at: parseFloat(m[2] || 0), count: parseInt(m[3] || 1, 10), length: parseFloat(m[4] || 0) };
}

export function formatSfx({ name, at, count, length }) {
  return `${name}${at ? `@${+at.toFixed(2)}` : ''}${count > 1 ? `*${count}` : ''}${length ? `:${+length.toFixed(1)}` : ''}`;
}
