// Bagian tetap skrip After Effects (ExtendScript = JavaScript lama/ES3: tanpa let/const/arrow/forEach).
// Skrip hasil ekspor = `var D = {data proyek};` + RUNTIME. Data dibuat oleh ae/export.js.
//
// Saluran nilai (ch): { v: nilai } = tetap, atau { k: [[t, v, in, out, inSpeed, inInfl, outSpeed, outInfl], …] }
// in/out = 'L' (linear) | 'B' (bezier dengan ease) | 'H' (tahan). Waktu dalam detik komposisi.

export const RUNTIME = String.raw`
(function () {
  var warnings = [];
  function warn(m) { warnings.push(m); }
  var base = File($.fileName).parent;

  function T(c) {
    if (c === 'H') return KeyframeInterpolationType.HOLD;
    if (c === 'B') return KeyframeInterpolationType.BEZIER;
    return KeyframeInterpolationType.LINEAR;
  }
  function dimsOf(p) {
    var t = p.propertyValueType;
    if (t === PropertyValueType.ThreeD) return 3;
    if (t === PropertyValueType.TwoD) return 2;
    return 1;
  }
  // samakan bentuk nilai dengan properti (angka -> [n, n, n] untuk skala, warna 3/4 elemen, dst.)
  function fit(p, v) {
    var cur = p.value;
    if (!(cur instanceof Array)) return (v instanceof Array) ? v[0] : v;
    var out = [];
    for (var i = 0; i < cur.length; i++) {
      if (v instanceof Array) out.push(i < v.length ? v[i] : (i === 3 ? 1 : v[v.length - 1]));
      else out.push(v);
    }
    return out;
  }
  function eases(n, speed, infl) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(new KeyframeEase(speed || 0, Math.max(0.1, Math.min(100, infl || 33.3))));
    return a;
  }
  function apply(p, ch, label) {
    if (!p || !ch) return;
    try {
      if (ch.k === undefined) { p.setValue(fit(p, ch.v)); return; }
      var ks = ch.k, i;
      for (i = 0; i < ks.length; i++) p.setValueAtTime(ks[i][0], fit(p, ks[i][1]));
      var n = dimsOf(p);
      for (i = 0; i < ks.length; i++) {
        var k = ks[i];
        var idx = p.nearestKeyIndex(k[0]);
        if (k[2] === 'B' || k[3] === 'B') {
          try { p.setTemporalEaseAtKey(idx, eases(n, k[4], k[5]), eases(n, k[6], k[7])); } catch (e1) {}
        }
        p.setInterpolationTypeAtKey(idx, T(k[2]), T(k[3]));
      }
    } catch (e) {
      warn((label || p.name) + ': ' + e.toString());
    }
  }
  function prop(layer, path) {
    var p = layer;
    for (var i = 0; i < path.length && p; i++) p = p.property(path[i]);
    return p;
  }

  var proj = app.project || app.newProject();
  app.beginUndoGroup('Labs Studio: ' + D.name);
  var folder = proj.items.addFolder(D.name + ' (Labs Studio)');
  var mediaFolder = proj.items.addFolder('Media');
  mediaFolder.parentFolder = folder;
  var C = D.comp;
  var comp = proj.items.addComp(D.name, C.w, C.h, 1, C.dur, C.fps);
  comp.parentFolder = folder;
  comp.bgColor = C.bg;

  var imported = {};
  function importMedia(rel, straight) {
    if (imported[rel]) return imported[rel];
    var f = new File(base.fsName + '/' + rel);
    if (!f.exists) { warn('File tidak ditemukan: ' + rel); return null; }
    try {
      var item = proj.importFile(new ImportOptions(f));
      item.parentFolder = mediaFolder;
      if (straight) {
        try { item.mainSource.alphaMode = AlphaMode.STRAIGHT; } catch (e1) {}
        try { item.mainSource.conformFrameRate = C.fps; } catch (e2) {}
      }
      imported[rel] = item;
      return item;
    } catch (e) {
      warn('Gagal mengimpor ' + rel + ': ' + e.toString());
      return null;
    }
  }

  var BLEND = {
    screen: BlendingMode.SCREEN, multiply: BlendingMode.MULTIPLY, overlay: BlendingMode.OVERLAY,
    lighter: BlendingMode.ADD, 'soft-light': BlendingMode.SOFT_LIGHT
  };
  var JUST = { left: ParagraphJustification.LEFT_JUSTIFY, center: ParagraphJustification.CENTER_JUSTIFY, right: ParagraphJustification.RIGHT_JUSTIFY };

  function transform(L, s) {
    var tr = L.property('ADBE Transform Group');
    if (s.x || s.y) {
      var pos = tr.property('ADBE Position');
      pos.dimensionsSeparated = true;
      apply(tr.property('ADBE Position_0'), s.x, 'Posisi X');
      apply(tr.property('ADBE Position_1'), s.y, 'Posisi Y');
    }
    apply(tr.property('ADBE Scale'), s.scale, 'Skala');
    apply(tr.property('ADBE Rotate Z'), s.rot, 'Rotasi');
    apply(tr.property('ADBE Opacity'), s.op, 'Opacity');
    var fx = L.property('ADBE Effect Parade');
    if (s.blur) {
      try {
        var b = fx.addProperty('ADBE Gaussian Blur 2');
        apply(b.property('ADBE Gaussian Blur 2-0001'), s.blur, 'Blur');
      } catch (e) { warn(s.name + ': blur tidak bisa dibuat (' + e.toString() + ')'); }
    }
    if (s.shadow) {
      try {
        var d = fx.addProperty('ADBE Drop Shadow');
        apply(d.property('ADBE Drop Shadow-0001'), s.shadow.color, 'Warna bayangan');
        var op = d.property('ADBE Drop Shadow-0002');
        op.setValue(op.hasMax && op.maxValue > 100 ? 255 : 100);
        d.property('ADBE Drop Shadow-0004').setValue(0);
        apply(d.property('ADBE Drop Shadow-0005'), s.shadow.soft, 'Bayangan');
      } catch (e2) { warn(s.name + ': bayangan tidak bisa dibuat (' + e2.toString() + ')'); }
    }
    if (s.blend && BLEND[s.blend]) L.blendingMode = BLEND[s.blend];
  }

  function times(L, s) {
    if (s.stretch && s.stretch !== 100) L.stretch = s.stretch;
    L.startTime = s.startTime || 0;
    L.inPoint = s.start;
    L.outPoint = s.end;
  }

  function shapeLayer(s) {
    var L = comp.layers.addShape();
    var g = L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    g.name = s.shape;
    var c = g.property('ADBE Vectors Group');
    if (s.shape === 'ellipse') {
      apply(c.addProperty('ADBE Vector Shape - Ellipse').property('ADBE Vector Ellipse Size'), s.size, 'Ukuran');
    } else if (s.shape === 'triangle' || s.shape === 'line') {
      var sh = new Shape();
      var w = s.w / 2, h = s.h / 2;
      sh.vertices = s.shape === 'line' ? [[-w, 0], [w, 0]] : [[0, -h], [w, h], [-w, h]];
      sh.closed = s.shape !== 'line';
      c.addProperty('ADBE Vector Shape - Group').property('ADBE Vector Shape').setValue(sh);
    } else {
      var r = c.addProperty('ADBE Vector Shape - Rect');
      apply(r.property('ADBE Vector Rect Size'), s.size, 'Ukuran');
      apply(r.property('ADBE Vector Rect Roundness'), s.round, 'Sudut membulat');
    }
    if (s.stroke) {
      var st = c.addProperty('ADBE Vector Graphic - Stroke');
      apply(st.property('ADBE Vector Stroke Color'), s.stroke.color, 'Warna garis');
      apply(st.property('ADBE Vector Stroke Width'), s.stroke.width, 'Tebal garis');
      if (s.shape === 'line') try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
    }
    if (s.fill) apply(c.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color'), s.fill, 'Warna isi');
    return L;
  }

  function textLayer(s) {
    var L = comp.layers.addText(s.text);
    var src = L.property('ADBE Text Properties').property('ADBE Text Document');
    var td = src.value;
    try { td.resetCharStyle(); } catch (e0) {}
    td.font = s.font;
    td.fontSize = s.size;
    td.fillColor = s.color;
    td.applyFill = true;
    td.justification = JUST[s.align] || JUST.center;
    td.tracking = s.tracking || 0;
    try { td.autoLeading = false; td.leading = s.leading; } catch (e1) {}
    if (s.stroke) {
      td.applyStroke = true;
      td.strokeColor = s.stroke.color;
      td.strokeWidth = s.stroke.width;
      td.strokeOverFill = false;
    } else td.applyStroke = false;
    src.setValue(td);
    // kata *aksen*: warna/font per huruf hanya bisa lewat skrip di After Effects 24.3 ke atas
    if (s.accents && s.accents.length) {
      try {
        td = src.value;
        if (!td.characterRange) throw new Error('lama');
        for (var i = 0; i < s.accents.length; i++) {
          var cr = td.characterRange(s.accents[i][0], s.accents[i][1]);
          cr.fillColor = s.accentColor;
          if (s.accentFont) cr.font = s.accentFont;
        }
        src.setValue(td);
      } catch (e2) {
        warn(s.name + ': warna kata aksen perlu diatur manual (butuh After Effects 24.3+)');
      }
    }
    if (td.font !== s.font) warn(s.name + ': font "' + s.font + '" belum terpasang, diganti ' + td.font);
    // titik jangkar di tengah teks, seperti di studio
    try {
      var r = L.sourceRectAtTime(s.start, false);
      // rata kiri/kanan: di studio teks menempel ke tepi kotak teks (lebar s.box), bukan ke tengah
      var ax = r.left + r.width / 2;
      if (s.align === 'left') ax = r.left + s.box / 2;
      else if (s.align === 'right') ax = r.left + r.width - s.box / 2;
      L.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([ax, r.top + r.height / 2]);
    } catch (e3) {}
    return L;
  }

  function solidLayer(s) {
    var L = comp.layers.addSolid(s.color, s.name, C.w, C.h, 1, C.dur);
    try { L.source.parentFolder = mediaFolder; } catch (e0) {}
    var fx = L.property('ADBE Effect Parade');
    if (s.fill) {
      try { apply(fx.addProperty('ADBE Fill').property('ADBE Fill-0002'), s.fill, 'Warna'); } catch (e) { warn(s.name + ': warna beranimasi tidak bisa dibuat'); }
    }
    if (s.ramp) {
      try {
        var rp = fx.addProperty('ADBE Ramp');
        apply(rp.property('ADBE Ramp-0001'), s.ramp.p1, 'Awal gradien');
        apply(rp.property('ADBE Ramp-0002'), s.ramp.c1, 'Warna 1');
        apply(rp.property('ADBE Ramp-0003'), s.ramp.p2, 'Akhir gradien');
        apply(rp.property('ADBE Ramp-0004'), s.ramp.c2, 'Warna 2');
        rp.property('ADBE Ramp-0005').setValue(s.ramp.shape);
      } catch (e2) { warn(s.name + ': gradien tidak bisa dibuat (' + e2.toString() + ')'); }
    }
    return L;
  }

  function footageLayer(s) {
    var item = importMedia(s.file, s.straight);
    if (!item) return null;
    var L = comp.layers.add(item);
    if (s.mute) try { L.audioEnabled = false; } catch (e) {}
    if (s.db !== undefined) {
      try { L.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([s.db, s.db]); } catch (e2) {}
    }
    return L;
  }

  // latar komposisi (di studio warna latar ikut tergambar)
  if (C.bgLayer) {
    var bgL = comp.layers.addSolid(C.bg, 'Warna latar', C.w, C.h, 1, C.dur);
    try { bgL.source.parentFolder = mediaFolder; } catch (e) {}
    bgL.locked = true;
  }

  // dari layer paling belakang ke paling depan (layer baru selalu masuk paling atas)
  for (var i = D.layers.length - 1; i >= 0; i--) {
    var s = D.layers[i];
    var L = null;
    try {
      if (s.kind === 'shape') L = shapeLayer(s);
      else if (s.kind === 'text') L = textLayer(s);
      else if (s.kind === 'solid') L = solidLayer(s);
      else L = footageLayer(s);
      if (!L) continue;
      L.name = s.name;
      times(L, s);
      transform(L, s);
      if (s.comment) L.comment = s.comment;
      if (s.label) try { L.label = s.label; } catch (e1) {}
    } catch (e) {
      warn(s.name + ': ' + e.toString());
    }
  }

  comp.openInViewer();
  app.endUndoGroup();
  var msg = 'Komposisi "' + D.name + '" selesai dibuat dari Labs Studio.';
  if (warnings.length) msg += '\n\nPerlu dicek:\n- ' + warnings.slice(0, 25).join('\n- ');
  alert(msg);
})();
`;
