// Peach Blossom's floor: petals drifting down rice paper. Each petal's place is worked out from the time alone, so the
// scene is the same whatever the frame rate, and with reduce motion on it is simply one moment of it. A light breeze
// carries them sideways, a little stronger the more sessions are at work.

const PINKS = ['#d9628f', '#e27fa6', '#c94a7e', '#eb9dbb'];
let petals = [], width = 0, height = 0;

/** Petals scattered over the window: about one for every 14,000 square pixels, 120 at most. */
function scatter(info) {
  width = info.width; height = info.height;
  const count = Math.max(12, Math.min(120, Math.round(width * height / 14000)));
  petals = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random(),                          // where in its fall it starts, 0 to 1
    fall: 0.012 + Math.random() * 0.016,       // pixels a millisecond
    size: 6 + Math.random() * 9,
    sway: 14 + Math.random() * 26,             // how far it swings side to side
    swing: 0.0006 + Math.random() * 0.0008,    // how fast it swings
    turn: (Math.random() - 0.5) * 0.0016,      // how fast it turns
    phase: Math.random() * Math.PI * 2,
    colour: PINKS[Math.floor(Math.random() * PINKS.length)],
    alpha: 0.75 + Math.random() * 0.25,
  }));
}

/** One petal, point down, round at the top with a small notch. */
function petal(ctx, size) {
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.bezierCurveTo(size * 0.9, size * 0.3, size * 0.75, -size * 0.8, size * 0.12, -size * 0.7);
  ctx.lineTo(0, -size * 0.45);
  ctx.lineTo(-size * 0.12, -size * 0.7);
  ctx.bezierCurveTo(-size * 0.75, -size * 0.8, -size * 0.9, size * 0.3, 0, size);
  ctx.fill();
}

floor({
  fps: 30,
  layout(ctx, info) { scatter(info); },
  draw(ctx, now, info) {
    if (info.width !== width || info.height !== height) scatter(info);
    const t = info.still ? 0 : now;
    ctx.globalAlpha = 1;
    ctx.fillStyle = info.colors.chrome || '#f1eadb';
    ctx.fillRect(0, 0, width, height);

    // A wash of jade low down, as of hills a long way off.
    const wash = ctx.createLinearGradient(0, height * 0.55, 0, height);
    wash.addColorStop(0, 'rgba(47, 125, 91, 0)');
    wash.addColorStop(1, 'rgba(47, 125, 91, 0.07)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);

    const working = (info.sessions && info.sessions.working) || 0;
    const breeze = 0.004 + Math.min(working, 6) * 0.0015;   // pixels a millisecond, to the right
    const span = height + 60, wide = width + 80;
    for (const p of petals) {
      const y = ((p.y * span + t * p.fall) % span) - 30;
      const x = (((p.x + t * breeze * (0.6 + p.size / 12) + Math.sin(t * p.swing + p.phase) * p.sway) % wide) + wide) % wide - 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.phase + t * p.turn + Math.sin(t * p.swing + p.phase) * 0.5);
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(t * p.swing * 1.3 + p.phase)));   // it tumbles: seen flat on, then edge on
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.colour;
      petal(ctx, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
});
