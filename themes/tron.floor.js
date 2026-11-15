// Tron's floor: the Grid, with a light cycle running its lines. The floor is ruled in faint lines of the accent colour
// every 32 pixels, with a glow rising from the horizon at the bottom; that part stands still and is painted once, into a
// picture that is put down again each frame. Over it one light cycle rides the lines of the Grid: it keeps to them, turns
// at their crossings and never leaves the window, and a ribbon of light follows it and fades. It rides a little faster
// while sessions are working. With reduce motion on, the cycle stands at the bottom left with a short ribbon behind it.

const PITCH = 32;            // the Grid's lines, in pixels
const FPS = 30;
const SPEED = 150;           // pixels per second on an idle Grid
const RIBBON_MS = 2600;      // how long the ribbon behind the cycle lasts
const TURN = 0.22;           // how often the cycle turns at a crossing it could go straight through
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];   // 0 right, 1 down, 2 left, 3 up

let grid = null, gridKey = '';   // the still Grid, painted once per size and colours
let cycle = null, lastNow = 0;

/** The still Grid: the floor's colour, the glow at the horizon and the lines, a pixel wide. */
function paintGrid(ctx, w, h, accent, chrome) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = chrome;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h);
  ctx.scale(1.2 * w / (0.4 * h), 1);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.4 * h);
  glow.addColorStop(0, accent);
  glow.addColorStop(0.7, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = glow;
  ctx.fillRect(-0.4 * h, -0.4 * h, 0.8 * h, 0.8 * h);
  ctx.restore();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = accent;
  for (let x = 0; x < w; x += PITCH) ctx.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += PITCH) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;
}

/** Puts the Grid down: from the cached picture when the worker can hold one, else painted afresh. */
function putGrid(ctx, info, accent, chrome) {
  const { width: w, height: h, dpr } = info;
  const key = [w, h, dpr, accent, chrome].join('|');
  if (typeof OffscreenCanvas !== 'function') { paintGrid(ctx, w, h, accent, chrome); return; }
  if (key !== gridKey) {
    gridKey = key;
    grid = new OffscreenCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)));
    const g = grid.getContext('2d');
    g.scale(dpr, dpr);
    paintGrid(g, w, h, accent, chrome);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(grid, 0, 0, w, h);
}

/** The crossings the cycle may ride between: one line in from every edge of the window. */
function bounds(info) {
  return { minI: 1, maxI: Math.max(2, Math.floor((info.width - 1) / PITCH) - 1), minJ: 1, maxJ: Math.max(2, Math.floor((info.height - 1) / PITCH) - 1) };
}

/** A new cycle at the bottom left of the Grid, heading right, with no ribbon yet. */
function spawn(info) {
  const b = bounds(info);
  cycle = { i: b.minI, j: b.maxJ, x: b.minI * PITCH, y: b.maxJ * PITCH, dir: 0, ribbon: [] };
  cycle.ribbon.push({ x: cycle.x, y: cycle.y, t: 0 });
}

/** The way out of crossing (i, j): straight on if it can and feels like it, else left or right, never back. */
function chooseDir(dir, i, j, b) {
  const fits = (d) => { const ni = i + DX[d], nj = j + DY[d]; return ni >= b.minI && ni <= b.maxI && nj >= b.minJ && nj <= b.maxJ; };
  const left = (dir + 3) % 4, right = (dir + 1) % 4;
  const turns = [left, right].filter(fits);
  if (fits(dir) && (turns.length === 0 || Math.random() > TURN)) return dir;
  if (turns.length) return turns[Math.floor(Math.random() * turns.length)];
  return fits(dir) ? dir : (dir + 2) % 4;
}

/** Moves the cycle `dist` pixels along the lines, crossing by crossing, recording the ribbon at each crossing. */
function advance(info, dist, now) {
  const b = bounds(info);
  const c = cycle;
  while (dist > 0) {
    const tx = (c.i + DX[c.dir]) * PITCH, ty = (c.j + DY[c.dir]) * PITCH;
    const left = Math.abs(tx - c.x) + Math.abs(ty - c.y);
    if (dist < left) { c.x += DX[c.dir] * dist; c.y += DY[c.dir] * dist; return; }
    dist -= left;
    c.i += DX[c.dir]; c.j += DY[c.dir]; c.x = c.i * PITCH; c.y = c.j * PITCH;
    c.ribbon.push({ x: c.x, y: c.y, t: now });
    c.dir = chooseDir(c.dir, c.i, c.j, b);
  }
}

/** The ribbon: the lines the cycle rode, newest brightest, gone after RIBBON_MS. */
function drawRibbon(ctx, now, accent) {
  const r = cycle.ribbon;
  while (r.length > 1 && now - r[1].t > RIBBON_MS) r.shift();
  if (r.length && now - r[0].t > RIBBON_MS) r[0].t = now - RIBBON_MS;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segment = (k) => {
    const a = r[k], z = k + 1 < r.length ? r[k + 1] : { x: cycle.x, y: cycle.y, t: now };
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(z.x, z.y); ctx.stroke();
    return Math.max(0, Math.min(1, (now - a.t) / RIBBON_MS));   // the segment's age, 0 new to 1 gone
  };
  // The ribbon in the accent, glowing, thinner and fainter as it ages...
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  for (let k = 0; k < r.length; k++) {
    const age = Math.max(0, Math.min(1, (now - r[k].t) / RIBBON_MS));
    ctx.globalAlpha = 1 - age;
    ctx.lineWidth = 3.4 - 1.8 * age;
    segment(k);
  }
  // ...with a white-hot core along its newest part.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let k = 0; k < r.length; k++) {
    const age = Math.max(0, Math.min(1, (now - r[k].t) / RIBBON_MS));
    if (age > 0.4) continue;
    ctx.globalAlpha = 0.7 * (1 - age / 0.4);
    segment(k);
  }
  ctx.globalAlpha = 1;
}

// The cycle seen from above, nose first, in a 32 by 32 box: a slim body with light lines fore and aft, a cockpit and a hub.
const BODY = new Path2D('M16 1c-2.8 0-4.8 2.6-4.8 6v4.5l1.6 2.6v3.8l-1.6 2.6v4.5c0 3.4 2 6 4.8 6s4.8-2.6 4.8-6v-4.5l-1.6-2.6v-3.8l1.6-2.6V7c0-3.4-2-6-4.8-6Z');
const LIGHTS = new Path2D('M16 3.6v6.4m0 12v6.4');
const COCKPIT = new Path2D('M16 11.7c1.2 0 2 1 2 2.4v3.6c0 1.5-.8 2.5-2 2.5s-2-1-2-2.5v-3.6c0-1.4.8-2.4 2-2.4Z');
const HUB = new Path2D('M16 12.7a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7Z');

/**
 * The cycle itself, seen from above and turned the way it rides, its middle on the line: the body in the floor's colour,
 * tinted and edged in the accent with a glow, so the Grid doesn't show through it; the light lines with a white core;
 * the cockpit in the accent and a white hub. About 36 pixels nose to tail.
 */
function drawCycle(ctx, accent, chrome) {
  ctx.save();
  ctx.translate(cycle.x, cycle.y);
  ctx.rotate((cycle.dir + 1) * Math.PI / 2);   // the picture's nose is up; heading right is a quarter turn
  ctx.scale(1.125, 1.125);
  ctx.translate(-16, -16);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = chrome; ctx.strokeStyle = chrome; ctx.lineWidth = 3; ctx.fill(BODY); ctx.stroke(BODY);
  ctx.globalAlpha = 0.16; ctx.fillStyle = accent; ctx.fill(BODY); ctx.globalAlpha = 1;
  ctx.shadowColor = accent; ctx.shadowBlur = 12; ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5; ctx.stroke(BODY);
  ctx.lineWidth = 2; ctx.stroke(LIGHTS);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.stroke(LIGHTS);
  ctx.globalAlpha = 0.5; ctx.fillStyle = accent; ctx.fill(COCKPIT);
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff'; ctx.fill(HUB);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** With reduce motion on: the cycle at rest a few crossings in from the bottom left, a short ribbon behind it. */
function drawStill(ctx, info, accent, chrome) {
  spawn(info);
  const b = bounds(info);
  cycle.ribbon = [{ x: b.minI * PITCH, y: b.maxJ * PITCH, t: -RIBBON_MS * 0.75 }];
  cycle.i = b.minI + 3; cycle.x = cycle.i * PITCH;
  drawRibbon(ctx, 0, accent);
  drawCycle(ctx, accent, chrome);
}

floor({
  fps: FPS,
  layout(ctx, info) { gridKey = ''; spawn(info); lastNow = 0; },
  draw(ctx, now, info) {
    const accent = info.colors.accent || '#00e5ff', chrome = info.colors.chrome || '#05080c';
    putGrid(ctx, info, accent, chrome);
    if (info.still) { drawStill(ctx, info, accent, chrome); return; }
    if (!cycle) spawn(info);
    const dt = lastNow ? Math.min(120, now - lastNow) : 0;   // a long gap (the window was hidden) is not a long ride
    lastNow = now;
    const working = info.sessions ? Math.min(3, info.sessions.working || 0) : 0;
    advance(info, (SPEED + 35 * working) * dt / 1000, now);
    drawRibbon(ctx, now, accent);
    drawCycle(ctx, accent, chrome);
  },
});
