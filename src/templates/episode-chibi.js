// Proyek jenis "episode": editor khusus video ceramah dengan karakter chibi di panggung catur
// (chibi.html). Naskah otomatis dipecah jadi adegan.
import { newEpisode } from '../scriptgen.js';

export default {
  id: 'episode-chibi',
  name: 'Episode karakter chibi (naskah → video)',
  description: 'Tempel naskah, adegan dengan ekspresi, pose, kamera, dan SFX dibuat otomatis. Gaya Mode Ustadz.',
  kind: 'chibi',
  order: 4,
  fixedSize: '1920×1080',
  needsScript: true,
  create({ id, name, script, label }) {
    return newEpisode({ id, title: name, label, script });
  }
};
