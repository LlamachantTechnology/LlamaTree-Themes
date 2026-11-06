// Tron's floor: the Grid. The window's floor ruled in faint lines of the accent colour every 32 pixels, with a glow rising
// from the horizon at the bottom. It stands still, so it's drawn again only when the window's size or the colours change.

const PITCH = 32;
let drawn = '';

floor({
  fps: 2,   // nothing moves: often enough to follow a change of accent
  draw(ctx, now, info) {
    const { width: w, height: h } = info, accent = info.colors.accent || '#00e5ff', chrome = info.colors.chrome || '#05080c';
    const key = [w, h, info.dpr, accent, chrome].join('|');
    if (key === drawn) return;
    drawn = key;
    ctx.globalAlpha = 1;
    ctx.fillStyle = chrome;
    ctx.fillRect(0, 0, w, h);
    // The glow at the horizon: an ellipse of the accent, wide and low, fading upwards.
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
    // The lines, a pixel wide.
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = accent;
    for (let x = 0; x < w; x += PITCH) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += PITCH) ctx.fillRect(0, y, w, 1);
  },
});
