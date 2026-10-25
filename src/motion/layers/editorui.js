// Editor level bergaya mesin game (tema gelap, tata letak seperti editor di video referensi): bilah judul & menu,
// toolbar, viewport berlubang (dunia tampil di baliknya) dengan toolbar viewport, Outliner (Item Label/Type) di atas
// Details, Content Drawer/Output Log, dan baris Cmd. Hanya nama panel, tanpa logo.
// "frame" 0 = viewport memenuhi layar (panel bergeser keluar), 1 = editor lengkap.
const C = {
  title: '#151515', bar: '#1f1f1f', panel: '#1a1a1a', panel2: '#242424', line: '#0d0d0d', head: '#262626', row: '#202020',
  text: '#c8c8c8', bright: '#ffffff', muted: '#8a8a8a', faint: '#666', accent: '#0070e0', green: '#3fb950', sel: '#0d4f9c'
};
const TITLE = 30;
const TOOL = 42;
const RIGHT = 416;
const BOTTOM = 168;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

// kotak viewport pada nilai frame tertentu (dipakai juga layer dunia supaya pas di lubangnya)
export function editorViewport(W, H, frame) {
  const k = ease(frame);
  const top = (TITLE + TOOL) * k;
  const x = 6 * k;
  return { x, y: top, w: W - x - (RIGHT + 8) * k, h: H - top - BOTTOM * k };
}

const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
function txt(ctx, s, x, y, size, color, weight = 400, align = 'left', font = 'Geist') {
  ctx.font = `${weight} ${size}px "${font}", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
const box = (ctx, x, y, w, h, c, r = 0) => {
  ctx.fillStyle = c;
  if (r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
};
const stroke = (ctx, x, y, w, h, c, r = 0, lw = 1) => {
  ctx.strokeStyle = c;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
};
// ikon kecil sederhana
function icon(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (kind === 'eye') {
    ctx.ellipse(x, y, s * 0.55, s * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'play') {
    ctx.moveTo(x - s * 0.35, y - s * 0.45);
    ctx.lineTo(x + s * 0.45, y);
    ctx.lineTo(x - s * 0.35, y + s * 0.45);
    ctx.fill();
  } else if (kind === 'menu') {
    for (let i = -1; i <= 1; i++) { ctx.moveTo(x - s * 0.4, y + i * s * 0.3); ctx.lineTo(x + s * 0.4, y + i * s * 0.3); }
    ctx.stroke();
  } else if (kind === 'sun') {
    ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.moveTo(x + Math.cos(a) * s * 0.32, y + Math.sin(a) * s * 0.32); ctx.lineTo(x + Math.cos(a) * s * 0.46, y + Math.sin(a) * s * 0.46); }
    ctx.stroke();
  } else if (kind === 'cube') {
    ctx.rect(x - s * 0.32, y - s * 0.32, s * 0.64, s * 0.64);
    ctx.stroke();
  } else if (kind === 'cloud') {
    ctx.arc(x - s * 0.15, y + s * 0.05, s * 0.22, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + s * 0.08, y - s * 0.08, s * 0.26, Math.PI, Math.PI * 2);
    ctx.lineTo(x + s * 0.34, y + s * 0.27);
    ctx.closePath();
    ctx.stroke();
  } else if (kind === 'globe') {
    ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
    ctx.moveTo(x - s * 0.4, y);
    ctx.lineTo(x + s * 0.4, y);
    ctx.ellipse(x, y, s * 0.18, s * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'person') {
    ctx.arc(x, y - s * 0.18, s * 0.16, 0, Math.PI * 2);
    ctx.moveTo(x - s * 0.3, y + s * 0.38);
    ctx.quadraticCurveTo(x, y - s * 0.1, x + s * 0.3, y + s * 0.38);
    ctx.stroke();
  } else if (kind === 'fog') {
    for (let i = -1; i <= 1; i++) { ctx.moveTo(x - s * 0.38, y + i * s * 0.22); ctx.lineTo(x + s * 0.38, y + i * s * 0.22); }
    ctx.stroke();
  } else {
    ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

const BASE_ACTORS = [
  ['Untitled (Editor)', 'World', 'globe', 0], ['DirectionalLight', 'DirectionalLight', 'sun', 1], ['ExponentialHeightFog', 'ExponentialHeightFog', 'fog', 1],
  ['Floor', 'StaticMeshActor', 'cube', 1], ['PlayerStart', 'PlayerStart', 'person', 1], ['SkyAtmosphere', 'SkyAtmosphere', 'cloud', 1],
  ['SkyLight', 'SkyLight', 'sun', 1], ['VolumetricCloud', 'VolumetricCloud', 'cloud', 1]
];
const GEN = [['Pulau_', 'LandscapeStreamingProxy', 'cube'], ['Foliage_Pine_', 'InstancedFoliageActor', 'cube'], ['Building_', 'StaticMeshActor', 'cube'], ['River_', 'WaterBodyRiver', 'fog'], ['HLOD_Cell_', 'WorldPartitionHLOD', 'cube']];

export default {
  type: 'editorui',
  name: 'Editor level (UI)',
  icon: '▦',
  category: 'Demo UI',
  order: 34,
  fullFrame: true,
  defaults: {
    frame: 1, cmd: 'bangun dunia. buat seperti rumahku', typed: 0, caret: 1,
    log: 'LogInit: Display: Engine is initialized. (2.31s)\nLogWorld: Bringing World /Game/Maps/Untitled.Untitled up for editing\nLogShaderCompilers: Display: 0 shader jobs remaining', logShown: 3,
    actors: 7, actorWord: 'actors', names: '',
    level: 'Untitled', project: 'Project 1', fps: 60,
    stats: 0, statActors: 7, statInstances: 0, statTris: 0.3,
    toasts: '', chip: 'Claude'
  },
  schema: [
    { key: 'frame', label: 'Panel editor (0 = layar penuh, 1 = lengkap)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'cmd', label: 'Perintah di Cmd', kind: 'text' },
    { key: 'typed', label: 'Ketikan (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'caret', label: 'Kursor ketik (0/1)', kind: 'number', min: 0, max: 1, step: 1, animatable: true },
    { key: 'log', label: 'Output Log (satu baris per entri)', kind: 'textarea' },
    { key: 'logShown', label: 'Baris log tampil', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'actors', label: 'Jumlah di Outliner', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'actorWord', label: 'Sebutan item Outliner', kind: 'text' },
    { key: 'level', label: 'Nama level', kind: 'text' },
    { key: 'project', label: 'Nama proyek', kind: 'text' },
    { key: 'stats', label: 'Statistik viewport (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'statActors', label: 'Statistik: actors', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'statInstances', label: 'Statistik: instances', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'statTris', label: 'Statistik: triangles (juta)', kind: 'number', min: 0, step: 0.01, animatable: true },
    { key: 'toasts', label: 'Notifikasi (detik|judul|keterangan per baris)', kind: 'textarea' },
    { key: 'chip', label: 'Chip di Cmd', kind: 'text' }
  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const { width: W, height: H } = env.comp;
    const k = ease(p.frame);
    const t = env.contentT;
    ctx.save();
    ctx.translate(-W / 2, -H / 2);
    const vp = editorViewport(W, H, p.frame);

    // ---------- statistik di pojok viewport (angka naik selama dunia dibangun) ----------
    if (p.stats > 0.01) {
      ctx.save();
      ctx.globalAlpha = p.stats;
      const sx = vp.x + 14;
      const sy = vp.y + (k > 0.02 ? 50 : 18);
      const jit = (n) => Math.sin(t * 7.3 + n) * 0.5 + Math.sin(t * 13.1 + n * 2) * 0.3;
      [['Frame:', `${(16.4 + jit(1) * 0.6).toFixed(2)} ms`], ['GPU:', `${(14.1 + jit(2) * 1.4 + p.statTris * 0.6).toFixed(2)} ms`],
        ['Actors:', fmtNum(p.statActors)], ['Instances:', fmtNum(p.statInstances)], ['Triangles:', `${p.statTris.toFixed(1)} M`]].forEach(([a, b], i) => {
        txt(ctx, a, sx, sy + i * 17, 13, '#7ee787', 500, 'left', 'Geist Mono');
        txt(ctx, b, sx + 92, sy + i * 17, 13, '#e3d26f', 500, 'left', 'Geist Mono');
      });
      txt(ctx, `${(60 + jit(3) * 0.4).toFixed(2)} FPS`, vp.x + vp.w - 14, sy, 13, '#7ee787', 500, 'right', 'Geist Mono');
      txt(ctx, `${(16.6 + jit(4) * 0.3).toFixed(2)} ms`, vp.x + vp.w - 14, sy + 17, 13, '#e3d26f', 500, 'right', 'Geist Mono');
      ctx.restore();
    }
    // ---------- notifikasi tiap tahap (kanan bawah viewport): "detik|judul|keterangan" ----------
    let stack = 0;
    const toasts = String(p.toasts).split('\n').map((l) => l.split('|')).filter(([ts, title]) => title && t >= parseFloat(ts) && t < parseFloat(ts) + 2.8);
    for (const [ts, title, sub = ''] of toasts.reverse()) {
      const t0 = parseFloat(ts);
      const a = Math.min(1, (t - t0) / 0.22, (t0 + 2.8 - t) / 0.3);
      const bw2 = 300;
      const bh2 = 44;
      const bx = vp.x + vp.w - bw2 - 18 + (1 - a) * 30;
      const by = vp.y + vp.h - bh2 - 18 - stack * (bh2 + 8);
      stack++;
      ctx.save();
      ctx.globalAlpha = a;
      box(ctx, bx, by, bw2, bh2, 'rgba(22,22,24,0.94)', 4);
      ctx.fillStyle = C.green;
      ctx.beginPath();
      ctx.arc(bx + 20, by + bh2 / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0b1a0e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 16, by + bh2 / 2);
      ctx.lineTo(bx + 19, by + bh2 / 2 + 3);
      ctx.lineTo(bx + 24.5, by + bh2 / 2 - 3);
      ctx.stroke();
      txt(ctx, title, bx + 36, by + 16, 12.5, C.bright, 600);
      txt(ctx, sub, bx + 36, by + 31, 10.5, C.muted);
      box(ctx, bx + 8, by + bh2 - 3, (bw2 - 16) * Math.min(1, (t - t0) / 1.6), 2, C.accent);
      ctx.restore();
    }

    if (k <= 0.001) {
      ctx.restore();
      return;
    }

    // ---------- toolbar viewport (di dalam viewport) ----------
    ctx.save();
    ctx.globalAlpha = k;
    const vy = vp.y + 9;
    box(ctx, vp.x + 8, vy, 26, 26, 'rgba(20,20,20,0.85)', 3);
    icon(ctx, 'menu', vp.x + 21, vy + 13, 14, C.text);
    [['Perspective', 84], ['Lit', 52], ['Show', 50]].reduce((x, [s, w]) => {
      box(ctx, x, vy, w, 26, 'rgba(20,20,20,0.85)', 3);
      txt(ctx, s, x + w / 2, vy + 13, 12.5, C.bright, 600, 'center');
      return x + w + 4;
    }, vp.x + 40);
    let rx = vp.x + vp.w - 8;
    for (const [s, w, sel] of [['4', 44], ['0.25', 58], ['10°', 54], ['10', 50], ['', 28], ['', 28], ['', 28], ['', 28], ['', 28, 1]]) {
      rx -= w + 4;
      box(ctx, rx, vy, w, 26, sel ? C.accent : 'rgba(20,20,20,0.85)', 3);
      if (s) txt(ctx, s, rx + w - 8, vy + 13, 12, C.bright, 600, 'right');
      else box(ctx, rx + 9, vy + 8, 10, 10, sel ? '#fff' : '#9a9a9a', 2);
    }
    ctx.restore();

    // ---------- bilah judul + toolbar (geser ke atas) ----------
    ctx.save();
    ctx.translate(0, -(TITLE + TOOL) * (1 - k));
    box(ctx, 0, 0, W, TITLE, C.title);
    box(ctx, 10, 8, 14, 14, '#3a3a3a', 2);
    box(ctx, 34, 4, 82, TITLE - 4, C.bar, 3);
    txt(ctx, p.level, 50, TITLE / 2 + 1, 13, C.bright, 500);
    txt(ctx, '×', 104, TITLE / 2, 12, C.muted, 400, 'center');
    ['File', 'Edit', 'Window', 'Tools', 'Build', 'Select', 'Actor', 'Help'].reduce((x, m) => {
      txt(ctx, m, x, TITLE / 2, 13, C.text);
      ctx.font = '400 13px "Geist"';
      return x + ctx.measureText(m).width + 22;
    }, 150);
    txt(ctx, p.project, W - 145, TITLE / 2, 12.5, C.muted, 400, 'right');
    ['—', '▢', '✕'].forEach((s, i) => txt(ctx, s, W - 92 + i * 38, TITLE / 2, 12, C.text, 400, 'center'));
    box(ctx, 0, TITLE, W, TOOL, C.bar);
    box(ctx, 0, TITLE + TOOL - 1, W, 1, C.line);
    const ty = TITLE + TOOL / 2;
    box(ctx, 16, ty - 7, 14, 14, '#9a9a9a', 2);
    box(ctx, 62, ty - 13, 140, 26, C.panel2, 3);
    txt(ctx, 'Selection Mode ▾', 132, ty, 12.5, C.text, 500, 'center');
    txt(ctx, '+  Add ▾', 238, ty, 12.5, C.text, 500);
    box(ctx, 318, ty - 7, 14, 14, '#6aa0ff', 2);
    box(ctx, 372, ty - 7, 14, 14, '#c9a46a', 2);
    icon(ctx, 'play', 452, ty, 14, C.green);
    icon(ctx, 'play', 490, ty, 11, C.text);
    txt(ctx, '⋮', 532, ty, 15, C.text, 600, 'center');
    txt(ctx, '▭  Platforms ▾', 580, ty, 12.5, C.text, 500);
    txt(ctx, '⚙  Settings ▾', W - 18, ty, 12.5, C.text, 500, 'right');
    ctx.restore();

    // ---------- panel kanan: Outliner di atas Details (geser ke kanan) ----------
    const px = W - (RIGHT + 6) * k;
    const pTop = (TITLE + TOOL) * k;
    box(ctx, px - 4, pTop, RIGHT + 10, H - pTop, C.panel);
    // tab Outliner
    box(ctx, px, pTop + 2, 124, 30, C.panel2, 3);
    box(ctx, px, pTop + 2, 124, 2, C.accent);
    icon(ctx, 'menu', px + 18, pTop + 17, 13, C.text);
    txt(ctx, 'Outliner', px + 36, pTop + 17, 13, C.bright, 500);
    txt(ctx, '×', px + 108, pTop + 17, 12, C.muted, 400, 'center');
    // pencarian
    txt(ctx, '+', px + 18, pTop + 50, 18, C.green, 400, 'center');
    box(ctx, px + 40, pTop + 38, RIGHT - 106, 24, '#0f0f0f', 3);
    txt(ctx, '⌕  Search...', px + 50, pTop + 50, 12.5, C.faint);
    // kepala kolom
    const hy = pTop + 74;
    box(ctx, px, hy, RIGHT, 24, C.head);
    icon(ctx, 'eye', px + 14, hy + 12, 14, C.muted);
    txt(ctx, 'Item Label ▲', px + 34, hy + 12, 12, C.text);
    txt(ctx, 'Type', px + 282, hy + 12, 12, C.text);
    // baris aktor: 8 bawaan, lalu aktor hasil build menggulir ke bawah saat Outliner "membanjir"
    const n = Math.max(7, Math.round(p.actors));
    const listTop = hy + 26;
    const listH = (H - BOTTOM * 0 - listTop) * 0.42;
    const rowH = 24;
    const rows = Math.floor(listH / rowH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, listTop, RIGHT, rows * rowH);
    ctx.clip();
    for (let r = 0; r < rows; r++) {
      const y = listTop + r * rowH;
      let label;
      let type;
      let ic;
      let indent = 1;
      if (n <= 7) {
        if (r >= BASE_ACTORS.length) break;
        [label, type, ic, indent] = BASE_ACTORS[r];
      } else if (r === 0) {
        [label, type, ic, indent] = ['Untitled (Editor)', 'World', 'globe', 0];
      } else {
        // gulir: tampilkan aktor terbaru
        const idx = n - rows + r;
        const g = GEN[idx % GEN.length];
        [label, type, ic] = [`${g[0]}${String(Math.max(1, idx)).padStart(5, '0')}`, g[1], g[2]];
      }
      const sel = n > 7 && r === 0;
      if (sel) box(ctx, px, y, RIGHT, rowH, C.sel);
      icon(ctx, 'eye', px + 14, y + rowH / 2, 13, C.muted);
      icon(ctx, ic, px + 36 + indent * 14, y + rowH / 2, 13, C.text);
      txt(ctx, label, px + 50 + indent * 14, y + rowH / 2, 12.5, C.bright);
      txt(ctx, type, px + 282, y + rowH / 2, 11.5, C.muted);
    }
    ctx.restore();
    const fy = listTop + rows * rowH + 14;
    txt(ctx, `${fmtNum(n)} ${p.actorWord}`, px + 10, fy, 12, n > 7 ? C.text : C.muted);
    // Details
    const dy = fy + 18;
    box(ctx, px, dy, 112, 30, C.panel2, 3);
    box(ctx, px, dy, 112, 2, C.accent);
    icon(ctx, 'menu', px + 18, dy + 15, 13, C.text);
    txt(ctx, 'Details', px + 36, dy + 15, 13, C.bright, 500);
    txt(ctx, '×', px + 98, dy + 15, 12, C.muted, 400, 'center');
    txt(ctx, 'World Settings', px + 132, dy + 15, 13, C.muted);
    if (n > 7) {
      [['Location', '0.0   0.0   0.0'], ['Planet Radius', '6.371 km'], ['Islands', fmtNum(n)], ['Foliage', '894,863'], ['Buildings', '4,861']].forEach(([a, b], i) => {
        const y = dy + 52 + i * 26;
        txt(ctx, a, px + 14, y, 12, C.muted);
        box(ctx, px + 150, y - 10, RIGHT - 164, 20, '#0f0f0f', 3);
        txt(ctx, b, px + 158, y, 11.5, C.text);
      });
    } else txt(ctx, 'Select an object to view details.', px + RIGHT / 2, dy + 62, 12.5, C.muted, 400, 'center');

    // ---------- bawah: Content Drawer / Output Log + Cmd (geser ke bawah) ----------
    const bTop = H - BOTTOM * k;
    const bw = vp.x + vp.w;
    box(ctx, 0, bTop, bw + 4, BOTTOM, C.panel);
    box(ctx, 0, bTop, bw + 4, 1, C.line);
    txt(ctx, '▭  Content Drawer', 20, bTop + 26, 13, C.text, 500);
    box(ctx, 150, bTop + 10, 142, 30, C.panel2, 3);
    box(ctx, 150, bTop + 10, 142, 2, C.accent);
    txt(ctx, '▤  Output Log', 164, bTop + 26, 13, C.bright, 500);
    txt(ctx, '×', 274, bTop + 26, 12, C.muted, 400, 'center');
    const lines = String(p.log).split('\n').slice(0, Math.max(0, Math.round(p.logShown)));
    lines.slice(-4).forEach((l, i) => {
      const claude = /^Claude:/.test(l);
      const ok = /✓|built/.test(l);
      if (claude) {
        box(ctx, 16, bTop + 54 + i * 19 - 8, 50, 16, '#c0533a', 3);
        txt(ctx, 'Claude', 41, bTop + 54 + i * 19, 11, '#fff', 600, 'center');
        txt(ctx, l.replace(/^Claude:\s*/, ''), 72, bTop + 54 + i * 19, 13, C.bright, 400, 'left', 'Geist Mono');
      } else txt(ctx, l, 16, bTop + 54 + i * 19, 13, ok ? C.green : C.text, 400, 'left', 'Geist Mono');
    });
    // baris Cmd
    const cy = bTop + BOTTOM - 40;
    txt(ctx, 'Cmd ▾', 22, cy + 14, 12.5, C.text, 600);
    const ix0 = 82;
    box(ctx, ix0, cy, bw - ix0 - 6, 28, '#0f0f0f', 3);
    stroke(ctx, ix0, cy, bw - ix0 - 6, 28, C.accent, 3, 1.5);
    let ix = ix0 + 6;
    if (p.chip) {
      ctx.font = '600 14px "Geist", sans-serif';
      const cwid = ctx.measureText(p.chip).width + 40;
      box(ctx, ix, cy + 3, cwid, 22, '#5a1f14', 3);
      box(ctx, ix + 8, cy + 9, 16, 10, '#d97757', 2);
      txt(ctx, p.chip, ix + 30, cy + 14, 14, '#f07a5a', 600);
      ix += cwid + 8;
    }
    const shown = String(p.cmd).slice(0, Math.round(p.typed * String(p.cmd).length));
    txt(ctx, shown, ix, cy + 14, 13.5, C.bright, 400, 'left', 'Geist Mono');
    if (p.caret > 0.5 && Math.floor(t * 2.2) % 2 === 0) {
      ctx.font = '400 13.5px "Geist Mono", monospace';
      box(ctx, ix + ctx.measureText(shown).width + 1, cy + 7, 7, 14, C.bright);
    }
    ctx.restore();
  }
};
