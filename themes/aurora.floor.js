// Aurora's floor: the northern lights folding over a dark lake. Three curtains of light hang across the sky, green and
// bright along their lower edge with a touch of pink beneath, blooming toward violet and fading to blue at their tops,
// folding and swaying slowly. Stars fill the sky behind them. Below the horizon, the lake holds a soft, rippling
// reflection of the aurora under two dark ridges, and bare trees lean over a snowy bank at the bottom right. The accent
// colour is blended a little into the aurora's green and the glow beneath it.
//
// The aurora moves a little faster and shines a little brighter while sessions are working (up to three); with nothing
// running it drifts slowly and dimmer. With reduce motion on, it's one still picture.
//
// Drawn with the 2D canvas into pictures of the floor's own, then put down on the floor: the sky with its stars and the
// aurora (softened with a blur), the lake and its reflection, the ridges, and the bank and trees, which are drawn once for
// each size of the window.

const FPS = 24;               // the aurora moves slowly, so this many frames a second is plenty
const MAX_WORKING = 3;        // sessions past this many make no further difference
const MAX_PICTURE_WIDTH = 1800;
const MAX_LIGHT_SCALE = 0.75; // the aurora is blurred, so its own picture can be smaller still

const stars = Array.from({ length: 980 }, () => ({
  x: Math.random(), y: Math.random() * 0.79, size: 0.22 + Math.pow(Math.random(), 6) * 0.95,
  phase: Math.random() * 6.28, brightness: 0.12 + Math.random() * 0.56,
}));
const farRidge = [.785, .756, .771, .735, .759, .704, .735, .721, .767, .755, .787, .752, .717, .752, .737, .690, .726, .715, .755, .744, .781, .769, .786];
const nearRidge = [.761, .747, .704, .736, .728, .765, .753, .777, .792, .801, .797, .806, .803, .795, .794, .781, .761, .773, .740, .757, .721, .744, .758];
const curtains = [
  { start: -0.23, span: 0.91, level: 0.28, slope: 0.41, phase: 0.8, strength: 0.49, lean: -0.07 },
  { start: 0.13, span: 0.93, level: 0.63, slope: 0.24, phase: 3.5, strength: 0.37, lean: 0.015 },
  { start: 0.51, span: 0.64, level: 0.76, slope: -0.49, phase: 6.1, strength: 0.26, lean: 0.055 },
];

let width = 1, height = 1, scale = 1;
let sky, scene, aurora, light, terrain, foreground;   // the pictures, and their 2D contexts
let clock = 0;          // the aurora's own time, in seconds: runs faster while sessions work
let pace = 0.7;         // how fast that clock runs now, easing toward what the working sessions ask for
let liveliness = 0.75;  // how bright the aurora is now, easing the same way
let lastNow = 0;

// The accent colour is blended a little into the aurora's green and the glow under it, so the sky leans toward it while
// still reading as the northern lights. The pink fringe and the blue tops keep their own colours.
const ACCENT_IN_AURORA = 0.3;
const ACCENT_IN_GLOW = 0.35;
let tintFor = '';
let tint = null;   // the aurora's colours with the accent blended in

/** The aurora's colours for this accent, worked out once each time the accent changes. */
function tintAurora(accent) {
  if (accent === tintFor && tint) return;
  tintFor = accent;
  const a = rgb(accent, [79, 240, 192]);
  const blend = (c, k) => c.map((v, i) => Math.round(v + (a[i] - v) * k));
  tint = {
    edge: blend([148, 242, 135], ACCENT_IN_AURORA).join(','),   // the bright lower edge
    body: blend([76, 231, 75], ACCENT_IN_AURORA).join(','),     // just above it
    fade: blend([56, 159, 92], ACCENT_IN_AURORA).join(','),     // where the green fades out
    bloomFrom: blend([73, 219, 77], ACCENT_IN_AURORA),          // the green a bloom turns violet from, as [r, g, b]
    glow: blend([47, 113, 97], ACCENT_IN_GLOW).join(','),       // the glow on the sky under the aurora
  };
}

/** A colour from the theme as [r, g, b] from 0 to 255: #rgb, #rrggbb or rgb(...). */
function rgb(colour, fallback) {
  const s = String(colour || '').trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16));
  m = /^#([0-9a-f]{6})/i.exec(s);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (m) return [m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)));
  return fallback;
}

/**
 * A ridge along the horizon, through the given heights (shares of the window's height, so a larger number is lower).
 * Where two slopes meet in a valley they overlap in a sharp corner, as one mountain's flank runs into the next; the tops
 * and the slopes between are rounded, each top by an amount of its own, some broad and some nearly pointed.
 */
function ridge(ctx, points, colour, horizon) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  const step = width / (points.length - 1);
  ctx.lineTo(0, points[0] * height);
  for (let i = 1; i < points.length - 1; i++) {
    const y = points[i] * height;
    const before = points[i - 1] * height;
    const after = points[i + 1] * height;
    if (y > before && y > after) { ctx.lineTo(i * step, y); continue; }   // a valley: a clean corner
    const top = y < before && y < after;
    const rounding = top ? 0.16 + 0.34 * ((i * 7) % 5) / 4 : 0.3;      // tops from nearly pointed to broad
    ctx.lineTo((i - rounding) * step, y + (before - y) * rounding);
    ctx.quadraticCurveTo(i * step, y, (i + rounding) * step, y + (after - y) * rounding);
  }
  ctx.lineTo(width, points[points.length - 1] * height);
  ctx.lineTo(width, horizon + 1);
  ctx.closePath();
  ctx.fill();
}

/**
 * One curtain of the aurora, as a row of strokes of light rising from its lower edge: each folds and sways with time,
 * and is coloured from the bottom up, pink just under the edge, bright green, blooming toward violet, then blue at the top.
 */
function drawCurtain(curtain, t) {
  const { level, phase, start, span, slope, lean } = curtain;
  const strength = curtain.strength * liveliness;
  const columns = 270;
  const primary = 0.5 + 0.21 * Math.sin(t * 0.076 + phase);
  for (let column = 0; column <= columns; column++) {
    const u = column / columns;
    const bend = u * 5.9 + phase;
    const fold = Math.sin(bend + 0.61 * Math.sin(t * 0.30 + u * 6 + phase));
    const sway = Math.sin(u * 8.5 - t * 0.44 + phase);
    const x = width * (start + u * span + fold * 0.041 + sway * 0.014);
    const y = height * (level + u * slope + fold * 0.094 + 0.019 * Math.sin(u * 13 + t * 0.25 + phase));
    const tipX = x + (lean + 0.043 * fold + 0.025 * sway) * width;
    const tipY = y - height * (0.25 + 0.28 * (0.5 + 0.5 * Math.cos(u * 7 + phase)));
    const envelope = Math.sin(Math.PI * u);
    const offset = (u - primary) * 5;
    const folds = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(u * 17 + phase), 2);
    const fibers = 0.76 + 0.24 * Math.sin(u * 88 + fold * 4);
    const alpha = strength * envelope * folds * fibers * (0.34 + 0.66 * Math.exp(-offset * offset));
    const pink = Math.pow(0.5 + 0.5 * Math.sin(u * 9 - t * 0.14 + phase), 5);
    const bloom = Math.pow(0.5 + 0.5 * Math.sin(t * 0.31 + phase + u * 7), 3)
                * Math.pow(0.5 + 0.5 * Math.cos(t * 0.217 - u * 12 + phase * 2), 2);
    const blue = Math.pow(0.5 + 0.5 * Math.cos(u * 7 + t * 0.12 + phase), 3);
    const emission = light.createLinearGradient(x, y, tipX, tipY);
    emission.addColorStop(0, 'rgba(45,136,70,0)');
    emission.addColorStop(0.021, `rgba(226,119,178,${alpha * pink * 0.48})`);
    const [br, bg, bb] = tint.bloomFrom;
    emission.addColorStop(0.045, `rgba(${tint.edge},${alpha})`);
    emission.addColorStop(0.15, `rgba(${tint.body},${alpha * 0.76})`);
    emission.addColorStop(0.17 + bloom * 0.22, `rgba(${Math.round(br + bloom * (222 - br))},${Math.round(bg + bloom * (116 - bg))},${Math.round(bb + bloom * (183 - bb))},${alpha * (0.71 - bloom * 0.07)})`);
    emission.addColorStop(0.43, `rgba(${tint.fade},${alpha * 0.32})`);
    emission.addColorStop(0.68, `rgba(86,143,238,${alpha * blue * 0.32})`);
    emission.addColorStop(1, 'rgba(86,143,238,0)');
    light.strokeStyle = emission;
    light.lineCap = 'round';
    light.lineWidth = Math.max(4, width / columns * 3.8);
    light.beginPath();
    light.moveTo(x, y);
    light.bezierCurveTo(x + sway * width * 0.026, y + (tipY - y) * 0.29,
                        tipX - sway * width * 0.019, y + (tipY - y) * 0.70, tipX, tipY);
    light.stroke();
  }
}

/** The bare trees over the bank: branching limbs, the same every time (from a fixed seed), drawn once per size. */
function drawTrees() {
  let seed = 18278;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const branch = (x, y, length, angle, thickness, depth) => {
    const bend = angle + (random() - 0.5) * 0.95;
    const jointX = x + Math.cos(angle) * length * 0.46;
    const jointY = y + Math.sin(angle) * length * 0.46;
    const endX = jointX + Math.cos(bend) * length * 0.54;
    const endY = jointY + Math.sin(bend) * length * 0.54;
    const root = Math.max(0.4, thickness) * 0.5;
    const middle = root * 0.72;
    const tip = root * (depth > 0 ? 0.55 : 0.10);
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    const bx = -Math.sin(bend), by = Math.cos(bend);
    foreground.beginPath();
    foreground.moveTo(x + nx * root, y + ny * root);
    foreground.lineTo(jointX + (nx + bx) * middle * 0.5, jointY + (ny + by) * middle * 0.5);
    foreground.lineTo(endX + bx * tip, endY + by * tip);
    foreground.lineTo(endX - bx * tip, endY - by * tip);
    foreground.lineTo(jointX - (nx + bx) * middle * 0.5, jointY - (ny + by) * middle * 0.5);
    foreground.lineTo(x - nx * root, y - ny * root);
    foreground.closePath();
    foreground.fill();
    if (thickness > height * 0.013) {
      // A faint edge of light from the aurora along the thicker limbs.
      foreground.strokeStyle = 'rgba(105,148,137,.16)';
      foreground.lineWidth = Math.max(0.65, thickness * 0.075);
      foreground.beginPath();
      foreground.moveTo(x - nx * root * 0.86, y - ny * root * 0.86);
      foreground.lineTo(jointX - (nx + bx) * middle * 0.43, jointY - (ny + by) * middle * 0.43);
      foreground.lineTo(endX - bx * tip * 0.86, endY - by * tip * 0.86);
      foreground.stroke();
    }
    if (depth === 0) return;
    // Overlap the tapered shapes so angled limbs share a solid joint.
    foreground.beginPath();
    foreground.arc(endX, endY, Math.max(tip, root * 0.57), 0, Math.PI * 2);
    foreground.fill();
    const side = random() < 0.5 ? -1 : 1;
    branch(endX, endY, length * (0.60 + random() * 0.19), bend + side * (0.08 + random() * 0.31), thickness * 0.57, depth - 1);
    const fork = 0.45 + random() * 0.52;
    branch(jointX + (endX - jointX) * fork, jointY + (endY - jointY) * fork,
           length * (0.42 + random() * 0.27), bend - side * (0.43 + random() * 0.64), thickness * 0.40, depth - 1);
    if (depth > 2) branch(jointX, jointY, length * (0.32 + random() * 0.22), angle + side * (1 + random() * 0.3), thickness * 0.30, depth - 2);
  };
  foreground.fillStyle = '#091617';
  branch(width * 0.65, height * 1.06, height * 0.18, -1.85, height * 0.008, 6);
  branch(width * 0.99, height * 1.06, height * 0.21, -1.68, height * 0.012, 6);
  foreground.fillStyle = '#050c0e';
  branch(width * 0.82, height * 1.04, height * 0.31, -1.99, height * 0.041, 8);
  branch(width * 0.805, height * 0.985, height * 0.33, -1.12, height * 0.025, 7);
  for (const [x, y, size] of [[0.59, 0.987, 0.028], [0.72, 0.971, 0.019], [0.91, 0.944, 0.032], [0.97, 0.905, 0.025]]) {
    branch(width * x, height * y, height * size, -1.45, height * 0.0024, 4);
  }
}

/** The snowy bank at the bottom right, with drifts of snow on it, drawn once per size. */
function drawBank() {
  const bank = new Path2D();
  bank.moveTo(width * 0.48, height);
  bank.bezierCurveTo(width * 0.55, height * 0.985, width * 0.59, height * 0.945, width * 0.66, height * 0.959);
  bank.bezierCurveTo(width * 0.73, height * 0.972, width * 0.77, height * 0.915, width * 0.83, height * 0.938);
  bank.bezierCurveTo(width * 0.89, height * 0.955, width * 0.95, height * 0.867, width, height * 0.883);
  bank.lineTo(width, height);
  bank.closePath();
  foreground.fillStyle = '#0b151a';
  foreground.fill(bank);
  foreground.save();
  foreground.clip(bank);
  for (const [x, y, spread, rise] of [[0.61, 0.983, 0.10, 0.018], [0.74, 0.974, 0.08, 0.024], [0.86, 0.958, 0.11, 0.031], [0.95, 0.917, 0.08, 0.024], [0.99, 0.973, 0.11, 0.035]]) {
    const snow = foreground.createLinearGradient(0, height * (y - rise), 0, height * (y + rise));
    snow.addColorStop(0, '#253738');
    snow.addColorStop(1, 'rgba(25,43,47,0)');
    foreground.fillStyle = snow;
    foreground.beginPath();
    foreground.moveTo(width * (x - spread), height * y);
    foreground.bezierCurveTo(width * (x - spread * 0.44), height * (y - rise * 0.22),
                             width * (x + spread * 0.23), height * (y - rise * 1.4), width * (x + spread), height * y);
    foreground.bezierCurveTo(width * (x + spread * 0.39), height * (y + rise),
                             width * (x - spread * 0.49), height * (y + rise * 0.81), width * (x - spread), height * y);
    foreground.fill();
  }
  foreground.restore();
}

/** The whole scene at time t, onto the floor. */
function drawScene(ctx, info, t) {
  const chrome = info.colors.chrome || '#050b13';
  const [cr, cg, cb] = rgb(chrome, [5, 11, 19]);
  const horizon = height * 0.82;
  tintAurora(info.colors.accent || '#4ff0c0');

  // The sky: darkest overhead, a little lighter toward the horizon, with a faint glow under the aurora, and the stars.
  scene.globalCompositeOperation = 'source-over';
  // Close to black overhead, turning to night blue lower down and lightest just above the mountains.
  const night = scene.createLinearGradient(0, 0, 0, horizon);
  night.addColorStop(0, '#000104');
  night.addColorStop(0.4, info.colors['chrome-3'] || '#02050a');
  night.addColorStop(0.77, info.colors.panel || '#08131d');
  night.addColorStop(1, '#102331');
  scene.fillStyle = night;
  scene.fillRect(0, 0, width, height);
  const glow = scene.createRadialGradient(width * 0.53, height * 0.48, 0, width * 0.53, height * 0.48, height * 0.63);
  glow.addColorStop(0, `rgba(${tint.glow},.19)`);
  glow.addColorStop(1, `rgba(${tint.glow},0)`);
  scene.fillStyle = glow;
  scene.fillRect(0, 0, width, horizon);
  scene.fillStyle = '#cfdeec';
  for (const star of stars) {
    scene.globalAlpha = star.brightness * (0.84 + 0.16 * Math.sin(t * 0.75 + star.phase));
    scene.beginPath();
    scene.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    scene.fill();
  }
  scene.globalAlpha = 1;

  // The aurora, drawn on its own and softened onto the sky.
  light.clearRect(0, 0, width, height);
  light.globalCompositeOperation = 'screen';
  for (const curtain of curtains) drawCurtain(curtain, t);
  scene.save();
  scene.globalCompositeOperation = 'screen';
  scene.filter = `blur(${Math.max(3, height * 0.007) * scale}px)`;
  scene.drawImage(aurora, 0, 0, width, height);
  scene.restore();

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sky, 0, 0, width, height);

  // The lake, and the aurora reflected in it as one soft, slightly rippling picture.
  const lake = ctx.createLinearGradient(0, horizon, 0, height);
  lake.addColorStop(0, '#0c1b22');
  lake.addColorStop(1, chrome);
  ctx.fillStyle = lake;
  ctx.fillRect(0, horizon, width, height - horizon);
  const waterDepth = height - horizon;
  const overscan = height * 0.04;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, width, waterDepth);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.40 + 0.035 * Math.sin(t * 0.62);
  ctx.filter = `blur(${Math.max(5, height * 0.016) * (info.dpr || 1)}px)`;   // a filter's blur is in the canvas's own pixels
  ctx.translate(Math.sin(t * 0.44) * overscan * 0.22, horizon - overscan);
  ctx.scale(1, -1);
  ctx.drawImage(aurora, 0, aurora.height * 0.23, aurora.width, aurora.height * 0.62,
                -overscan, -waterDepth - overscan * 2, width + overscan * 2, waterDepth + overscan * 2);
  ctx.restore();
  const falloff = ctx.createLinearGradient(0, horizon, 0, height);
  falloff.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
  falloff.addColorStop(1, `rgba(${cr},${cg},${cb},.46)`);
  ctx.fillStyle = falloff;
  ctx.fillRect(0, horizon, width, waterDepth);

  // The ridges across the lake, and the bank and trees in front.
  ridge(ctx, farRidge.map((y) => 0.76 + (y - 0.70) * 0.43), '#0b1925', horizon);
  ridge(ctx, nearRidge.map((y) => 0.79 + (y - 0.70) * 0.25), chrome, horizon);
  ctx.drawImage(terrain, 0, 0, width, height);
  ctx.restore();
}

/** How lively the aurora should be for the sessions working now. */
function wanted(info) {
  const working = info.sessions ? Math.min(MAX_WORKING, info.sessions.working || 0) : 0;
  return { pace: 0.7 + 0.15 * working, liveliness: 0.75 + 0.1 * working };
}

floor({
  fps: FPS,
  layout(ctx, info) {
    width = Math.max(1, info.width);
    height = Math.max(1, info.height);
    scale = Math.min(info.dpr || 1, 1.5, MAX_PICTURE_WIDTH / width);
    const lightScale = Math.min(scale, MAX_LIGHT_SCALE);
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    sky = new OffscreenCanvas(w, h);
    terrain = new OffscreenCanvas(w, h);
    aurora = new OffscreenCanvas(Math.max(1, Math.round(width * lightScale)), Math.max(1, Math.round(height * lightScale)));
    scene = sky.getContext('2d');
    foreground = terrain.getContext('2d');
    light = aurora.getContext('2d');
    scene.setTransform(scale, 0, 0, scale, 0, 0);
    foreground.setTransform(scale, 0, 0, scale, 0, 0);
    light.setTransform(lightScale, 0, 0, lightScale, 0, 0);
    drawBank();
    drawTrees();
    lastNow = 0;
  },
  draw(ctx, now, info) {
    const want = wanted(info);
    if (info.still) {
      liveliness = want.liveliness;
      drawScene(ctx, info, 0);
      return;
    }
    const dt = lastNow ? Math.min(100, now - lastNow) : 1000 / FPS;   // a long gap (the window was hidden) is not a jump
    lastNow = now;
    // Ease toward the pace and brightness asked for, so a session starting or stopping doesn't jolt the sky.
    const ease = Math.min(1, dt / 3000);
    pace += (want.pace - pace) * ease;
    liveliness += (want.liveliness - liveliness) * ease;
    clock += (dt / 1000) * pace;
    drawScene(ctx, info, clock);
  },
});
