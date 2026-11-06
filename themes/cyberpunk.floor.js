// Cyberpunk's floor: a city screen. A hazard-trimmed frame with chamfered corners in the accent colour, bundles of cyan
// circuit traces routed in from the edges to end in pads, a drift of specks across the middle, an access-sequence
// matrix solving itself over and over, a strip of readouts, and along the bottom a skyline, its windows lit and
// flickering under a magenta haze with the odd aerial vehicle crossing above it. A scan line sweeps down it, and every
// few seconds a glitch: the screen jolted sideways and slices of it thrown further for a moment, with red and cyan
// fringes, while the implant readout fails. With reduce motion on, the screen stands still.

const RED = '#ff003c', CYAN = '#00f0ff', MAGENTA = '#ff2bd6';
const CODE = ['3F', 'A7', '5D', 'C2', '8E', '71'];   // the bytes of an access-sequence matrix
const PITCH = 11;   // between the traces of a bundle
const LABEL_FONT = '600 10px "Bahnschrift SemiCondensed", Bahnschrift, "Segoe UI", sans-serif';
const MONO_FONT = '11px "Cascadia Mono", Consolas, monospace';
const PANEL_W = 310, PANEL_H = 182, CELL = 30, ROW = 22;   // the matrix panel
const STAGES = [0, 1500, 5500, 9500, 13500];   // when each byte is taken, and when access is granted
const CYCLE = 15500;                            // a new matrix after this

const s = {
  w: 0, h: 0, dpr: 1, colour: '#fcee0a', floorColour: '#060608',
  traces: [], specks: [], labels: [], implant: null, buildings: [], flickers: [], lamps: [], matrix: null,
  inks: [], breach: null, panels: [], stage: -1,
  av: null, avNext: 0, sweep: -40, until: 0, next: 0, rolled: 0, shift: 0, slices: [], started: false,
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const layer = (w, h) => {
  const c = new OffscreenCanvas(Math.max(1, Math.round(w * s.dpr)), Math.max(1, Math.round(h * s.dpr)));
  const x = c.getContext('2d');
  x.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  return [c, x];
};

/** A polyline the given distance to one side of another: each segment moved along its normal, the corners where they meet. */
function offsetRoute(route, d) {
  if (!d) return route;
  const segs = [];
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i], len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len * d, ny = (bx - ax) / len * d;
    segs.push([[ax + nx, ay + ny], [bx + nx, by + ny]]);
  }
  const points = [segs[0][0]];
  for (let i = 1; i < segs.length; i++) {
    const [[x1, y1], [x2, y2]] = segs[i - 1], [[x3, y3], [x4, y4]] = segs[i];
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) { points.push([x2, y2]); continue; }
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    points.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
  }
  points.push(segs[segs.length - 1][1]);
  return points;
}

/** Writes a readout in the screen's stencil face. */
function label(x, text, px, py) {
  x.font = LABEL_FONT;
  if ('letterSpacing' in x) x.letterSpacing = '1.5px';
  x.textBaseline = 'alphabetic';
  x.fillText(text, px, py);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
}

/** Lays the screen out for a window this size: the traces, the specks, the matrix's place, the readouts, and the skyline. */
function board(w, h) {
  const traces = [];
  const bundle = (route, n) => {
    for (let i = 0; i < n; i++) traces.push({ points: offsetRoute(route, (i - (n - 1) / 2) * PITCH), pad: i % 2 ? 'dot' : 'ring' });
  };
  // Down from the top edge, a bend to one side, a run, and a bend down again.
  for (let x = rnd(40, 160); x < w - 60; x += rnd(170, 320)) {
    const side = Math.random() < 0.5 ? -1 : 1, drop = rnd(40, 200), run = rnd(50, 190), bend = rnd(22, 48);
    bundle([[x, -4], [x, drop], [x + side * bend, drop + bend], [x + side * (bend + run), drop + bend],
      [x + side * (bend + run + bend), drop + bend + bend], [x + side * (bend + run + bend), drop + bend + bend + rnd(10, 70)]], 2 + Math.floor(Math.random() * 3));
  }
  // In from each side, high up, with a bend down.
  for (const [x0, dir] of [[-4, 1], [w + 4, -1]]) {
    const y = rnd(h * 0.14, h * 0.45), run = rnd(90, 260), bend = rnd(24, 50);
    bundle([[x0, y], [x0 + dir * run, y], [x0 + dir * (run + bend), y + bend], [x0 + dir * (run + bend), y + bend + rnd(30, 110)]], 3 + Math.floor(Math.random() * 2));
  }
  // The specks: a drift across the middle of the window, thicker towards its centre line.
  const specks = Array.from({ length: Math.min(600, Math.round((w * h) / 3600)) },
    () => [rnd(0, w), h * 0.5 + (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.16, rnd(0.7, 2)]);
  // The skyline: buildings shoulder to shoulder along the bottom, some with a mast and its lamp, their windows lit here
  // and there; one window in eight flickers, so it's drawn each frame rather than on the screen.
  const skyMax = Math.min(180, h * 0.2), buildings = [], flickers = [], lamps = [];
  for (let x = -10; x < w + 10;) {
    const bw = rnd(16, 64), bh = (Math.random() < 0.15 ? rnd(0.85, 1) : rnd(0.25, 0.75)) * skyMax;
    const mast = bh > skyMax * 0.7 && Math.random() < 0.5 ? rnd(10, 30) : 0;
    const windows = [];
    for (let wx = x + 4; wx < x + bw - 4; wx += 7) for (let wy = h - bh + 6; wy < h - 4; wy += 9) {
      if (Math.random() >= 0.22) continue;
      const colour = pick([CYAN, CYAN, '#fcee0a', MAGENTA, '#ffffff']);
      if (Math.random() < 0.125) flickers.push({ x: wx, y: wy, colour, period: rnd(1800, 9000), phase: rnd(0, Math.PI * 2) });
      else windows.push([wx, wy, colour]);
    }
    if (mast) lamps.push({ x: x + bw / 2 - 1, y: h - bh - mast - 1, phase: rnd(0, 2000) });
    buildings.push({ x, w: bw, h: bh, mast, windows });
    x += bw + rnd(0, 6);
  }
  // The readouts, in a strip above the skyline; the implant's is the one that fails during a glitch.
  const ly = Math.round(h - skyMax - 18), span = Math.min(w * 0.68, 1100);
  const labels = [['NEON DISTRICT', 36, ly], ['NET ACCESS MONITORED', 36 + span * 0.28, ly], ['ICE  LVL 03', 36 + span * 0.66, ly], ['IMPLANT  ▸  NOMINAL', 36 + span * 0.84, ly]];
  return { traces, specks, buildings, flickers, lamps, labels, implant: { x: 36 + span * 0.84, y: ly }, matrix: { x: 36, y: Math.round(h * 0.36) - 12, skyTop: h - skyMax } };
}

/** A new matrix: a 5×5 grid of bytes, a sequence of three to find through it (first row, then that column, then that
 *  row) that the grid is made to hold, and a longer sequence that's only there to distract. */
function newBreach(now) {
  const byte = () => pick(CODE);
  const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, byte));
  const c0 = Math.floor(Math.random() * 5), r1 = 1 + Math.floor(Math.random() * 4), c2 = (c0 + 1 + Math.floor(Math.random() * 4)) % 5;
  const seq = [byte(), byte(), byte()];
  grid[0][c0] = seq[0]; grid[r1][c0] = seq[1]; grid[r1][c2] = seq[2];
  return { t0: now, grid, seq, decoy: [byte(), byte(), byte(), byte()], path: [[0, c0], [r1, c0], [r1, c2]] };
}

/** The matrix's panel at a stage, in one ink or (ink null) its own colours. */
function panel(b, stage, ink) {
  const [c, x] = layer(PANEL_W, PANEL_H);
  const accent = ink || s.colour, cyan = ink || CYAN, taken = b.path.slice(0, stage), done = stage >= 3;
  x.globalAlpha = 0.7; x.fillStyle = accent;
  label(x, 'ACCESS SEQUENCE', 0, 12);
  x.fillRect(0, 18, PANEL_W - 6, 1);
  x.font = MONO_FONT; x.textBaseline = 'middle'; x.textAlign = 'center'; x.lineWidth = 1;
  for (let i = 0; i < 6; i++) {   // the buffer
    x.globalAlpha = 0.55; x.strokeStyle = cyan; x.strokeRect(0.5 + i * 24, 27.5, 18, 18);
    if (i < taken.length) { x.globalAlpha = 0.85; x.fillStyle = accent; x.fillText(b.grid[taken[i][0]][taken[i][1]], 9 + i * 24, 37); }
  }
  const gy = 58;
  if (!done) {   // the row or column in play
    const [r, ci] = taken.length ? taken[taken.length - 1] : [0, -1], byRow = taken.length % 2 === 0;
    x.globalAlpha = ink ? 0.25 : 0.12; x.fillStyle = accent;
    if (byRow) x.fillRect(0, gy + r * ROW, 5 * CELL, ROW); else x.fillRect(ci * CELL, gy, CELL, 5 * ROW);
    x.globalAlpha = 0.55; x.strokeStyle = accent;
    if (byRow) x.strokeRect(0.5, gy + r * ROW + 0.5, 5 * CELL - 1, ROW - 1); else x.strokeRect(ci * CELL + 0.5, gy + 0.5, CELL - 1, 5 * ROW - 1);
  }
  for (let r = 0; r < 5; r++) for (let ci = 0; ci < 5; ci++) {
    const cx = ci * CELL + CELL / 2, cy = gy + r * ROW + ROW / 2;
    if (taken.some(([tr, tc]) => tr === r && tc === ci)) {   // a byte taken: a box in the accent, its text in the floor's colour
      if (ink) { x.globalAlpha = 0.8; x.strokeStyle = ink; x.strokeRect(ci * CELL + 2.5, gy + r * ROW + 2.5, CELL - 5, ROW - 5); }
      else { x.globalAlpha = 0.85; x.fillStyle = accent; x.fillRect(ci * CELL + 2, gy + r * ROW + 2, CELL - 4, ROW - 4); x.fillStyle = s.floorColour; x.fillText(b.grid[r][ci], cx, cy); }
      continue;
    }
    x.globalAlpha = 0.45; x.fillStyle = cyan; x.fillText(b.grid[r][ci], cx, cy);
  }
  const sx = 5 * CELL + 24;
  x.textAlign = 'left'; x.globalAlpha = 0.7; x.fillStyle = accent;
  label(x, 'SEQUENCE REQUIRED', sx, gy + 8);
  x.font = MONO_FONT; x.textBaseline = 'middle';
  x.globalAlpha = done ? 0.95 : 0.75; x.fillStyle = accent; x.fillText(b.seq.join('  '), sx, gy + 28);
  if (taken.length && !done) { x.globalAlpha = 0.9; x.fillRect(sx, gy + 36, taken.length * 22 - 4, 1.5); }   // how far along it is
  x.globalAlpha = 0.45; x.fillStyle = cyan; x.fillText(b.decoy.join('  '), sx, gy + 28 + ROW);
  if (done) { x.globalAlpha = 0.95; x.fillStyle = accent; label(x, 'ACCESS GRANTED', sx, gy + 88); x.fillRect(sx, gy + 94, 120, 1.5); }
  return c;
}

/** Moves the matrix along: the stage from how long it has run, a new one when the cycle ends, and its panel drawn again in
 *  its three inks when the stage changes. Still, it stands with the first byte taken. */
function advanceBreach(now, still) {
  if (!s.breach || (!still && now - s.breach.t0 >= CYCLE)) { s.breach = newBreach(now); s.stage = -1; }
  const e = still ? STAGES[1] : now - s.breach.t0;
  const stage = STAGES.filter((t) => e >= t).length - 1;
  if (stage === s.stage) return;
  s.stage = stage;
  s.panels = [null, RED, CYAN].map((ink) => panel(s.breach, stage, ink));
}

/** The screen itself, all of it that stands still, in its own colours or (for a glitch's fringes) in one ink. */
function screen(w, h, ink) {
  const [c, x] = layer(w, h);
  const accent = ink || s.colour, cyan = ink || CYAN;
  if (!ink) {   // the haze, from the bottom corners, behind the skyline
    for (const [cx, a] of [[0, 0.3], [w, 0.2]]) {
      const haze = x.createRadialGradient(cx, h, 0, cx, h, h * 0.55);
      haze.addColorStop(0, MAGENTA); haze.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalAlpha = a; x.fillStyle = haze; x.fillRect(0, 0, w, h);
    }
  }
  x.lineJoin = 'round'; x.lineCap = 'round';
  for (const b of s.buildings) {   // the skyline: black blocks against the haze, outlined faintly; in one ink, outlines alone
    const top = h - b.h;
    if (!ink) { x.globalAlpha = 1; x.fillStyle = '#07060a'; x.fillRect(b.x, top, b.w, b.h); }
    x.globalAlpha = ink ? 0.5 : 0.3; x.strokeStyle = cyan; x.lineWidth = 1;
    x.beginPath(); x.moveTo(b.x, h); x.lineTo(b.x, top); x.lineTo(b.x + b.w, top); x.lineTo(b.x + b.w, h); x.stroke();
    if (b.mast) { x.beginPath(); x.moveTo(b.x + b.w / 2, top); x.lineTo(b.x + b.w / 2, top - b.mast); x.stroke(); }
    x.globalAlpha = ink ? 0.6 : 0.8;
    for (const [wx, wy, colour] of b.windows) { x.fillStyle = ink || colour; x.fillRect(wx, wy, 2, 3); }
  }
  x.strokeStyle = x.fillStyle = cyan; x.lineWidth = 2;
  x.globalAlpha = 0.85;   // the traces, each ending in a pad: a ring or a dot
  for (const { points, pad } of s.traces) {
    x.beginPath(); points.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    const [ex, ey] = points[points.length - 1];
    x.beginPath(); x.arc(ex, ey, pad === 'ring' ? 5.5 : 3.5, 0, Math.PI * 2);
    if (pad === 'ring') x.stroke(); else x.fill();
  }
  x.globalAlpha = 0.75;   // the specks
  for (const [px, py, r] of s.specks) { x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); }
  x.globalAlpha = 0.65; x.fillStyle = accent;   // the readouts
  for (const [text, lx, ly] of s.labels) label(x, text, lx, ly);
  // The frame: chamfered corners, a notch in the top and bottom edges, hazard stripes along two stretches of it.
  const inset = 8, ch = 16, nx1 = w * 0.4, nx2 = w * 0.6;
  x.globalAlpha = 0.55; x.strokeStyle = accent; x.lineWidth = 1.5; x.lineJoin = 'miter';
  x.beginPath();
  x.moveTo(inset + ch, inset); x.lineTo(nx1, inset); x.lineTo(nx1 + 6, inset + 6); x.lineTo(nx1 + 126, inset + 6); x.lineTo(nx1 + 132, inset);
  x.lineTo(w - inset - ch, inset); x.lineTo(w - inset, inset + ch); x.lineTo(w - inset, h - inset - ch); x.lineTo(w - inset - ch, h - inset);
  x.lineTo(nx2 + 132, h - inset); x.lineTo(nx2 + 126, h - inset - 6); x.lineTo(nx2 + 6, h - inset - 6); x.lineTo(nx2, h - inset);
  x.lineTo(inset + ch, h - inset); x.lineTo(inset, h - inset - ch); x.lineTo(inset, inset + ch); x.closePath(); x.stroke();
  x.fillStyle = accent;
  for (const [sx, sy, sw] of [[inset + 24, h - inset - 8, 170], [w - inset - 24 - 170, inset + 1, 170]]) {   // the stripes
    x.save(); x.beginPath(); x.rect(sx, sy, sw, 7); x.clip();
    for (let px = sx - 8; px < sx + sw + 8; px += 12) { x.beginPath(); x.moveTo(px, sy + 7); x.lineTo(px + 7, sy); x.lineTo(px + 12, sy); x.lineTo(px + 5, sy + 7); x.closePath(); x.fill(); }
    x.restore();
  }
  x.globalAlpha = 0.14; x.fillStyle = '#000000';   // scan lines, the fine kind
  for (let py = 0; py < h; py += 3) x.fillRect(0, py, w, 1);
  return c;
}

/** The city's life, drawn each frame over the screen: flickering windows, blinking mast lamps, and now and then an
 *  aerial vehicle crossing above the roofline. Still, every window is lit and nothing flies. */
function city(ctx, now, still, shift) {
  for (const f of s.flickers) {
    if (!still && Math.sin(now / f.period * Math.PI * 2 + f.phase) < -0.35) continue;
    ctx.globalAlpha = 0.8; ctx.fillStyle = f.colour; ctx.fillRect(f.x + shift, f.y, 2, 3);
  }
  for (const l of s.lamps) {
    if (!still && (now + l.phase) % 2000 > 1700) continue;
    ctx.globalAlpha = 0.9; ctx.fillStyle = RED; ctx.fillRect(l.x + shift, l.y, 2, 2);
  }
  if (still) return;
  const m = s.matrix;
  if (!s.av && now >= s.avNext) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    s.av = { x: dir > 0 ? -20 : s.w + 20, y: m.skyTop - 40 - Math.random() * 80, dir, speed: 0.035 + Math.random() * 0.035, at: now };
  }
  const av = s.av;
  if (!av) return;
  av.x += av.dir * av.speed * (now - av.at); av.at = now;
  if (av.x < -30 || av.x > s.w + 30) { s.av = null; s.avNext = now + 25000 + Math.random() * 35000; return; }
  const beam = ctx.createLinearGradient(av.x - av.dir * 26, 0, av.x, 0);
  beam.addColorStop(0, 'rgba(0,0,0,0)'); beam.addColorStop(1, CYAN);
  ctx.globalAlpha = 0.3; ctx.fillStyle = beam; ctx.fillRect(Math.min(av.x, av.x - av.dir * 26) + shift, av.y, 26, 1);
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff'; ctx.fillRect(av.x + shift, av.y - 1, 2, 2);
  ctx.fillStyle = RED; ctx.fillRect(av.x - av.dir * 8 + shift, av.y - 1, 2, 2);
  if (Math.floor(now / 500) % 2 === 0) { ctx.fillStyle = CYAN; ctx.fillRect(av.x - av.dir * 4 + shift, av.y - 3, 1, 1); }   // a strobe
}

/** Lays the screen out again and draws it in its three inks: at the start, on a new size, and when the colours change. */
function rebuild(info) {
  s.w = info.width; s.h = info.height; s.dpr = info.dpr;
  s.colour = info.colors.accent || '#fcee0a';
  s.floorColour = info.colors.chrome || '#060608';
  Object.assign(s, board(s.w, s.h));
  s.inks = [null, RED, CYAN].map((ink) => screen(s.w, s.h, ink));
  s.stage = -1;   // the matrix panel is drawn again too
  s.slices = []; s.until = 0;
}

floor({
  fps: 20,
  layout(ctx, info) { rebuild(info); },
  draw(ctx, now, info) {
    if ((info.colors.accent || '#fcee0a') !== s.colour || (info.colors.chrome || '#060608') !== s.floorColour) rebuild(info);
    const { w, h, inks, dpr } = s, m = s.matrix, still = info.still;
    if (!s.started) { s.started = true; s.next = now + 1500; s.avNext = now + 8000 + Math.random() * 12000; }
    if (!still) {
      // A glitch every few seconds, lasting a moment; while it lasts, the jolt and the slices roll again every other
      // frame so it jitters, a third of the rolls jolting the whole screen.
      if (now >= s.next && now >= s.until) {
        s.until = now + 180 + Math.random() * 420;
        s.next = s.until + 1800 + Math.random() * 5000;
        s.rolled = 0;
      }
      if (now < s.until && now >= s.rolled) {
        s.rolled = now + 70;
        s.shift = Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 5) : 0;
        s.slices = Array.from({ length: 4 + Math.floor(Math.random() * 5) }, () => ({
          y: Math.random() * h, h: Math.random() < 0.2 ? 40 + Math.random() * 50 : 3 + Math.random() * 30,
          dx: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 52), f: 3 + Math.random() * 7,
          bar: { x: Math.random() * w, w: 60 + Math.random() * 400, ink: Math.random() < 0.5 ? RED : CYAN, block: Math.random() < 0.5 },
        }));
      }
    }
    const bursting = !still && now < s.until, shift = bursting ? s.shift : 0;
    ctx.globalAlpha = 1; ctx.fillStyle = s.floorColour; ctx.fillRect(0, 0, w, h);
    if (shift) { ctx.globalAlpha = 0.55; ctx.drawImage(inks[1], shift - 3, 0, w, h); ctx.drawImage(inks[2], shift + 3, 0, w, h); ctx.globalAlpha = 1; }
    ctx.drawImage(inks[0], shift, 0, w, h);
    advanceBreach(now, still);
    ctx.drawImage(s.panels[0], m.x + shift, m.y, PANEL_W, PANEL_H);
    city(ctx, now, still, shift);
    if (still) return;
    // The scan line, sweeping down with a soft trail above it.
    const y = s.sweep;
    const trail = ctx.createLinearGradient(0, y - 36, 0, y);
    trail.addColorStop(0, 'rgba(0,0,0,0)'); trail.addColorStop(1, s.colour);
    ctx.globalAlpha = 0.18; ctx.fillStyle = trail; ctx.fillRect(0, y - 36, w, 36);
    ctx.globalAlpha = 0.6; ctx.fillStyle = s.colour; ctx.fillRect(0, y, w, 1.5);
    s.sweep = y > h + 40 ? -40 : y + 1.6;
    if (!bursting) return;
    // While it lasts, the implant readout fails…
    const imp = s.implant;
    ctx.globalAlpha = 1; ctx.fillStyle = s.floorColour; ctx.fillRect(imp.x - 2 + shift, imp.y - 11, 150, 14);
    ctx.globalAlpha = 0.9; ctx.fillStyle = RED; label(ctx, 'IMPLANT  ▸  MALFUNCTION', imp.x + shift, imp.y);
    // …and slices of the screen are thrown sideways, their red and cyan fringes pulled apart, with a bar of solid colour
    // or a block of it over each. The matrix's panel goes with its slice.
    const slice = (src, sy, sh, dx) => ctx.drawImage(src, 0, sy * dpr, w * dpr, sh * dpr, dx, sy, w, sh);
    const panelSlice = (src, sy, sh, dx) => {
      const top = Math.max(sy, m.y), bottom = Math.min(sy + sh, m.y + PANEL_H);
      if (bottom > top) ctx.drawImage(src, 0, (top - m.y) * dpr, PANEL_W * dpr, (bottom - top) * dpr, m.x + dx, top, PANEL_W, bottom - top);
    };
    for (const sl of s.slices) {
      const sy = Math.round(sl.y), sh = Math.ceil(sl.h);
      ctx.globalAlpha = 1; ctx.fillStyle = s.floorColour; ctx.fillRect(0, sy, w, sh);
      ctx.globalAlpha = 0.9;
      slice(inks[1], sy, sh, sl.dx - sl.f); panelSlice(s.panels[1], sy, sh, sl.dx - sl.f);
      slice(inks[2], sy, sh, sl.dx + sl.f); panelSlice(s.panels[2], sy, sh, sl.dx + sl.f);
      ctx.globalAlpha = 1;
      slice(inks[0], sy, sh, sl.dx); panelSlice(s.panels[0], sy, sh, sl.dx);
      ctx.fillStyle = sl.bar.ink;
      if (sl.bar.block) { ctx.globalAlpha = 0.25; ctx.fillRect(sl.bar.x, sy, sl.bar.w, sh); }
      ctx.globalAlpha = 0.8; ctx.fillRect(sl.bar.x, sy + sh / 2, sl.bar.w, 2.5); ctx.globalAlpha = 1;
    }
  },
});
