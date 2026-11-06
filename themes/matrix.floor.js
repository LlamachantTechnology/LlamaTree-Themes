// Matrix's floor: glyphs raining down the window in the accent colour. Each column is one drop: a white-hot head, the
// glyph behind it in the accent, and a tail that fades as the floor is washed with its own colour each frame. With
// reduce motion on, a settled picture of the rain stands still.

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:・"=*+-<>¦|ç';
const CELL = 16;
const FONT = `${CELL - 2}px "MS Gothic", "Cascadia Mono", Consolas, Menlo, "DejaVu Sans Mono", monospace`;
let cols = [], rows = 0, width = 0, height = 0, colour = '#39ff6a', floorColour = '#000000';

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/** A drop in every column, staggered so they don't all fall at once, on a floor washed clean. */
function start(ctx, info) {
  width = info.width; height = info.height;
  colour = info.colors.accent || '#39ff6a';
  floorColour = info.colors.chrome || '#000000';
  ctx.globalAlpha = 1;
  ctx.fillStyle = floorColour;
  ctx.fillRect(0, 0, width, height);
  cols = Array.from({ length: Math.ceil(width / CELL) }, () => ({ y: -Math.random() * height * 1.6 / CELL, speed: 0.4 + Math.random() * 0.8 }));
  rows = Math.ceil(height / CELL);
}

/** One step of the rain. */
function step(ctx) {
  ctx.fillStyle = floorColour; ctx.globalAlpha = 0.16; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1;   // the tails fade
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i], y = Math.floor(c.y);
    if (y >= 0 && y < rows + 1) {
      ctx.fillStyle = colour; ctx.globalAlpha = 0.6;
      ctx.fillText(glyph(), i * CELL + 1, (y - 1) * CELL);   // last cell: back to the accent
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8;
      ctx.fillText(glyph(), i * CELL + 1, y * CELL);         // the head, white-hot
      ctx.globalAlpha = 1;
    }
    c.y += c.speed;
    if (c.y > rows + 2 && Math.random() < 0.035) { c.y = -Math.random() * 20; c.speed = 0.4 + Math.random() * 0.8; }
  }
}

floor({
  fps: 14,   // a step every 70 milliseconds or so
  layout(ctx, info) { start(ctx, info); },
  draw(ctx, now, info) {
    if ((info.colors.accent || '#39ff6a') !== colour || (info.colors.chrome || '#000000') !== floorColour) start(ctx, info);
    if (info.still) { start(ctx, info); for (let i = 0; i < 60; i++) step(ctx); return; }   // a settled picture, not a moving one
    step(ctx);
  },
});
