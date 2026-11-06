// Steampunk Pirate's floor: the chart table in an airship captain's cabin. A riveted brass frame round the window, pipework with flanges
// and a hand-wheel, a sea chart in the accent's ink on dark walnut (rhumb lines from a compass rose, a coast with hatching,
// an island, soundings, the rings a mug left), a course plotted leg by leg to an X and then a new one, a train of brass
// gears meshing in the top corner and a pair at the bottom driving a piston, an instrument plate with a steam gauge whose
// needle stands at how many sessions are working, a crew gauge at how many there are, and a ship's clock keeping real time,
// a puff of steam from a valve now and then, a lamp's glow breathing, an airship drifting across the chart once in a while,
// and a pennant with the skull and crossbones. A telegraph taps out how the crew is doing. With reduce motion on, the
// table stands still: the course plotted, the gears at rest, no steam, nothing aloft.
const cabin = {
  screen: null, dpr: 1, w: 0, h: 0, started: false,
  colour: '#d4aa4f', floor: '#1a120c', ink: '#b89c6e', ok: '#4fa38a', danger: '#b8322a', copper: '#d2763a', paper: '#efe2c4', working: '#e0a93a', asking: '#a05a9c',
  coast: [], island: [], soundings: [], stains: [], pipes: [], wheel: null, rose: null, gears: [], piston: null, plate: null, gauges: [], clock: null, lamp: null, valve: null,
  governor: null, sprocket: null, lamps: null, serpent: null, dividers: null, glass: null, bell: null, helm: null, smokeAt: 0,
  lantern: null, pennant: null, goggles: null, bottle: null, boiler: null, tesla: null, arcUntil: 0, arcNext: 0, stackAt: 0,
  whistle: null, whistleAt: 0, whistleUntil: 0, jet: null, jetAt: 0, jetUntil: 0, leaks: [], leakAt: 0, haze: [],
  escapement: null, telegraph: null, tape: null, counter: null, leagues: 0, leaguesAt: 0, drip: null, dripAt: 0,
  ladder: null, parrot: null, turbine: null, cannon: null, chest: null,
  course: null, steam: [], puffAt: 0, airship: null, airshipAt: 0, stroke: 0,
};
const CABIN_MS = 60, CABIN_BAND = 14, CABIN_PITCH = 3.5;   // the frame's width; a gear's radius per tooth, so gears mesh
const CABIN_FONT = 'italic 10px Constantia, "Palatino Linotype", Georgia, serif', CABIN_LABEL = '600 9px Constantia, "Palatino Linotype", Georgia, serif';
const COURSE_LEG_MS = 5000, COURSE_REST_MS = 7000;

/** A gear meshing with another: its centre a tooth-pitch radius away in the given direction, turning the other way at the rate the teeth give, its teeth phased to fall into the other's gaps. */
function meshGear(prev, teeth, angle) {
  const r = teeth * CABIN_PITCH, d = prev.r + r;
  return { x: prev.x + Math.cos(angle) * d, y: prev.y + Math.sin(angle) * d, r, teeth, speed: -prev.speed * prev.teeth / teeth, phase: angle + Math.PI - Math.PI / teeth + (prev.teeth / teeth) * (angle - prev.phase) };
}

/** Where everything sits for a window this size: the chart's coast, island, soundings and stains, the rose, the pipes, the gear train and the pair with the piston, the instrument plate, the lamp, the valve. */
function cabinLayout(w, hgt) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  // The coast: from the left edge, a little below the middle, wandering down to the bottom edge past the centre; land lies below and left of it.
  const coast = [[-10, hgt * 0.5]];
  for (let x = 0, y = hgt * 0.5; x < w * 0.48; ) {
    x += rnd(14, 40); y += rnd(-10, 26) + (hgt - y) * 0.03;
    coast.push([x, Math.min(hgt + 10, y)]);
    if (y >= hgt + 10) break;
  }
  if (coast[coast.length - 1][1] < hgt + 10) coast.push([coast[coast.length - 1][0] + 20, hgt + 10]);
  // An island, a blob of a dozen points, in open sea.
  const ix = w * rnd(0.56, 0.64), iy = hgt * rnd(0.22, 0.34), island = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = rnd(22, 46); island.push([ix + Math.cos(a) * r * 1.4, iy + Math.sin(a) * r]); }
  // Soundings, in the sea only.
  const sea = (x, y) => y < coastY(coast, x) - 14 && Math.hypot((x - ix) / 1.4, y - iy) > 60;
  const soundings = [];
  for (let i = 0; i < 400 && soundings.length < Math.round((w * hgt) / 9000); i++) {
    const x = rnd(30, w - 30), y = rnd(60, hgt - 30);
    if (sea(x, y)) soundings.push([x, y, String(Math.floor(rnd(3, 48)))]);
  }
  const stains = Array.from({ length: 3 }, () => [rnd(w * 0.2, w * 0.9), rnd(hgt * 0.15, hgt * 0.8), rnd(26, 44)]);   // the rings a mug left
  const rose = { x: w * 0.62, y: hgt * 0.6, r: Math.min(w, hgt) * 0.11 };
  // Gears: a train of three in the top-right corner, and a pair at the bottom whose big wheel drives the piston.
  const top = { x: w - 76, y: 84, r: 16 * CABIN_PITCH, teeth: 16, speed: 0.00022, phase: 0 };
  const top2 = meshGear(top, 8, Math.PI * 0.85), top3 = meshGear(top2, 12, Math.PI * 1.15);
  const big = { x: w * 0.52, y: hgt - 72, r: 12 * CABIN_PITCH, teeth: 12, speed: -0.0003, phase: 0 };
  const small = meshGear(big, 7, Math.PI * 1.2);
  const gears = [top, top2, top3, big, small];
  // The piston: a crank pin on the big wheel, a rod, a piston in a cylinder to its right on the same line.
  const piston = { gear: big, crank: big.r * 0.55, rod: 92, cyl: { x: big.x + big.r + 34, y: big.y, len: 86, bore: 22 } };
  // The instrument plate on the land at the bottom left, clear of the terminals' text: the steam and crew gauges and the clock.
  const plate = { x: 36, y: hgt - 194, w: 408, h: 172 };
  const gauges = [
    { x: plate.x + 76, y: plate.y + 74, r: 46, label: 'STEAM', needle: 0, target: 0, of: (counts) => counts.working },
    { x: plate.x + 194, y: plate.y + 74, r: 46, label: 'CREW', needle: 0, target: 0, of: (counts) => counts.total },
  ];
  const clock = { x: plate.x + 318, y: plate.y + 74, r: 46 };
  const lamps = { x: plate.x + 44, y: plate.y + 148, gap: 46 };   // one lamp per session, lit in its status's colour
  // The governor stands on the bottom pipe beyond the valve; the chain runs from the big wheel to a sprocket beside it.
  const governor = { x: plate.x + plate.w + 86, y: hgt - 34, h: 62, spin: 0 };
  const sprocket = { x: plate.x + plate.w + 160, y: hgt - 72, r: 13 };
  // Props on the chart: a sea serpent in open water, dividers and a reading glass lying where the navigator left them; the bell on the left pipe.
  const serpent = { x: w * 0.3, y: hgt * 0.3 };
  const dividers = { x: w * 0.46, y: hgt * 0.17, len: 64, spread: 0.36 };
  const glass = { x: w * 0.44, y: hgt * 0.6, r: 26 };   // in open water left of the rose, clear of the side panel
  const bell = { x: 26, y: hgt * 0.28 };
  const helm = { x: 122, y: hgt - 286, r: 34, angle: 0 };   // the ship's wheel, above the plate on the land
  const lantern = { x: w * 0.42, chain: 118 };   // hangs from the top band; the glow follows its flame
  const pennant = { x: 40, y: hgt * 0.21 - 10 };   // flies from a bracket on the left pipe, below the title bar
  const goggles = { x: w * 0.3, y: hgt * 0.47 };
  const bottle = { x: w * 0.5, y: hgt * 0.42 };
  // The boiler beyond the cylinder: a riveted drum with a firebox, a sight glass and a stack; and a Tesla coil on the land above the plate.
  const boiler = { x: piston.cyl.x + piston.cyl.len + 44, y: hgt - 126, w: 112, h: 82 };
  const tesla = { x: 330, y: hgt - 236, h: 64, rod: { x: 410, y: hgt - 262 } };
  const whistle = { x: boiler.x + boiler.w - 30, y: boiler.y - 22 };   // on top of the drum
  const escapement = { x: 236, y: hgt - 300 };   // the balance wheel and its escapement, between the helm and the coil
  const telegraph = { x: w * 0.17, y: hgt * 0.33, run: 190 };   // the sounder, with its tape running out to the right
  const counter = { x: plate.x + plate.w - 118, y: plate.y - 30, digits: 5 };   // the leagues run, above the plate's right end
  const drip = { x: 26, y: hgt * 0.5 + 6, floor: hgt - CABIN_BAND - 2 };   // where the left pipe's flange weeps oil
  const ladder = { x: w * 0.12, y: hgt * 0.56, h: 70 };   // the Jacob's ladder, on the land above the helm
  const turbine = { x: boiler.x + 56, y: boiler.y - 7, r: 7, spin: 0 };   // a spinning vent on the boiler's top
  // On the island: a cannon that fires out to sea now and then, and a chest the crew buried badly.
  const cannon = { x: ix - 10, y: iy + 4, dir: -1, at: 0, fired: -1e9 };
  const chest = { x: ix + 22, y: iy + 10 };
  const jet = { x: boiler.x + boiler.w + 6, y: boiler.y + 50 };   // the safety valve's nozzle, out of the drum's end
  const haze = Array.from({ length: 7 }, () => ({ x: rnd(0, w), y: rnd(hgt * 0.5, hgt * 0.92), r: rnd(60, 130), v: rnd(0.006, 0.016), a: rnd(0.035, 0.07) }));
  // Pipework: up the left side from the plate to the top band and along it to the gear train, with flanges and a hand-wheel; and along the bottom from the plate to the cylinder.
  const pipes = [
    { points: [[26, plate.y], [26, CABIN_BAND + 22], [38, CABIN_BAND + 10], [top3.x - top3.r - 10, CABIN_BAND + 10]], width: 7, flanges: [[26, plate.y - 60], [26, hgt * 0.5], [26, hgt * 0.25], [w * 0.2, CABIN_BAND + 10], [w * 0.45, CABIN_BAND + 10], [w * 0.7, CABIN_BAND + 10]] },
    { points: [[plate.x + plate.w, hgt - 34], [piston.cyl.x + piston.cyl.len + 8, hgt - 34], [piston.cyl.x + piston.cyl.len + 8, piston.cyl.y + 8]], width: 6, flanges: [[plate.x + plate.w + 56, hgt - 34], [plate.x + plate.w + 124, hgt - 34], [(plate.x + plate.w + 200 + piston.cyl.x) / 2, hgt - 34]] },
  ];
  const wheel = { x: 26, y: hgt * 0.4, r: 11 };   // on the left pipe, its stem out to the right
  Object.assign(cabin, { coast, island, soundings, stains, rose, gears, piston, plate, gauges, clock, pipes, wheel, lamps, governor, sprocket, serpent, dividers, glass, bell, helm, lantern, pennant, goggles, bottle, boiler, tesla, whistle, jet, haze, escapement, telegraph, counter, drip, ladder, turbine, cannon, chest, tape: null, leaks: [[26, plate.y - 60], [w * 0.45, CABIN_BAND + 10]], lamp: { x: w * 0.42, y: 10 }, valve: { x: plate.x + plate.w + 26, y: hgt - CABIN_BAND - 2 }, course: null, steam: [], airship: null });
}

/** The coast's height at x: land lies below it. Past the coast's end there is only sea. */
function coastY(coast, x) {
  for (let i = 1; i < coast.length; i++) {
    const [x0, y0] = coast[i - 1], [x1, y1] = coast[i];
    if (x <= x1) return x <= x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return Infinity;
}

/** A new course: from a port on the coast, six to eight legs out to sea, to an X. */
function newCourse(now, w, hgt) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const coast = cabin.coast, p = coast[Math.floor(rnd(1, coast.length - 2))];
  const points = [[p[0] + 8, p[1] - 10]];
  const legs = 6 + Math.floor(Math.random() * 3);
  const goal = [rnd(w * 0.55, w - 80), rnd(80, hgt * 0.5)];
  for (let i = 1; i < legs; i++) {
    const t = i / legs, [lx, ly] = points[i - 1];
    points.push([lx + (goal[0] - lx) * (1 / (legs - i + 1)) + rnd(-50, 50), Math.max(60, ly + (goal[1] - ly) * (1 / (legs - i + 1)) + rnd(-50, 50) * (1 - t))]);
  }
  points.push(goal);
  return { points, t0: now };
}

/** A brass pipe along a polyline, with its flanges (a collar across the pipe) where asked. */
function cabinPipe(x, pipe) {
  const brass = cabin.colour;
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.globalAlpha = 0.9; x.strokeStyle = '#0a0604'; x.lineWidth = pipe.width + 3;
  x.beginPath(); pipe.points.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
  x.globalAlpha = 0.6; x.strokeStyle = brass; x.lineWidth = pipe.width;
  x.stroke();
  x.globalAlpha = 0.35; x.strokeStyle = cabin.paper; x.lineWidth = 1.5;   // a highlight down the pipe
  x.beginPath(); pipe.points.forEach(([px, py], i) => (i ? x.lineTo(px - 1.5, py - 1.5) : x.moveTo(px - 1.5, py - 1.5))); x.stroke();
  for (const [fx, fy] of pipe.flanges) {   // flanges: find the pipe's direction there and draw a collar across it
    let seg = null;
    for (let i = 1; i < pipe.points.length && !seg; i++) {
      const [ax, ay] = pipe.points[i - 1], [bx, by] = pipe.points[i];
      if (Math.min(ax, bx) - 1 <= fx && fx <= Math.max(ax, bx) + 1 && Math.min(ay, by) - 1 <= fy && fy <= Math.max(ay, by) + 1) seg = [bx - ax, by - ay];
    }
    if (!seg) continue;
    const len = Math.hypot(...seg) || 1, nx = -seg[1] / len, ny = seg[0] / len, half = pipe.width / 2 + 3;
    x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 5;
    x.beginPath(); x.moveTo(fx + nx * half, fy + ny * half); x.lineTo(fx - nx * half, fy - ny * half); x.stroke();
    x.globalAlpha = 0.9; x.fillStyle = '#0a0604';
    for (const s of [-1, 1]) { x.beginPath(); x.arc(fx + nx * (half - 1) * s, fy + ny * (half - 1) * s, 1.2, 0, Math.PI * 2); x.fill(); }
  }
}

/** What stands still on the table: the walnut's grain, the chart (grid, rhumb lines, stains, coast, island, soundings, rose), the pipework, the frame with its rivets, the instrument plate, the pennant. */
function cabinScreen(w, hgt, dpr) {
  const c = new OffscreenCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(hgt * dpr)));
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const brass = cabin.colour, ink = cabin.ink;
  // The walnut's grain: long slow waves, barely there.
  x.strokeStyle = '#000000'; x.lineWidth = 1; x.globalAlpha = 0.12;
  for (let gy = 6; gy < hgt; gy += 9) {
    x.beginPath();
    for (let gx = 0; gx <= w; gx += 24) x.lineTo(gx, gy + Math.sin(gx / 140 + gy / 37) * 3 + Math.sin(gx / 53) * 1.5);
    x.stroke();
  }
  // The chart's grid and the rhumb lines from the rose.
  const { rose } = cabin;
  x.strokeStyle = brass; x.globalAlpha = 0.08;
  for (let gx = 60; gx < w; gx += 120) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, hgt); x.stroke(); }
  for (let gy = 60; gy < hgt; gy += 120) { x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke(); }
  const far = w + hgt;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    x.globalAlpha = i % 4 === 0 ? 0.2 : i % 2 === 0 ? 0.12 : 0.07;
    x.beginPath(); x.moveTo(rose.x, rose.y); x.lineTo(rose.x + Math.cos(a) * far, rose.y + Math.sin(a) * far); x.stroke();
  }
  // The rings a mug left on the chart.
  x.strokeStyle = cabin.copper;
  for (const [sx, sy, sr] of cabin.stains) {
    for (const [k, a] of [[1, 0.1], [0.93, 0.05], [1.06, 0.04]]) { x.globalAlpha = a; x.lineWidth = k === 1 ? 2.5 : 1; x.beginPath(); x.arc(sx, sy, sr * k, 0.1, Math.PI * 1.9); x.stroke(); }
  }
  // The coast: land darker, hatched along the shore, the shore line itself in brass.
  const land = [...cabin.coast, [-10, hgt + 10]];
  x.globalAlpha = 0.55; x.fillStyle = '#0a0604';
  x.beginPath(); land.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill();
  x.strokeStyle = ink; x.lineWidth = 1;
  for (let i = 1; i < cabin.coast.length; i++) {
    const [x0, y0] = cabin.coast[i - 1], [x1, y1] = cabin.coast[i], len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let d = 0; d < len; d += 7) {
      const px = x0 + (x1 - x0) * d / len, py = y0 + (y1 - y0) * d / len;
      for (const k of [1, 2, 3]) { x.globalAlpha = 0.3 / k; x.beginPath(); x.moveTo(px - nx * (4 + k * 7), py - ny * (4 + k * 7)); x.lineTo(px - nx * (8 + k * 7), py - ny * (8 + k * 7)); x.stroke(); }
    }
  }
  x.globalAlpha = 0.6; x.strokeStyle = brass; x.lineWidth = 1.5;
  x.beginPath(); cabin.coast.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
  // The island, the same way.
  x.globalAlpha = 0.55; x.fillStyle = '#0a0604';
  x.beginPath(); cabin.island.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill();
  x.globalAlpha = 0.6; x.strokeStyle = brass; x.lineWidth = 1.5; x.stroke();
  x.globalAlpha = 0.25; x.strokeStyle = ink; x.lineWidth = 1;
  const icx = cabin.island.reduce((s, p) => s + p[0], 0) / cabin.island.length, icy = cabin.island.reduce((s, p) => s + p[1], 0) / cabin.island.length;
  for (const [px, py] of cabin.island) {
    const dx = icx - px, dy = icy - py, len = Math.hypot(dx, dy) || 1;
    x.beginPath(); x.moveTo(px + dx / len * 4, py + dy / len * 4); x.lineTo(px + dx / len * 12, py + dy / len * 12); x.stroke();
  }
  // Soundings.
  x.globalAlpha = 0.35; x.fillStyle = ink; x.font = CABIN_FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const [sx, sy, n] of cabin.soundings) x.fillText(n, sx, sy);
  // The compass rose: a sixteen-point star, the four cardinal points longer, N marked.
  x.save(); x.translate(rose.x, rose.y);
  x.globalAlpha = 0.5; x.strokeStyle = brass; x.lineWidth = 1;
  x.beginPath(); x.arc(0, 0, rose.r, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(0, 0, rose.r * 0.82, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2, len = i % 4 === 0 ? rose.r * 0.95 : i % 2 === 0 ? rose.r * 0.7 : rose.r * 0.45, half = rose.r * 0.06;
    x.beginPath(); x.moveTo(Math.cos(a) * len, Math.sin(a) * len);
    x.lineTo(Math.cos(a + Math.PI / 2) * half, Math.sin(a + Math.PI / 2) * half); x.lineTo(0, 0); x.lineTo(Math.cos(a - Math.PI / 2) * half, Math.sin(a - Math.PI / 2) * half); x.closePath();
    x.globalAlpha = i % 2 === 0 ? 0.55 : 0.3; x.fillStyle = i % 4 === 0 ? brass : ink; x.fill();
  }
  x.globalAlpha = 0.75; x.fillStyle = brass; x.font = '700 ' + Math.round(rose.r * 0.22) + 'px Constantia, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('N', 0, -rose.r * 1.12);
  // A brass porthole ring round the rose, with its bolts.
  x.globalAlpha = 0.55; x.strokeStyle = brass; x.lineWidth = 7; x.beginPath(); x.arc(0, 0, rose.r * 1.3, 0, Math.PI * 2); x.stroke();
  x.globalAlpha = 0.35; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, rose.r * 1.3 + 5, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, rose.r * 1.3 - 5, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; x.globalAlpha = 0.8; x.fillStyle = brass; x.beginPath(); x.arc(Math.cos(a) * rose.r * 1.3, Math.sin(a) * rose.r * 1.3, 3, 0, Math.PI * 2); x.fill(); x.globalAlpha = 0.6; x.fillStyle = '#000000'; x.beginPath(); x.arc(Math.cos(a) * rose.r * 1.3 + 0.8, Math.sin(a) * rose.r * 1.3 + 0.8, 1.3, 0, Math.PI * 2); x.fill(); }
  x.restore();
  // The old warning under where the serpent swims (the serpent itself moves, so the frame draws it).
  const sp = cabin.serpent;
  x.globalAlpha = 0.45; x.fillStyle = ink; x.font = CABIN_FONT; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText('here be monsters', sp.x, sp.y + 26);
  // The escapement's cock: a brass bracket the balance wheel hangs from, and the escape wheel's arbor plate.
  const es = cabin.escapement;
  x.globalAlpha = 0.8; x.strokeStyle = brass; x.lineWidth = 3; x.lineCap = 'round';
  x.beginPath(); x.moveTo(es.x - 30, es.y - 34); x.lineTo(es.x + 30, es.y - 34); x.lineTo(es.x, es.y - 34); x.lineTo(es.x, es.y - 26); x.stroke();
  x.beginPath(); x.moveTo(es.x - 30, es.y - 34); x.lineTo(es.x - 30, es.y + 70); x.moveTo(es.x + 30, es.y - 34); x.lineTo(es.x + 30, es.y + 70); x.stroke();   // the pillars
  x.beginPath(); x.moveTo(es.x - 34, es.y + 70); x.lineTo(es.x + 34, es.y + 70); x.stroke();   // the foot
  // The telegraph: a brass base with the sounder's magnets, the stylus arm's pivot, and the slot the tape runs out of.
  const tg = cabin.telegraph;
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2; x.lineJoin = 'round';
  x.beginPath(); x.roundRect(tg.x - 30, tg.y - 10, 60, 20, 3); x.fill(); x.stroke();
  x.fillStyle = cabin.copper; x.globalAlpha = 0.8; x.fillRect(tg.x - 22, tg.y - 6, 9, 12); x.fillRect(tg.x - 10, tg.y - 6, 9, 12);   // the coils
  x.globalAlpha = 0.9; x.fillStyle = brass; x.beginPath(); x.arc(tg.x + 14, tg.y - 10, 3, 0, Math.PI * 2); x.fill();   // the pivot
  x.fillRect(tg.x + 26, tg.y - 4, 6, 8);   // the slot
  x.globalAlpha = 0.5; x.fillStyle = ink; x.font = CABIN_LABEL; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.letterSpacing = '1px'; x.fillText('TELEGRAPH', tg.x, tg.y + 22); x.letterSpacing = '0px';
  // The counter's housing: a brass frame with a window for its drums.
  const ct = cabin.counter;
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2;
  x.beginPath(); x.roundRect(ct.x - 4, ct.y - 4, ct.digits * 14 + 8, 26, 3); x.fill(); x.stroke();
  x.globalAlpha = 0.5; x.fillStyle = ink; x.font = CABIN_LABEL; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('LEAGUES', ct.x + ct.digits * 14 + 10, ct.y + 9);
  // The Jacob's ladder: a base box and two rods leaning apart; the arc climbs them by the frame.
  const ld = cabin.ladder;
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2;
  x.beginPath(); x.roundRect(ld.x - 16, ld.y - 4, 32, 12, 3); x.fill(); x.stroke();
  x.lineWidth = 2.5; x.lineCap = 'round';
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(ld.x + s * 3, ld.y - 4); x.lineTo(ld.x + s * 14, ld.y - 4 - ld.h); x.stroke(); x.fillStyle = brass; x.beginPath(); x.arc(ld.x + s * 14, ld.y - 4 - ld.h, 2.5, 0, Math.PI * 2); x.fill(); }
  x.globalAlpha = 0.6; x.strokeStyle = cabin.copper; x.lineWidth = 1; x.beginPath(); x.moveTo(ld.x - 16, ld.y + 2); x.lineTo(ld.x - 40, ld.y + 2); x.lineTo(ld.x - 40, ld.y + 14); x.stroke();   // its lead
  // The cannon's carriage on the island, and the chest.
  const cn = cabin.cannon;
  x.globalAlpha = 0.9; x.fillStyle = '#2a1a0a'; x.strokeStyle = brass; x.lineWidth = 1;
  x.beginPath(); x.moveTo(cn.x - 8, cn.y + 6); x.lineTo(cn.x + 8, cn.y + 6); x.lineTo(cn.x + 6, cn.y); x.lineTo(cn.x - 6, cn.y); x.closePath(); x.fill(); x.stroke();
  for (const s of [-1, 1]) { x.fillStyle = brass; x.beginPath(); x.arc(cn.x + s * 5, cn.y + 7, 2.5, 0, Math.PI * 2); x.fill(); }   // its wheels
  const ch = cabin.chest;
  x.globalAlpha = 0.9; x.fillStyle = '#2a1a0a'; x.strokeStyle = brass; x.lineWidth = 1.2;
  x.beginPath(); x.roundRect(ch.x - 8, ch.y - 4, 16, 10, 1.5); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(ch.x - 8, ch.y - 4); x.quadraticCurveTo(ch.x, ch.y - 12, ch.x + 8, ch.y - 4); x.stroke();   // the lid
  x.globalAlpha = 0.9; x.fillStyle = cabin.working; x.fillRect(ch.x - 6, ch.y - 5, 12, 1.5);   // the gold showing under the lid
  x.fillStyle = brass; x.fillRect(ch.x - 1, ch.y - 2, 2, 4);   // the clasp
  // Dividers lying on the chart: two legs from a hinge, their points on the paper.
  const dv = cabin.dividers;
  x.save(); x.translate(dv.x, dv.y); x.globalAlpha = 0.8; x.strokeStyle = brass; x.lineWidth = 3; x.lineCap = 'round';
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(dv.spread) * s * dv.len, Math.cos(dv.spread) * dv.len); x.stroke(); }
  x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.stroke(); x.fillStyle = brass; x.beginPath(); x.arc(0, -9, 3, 0, Math.PI * 2); x.fill();   // the hinge and its thumb-screw
  x.globalAlpha = 0.9; x.strokeStyle = cabin.paper; x.lineWidth = 1;
  for (const s of [-1, 1]) { const ex = Math.sin(dv.spread) * s * dv.len, ey = Math.cos(dv.spread) * dv.len; x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + Math.sin(dv.spread) * s * 6, ey + Math.cos(dv.spread) * 6); x.stroke(); }   // the points
  x.restore();
  // A reading glass on the chart: a brass ring, a glint, a handle.
  const gl = cabin.glass;
  x.save(); x.translate(gl.x, gl.y);
  x.globalAlpha = 0.06; x.fillStyle = cabin.paper; x.beginPath(); x.arc(0, 0, gl.r, 0, Math.PI * 2); x.fill();
  x.globalAlpha = 0.8; x.strokeStyle = brass; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, gl.r, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(Math.cos(0.75) * (gl.r + 3), Math.sin(0.75) * (gl.r + 3)); x.lineTo(Math.cos(0.75) * (gl.r + 40), Math.sin(0.75) * (gl.r + 40)); x.stroke();
  x.globalAlpha = 0.5; x.strokeStyle = cabin.paper; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, gl.r - 6, Math.PI * 1.15, Math.PI * 1.45); x.stroke();   // the glint
  x.restore();
  // The bell's bracket, out from the left pipe.
  const bl = cabin.bell;
  x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(bl.x, bl.y); x.lineTo(bl.x + 26, bl.y); x.lineTo(bl.x + 26, bl.y + 6); x.stroke();
  // The pipework, and the hand-wheel on the left pipe.
  for (const pipe of cabin.pipes) cabinPipe(x, pipe);
  const wh = cabin.wheel, wx = wh.x + 8 + wh.r;
  x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(wh.x, wh.y); x.lineTo(wh.x + 8, wh.y); x.stroke();   // the stem
  x.beginPath(); x.arc(wx, wh.y, wh.r, 0, Math.PI * 2); x.stroke();   // the wheel
  x.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; x.beginPath(); x.moveTo(wx - Math.cos(a) * wh.r, wh.y - Math.sin(a) * wh.r); x.lineTo(wx + Math.cos(a) * wh.r, wh.y + Math.sin(a) * wh.r); x.stroke(); }
  x.fillStyle = brass; x.beginPath(); x.arc(wx, wh.y, 3, 0, Math.PI * 2); x.fill();
  // The frame: a brass band round the window with rivets, and plates at the corners.
  x.globalAlpha = 0.45; x.strokeStyle = brass; x.lineWidth = CABIN_BAND;
  x.strokeRect(CABIN_BAND / 2, CABIN_BAND / 2, w - CABIN_BAND, hgt - CABIN_BAND);
  x.globalAlpha = 0.5; x.lineWidth = 1;
  x.strokeRect(CABIN_BAND + 0.5, CABIN_BAND + 0.5, w - 2 * CABIN_BAND - 1, hgt - 2 * CABIN_BAND - 1);
  const rivet = (rx, ry) => { x.globalAlpha = 0.7; x.fillStyle = brass; x.beginPath(); x.arc(rx, ry, 2.6, 0, Math.PI * 2); x.fill(); x.globalAlpha = 0.6; x.fillStyle = '#000000'; x.beginPath(); x.arc(rx + 0.8, ry + 0.8, 1.2, 0, Math.PI * 2); x.fill(); };
  for (let rx = 24; rx < w - 12; rx += 48) { rivet(rx, CABIN_BAND / 2); rivet(rx, hgt - CABIN_BAND / 2); }
  for (let ry = 24 + 48; ry < hgt - 60; ry += 48) { rivet(CABIN_BAND / 2, ry); rivet(w - CABIN_BAND / 2, ry); }
  for (const [cx, cy] of [[0, 0], [w, 0], [0, hgt], [w, hgt]]) {
    x.globalAlpha = 0.5; x.fillStyle = brass;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + (cx ? -36 : 36), cy); x.lineTo(cx, cy + (cy ? -36 : 36)); x.closePath(); x.fill();
    // Scrollwork inside each corner: a pair of curls, one along each edge.
    const sx = cx ? -1 : 1, sy = cy ? -1 : 1;
    x.globalAlpha = 0.55; x.strokeStyle = brass; x.lineWidth = 2; x.lineCap = 'round';
    for (const [ax, ay] of [[1, 0], [0, 1]]) {
      const px = (u, v) => cx + sx * (ax ? u : v), py = (u, v) => cy + sy * (ax ? v : u);
      x.beginPath(); x.moveTo(px(36, CABIN_BAND + 4), py(36, CABIN_BAND + 4));
      x.quadraticCurveTo(px(96, CABIN_BAND + 4), py(96, CABIN_BAND + 4), px(112, CABIN_BAND + 22), py(112, CABIN_BAND + 22));
      x.quadraticCurveTo(px(118, CABIN_BAND + 40), py(118, CABIN_BAND + 40), px(102, CABIN_BAND + 44), py(102, CABIN_BAND + 44));
      x.quadraticCurveTo(px(90, CABIN_BAND + 46), py(90, CABIN_BAND + 46), px(92, CABIN_BAND + 34), py(92, CABIN_BAND + 34));
      x.stroke();
      x.fillStyle = brass; x.beginPath(); x.arc(px(92, CABIN_BAND + 34), py(92, CABIN_BAND + 34), 2.5, 0, Math.PI * 2); x.fill();
    }
  }
  // The instrument plate: a dark plate with a brass edge and rivets, for the gauges and the clock to sit on.
  const pl = cabin.plate;
  x.globalAlpha = 0.85; x.fillStyle = '#0d0906'; x.fillRect(pl.x, pl.y, pl.w, pl.h);
  x.globalAlpha = 0.7; x.strokeStyle = brass; x.lineWidth = 3; x.strokeRect(pl.x + 1.5, pl.y + 1.5, pl.w - 3, pl.h - 3);
  x.globalAlpha = 0.35; x.lineWidth = 1; x.strokeRect(pl.x + 7.5, pl.y + 7.5, pl.w - 15, pl.h - 15);
  for (const [rx, ry] of [[pl.x + 12, pl.y + 12], [pl.x + pl.w - 12, pl.y + 12], [pl.x + 12, pl.y + pl.h - 12], [pl.x + pl.w - 12, pl.y + pl.h - 12], [pl.x + pl.w / 2, pl.y + pl.h - 12]]) rivet(rx, ry);
  // The nameplate, engraved, screwed to the plate's top edge.
  x.globalAlpha = 0.85; x.fillStyle = brass; x.fillRect(pl.x + pl.w / 2 - 112, pl.y + 6, 224, 16);
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.font = CABIN_LABEL; x.letterSpacing = '1.5px'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('H.M.A. CONSOLE \u00b7 PATENT 1887', pl.x + pl.w / 2, pl.y + 14.5); x.letterSpacing = '0px';
  for (const sx of [pl.x + pl.w / 2 - 106, pl.x + pl.w / 2 + 106]) { x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.beginPath(); x.arc(sx, pl.y + 14, 1.8, 0, Math.PI * 2); x.fill(); }
  for (let i = 0; i < 8; i++) {   // the lamps' bezels; the lamps themselves are lit by the frame
    const lx = cabin.lamps.x + i * cabin.lamps.gap, ly = cabin.lamps.y;
    x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 2; x.beginPath(); x.arc(lx, ly, 8, 0, Math.PI * 2); x.stroke();
    x.globalAlpha = 0.9; x.fillStyle = '#060402'; x.beginPath(); x.arc(lx, ly, 6, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 0.5; x.fillStyle = ink; x.font = CABIN_LABEL; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('WATCH', cabin.lamps.x + 8 * cabin.lamps.gap - 30, cabin.lamps.y);
  // The pennant's pole; the flag itself ripples, so the frame draws it.
  const px = cabin.pennant.x, py = cabin.pennant.y;
  x.globalAlpha = 0.8; x.strokeStyle = brass; x.lineWidth = 2; x.lineCap = 'round';
  x.beginPath(); x.moveTo(26, py + 11); x.lineTo(px, py + 11); x.stroke();   // the bracket from the pipe
  x.beginPath(); x.moveTo(px, py - 8); x.lineTo(px, py + 40); x.stroke();   // the pole
  x.fillStyle = brass; x.beginPath(); x.arc(px, py - 10, 3, 0, Math.PI * 2); x.fill();
  // Goggles left on the chart: two brass rims on a leather strap, the lenses tinted.
  const gg = cabin.goggles;
  x.save(); x.translate(gg.x, gg.y); x.rotate(-0.18);
  x.globalAlpha = 0.7; x.strokeStyle = '#3a2414'; x.lineWidth = 5; x.beginPath(); x.moveTo(-26, -2); x.quadraticCurveTo(0, -30, 26, -2); x.stroke();   // the strap
  for (const s of [-1, 1]) {
    x.globalAlpha = 0.12; x.fillStyle = cabin.ok; x.beginPath(); x.arc(s * 14, 0, 11, 0, Math.PI * 2); x.fill();   // the lens
    x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 3; x.beginPath(); x.arc(s * 14, 0, 11, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 1; x.globalAlpha = 0.5; x.beginPath(); x.arc(s * 14, 0, 7, 0, Math.PI * 2); x.stroke();
    x.globalAlpha = 0.5; x.strokeStyle = cabin.paper; x.lineWidth = 1.5; x.beginPath(); x.arc(s * 14, 0, 7, Math.PI * 1.2, Math.PI * 1.5); x.stroke();   // a glint
  }
  x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-3, -2); x.lineTo(3, -2); x.stroke();   // the bridge
  x.restore();
  // The boiler: a riveted drum with rounded ends, a firebox door, a sight glass, and a stack up from it.
  const bo = cabin.boiler;
  x.globalAlpha = 0.92; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2.5; x.lineJoin = 'round';
  x.beginPath(); x.roundRect(bo.x, bo.y, bo.w, bo.h, 14); x.fill(); x.stroke();
  x.globalAlpha = 0.5; x.lineWidth = 1; for (const bx of [bo.x + 18, bo.x + bo.w - 18]) { x.beginPath(); x.moveTo(bx, bo.y + 2); x.lineTo(bx, bo.y + bo.h - 2); x.stroke(); }   // the seams
  for (let ry = bo.y + 10; ry < bo.y + bo.h; ry += 16) for (const bx of [bo.x + 12, bo.x + bo.w - 12]) rivet(bx, ry);
  x.globalAlpha = 0.9; x.fillStyle = '#060402'; x.fillRect(bo.x + 30, bo.y + 36, 34, 30);   // the firebox, lit by the frame
  x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 2; x.strokeRect(bo.x + 30, bo.y + 36, 34, 30);
  x.beginPath(); x.moveTo(bo.x + 30, bo.y + 51); x.lineTo(bo.x + 64, bo.y + 51); x.stroke();   // its bars
  x.fillStyle = brass; x.beginPath(); x.arc(bo.x + 60, bo.y + 44, 2, 0, Math.PI * 2); x.fill();   // the latch
  x.globalAlpha = 0.9; x.fillStyle = '#060402'; x.fillRect(bo.x + 78, bo.y + 14, 8, 50); x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 1.5; x.strokeRect(bo.x + 78, bo.y + 14, 8, 50);   // the sight glass
  x.globalAlpha = 0.6; x.fillStyle = cabin.ok; x.fillRect(bo.x + 79, bo.y + 36, 6, 27);   // the water in it
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.fillRect(bo.x + 16, bo.y - 54, 14, 56); x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 2; x.strokeRect(bo.x + 16, bo.y - 54, 14, 56);   // the stack
  x.lineWidth = 4; x.beginPath(); x.moveTo(bo.x + 12, bo.y - 54); x.lineTo(bo.x + 34, bo.y - 54); x.stroke();   // its crown
  const wh2 = cabin.whistle;   // the whistle: a brass tube up from the drum, a bell on top, a lever
  x.globalAlpha = 0.9; x.fillStyle = brass; x.fillRect(wh2.x - 4, wh2.y, 8, 22); x.fillRect(wh2.x - 7, wh2.y - 6, 14, 7);
  x.beginPath(); x.ellipse(wh2.x, wh2.y - 6, 7, 3, 0, 0, Math.PI * 2); x.fill();
  x.globalAlpha = 0.6; x.fillStyle = '#000000'; x.fillRect(wh2.x - 5, wh2.y + 1, 10, 2);   // the slot it blows from
  x.globalAlpha = 0.85; x.strokeStyle = brass; x.lineWidth = 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(wh2.x + 4, wh2.y + 10); x.lineTo(wh2.x + 16, wh2.y + 4); x.stroke();   // the lever
  const jt = cabin.jet;   // the safety valve's nozzle out of the drum's end
  x.globalAlpha = 0.9; x.fillStyle = brass; x.fillRect(jt.x - 8, jt.y - 4, 10, 8); x.fillRect(jt.x, jt.y - 6, 3, 12);
  // The Tesla coil: a base, the windings, a toroid on top; and the rod it arcs to.
  const tc = cabin.tesla;
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2;
  x.beginPath(); x.roundRect(tc.x - 16, tc.y - 10, 32, 12, 3); x.fill(); x.stroke();   // the base
  x.beginPath(); x.rect(tc.x - 7, tc.y - tc.h - 10, 14, tc.h); x.fill(); x.stroke();   // the former
  x.globalAlpha = 0.6; x.strokeStyle = cabin.copper; x.lineWidth = 1;   // the windings, in copper
  for (let wy = tc.y - 14; wy > tc.y - tc.h - 8; wy -= 3) { x.beginPath(); x.moveTo(tc.x - 7, wy); x.lineTo(tc.x + 7, wy - 1.5); x.stroke(); }
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2.5;
  x.beginPath(); x.ellipse(tc.x, tc.y - tc.h - 14, 20, 7, 0, 0, Math.PI * 2); x.fill(); x.stroke();   // the toroid
  x.lineWidth = 2.5; x.beginPath(); x.moveTo(tc.rod.x, tc.y); x.lineTo(tc.rod.x, tc.rod.y + 6); x.stroke();   // the rod
  x.fillStyle = brass; x.beginPath(); x.arc(tc.rod.x, tc.rod.y, 5, 0, Math.PI * 2); x.fill();
  x.globalAlpha = 0.9; x.fillStyle = '#0d0906'; x.strokeStyle = brass; x.lineWidth = 2; x.beginPath(); x.roundRect(tc.rod.x - 10, tc.y - 8, 20, 10, 3); x.fill(); x.stroke();   // its foot
  // A vignette, so the edges fall off into the cabin's dark.
  const v = x.createRadialGradient(w / 2, hgt / 2, Math.min(w, hgt) * 0.3, w / 2, hgt / 2, Math.max(w, hgt) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.globalAlpha = 1; x.fillStyle = v; x.fillRect(0, 0, w, hgt);
  return c;
}

/** One gear: toothed rim, a ring, five spokes and a hub, turned to its angle. */
function cabinGear(ctx, g, angle) {
  const { x, y, r, teeth } = g, root = r - 5, tip = r + 4;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, step = Math.PI * 2 / teeth;
    ctx.lineTo(Math.cos(a - step * 0.15) * root, Math.sin(a - step * 0.15) * root);
    ctx.lineTo(Math.cos(a - step * 0.08) * tip, Math.sin(a - step * 0.08) * tip);
    ctx.lineTo(Math.cos(a + step * 0.08) * tip, Math.sin(a + step * 0.08) * tip);
    ctx.lineTo(Math.cos(a + step * 0.15) * root, Math.sin(a + step * 0.15) * root);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.92; ctx.fillStyle = cabin.floor; ctx.fill();
  ctx.globalAlpha = 0.75; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = r > 40 ? 4 : 3;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22); ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68); ctx.stroke(); }
  ctx.globalAlpha = 0.8; ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2); ctx.fill();   // the hub, verdigris
  ctx.restore();
}

/** The piston: a crank pin on the big wheel, the rod to the piston, the piston in its cylinder; a breath of steam at the end of each stroke. */
function cabinPiston(ctx, angle, now, still) {
  const p = cabin.piston, g = p.gear, { cyl } = p;
  const pinX = g.x + Math.cos(angle) * p.crank, pinY = g.y + Math.sin(angle) * p.crank;
  const headX = pinX + Math.sqrt(Math.max(0, p.rod * p.rod - (pinY - cyl.y) ** 2));
  ctx.save(); ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#0a0604'; ctx.fillRect(cyl.x, cyl.y - cyl.bore / 2, cyl.len, cyl.bore);   // the cylinder
  ctx.globalAlpha = 0.7; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2; ctx.strokeRect(cyl.x, cyl.y - cyl.bore / 2, cyl.len, cyl.bore);
  ctx.lineWidth = 4;   // its end flanges
  for (const fx of [cyl.x, cyl.x + cyl.len]) { ctx.beginPath(); ctx.moveTo(fx, cyl.y - cyl.bore / 2 - 4); ctx.lineTo(fx, cyl.y + cyl.bore / 2 + 4); ctx.stroke(); }
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 3;   // the rod
  ctx.beginPath(); ctx.moveTo(pinX, pinY); ctx.lineTo(headX, cyl.y); ctx.stroke();
  ctx.fillStyle = cabin.colour;   // the piston head, and the pin
  ctx.fillRect(headX - 3, cyl.y - cyl.bore / 2 + 3, 10, cyl.bore - 6);
  ctx.beginPath(); ctx.arc(pinX, pinY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.arc(headX, cyl.y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // At the top of each stroke, a little steam from the cylinder's far end.
  const stroke = Math.floor(angle / (Math.PI * 2));
  if (!still && stroke !== cabin.stroke) {
    cabin.stroke = stroke;
    cabinPuff(now, cyl.x + cyl.len + 6, cyl.y - cyl.bore / 2 - 2, 6, 0.25, -0.35, 1300, 11);
  }
}

/** A gauge: a brass ring, a dark face with a scale from 0 to 8, its label, and the needle easing to what it measures. */
function cabinGauge(ctx, g, counts, still) {
  g.target = Math.min(8, g.of(counts));
  g.needle = still ? g.target : g.needle + (g.target - g.needle) * 0.08;
  ctx.save(); ctx.translate(g.x, g.y);
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#0a0604'; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, g.r - 5, 0, Math.PI * 2); ctx.stroke();
  const from = Math.PI * 0.75, span = Math.PI * 1.5;
  ctx.font = CABIN_LABEL; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 8; i++) {
    const a = from + span * i / 8, outer = g.r - 8, inner = g.r - (i % 2 ? 12 : 15);
    ctx.globalAlpha = 0.8; ctx.strokeStyle = i >= 6 ? cabin.danger : cabin.paper;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer); ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner); ctx.stroke();
    if (i % 2 === 0) { ctx.globalAlpha = 0.85; ctx.fillStyle = i >= 6 ? cabin.danger : cabin.paper; ctx.fillText(String(i), Math.cos(a) * (g.r - 23), Math.sin(a) * (g.r - 23)); }
  }
  ctx.globalAlpha = 0.6; ctx.fillStyle = cabin.ink; ctx.fillText(g.label, 0, g.r * 0.42);
  const a = from + span * (g.needle / 8) + (still || g.needle < 0.05 ? 0 : Math.sin(cabinNow / 90) * 0.012);
  ctx.globalAlpha = 0.95; ctx.strokeStyle = cabin.danger; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 8, -Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * (g.r - 14), Math.sin(a) * (g.r - 14)); ctx.stroke();
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The ship's clock, keeping real time: a brass case, twelve marks with the quarters numbered, hour and minute hands, a second hand that steps. */
function cabinClock(ctx, still) {
  const c = cabin.clock, d = new Date();
  ctx.save(); ctx.translate(c.x, c.y);
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#0a0604'; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, c.r - 5, 0, Math.PI * 2); ctx.stroke();
  ctx.font = CABIN_LABEL; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cabin.paper; ctx.strokeStyle = cabin.paper;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    if (i % 3 === 0) { ctx.globalAlpha = 0.85; ctx.fillText(['XII', 'III', 'VI', 'IX'][i / 3], Math.cos(a) * (c.r - 15), Math.sin(a) * (c.r - 15)); }
    else { ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (c.r - 8), Math.sin(a) * (c.r - 8)); ctx.lineTo(Math.cos(a) * (c.r - 13), Math.sin(a) * (c.r - 13)); ctx.stroke(); }
  }
  ctx.globalAlpha = 0.5; ctx.fillStyle = cabin.ink; ctx.fillText('SHIP’S TIME', 0, c.r * 0.45);
  const hand = (a, len, width, colour) => { ctx.globalAlpha = 0.95; ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 6, -Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke(); };
  const sec = still ? 0 : d.getSeconds(), min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
  hand((hr / 12) * Math.PI * 2 - Math.PI / 2, c.r * 0.5, 3, cabin.paper);
  hand((min / 60) * Math.PI * 2 - Math.PI / 2, c.r * 0.72, 2, cabin.paper);
  hand((sec / 60) * Math.PI * 2 - Math.PI / 2, c.r * 0.78, 1, cabin.danger);
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The course under way: dotted legs from the port, the leg in hand growing, the X when the last is in; then a rest and a new course. */
function cabinCourse(ctx, now, still, w, hgt) {
  if (!cabin.course) cabin.course = newCourse(now, w, hgt);
  const c = cabin.course, legs = c.points.length - 1, e = still ? Infinity : now - c.t0;
  const done = Math.min(legs, Math.floor(e / COURSE_LEG_MS)), part = done >= legs ? 0 : (e % COURSE_LEG_MS) / COURSE_LEG_MS;
  if (!still && e > legs * COURSE_LEG_MS + COURSE_REST_MS) { cabin.course = newCourse(now, w, hgt); return; }
  ctx.save();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.paper; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...c.points[0]);
  for (let i = 1; i <= done; i++) ctx.lineTo(...c.points[i]);
  if (done < legs) { const [ax, ay] = c.points[done], [bx, by] = c.points[done + 1]; ctx.lineTo(ax + (bx - ax) * part, ay + (by - ay) * part); }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = cabin.colour;   // the waypoints
  for (let i = 0; i <= done; i++) { ctx.beginPath(); ctx.arc(c.points[i][0], c.points[i][1], 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5;   // the port: an anchor ring
  ctx.beginPath(); ctx.arc(c.points[0][0], c.points[0][1], 6, 0, Math.PI * 2); ctx.stroke();
  const [gx, gy] = c.points[legs];   // the X, faint until reached
  ctx.globalAlpha = done >= legs ? 0.95 : 0.35; ctx.strokeStyle = cabin.danger; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(gx - 7, gy - 7); ctx.lineTo(gx + 7, gy + 7); ctx.moveTo(gx + 7, gy - 7); ctx.lineTo(gx - 7, gy + 7); ctx.stroke();
  if (done >= legs) { ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 12, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

/** A low haze of steam drifting across the lower chart: big soft blobs, barely there, wrapping round. */
function cabinHaze(ctx, now, still, w) {
  for (const b of cabin.haze) {
    if (!still) { b.x += b.v * CABIN_MS; if (b.x - b.r > w) b.x = -b.r; }
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, cabin.paper); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = b.a * (still ? 1 : 1 + Math.sin(now / 4000 + b.r) * 0.25); ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
}

/** Lets steam out at a point: n particles with the given drift, rising, spreading and fading over their life. */
function cabinPuff(now, x, y, n, vx, vy, life, size, spread = 1) {
  for (let i = 0; i < n; i++) cabin.steam.push({ x: x + (Math.random() - 0.5) * 6, y, vx: vx + (Math.random() - 0.5) * 0.3 * spread, vy: vy - Math.random() * 0.25, born: now + i * 40, life: life + Math.random() * life * 0.4, size, seed: Math.random() * 100 });
  if (cabin.steam.length > 420) cabin.steam.splice(0, cabin.steam.length - 420);
}

/** Steam: now and then a puff from the valve beside the plate, the whistle's blast, the safety jet, leaks at the flanges, and whatever the piston let out; the particles rise, spread and fade, soft-edged and a little turbulent. */
function cabinSteam(ctx, now) {
  const venting = cabin.gauges[0].needle >= 6;   // in the red: the safety valve lifts and keeps lifting, and the whistle screams
  if (now >= cabin.puffAt) {
    cabin.puffAt = now + (venting ? 500 + Math.random() * 400 : 7000 + Math.random() * 9000);
    cabinPuff(now, cabin.valve.x, cabin.valve.y - 18, 12, 0.35, -0.3, 2400, 14);
  }
  if (now >= cabin.whistleAt) { cabin.whistleUntil = now + 1200; cabin.whistleAt = cabin.whistleUntil + 25000 + Math.random() * 20000; }   // the whistle blows
  if (now < cabin.whistleUntil || venting) cabinPuff(now, cabin.whistle.x, cabin.whistle.y - 8, 2, 0.05, -0.9, 1500, 16, 0.6);
  if (now >= cabin.jetAt) { cabin.jetUntil = now + 700; cabin.jetAt = cabin.jetUntil + 9000 + Math.random() * 7000; }   // the safety valve spits sideways
  if (now < cabin.jetUntil) cabinPuff(now, cabin.jet.x + 4, cabin.jet.y, 2, 0.8, -0.1, 1100, 10, 0.4);
  if (now >= cabin.leakAt) { cabin.leakAt = now + 5000 + Math.random() * 7000; const [lx, ly] = cabin.leaks[Math.floor(Math.random() * cabin.leaks.length)]; cabinPuff(now, lx, ly, 4, 0.1, -0.2, 900, 7); }   // a flange weeps
  ctx.globalAlpha = 0.8; ctx.fillStyle = cabin.colour; ctx.fillRect(cabin.valve.x - 4, cabin.valve.y - 14, 8, 14); ctx.fillRect(cabin.valve.x - 7, cabin.valve.y - 17, 14, 4);   // the valve: a pipe stub with a collar
  ctx.fillStyle = cabin.paper;
  cabin.steam = cabin.steam.filter((p) => now - p.born < p.life);
  for (const p of cabin.steam) {
    const age = now - p.born; if (age < 0) continue;
    const t = age / p.life, wobble = Math.sin(age / 260 + (p.seed ?? 0)) * 4 * t;
    const px = p.x + p.vx * age / 16 + wobble, py = p.y + p.vy * age / 16, r = 3 + t * p.size;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);   // soft-edged: dense in the middle, thin at the edge
    g.addColorStop(0, p.dark ? cabin.ink : cabin.paper); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5 * (1 - t) * (1 - t * 0.3); ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
}

/** An airship, once in a while: a long hull with fins, a gondola slung below, a propeller spinning at the stern, drifting across the upper chart. */
function cabinAirship(ctx, now, w, hgt) {
  if (!cabin.airship && now >= cabin.airshipAt) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    cabin.airship = { x: dir > 0 ? -90 : w + 90, y: 150 + Math.random() * (hgt * 0.3), dir, speed: 0.02 + Math.random() * 0.012, at: now };
  }
  const a = cabin.airship;
  if (!a) return;
  a.x += a.dir * a.speed * (now - a.at); a.at = now;
  if (a.x < -110 || a.x > w + 110) { cabin.airship = null; cabin.airshipAt = now + 35000 + Math.random() * 40000; return; }
  ctx.save(); ctx.translate(a.x, a.y + Math.sin(now / 1400) * 2); ctx.scale(a.dir, 1);
  const sweep = Math.sin(now / 1700) * 0.35;   // the searchlight from the gondola, sweeping the chart below
  ctx.save(); ctx.translate(0, 20); ctx.rotate(sweep);
  const beam = ctx.createLinearGradient(0, 0, 0, 170);
  beam.addColorStop(0, cabin.paper); beam.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.07; ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(40, 170); ctx.lineTo(-40, 170); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 0.92; ctx.fillStyle = '#0d0906'; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 44, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // the hull
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(0, 20, 2.5, 0, Math.PI * 2); ctx.fill();   // the lamp under the gondola
  ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(-30, -9); ctx.quadraticCurveTo(0, -16, 30, -9); ctx.stroke();   // a seam
  ctx.globalAlpha = 0.92;
  ctx.beginPath(); ctx.moveTo(-38, -6); ctx.lineTo(-54, -16); ctx.lineTo(-50, 0); ctx.lineTo(-54, 16); ctx.lineTo(-38, 6); ctx.closePath(); ctx.fill(); ctx.stroke();   // the fins
  ctx.fillRect(-10, 13, 22, 7); ctx.strokeRect(-10, 13, 22, 7);   // the gondola
  ctx.beginPath(); ctx.moveTo(-8, 13); ctx.lineTo(-10, 6); ctx.moveTo(10, 13); ctx.lineTo(12, 6); ctx.stroke();   // its rigging
  ctx.fillStyle = cabin.paper; ctx.globalAlpha = 0.9; ctx.fillRect(-6, 15, 2, 2); ctx.fillRect(2, 15, 2, 2);   // lit windows
  const spin = now / 60;   // the propeller
  ctx.globalAlpha = 0.8; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-50, Math.sin(spin) * -9); ctx.lineTo(-50, Math.sin(spin) * 9); ctx.stroke();
  ctx.beginPath(); ctx.arc(-50, 0, 1.5, 0, Math.PI * 2); ctx.fillStyle = cabin.ok; ctx.fill();
  ctx.restore();
  if (now >= cabin.smokeAt) {   // a wisp from the funnel, carried behind
    cabin.smokeAt = now + 350;
    cabin.steam.push({ x: a.x - a.dir * 16, y: a.y - 14, vx: -a.dir * (0.25 + Math.random() * 0.2), vy: -(0.15 + Math.random() * 0.15), born: now, life: 1600 + Math.random() * 500, size: 8 });
  }
}

/** The flyball governor on the bottom run: a spindle turning with the steam, its two balls flung out the faster it goes. */
function cabinGovernor(ctx, now, still) {
  const g = cabin.governor, steam = cabin.gauges[0].needle / 8;
  if (!still) g.spin += CABIN_MS * (0.0025 + steam * 0.009);
  const lift = 14 + steam * 18, reach = 12 + steam * 10, top = g.y - g.h;
  ctx.save(); ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, top); ctx.stroke();   // the spindle
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(g.x - 10, g.y); ctx.lineTo(g.x + 10, g.y); ctx.stroke();   // its foot
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(g.x, top, 4, 0, Math.PI * 2); ctx.fill();
  const balls = [0, Math.PI].map((o) => { const a = g.spin + o; return { x: g.x + Math.cos(a) * reach, y: top + lift - Math.sin(a) * 3, near: Math.sin(a) >= 0 }; });
  for (const b of balls.sort((p, q) => (p.near ? 1 : 0) - (q.near ? 1 : 0))) {   // the far ball first, so the near one lies over the spindle
    ctx.globalAlpha = b.near ? 0.9 : 0.6; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(g.x, top + 2); ctx.lineTo(b.x, b.y); ctx.stroke();   // the arm
    ctx.beginPath(); ctx.moveTo(g.x, top + lift + 10); ctx.lineTo(b.x, b.y); ctx.stroke();   // the link to the sleeve
    ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = (b.near ? 0.9 : 0.6) * 0.6; ctx.fillStyle = cabin.paper; ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 1.5, 0, Math.PI * 2); ctx.fill();   // its glint
  }
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.ok; ctx.fillRect(g.x - 4, top + lift + 7, 8, 6);   // the sleeve
  ctx.restore();
}

/** The chain drive: a loop over the big wheel's ring and the sprocket, its links running with the wheel. */
function cabinChain(ctx, angle, still) {
  const big = cabin.piston.gear, r1 = big.r * 0.68, s = cabin.sprocket, r2 = s.r;
  const dx = s.x - big.x, dy = s.y - big.y, d = Math.hypot(dx, dy), base = Math.atan2(dy, dx), off = Math.acos((r1 - r2) / d);
  ctx.save(); ctx.lineCap = 'butt';
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r2, 0, Math.PI * 2); ctx.stroke();   // the sprocket
  ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - angle * r1 / r2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * r2, s.y + Math.sin(a) * r2); ctx.stroke(); }
  ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8; ctx.strokeStyle = '#0a0604'; ctx.lineWidth = 4;   // the chain: dark, with brass links running along it
  const path = () => {
    ctx.beginPath();
    ctx.arc(big.x, big.y, r1, base + off, base - off + Math.PI * 2);
    ctx.arc(s.x, s.y, r2, base - off, base + off);
    ctx.closePath();
  };
  path(); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = still ? 0 : -angle * r1;
  path(); ctx.stroke();
  ctx.restore();
}

/** The watch lamps on the plate: one lit per session, in the colour of what it's doing; dark where there is none.
 *  A floor knows only how many are in each state, so the lamps go working, asking, waiting, idle, then stopped. */
function cabinLamps(ctx, counts) {
  const sessions = [['working', counts.working], ['asking', counts.asking], ['attention', counts.waiting], ['running', counts.idle], ['exited', counts.stopped]]
    .flatMap(([st, n]) => Array.from({ length: n || 0 }, () => st));
  const colourOf = (s) => { const st = s; return st === 'working' ? cabin.working : st === 'asking' ? cabin.asking : st === 'attention' ? cabin.copper : st === 'exited' ? null : cabin.ok; };
  for (let i = 0; i < 8; i++) {
    const s = sessions[i], colour = s ? colourOf(s) : null, lx = cabin.lamps.x + i * cabin.lamps.gap, ly = cabin.lamps.y;
    if (!colour) { if (s) { ctx.globalAlpha = 0.5; ctx.fillStyle = cabin.ink; ctx.beginPath(); ctx.arc(lx, ly, 2, 0, Math.PI * 2); ctx.fill(); } continue; }   // a stopped session: a dark lamp with a pilot dot
    const halo = ctx.createRadialGradient(lx, ly, 2, lx, ly, 16);
    halo.addColorStop(0, colour); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35; ctx.fillStyle = halo; ctx.fillRect(lx - 16, ly - 16, 32, 32);
    ctx.globalAlpha = 0.95; ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.fillStyle = cabin.paper; ctx.beginPath(); ctx.arc(lx - 1.5, ly - 1.8, 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

/** The ship's bell on its bracket, swinging for a moment every so often. */
function cabinBell(ctx, now, still) {
  const b = cabin.bell, phase = now % 24000, swing = still || phase > 2600 ? 0 : Math.sin(now / 110) * 0.3 * (1 - phase / 2600);
  ctx.save(); ctx.translate(b.x + 26, b.y + 6); ctx.rotate(swing);
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#0d0906'; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.quadraticCurveTo(6, 10, 9, 18); ctx.lineTo(11, 22); ctx.lineTo(-11, 22); ctx.lineTo(-9, 18); ctx.quadraticCurveTo(-6, 10, -3, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(0, 25, 2.5, 0, Math.PI * 2); ctx.fill();   // the clapper
  ctx.restore();
}

/** The helm: a ship's wheel with eight handles, turning to the heading of the leg the course is on. */
function cabinHelm(ctx, still) {
  const hm = cabin.helm, c = cabin.course;
  if (c) {
    const e = still ? Infinity : cabinNow - c.t0, legs = c.points.length - 1, i = Math.min(legs - 1, Math.floor(e / COURSE_LEG_MS));
    const [ax, ay] = c.points[i], [bx, by] = c.points[i + 1], heading = Math.atan2(by - ay, bx - ax);
    hm.angle = still ? heading : hm.angle + (heading - hm.angle) * 0.04;
  }
  ctx.save(); ctx.translate(hm.x, hm.y); ctx.rotate(hm.angle);
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.colour; ctx.lineCap = 'round';
  ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, hm.r, 0, Math.PI * 2); ctx.stroke();   // the rim
  ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, hm.r - 4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, hm.r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {   // spokes through to the handles
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * (hm.r + 13), Math.sin(a) * (hm.r + 13)); ctx.stroke();
    ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(Math.cos(a) * (hm.r + 13), Math.sin(a) * (hm.r + 13), 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#0d0906'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();   // the hub
  ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The lantern: hung from the top band on a chain, swaying a little, its flame flickering; the glow on the table comes from it. */
function cabinLantern(ctx, now, still) {
  const ln = cabin.lantern, sway = still ? 0 : Math.sin(now / 2300) * 0.045;
  ctx.save(); ctx.translate(ln.x, CABIN_BAND); ctx.rotate(sway);
  ctx.globalAlpha = 0.7; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);   // the chain
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ln.chain); ctx.stroke(); ctx.setLineDash([]);
  ctx.translate(0, ln.chain);
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();   // the ring
  ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill();   // the cap
  const flick = still ? 1 : 0.85 + Math.sin(now / 90) * 0.08 + Math.sin(now / 37) * 0.07;
  ctx.globalAlpha = 0.18 * flick; ctx.fillStyle = cabin.working; ctx.fillRect(-7, 10, 14, 24);   // the glass, lit
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5; ctx.strokeRect(-7, 10, 14, 24);
  for (const gx of [-7, 7]) { ctx.beginPath(); ctx.moveTo(gx, 10); ctx.lineTo(gx * 0.7, 34); ctx.stroke(); }   // the frame bars
  ctx.fillStyle = cabin.colour; ctx.fillRect(-8, 34, 16, 4);   // the base
  ctx.globalAlpha = 0.95 * flick; ctx.fillStyle = cabin.working;   // the flame
  ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(5, 24, 0, 16 - flick * 3); ctx.quadraticCurveTo(-5, 24, 0, 30); ctx.fill();
  ctx.globalAlpha = 0.9 * flick; ctx.fillStyle = cabin.paper; ctx.beginPath(); ctx.ellipse(0, 27, 1.6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  cabin.lamp = { x: ln.x + Math.sin(sway) * ln.chain, y: CABIN_BAND + Math.cos(sway) * ln.chain + 24 };   // where the glow comes from
}

/** The pennant, rippling from its pole: a black swallow-tail with the skull and crossbones, the wave growing out to the fly. */
function cabinPennant(ctx, now, still) {
  const { x: px, y: py } = cabin.pennant, wave = (dx, base) => base + (still ? 0 : Math.sin(now / 160 + dx / 11) * dx * 0.09);
  ctx.save(); ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.92; ctx.fillStyle = '#0a0604';
  ctx.beginPath(); ctx.moveTo(px + 1, py - 6);
  for (let dx = 12; dx <= 72; dx += 12) ctx.lineTo(px + dx, wave(dx, py - 6 + dx * 0.11));   // the top edge
  ctx.lineTo(px + 58, wave(58, py + 11)); ctx.lineTo(px + 72, wave(72, py + 20));   // the swallow tail
  for (let dx = 60; dx >= 12; dx -= 12) ctx.lineTo(px + dx, wave(dx, py + 28 - dx * 0.11));   // the bottom edge
  ctx.lineTo(px + 1, py + 28); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.6; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1; ctx.stroke();
  const sy = wave(22, py + 8);   // the skull rides the wave
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.paper;
  ctx.beginPath(); ctx.arc(px + 22, sy, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px + 19.5, sy + 3, 5, 2.5);
  ctx.fillStyle = '#0a0604'; ctx.fillRect(px + 19.6, sy - 1, 1.8, 1.8); ctx.fillRect(px + 22.8, sy - 1, 1.8, 1.8);
  ctx.strokeStyle = cabin.paper; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px + 14, sy + 7); ctx.lineTo(px + 30, sy + 13); ctx.moveTo(px + 30, sy + 7); ctx.lineTo(px + 14, sy + 13); ctx.stroke();
  ctx.restore();
}

/** A message in a bottle, bobbing in the sea: a corked bottle lying over with a rolled note inside. */
function cabinBottle(ctx, now, still) {
  const b = cabin.bottle, bob = still ? 0 : Math.sin(now / 900) * 2, tilt = 0.5 + (still ? 0 : Math.sin(now / 1300) * 0.06);
  ctx.save(); ctx.translate(b.x, b.y + bob); ctx.rotate(tilt);
  ctx.globalAlpha = 0.25; ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.roundRect(-14, -7, 24, 14, 5); ctx.fill(); ctx.fillRect(10, -3, 9, 6);   // the glass
  ctx.globalAlpha = 0.8; ctx.strokeStyle = cabin.ok; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-14, -7, 24, 14, 5); ctx.stroke(); ctx.strokeRect(10, -3, 9, 6);
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.copper; ctx.fillRect(18, -3.5, 5, 7);   // the cork
  ctx.fillStyle = cabin.paper; ctx.globalAlpha = 0.85; ctx.fillRect(-10, -2.5, 16, 5);   // the note
  ctx.globalAlpha = 0.5; ctx.strokeStyle = cabin.danger; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -2.5); ctx.lineTo(-2, 2.5); ctx.stroke();   // its ribbon
  ctx.restore();
  ctx.globalAlpha = 0.25; ctx.strokeStyle = cabin.ink; ctx.lineWidth = 1;   // ripples
  for (const r of [18, 26]) { ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
}

/** The boiler at work: the firebox glowing and flickering through its bars, and smoke from the stack. */
function cabinBoiler(ctx, now, still) {
  const bo = cabin.boiler, flick = still ? 1 : 0.75 + Math.sin(now / 70) * 0.12 + Math.sin(now / 190) * 0.13;
  const fire = ctx.createRadialGradient(bo.x + 47, bo.y + 56, 2, bo.x + 47, bo.y + 56, 22);
  fire.addColorStop(0, '#ffd27a'); fire.addColorStop(0.4, cabin.copper); fire.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.85 * flick; ctx.fillStyle = fire; ctx.fillRect(bo.x + 31, bo.y + 37, 32, 28);
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bo.x + 30, bo.y + 51); ctx.lineTo(bo.x + 64, bo.y + 51); ctx.stroke();   // the bars over the fire
  const spill = ctx.createRadialGradient(bo.x + 47, bo.y + 70, 0, bo.x + 47, bo.y + 70, 70);   // its light on the floor
  spill.addColorStop(0, cabin.copper); spill.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.12 * flick; ctx.fillStyle = spill; ctx.fillRect(bo.x - 30, bo.y + 20, bo.w + 60, 90);
  if (!still && now >= cabin.stackAt) {   // smoke from the stack
    cabin.stackAt = now + 450 + Math.random() * 300;
    cabin.steam.push({ x: bo.x + 23 + Math.random() * 4 - 2, y: bo.y - 58, vx: 0.08 + Math.random() * 0.12, vy: -(0.22 + Math.random() * 0.2), born: now, life: 2600 + Math.random() * 900, size: 16, dark: true, seed: Math.random() * 100 });
  }
}

/** The Tesla coil: every few seconds an arc crackles from the toroid to the rod for a moment, jagged and pale, with a glow at the toroid. */
function cabinTesla(ctx, now, still) {
  const tc = cabin.tesla;
  if (!still && now >= cabin.arcNext) { cabin.arcUntil = now + 220 + Math.random() * 220; cabin.arcNext = cabin.arcUntil + 2500 + Math.random() * 5000; }
  const arcing = !still && now < cabin.arcUntil, top = { x: tc.x, y: tc.y - tc.h - 14 };
  const halo = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, arcing ? 34 : 18);
  halo.addColorStop(0, '#cfd8ff'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = arcing ? 0.35 : 0.12 + Math.sin(now / 300) * 0.03; ctx.fillStyle = halo; ctx.fillRect(top.x - 40, top.y - 40, 80, 80);
  if (!arcing) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) {   // two or three bolts, each a jagged line with a fork or two
    const pts = [[top.x + 12, top.y]];
    const steps = 7 + Math.floor(Math.random() * 4);
    for (let i = 1; i < steps; i++) { const u = i / steps; pts.push([top.x + 12 + (tc.rod.x - top.x - 12) * u + (Math.random() - 0.5) * 16, top.y + (tc.rod.y - top.y) * u + (Math.random() - 0.5) * 18]); }
    pts.push([tc.rod.x, tc.rod.y]);
    for (const [width, alpha, colour] of [[5, 0.18, '#8fa0ff'], [2, 0.6, '#cfd8ff'], [1, 0.95, '#ffffff']]) {
      ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = width;
      ctx.beginPath(); pts.forEach(([qx, qy], i) => (i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy))); ctx.stroke();
    }
    if (Math.random() < 0.6) {   // a fork off the middle
      const [fx, fy] = pts[Math.floor(pts.length / 2)];
      ctx.globalAlpha = 0.7; ctx.strokeStyle = '#cfd8ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (Math.random() - 0.5) * 24, fy - 10 - Math.random() * 16); ctx.stroke();
    }
  }
  ctx.restore();
}

/** The balance wheel swinging to and fro on its hairspring, the pallet anchor rocking with it, and the escape wheel ticking round a tooth at a time. */
function cabinEscapement(ctx, now, still) {
  const es = cabin.escapement, swing = still ? 0 : Math.sin(now / 1000 * Math.PI * 2) * 0.6;
  ctx.save(); ctx.translate(es.x, es.y);
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.save(); ctx.rotate(swing);
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();   // the balance wheel's rim
  ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.stroke(); }   // its spokes
  ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath();   // the hairspring, a spiral that breathes with the swing
  for (let a = 0; a < Math.PI * 7; a += 0.2) { const r = 2 + a * (0.9 + swing * 0.12); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();   // the jewel
  const tick = still ? 0 : Math.floor(now / 500), rock = still ? 0 : (Math.sin(now / 1000 * Math.PI * 2) > 0 ? 0.22 : -0.22);
  ctx.save(); ctx.translate(0, 34); ctx.rotate(rock);   // the pallet anchor
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.quadraticCurveTo(0, -4, 16, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(-13, 13); ctx.moveTo(16, 8); ctx.lineTo(13, 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -8); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(0, 56); ctx.rotate((tick % 15) * (Math.PI * 2 / 15));   // the escape wheel, fifteen teeth, a tooth a tick
  ctx.globalAlpha = 0.85; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5; ctx.fillStyle = cabin.floor;
  ctx.beginPath();
  for (let i = 0; i < 15; i++) { const a = (i / 15) * Math.PI * 2, b = a + Math.PI * 2 / 15; ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a + 0.1) * 9, Math.sin(a + 0.1) * 9); ctx.lineTo(Math.cos(b - 0.05) * 9, Math.sin(b - 0.05) * 9); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };

/** The tape's marks for a text: Morse, in units (a dot is one, a dash three, a gap one, between letters three, between words seven), with a long gap before it comes round again. */
function morseTape(text) {
  const marks = []; let at = 0;
  for (const word of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    for (const ch of word) {
      const code = MORSE[ch]; if (!code) continue;
      for (const sym of code) { const len = sym === '.' ? 1 : 3; marks.push({ start: at, len }); at += len + 1; }
      at += 2;
    }
    at += 4;
  }
  return { text, marks, total: at + 20 };
}

/** The telegraph: a paper tape running out of the sounder with the crew's report tapped on it in Morse (hands at work,
 *  hands waiting on the captain), the stylus arm dropping as each mark is made. */
function cabinTelegraph(ctx, now, still, counts) {
  const report = [counts.working && `${counts.working} AT WORK`, (counts.waiting + counts.asking) && `${counts.waiting + counts.asking} AWAIT ORDERS`].filter(Boolean);
  const tg = cabin.telegraph, text = report.length ? report.join(' / ') : counts.total ? 'ALL QUIET' : 'NIGHT WATCH';
  if (!cabin.tape || cabin.tape.text !== text) cabin.tape = morseTape(text);
  const tape = cabin.tape, U = 5, speed = 0.028, offset = still ? 0 : (now * speed) % (tape.total * U);
  const exit = tg.x + 32, end = exit + tg.run;
  ctx.save();
  ctx.globalAlpha = 0.8; ctx.fillStyle = cabin.paper; ctx.fillRect(exit, tg.y - 5, tg.run, 10);   // the paper
  ctx.beginPath(); ctx.moveTo(end, tg.y - 5); ctx.quadraticCurveTo(end + 22, tg.y - 2, end + 14, tg.y + 18); ctx.quadraticCurveTo(end + 8, tg.y + 26, end, tg.y + 5); ctx.closePath(); ctx.fill();   // curling off the table
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#1a120c';
  let printing = false;
  for (const m of tape.marks) {
    let x0 = exit + m.start * U - offset, x1 = x0 + m.len * U - 1.5;
    if (x1 < exit) { x0 += tape.total * U; x1 += tape.total * U; }   // the marks that have gone round
    if (x0 > end || x1 < exit) continue;
    ctx.fillRect(Math.max(exit, x0), tg.y - 1.5, Math.min(end, x1) - Math.max(exit, x0), 3);
    if (x0 <= exit + 2 && x1 >= exit) printing = true;
  }
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 2.5; ctx.lineCap = 'round';   // the stylus arm, down when a mark is being made
  ctx.beginPath(); ctx.moveTo(tg.x + 14, tg.y - 10); ctx.lineTo(tg.x + 29, tg.y - (printing ? 6 : 14)); ctx.stroke();
  ctx.fillStyle = cabin.danger; ctx.beginPath(); ctx.arc(tg.x + 29, tg.y - (printing ? 6 : 14), 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The leagues counter: brass drums behind a window, counting the distance the course has run, the last drum rolling. */
function cabinCounter(ctx, now, still) {
  const ct = cabin.counter, c = cabin.course;
  if (c && !still) {   // how far along the course we are, in leagues: a tenth of the chart's pixels
    const legs = c.points.length - 1, e = now - c.t0, done = Math.min(legs, Math.floor(e / COURSE_LEG_MS)), part = done >= legs ? 0 : (e % COURSE_LEG_MS) / COURSE_LEG_MS;
    let run = 0;
    for (let i = 1; i <= done; i++) run += Math.hypot(c.points[i][0] - c.points[i - 1][0], c.points[i][1] - c.points[i - 1][1]);
    if (done < legs) run += part * Math.hypot(c.points[done + 1][0] - c.points[done][0], c.points[done + 1][1] - c.points[done][1]);
    if (run < cabin.leaguesAt) cabin.leagues += cabin.leaguesAt;   // a new course: bank the last one
    cabin.leaguesAt = run;
  }
  const value = (cabin.leagues + cabin.leaguesAt) / 10;
  ctx.save(); ctx.beginPath(); ctx.rect(ct.x, ct.y, ct.digits * 14, 18); ctx.clip();
  ctx.font = '700 13px Constantia, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < ct.digits; i++) {
    const place = Math.pow(10, ct.digits - 1 - i), digit = Math.floor(value / place) % 10, roll = i === ct.digits - 1 ? value % 1 : (Math.floor(value / (place / 10)) % 10 === 9 ? value % 1 : 0);
    const cx = ct.x + i * 14 + 7;
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#17110a'; ctx.fillRect(ct.x + i * 14 + 1, ct.y, 12, 18);
    ctx.fillStyle = cabin.paper;
    ctx.fillText(String(digit), cx, ct.y + 9 - roll * 18);
    ctx.fillText(String((digit + 1) % 10), cx, ct.y + 27 - roll * 18);
  }
  ctx.restore();
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#000000'; ctx.fillRect(ct.x, ct.y, ct.digits * 14, 4); ctx.fillRect(ct.x, ct.y + 14, ct.digits * 14, 4);   // the drums' shading
}

/** The sea serpent swimming: humps rising and sinking in turn, the head lifting, ripples where it breaks the water. */
function cabinSerpent(ctx, now, still) {
  const sp = cabin.serpent, ink = cabin.ink, ph = still ? 0 : now / 1400;
  ctx.save(); ctx.translate(sp.x, sp.y); ctx.lineCap = 'round';
  [-54, -18, 18].forEach((hx, i) => {
    const lift = still ? 0 : Math.sin(ph + i * 1.1) * 5, r = 16 + (still ? 0 : Math.sin(ph + i * 1.1) * 2);
    ctx.globalAlpha = 0.5; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, lift, r, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(hx - 3, lift - r); ctx.lineTo(hx, lift - r - 8); ctx.lineTo(hx + 3, lift - r); ctx.closePath(); ctx.fill();   // the fin
    ctx.globalAlpha = 0.2; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(hx, lift + 2, r + 6, 3, 0, 0, Math.PI * 2); ctx.stroke();   // the water round it
  });
  const hl = still ? 0 : Math.sin(ph + 3.5) * 6;
  ctx.globalAlpha = 0.5; ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(34, 0); ctx.quadraticCurveTo(44, -16 + hl, 56, -14 + hl); ctx.lineTo(66, -20 + hl); ctx.lineTo(70, -14 + hl); ctx.lineTo(66, -8 + hl); ctx.quadraticCurveTo(56, -4 + hl * 0.5, 50, 0); ctx.closePath(); ctx.fill();   // the head
  ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(70, -14 + hl); ctx.lineTo(78, -16 + hl); ctx.moveTo(70, -14 + hl); ctx.lineTo(77, -11 + hl); ctx.stroke();   // the tongue
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.paper; ctx.beginPath(); ctx.arc(61, -15 + hl, 1.4, 0, Math.PI * 2); ctx.fill();   // the eye
  ctx.restore();
}

/** An oil drip from the left pipe's flange: a drop swelling, letting go, falling faster, and a ring where it lands. */
function cabinDrip(ctx, now, still) {
  if (still) return;
  const d = cabin.drip;
  if (!cabin.dripAt) cabin.dripAt = now;
  const age = now - cabin.dripAt;
  if (age > 7000) { cabin.dripAt = now + 1000 + Math.random() * 3000; return; }
  if (age < 0) return;
  ctx.save(); ctx.fillStyle = '#2a1a08'; ctx.strokeStyle = cabin.colour;
  if (age < 1800) {   // swelling at the flange
    const r = 1 + (age / 1800) * 2.2;
    ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(d.x, d.y + r, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.lineWidth = 0.8; ctx.stroke();
  } else {
    const t = (age - 1800) / 1000, y = d.y + 3 + t * t * 0.5 * 900;   // falling
    if (y < d.floor) { ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(d.x, y, 1.8, 3.2, 0, 0, Math.PI * 2); ctx.fill(); }
    else {   // landed: a ring spreading and fading
      const since = age - 1800 - Math.sqrt((d.floor - d.y - 3) / 450) * 1000, k = Math.min(1, since / 700);
      if (k < 1) { ctx.globalAlpha = 0.5 * (1 - k); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(d.x, d.floor, 2 + k * 10, 1 + k * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
      else cabin.dripAt = now + 2000 + Math.random() * 4000;
    }
  }
  ctx.restore();
}

/** The Jacob's ladder: an arc struck at the bottom of the rods climbs between them, widening as they lean apart, then strikes again. */
function cabinLadder(ctx, now, still) {
  const ld = cabin.ladder, k = still ? 0.3 : (now % 2400) / 2400, y = ld.y - 4 - k * ld.h, half = 3 + k * 11;
  const glow = ctx.createRadialGradient(ld.x, y, 0, ld.x, y, 18 + k * 10);
  glow.addColorStop(0, '#cfd8ff'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.3 - k * 0.1; ctx.fillStyle = glow; ctx.fillRect(ld.x - 30, y - 30, 60, 60);
  const pts = [[ld.x - half, y]];
  for (let i = 1; i < 5; i++) pts.push([ld.x - half + (2 * half) * i / 5, y + (still ? 0 : (Math.random() - 0.5) * (4 + k * 6))]);
  pts.push([ld.x + half, y]);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [width, alpha, colour] of [[4, 0.2, '#8fa0ff'], [1.5, 0.7, '#cfd8ff'], [0.8, 0.95, '#ffffff']]) {
    ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = width;
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  }
  ctx.restore();
}

/** The parrot perched on the helm's rim: a green body, a red head that bobs, a brass beak, a long blue tail, and a blink. */
function cabinParrot(ctx, now, still) {
  const hm = cabin.helm, px = hm.x + 4, py = hm.y - hm.r - 16, bob = still ? 0 : Math.sin(now / 700) * 1.2, blink = !still && (now % 4300) < 140;
  ctx.save(); ctx.translate(px, py);
  ctx.globalAlpha = 0.9; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5; ctx.lineCap = 'round';   // the feet, gripping the rim
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 2, 9); ctx.lineTo(s * 4, 13); ctx.stroke(); }
  ctx.fillStyle = '#5f8fb8'; ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-12, 20); ctx.lineTo(-7, 20); ctx.lineTo(1, 8); ctx.closePath(); ctx.fill();   // the tail
  ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.ellipse(0, 3, 6, 8, 0.2, 0, Math.PI * 2); ctx.fill();   // the body
  ctx.fillStyle = cabin.working; ctx.beginPath(); ctx.ellipse(-1, 4, 3, 5, 0.2, 0, Math.PI * 2); ctx.fill();   // a yellow wing
  ctx.fillStyle = cabin.danger; ctx.beginPath(); ctx.arc(3, -6 + bob, 4.5, 0, Math.PI * 2); ctx.fill();   // the head
  ctx.fillStyle = cabin.colour; ctx.beginPath(); ctx.moveTo(7, -7 + bob); ctx.lineTo(11, -4 + bob); ctx.lineTo(6, -3 + bob); ctx.closePath(); ctx.fill();   // the beak
  ctx.fillStyle = blink ? cabin.danger : cabin.paper; ctx.beginPath(); ctx.arc(4.5, -7.5 + bob, 1.3, 0, Math.PI * 2); ctx.fill();   // the eye
  if (!blink) { ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(4.8, -7.5 + bob, 0.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** The turbine vent on the boiler: a cowl with six blades spinning with the steam. */
function cabinTurbine(ctx, now, still) {
  const tb = cabin.turbine, steam = cabin.gauges[0].needle / 8;
  if (!still) tb.spin += CABIN_MS * (0.003 + steam * 0.012);
  ctx.save(); ctx.translate(tb.x, tb.y);
  ctx.globalAlpha = 0.9; ctx.fillStyle = cabin.colour; ctx.fillRect(-3, 0, 6, 7);   // the stub
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#0d0906'; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, tb.r + 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.rotate(tb.spin); ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.5) * tb.r * 0.7, Math.sin(a + 0.5) * tb.r * 0.7, Math.cos(a) * tb.r, Math.sin(a) * tb.r); ctx.stroke(); }
  ctx.fillStyle = cabin.ok; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The island's cannon: its barrel, and every so often a shot: smoke at the muzzle, a ball arcing out to sea, a splash where it lands. */
function cabinCannon(ctx, now, still) {
  const cn = cabin.cannon;
  if (!still) {
    if (!cn.at) cn.at = now + 12000 + Math.random() * 15000;
    if (now >= cn.at) { cn.fired = now; cn.at = now + 30000 + Math.random() * 25000; cabinPuff(now, cn.x + cn.dir * 16, cn.y - 8, 8, cn.dir * 0.4, -0.2, 1200, 10); }
  }
  const since = now - cn.fired, recoil = since < 300 ? (1 - since / 300) * 3 : 0;
  ctx.save(); ctx.translate(cn.x - cn.dir * recoil, cn.y);
  ctx.globalAlpha = 0.92; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-cn.dir * 4, 2); ctx.lineTo(cn.dir * 14, -6); ctx.stroke();   // the barrel
  ctx.lineWidth = 1; ctx.strokeStyle = '#000000'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(cn.dir * 14, -6, 1.2, 0, Math.PI * 2); ctx.stroke();   // the muzzle
  ctx.restore();
  if (still || since > 2300) return;
  if (since < 1500) {   // the ball's flight: out and up, then down into the sea
    const k = since / 1500, bx = cn.x + cn.dir * (16 + k * 220), by = cn.y - 8 - Math.sin(k * Math.PI) * 60 + k * 40;
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#0a0604'; ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.strokeStyle = cabin.colour; ctx.lineWidth = 0.8; ctx.stroke();
  } else {   // the splash: a ring spreading, a spout rising and falling
    const k = (since - 1500) / 800, sx = cn.x + cn.dir * 236, sy = cn.y + 32;
    ctx.globalAlpha = 0.5 * (1 - k); ctx.strokeStyle = cabin.paper; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 4 + k * 22, 1.5 + k * 7, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.6 * (1 - k); ctx.fillStyle = cabin.paper; ctx.beginPath(); ctx.ellipse(sx, sy - Math.sin(k * Math.PI) * 14, 2.5, 5 + Math.sin(k * Math.PI) * 6, 0, 0, Math.PI * 2); ctx.fill();
  }
}

let cabinNow = 0;   // the frame's time, for the parts that read it themselves

/** The table's colours, from the theme's: the accent for the brass and the chart's lines, the chrome for the walnut. */
function readCabinColours(colors) {
  const v = (name, fallback) => colors[name] || fallback;
  return { colour: v('accent', '#d4aa4f'), floor: v('chrome', '#1a120c'), ink: v('text-dim', '#b89c6e'), ok: v('ok', '#4fa38a'), danger: v('danger', '#b8322a'), copper: v('attention', '#d2763a'), paper: v('text', '#efe2c4'), working: v('working', '#e0a93a'), asking: v('asking', '#a05a9c') };
}
const COLOUR_KEYS = ['colour', 'floor', 'ink', 'ok', 'danger', 'copper', 'paper', 'working', 'asking'];

/** Lays the table out for the window and draws what stands still on it: at the start, on a new size, and when the colours change. */
function cabinSize(info) {
  Object.assign(cabin, readCabinColours(info.colors));
  cabin.w = info.width; cabin.h = info.height; cabin.dpr = info.dpr;
  cabinLayout(cabin.w, cabin.h);
  cabin.screen = cabinScreen(cabin.w, cabin.h, cabin.dpr);
}

/** One frame: the table as it stands, the lamp's glow, the gears turning and the piston working, the governor and chain, the gauges, clock and lamps, the course, the airship, the bell, the steam. */
function cabinFrame(ctx, now, still, counts) {
  const { screen } = cabin;
  if (!screen) return;
  const w = cabin.w, hgt = cabin.h;
  ctx.globalAlpha = 1; ctx.fillStyle = cabin.floor; ctx.fillRect(0, 0, w, hgt);
  ctx.drawImage(screen, 0, 0, w, hgt);
  const glow = ctx.createRadialGradient(cabin.lamp.x, cabin.lamp.y, 0, cabin.lamp.x, cabin.lamp.y, hgt * 0.7);   // the lamp, breathing
  glow.addColorStop(0, '#ffb347'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = still ? 0.11 : 0.11 + Math.sin(now / 1900) * 0.03; ctx.fillStyle = glow; ctx.fillRect(0, 0, w, hgt);
  cabinHaze(ctx, now, still, w);
  cabinSerpent(ctx, now, still);
  cabinCourse(ctx, now, still, w, hgt);
  if (!still) cabinAirship(ctx, now, w, hgt);
  const angles = cabin.gears.map((g) => (still ? 0 : now * g.speed) + g.phase);
  cabinChain(ctx, angles[3], still);
  cabinPiston(ctx, angles[3], now, still);
  cabin.gears.forEach((g, i) => cabinGear(ctx, g, angles[i]));
  for (const g of cabin.gauges) cabinGauge(ctx, g, counts, still);
  cabinGovernor(ctx, now, still);
  cabinClock(ctx, still);
  cabinLamps(ctx, counts);
  cabinHelm(ctx, still);
  cabinParrot(ctx, now, still);
  cabinBell(ctx, now, still);
  cabinBoiler(ctx, now, still);
  cabinTesla(ctx, now, still);
  cabinEscapement(ctx, now, still);
  cabinTelegraph(ctx, now, still, counts);
  cabinCounter(ctx, now, still);
  cabinDrip(ctx, now, still);
  cabinLadder(ctx, now, still);
  cabinTurbine(ctx, now, still);
  cabinCannon(ctx, now, still);
  cabinBottle(ctx, now, still);
  cabinPennant(ctx, now, still);
  cabinLantern(ctx, now, still);
  if (!still) cabinSteam(ctx, now);
}

floor({
  fps: 16,
  layout(ctx, info) { cabinSize(info); },
  draw(ctx, now, info) {
    cabinNow = now;
    const colours = readCabinColours(info.colors);
    if (COLOUR_KEYS.some((k) => colours[k] !== cabin[k])) cabinSize(info);
    if (!cabin.started) {
      cabin.started = true;
      cabin.puffAt = now + 4000 + Math.random() * 6000;
      cabin.airshipAt = now + 9000 + Math.random() * 12000;
    }
    cabinFrame(ctx, now, info.still, info.sessions);
  },
});
