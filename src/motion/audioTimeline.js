// Dokumen motion → bentuk timeline yang dipakai audio.js (layer audio + efek suara sintetis).
// Dipakai editor (putar & ekspor) dan jembatan MCP (ekspor dari luar editor).
import { getLayerDef } from './registry.js';

export function audioTimeline(d) {
  const list = d.layers
    .filter((l) => l.type === 'audio' && l.props?.url && !l.hidden)
    .map((l) => {
      const p = { ...getLayerDef('audio').defaults, ...l.props };
      return { id: l.id, url: p.url, start: l.start, in: p.in, out: p.in + l.dur * p.speed, speed: p.speed, volume: p.volume / 100, dur: l.dur, end: l.start + l.dur, track: 0 };
    });
  // layer efek suara → cue sintetis (sama dengan SFX di editor chibi)
  const cues = d.layers
    .filter((l) => l.type === 'sfx' && !l.hidden)
    .map((l) => {
      const p = { ...getLayerDef('sfx').defaults, ...l.props };
      return { name: p.sound, time: l.start, count: Math.max(1, Math.round(p.count)), length: l.dur, volume: p.volume / 100 };
    });
  return { cues, audio: list, total: d.comp.duration, sfxVolume: 1, sfxMuted: false, ep: {} };
}
