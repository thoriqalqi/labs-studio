// SFX disintesis dengan Web Audio (tanpa musik). Fungsi yang sama dipakai untuk
// pemutaran langsung dan render offline saat ekspor MP4.
// File opsional di public/audio/: vo.mp3 (voice over), azan.mp3 (azan sayup).
// Audio lain diimpor lewat editor dan tersimpan di public/audio/uploads/.

function noiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 99;
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    d[i] = (s / 2147483647) * 2 - 1;
  }
  return buf;
}

function env(ctx, out, when, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.setValueAtTime(peak, when + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  g.connect(out);
  return g;
}

function osc(ctx, type, f0, f1, when, dur, dest) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, when);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, when + dur);
  o.connect(dest);
  o.start(when);
  o.stop(when + dur + 0.05);
  return o;
}

const SFX = {
  whoosh(ctx, out, when, { up = false } = {}) {
    const dur = up ? 1.1 : 0.7;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur + 0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(up ? 250 : 2400, when);
    bp.frequency.exponentialRampToValueAtTime(up ? 5000 : 300, when + dur);
    src.connect(bp);
    bp.connect(env(ctx, out, when, dur * 0.45, 0, dur * 0.55, 0.55));
    src.start(when);
    src.stop(when + dur + 0.1);
  },
  whooshUp(ctx, out, when) {
    SFX.whoosh(ctx, out, when, { up: true });
  },
  bass(ctx, out, when) {
    osc(ctx, 'sine', 120, 38, when, 1.0, env(ctx, out, when, 0.005, 0.05, 1.0, 0.9));
    osc(ctx, 'triangle', 240, 60, when, 0.25, env(ctx, out, when, 0.002, 0, 0.25, 0.25));
  },
  tick(ctx, out, when, { count = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const w = when + i * 0.5;
      osc(ctx, 'square', i % 2 ? 1800 : 2300, i % 2 ? 1800 : 2300, w, 0.03, env(ctx, out, w, 0.001, 0, 0.04, 0.12));
    }
  },
  coin(ctx, out, when) {
    [0, 0.09, 0.2].forEach((d, i) => {
      const w = when + d;
      osc(ctx, 'sine', 1900 + i * 200, 1900 + i * 200, w, 0.5, env(ctx, out, w, 0.002, 0, 0.5, 0.18));
      osc(ctx, 'sine', 2850 + i * 300, 2850 + i * 300, w, 0.3, env(ctx, out, w, 0.002, 0, 0.3, 0.08));
    });
  },
  pop(ctx, out, when) {
    osc(ctx, 'sine', 700, 220, when, 0.1, env(ctx, out, when, 0.003, 0, 0.12, 0.45));
  },
  notif(ctx, out, when) {
    osc(ctx, 'sine', 988, 988, when, 0.3, env(ctx, out, when, 0.004, 0.02, 0.3, 0.25));
    osc(ctx, 'sine', 1319, 1319, when + 0.12, 0.4, env(ctx, out, when + 0.12, 0.004, 0.02, 0.4, 0.25));
  },
  message(ctx, out, when) {
    [784, 988, 1175].forEach((f, i) => {
      const w = when + i * 0.07;
      osc(ctx, 'sine', f, f * 1.05, w, 0.15, env(ctx, out, w, 0.003, 0, 0.18, 0.22));
    });
  },
  chime(ctx, out, when) {
    [[784, 0.22], [1568, 0.08], [2360, 0.05]].forEach(([f, a]) => {
      osc(ctx, 'sine', f, f, when, 2.4, env(ctx, out, when, 0.004, 0, 2.4, a));
    });
  },
  heart(ctx, out, when, { count = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const w = when + i * 1.0;
      osc(ctx, 'sine', 70, 45, w, 0.18, env(ctx, out, w, 0.005, 0, 0.18, 0.8));
      osc(ctx, 'sine', 62, 40, w + 0.22, 0.16, env(ctx, out, w + 0.22, 0.005, 0, 0.16, 0.6));
    }
  },
  drone(ctx, out, when, { length = 6 } = {}) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.22, when + 1.5);
    g.gain.setValueAtTime(0.22, when + Math.max(1.5, length - 1.5));
    g.gain.linearRampToValueAtTime(0, when + length);
    lp.connect(g);
    g.connect(out);
    osc(ctx, 'sawtooth', 55, 55, when, length, lp);
    osc(ctx, 'sawtooth', 55.6, 55.6, when, length, lp);
  },
  wind(ctx, out, when, { length = 20 } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 4);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.06, when + 3);
    g.gain.setValueAtTime(0.06, when + length - 3);
    g.gain.linearRampToValueAtTime(0, when + length);
    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start(when);
    src.stop(when + length);
  },
  // klik antarmuka: ketukan pendek & renyah
  click(ctx, out, when) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.05);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 3200;
    hp.Q.value = 2;
    src.connect(hp);
    hp.connect(env(ctx, out, when, 0.001, 0, 0.035, 0.6));
    src.start(when);
    src.stop(when + 0.06);
    osc(ctx, 'sine', 1400, 900, when, 0.05, env(ctx, out, when, 0.001, 0, 0.05, 0.18));
  },
  // kilau: beberapa nada tinggi berurutan yang berpendar
  shimmer(ctx, out, when) {
    [1568, 2093, 2637, 3136, 4186].forEach((f, i) => {
      const w = when + i * 0.045;
      osc(ctx, 'sine', f, f, w, 1.2, env(ctx, out, w, 0.005, 0, 1.2 - i * 0.12, 0.07));
    });
  },
  // riser: desis yang naik menjelang momen besar
  riser(ctx, out, when, { length = 1.2 } = {}) {
    const len = Math.max(0.3, length);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, len + 0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(300, when);
    bp.frequency.exponentialRampToValueAtTime(6000, when + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.5, when + len * 0.95);
    g.gain.linearRampToValueAtTime(0, when + len + 0.05);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(when);
    src.stop(when + len + 0.1);
  },
  // pad ambient lembut (latar video promo): akor terbuka yang bernapas pelan, panjang = durasi layer
  pad(ctx, out, when, { length = 8 } = {}) {
    const len = Math.max(2, length);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(500, when);
    lp.frequency.linearRampToValueAtTime(1600, when + len * 0.5);
    lp.frequency.linearRampToValueAtTime(700, when + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.16, when + Math.min(1.6, len * 0.3));
    g.gain.setValueAtTime(0.16, when + len - Math.min(1.4, len * 0.25));
    g.gain.linearRampToValueAtTime(0, when + len);
    // napas pelan (tremolo halus)
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 0.22;
    lg.gain.value = 0.035;
    lfo.connect(lg);
    lg.connect(g.gain);
    lfo.start(when);
    lfo.stop(when + len + 0.1);
    lp.connect(g);
    g.connect(out);
    // A mayor 9 terbuka, tiap nada sedikit dilaras ganda supaya berkilau
    [[110, 0.5], [164.81, 0.35], [220, 0.3], [277.18, 0.22], [329.63, 0.2], [493.88, 0.1]].forEach(([f, a]) => {
      for (const det of [-1.2, 1.2]) {
        const gg = ctx.createGain();
        gg.gain.value = a * 0.5;
        gg.connect(lp);
        osc(ctx, f < 200 ? 'triangle' : 'sine', f + det * (f / 220), f + det * (f / 220), when, len, gg);
      }
    });
  },
  // ketuk kaca: klik gelembung lembut + denting tinggi tipis (cocok untuk tombol kaca / riak)
  glassTap(ctx, out, when) {
    osc(ctx, 'sine', 520, 1250, when, 0.09, env(ctx, out, when, 0.002, 0, 0.12, 0.35));
    osc(ctx, 'sine', 2637, 2637, when + 0.01, 0.6, env(ctx, out, when + 0.01, 0.002, 0, 0.6, 0.06));
    osc(ctx, 'sine', 3951, 3951, when + 0.02, 0.4, env(ctx, out, when + 0.02, 0.002, 0, 0.4, 0.03));
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.04);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4500;
    bp.Q.value = 3;
    src.connect(bp);
    bp.connect(env(ctx, out, when, 0.001, 0, 0.03, 0.25));
    src.start(when);
    src.stop(when + 0.05);
  },
  // tik gulir: ketukan sangat halus untuk daftar/kata yang bergulir; "count" = jumlah ketukan tiap 0,25 dtk
  scrollTick(ctx, out, when, { count = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const w = when + i * 0.25;
      osc(ctx, 'sine', 1900, 1500, w, 0.03, env(ctx, out, w, 0.001, 0, 0.035, 0.09));
      osc(ctx, 'triangle', 380, 300, w, 0.04, env(ctx, out, w, 0.001, 0, 0.04, 0.08));
    }
  },
  // dentum lembut untuk adegan berganti / logo muncul
  sub(ctx, out, when) {
    osc(ctx, 'sine', 90, 32, when, 1.4, env(ctx, out, when, 0.01, 0.05, 1.3, 0.7));
    osc(ctx, 'sine', 180, 60, when, 0.4, env(ctx, out, when, 0.005, 0, 0.4, 0.15));
  },
  azan(ctx, out, when, opts, assets) {
    if (!assets.azan) return;
    const src = ctx.createBufferSource();
    src.buffer = assets.azan;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.25, when + 0.6);
    g.gain.linearRampToValueAtTime(0, when + 4);
    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start(when);
    src.stop(when + 4.2);
  }
};

async function loadOptional(ctx, url) {
  try {
    const res = await fetch(url);
    // file yang tidak ada dibalas index.html oleh dev server
    if (!res.ok || (res.headers.get('content-type') || '').includes('text/html')) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export function createAudio() {
  const ctx = new AudioContext({ sampleRate: 48000 });
  const assets = { azan: null };
  const pending = new Map(); // url -> Promise<AudioBuffer|null>
  const ready = new Map();   // url -> AudioBuffer (yang sudah selesai dimuat)
  const peakCache = new Map();
  let tl = null;
  let session = null;

  function setTimeline(next) {
    tl = next;
  }

  function getBuffer(url) {
    if (!pending.has(url)) {
      pending.set(url, loadOptional(ctx, url).then((buf) => {
        if (buf) ready.set(url, buf);
        return buf;
      }));
    }
    return pending.get(url);
  }

  // puncak gelombang per 10 ms, untuk menggambar waveform di editor
  function peaks(url) {
    const buf = ready.get(url);
    if (!buf) return null;
    if (peakCache.has(url)) return peakCache.get(url);
    const data = buf.getChannelData(0);
    const per = Math.floor(buf.sampleRate / 100);
    const out = new Float32Array(Math.ceil(data.length / per));
    for (let i = 0; i < out.length; i++) {
      let m = 0;
      const end = Math.min(data.length, (i + 1) * per);
      for (let j = i * per; j < end; j += 4) m = Math.max(m, Math.abs(data[j]));
      out[i] = m;
    }
    peakCache.set(url, out);
    return out;
  }

  async function load() {
    assets.azan = await getBuffer('/audio/azan.mp3');
    const vo = await getBuffer('/audio/vo.mp3');
    return { vo, azan: !!assets.azan };
  }

  async function ensureLoaded() {
    await Promise.all(tl.audio.map((a) => getBuffer(a.url)));
  }

  // jadwalkan SFX + klip audio mulai dari waktu timeline `from` ke context `c`
  function schedule(c, out, from, base, sources) {
    const sfxOut = c.createGain();
    sfxOut.gain.value = tl.sfxMuted ? 0 : tl.sfxVolume;
    sfxOut.connect(out);
    for (const cue of tl.cues) {
      if (cue.time + 0.05 < from) continue;
      const fn = SFX[cue.name];
      if (!fn) continue;
      let dest = sfxOut;
      if (cue.volume != null && cue.volume !== 1) {
        dest = c.createGain();
        dest.gain.value = cue.volume;
        dest.connect(sfxOut);
      }
      fn(c, dest, base + (cue.time - from), { count: cue.count, length: cue.length || undefined }, assets);
    }
    for (const a of tl.audio) {
      const buf = ready.get(a.url);
      if (!buf || a.end <= from) continue;
      let when = base + (a.start - from);
      let offset = a.in;
      let length = a.out - a.in;
      if (a.start < from) {
        const skip = (from - a.start) * a.speed;
        when = base;
        offset += skip;
        length -= skip;
      }
      if (length <= 0.001) continue;
      const g = c.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(a.volume, when + 0.01);
      g.connect(out);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = a.speed;
      src.connect(g);
      src.start(when, offset, length);
      sources.push(src);
    }
  }

  function play(from) {
    stop();
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    const base = ctx.currentTime + 0.05;
    const sources = [];
    schedule(ctx, out, from, base, sources);
    session = { out, sources, base, from };
  }

  function stop() {
    if (!session) return;
    session.out.disconnect();
    session.sources.forEach((s) => { try { s.stop(); } catch {} });
    session = null;
  }

  // waktu timeline saat ini berdasarkan jam audio (presisi)
  function now() {
    if (!session) return null;
    return session.from + Math.max(0, ctx.currentTime - session.base);
  }

  async function renderOffline(total) {
    const sr = 48000;
    const off = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
    const out = off.createGain();
    out.gain.value = 0.9;
    out.connect(off.destination);
    schedule(off, out, 0, 0, []);
    const buf = await off.startRendering();
    return encodeWav(buf);
  }

  return { load, play, stop, now, renderOffline, assets, setTimeline, getBuffer, ensureLoaded, peaks, isReady: (url) => ready.has(url) };
}

function encodeWav(buf) {
  const ch = buf.numberOfChannels;
  const len = buf.length;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  data.setUint32(4, 36 + len * ch * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, ch, true);
  data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true);
  w(36, 'data');
  data.setUint32(40, len * ch * 2, true);
  const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([data], { type: 'audio/wav' });
}
