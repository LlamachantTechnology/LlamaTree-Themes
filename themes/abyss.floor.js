// Abyss's floor: looking up through deep water at the moving surface. Shafts of sunlight come down through the waves,
// sway with the swell and fade with depth; the surface mirrors the dark water below except where a wave tilts it enough
// to see the sky through it; marine snow sinks, and bubbles wobble up.
//
// The water is a WebGL shader drawn into a canvas of the floor's own, smaller than the window (water is soft, so it looks
// the same and costs far less), then put down on the floor. The bubbles are drawn over it with the 2D canvas. Without
// WebGL the water is a plain gradient with the same bubbles. With reduce motion on, it's one still picture.

const FPS = 30;
const WATER_SCALE = 0.6;       // the water's picture, as a share of the window's width
const WATER_MAX_WIDTH = 1200;  // and never wider than this, in pixels

const WATER_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec3 chrome;
uniform vec3 panel;

// The surface's slope at p: five waves of different lengths and speeds.
vec2 waveSlope(vec2 p) {
  return vec2(1.2, .32) * cos(dot(p, vec2(1.2, .32)) - time * .79) * .15
       + vec2(-.64, 1.81) * cos(dot(p, vec2(-.64, 1.81)) - time * .96) * .085
       + vec2(2.8, 1.4) * cos(dot(p, vec2(2.8, 1.4)) + time * 1.26) * .036
       + vec2(-3.9, 2.7) * cos(dot(p, vec2(-3.9, 2.7)) - time * 1.52) * .022
       + vec2(6.9, -4.8) * cos(dot(p, vec2(6.9, -4.8)) + time * 2.2) * .009;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Marine snow: specks that sink slowly, drifting a little from side to side.
float motes(vec2 p, float layer) {
  p += vec2(sin(time * .26 + layer) * .18, time * (.05 + layer * .03));
  vec2 id = floor(p);
  vec2 center = .2 + .6 * vec2(hash(id + layer), hash(id + 12.3));
  float radius = mix(.022, .075, hash(id + 19.8));
  return (1. - smoothstep(radius * .22, radius, length(fract(p) - center))) * smoothstep(.72, 1., hash(id + 3.5));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (gl_FragCoord.xy - resolution * .5) / resolution.y;
  vec3 ray = normalize(vec3(p.x, p.y + .065, 1.));
  vec3 sun = normalize(vec3(-.16, .39, 1.));
  // The light's way down through the water, swaying as the swell tilts the surface.
  vec3 light = normalize(vec3(-.16 + .05 * sin(time * .33) + .022 * sin(time * .91 + 1.3), .39, 1.));
  float towardSun = max(0., dot(ray, sun));

  // Water takes the red out of the light first: blue-green toward the surface, deep blue below.
  vec3 shallow = panel + vec3(.004, .05, .068);
  vec3 color = mix(chrome, shallow, smoothstep(-.45, .5, p.y));
  color += vec3(.05, .13, .17) * pow(towardSun, 21.) * smoothstep(.03, .93, uv.y);

  // The shafts: sample along the view ray, and follow each sample back up to where its light came through the surface.
  float shafts = 0.;
  for (int i = 0; i < 9; i++) {
    float distance = 1.1 + float(i) * .61;
    vec3 samplePoint = ray * distance;
    float depth = 1.85 - samplePoint.y;
    vec2 entry = samplePoint.xz + light.xz * depth / light.y;
    vec2 slope = waveSlope(entry);
    float bands = .5 + .5 * sin(entry.x * 5.6 + entry.y * .31 + slope.x * 8. + slope.y * 2.);
    float offset = (entry.x + .50) * .65;
    float focus = exp(-offset * offset);
    shafts += pow(bands, 6.) * focus * smoothstep(0., .3, depth) * exp(-max(depth, 0.) * .41);
  }
  color += vec3(.2, .44, .58) * shafts * .27 * smoothstep(.04, .74, uv.y);

  // The surface overhead, where the view ray meets it.
  if (ray.y > .07) {
    float distance = 1.85 / ray.y;
    vec2 surface = ray.xz * distance;
    vec2 slope = waveSlope(surface);
    vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
    vec3 refracted = refract(ray, -normal, 1.333);
    float through = step(.001, length(refracted));          // 0 where the surface reflects everything
    float facing = max(0., dot(ray, normal));
    float window = smoothstep(.025, .29, refracted.y) * through;
    float rim = through * exp(-pow(refracted.y * 11., 2.)); // the bright edge of the window to the sky
    float glare = pow(max(0., dot(refracted, normalize(vec3(-.24, .55, .80)))), 26.);
    float fine = .5 + .5 * sin(surface.y * 3.6 + surface.x * 1.9 + slope.x * 12.);
    float sheen = exp(-abs(slope.y + slope.x * .28 - .08) * 16.) * (.35 + .65 * fine);
    // Outside the window the surface mirrors the dark water below; inside it, the sky shows through.
    vec3 mirror = mix(chrome, panel, .6) + vec3(.02, .045, .07) * facing;
    vec3 sky = panel + vec3(.12, .24, .31);
    vec3 surfaceColor = mix(mirror, sky, window * .55)
                      + vec3(.26, .44, .55) * rim * .22
                      + vec3(.28, .46, .6) * sheen * (.13 + .87 * pow(towardSun, 28.))
                      + vec3(.62, .76, .86) * glare * window * .61;
    float visibility = smoothstep(.07, .44, ray.y) * exp(-distance * .023);
    color = mix(color, surfaceColor, visibility);
  }

  float particles = motes(p * 41. + 6., 1.) * .15 + motes(p * 24., 2.) * .21;
  color += vec3(.43, .6, .7) * particles * (.12 + .88 * uv.y);
  color = mix(color, chrome, .40 * smoothstep(.28, 1.15, length(vec2(p.x * .80, p.y))));
  color += (hash(gl_FragCoord.xy) - .5) * .008;   // a little grain, so the dark gradients don't band
  gl_FragColor = vec4(color, 1.);
}`;

let water;          // { gl, canvas, time, resolution, chrome, panel }, or null without WebGL; undefined until tried
let waterColours = '';
let bubbles = [];

/** A colour from the theme as [r, g, b] from 0 to 1: #rgb, #rrggbb or rgb(...). */
function rgb(colour, fallback) {
  const s = String(colour || '').trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16) / 255);
  m = /^#([0-9a-f]{6})/i.exec(s);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (m) return [m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)) / 255);
  return fallback;
}

/** The water's WebGL canvas and shader, or null when there's no WebGL or the shader won't build. */
function makeWater() {
  if (typeof OffscreenCanvas !== 'function') return null;
  const canvas = new OffscreenCanvas(1, 1);
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 position; void main() { gl_Position = vec4(position, 0., 1.); }');
  const fragment = compile(gl.FRAGMENT_SHADER, WATER_SHADER);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  // One triangle that covers the whole picture.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return {
    gl, canvas,
    time: gl.getUniformLocation(program, 'time'),
    resolution: gl.getUniformLocation(program, 'resolution'),
    chrome: gl.getUniformLocation(program, 'chrome'),
    panel: gl.getUniformLocation(program, 'panel'),
  };
}

/** Sizes the water's picture for the window. */
function sizeWater(info) {
  if (!water) return;
  const w = Math.max(1, Math.round(Math.min(info.width * WATER_SCALE, WATER_MAX_WIDTH)));
  const h = Math.max(1, Math.round(w * info.height / info.width));
  water.canvas.width = w;
  water.canvas.height = h;
  water.gl.viewport(0, 0, w, h);
  water.gl.uniform2f(water.resolution, w, h);
}

/** The water, from the shader, put down over the whole floor; or a plain gradient without WebGL. */
function drawWater(ctx, info, seconds) {
  const colours = info.colors.chrome + '|' + info.colors.panel;
  if (water && colours !== waterColours) {
    waterColours = colours;
    water.gl.uniform3fv(water.chrome, rgb(info.colors.chrome, [0.008, 0.035, 0.07]));
    water.gl.uniform3fv(water.panel, rgb(info.colors.panel, [0.024, 0.075, 0.12]));
  }
  if (water) {
    water.gl.uniform1f(water.time, seconds);
    water.gl.drawArrays(water.gl.TRIANGLES, 0, 3);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(water.canvas, 0, 0, info.width, info.height);
    return;
  }
  const fill = ctx.createLinearGradient(0, 0, 0, info.height);
  fill.addColorStop(0, '#0c3d5e');
  fill.addColorStop(0.2, '#072a45');
  fill.addColorStop(0.55, info.colors.panel || '#06131f');
  fill.addColorStop(1, info.colors.chrome || '#020912');
  ctx.globalAlpha = 1;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, info.width, info.height);
}

const BUBBLE_VENTS = [0.08, 0.24, 0.38, 0.49, 0.62, 0.70, 0.86];   // where the columns rise, as a share of the width
const BUBBLES_PER_VENT = 18;
const STRAY_BUBBLES = 24;

/**
 * Loose columns of bubbles rising from below, as if from vents on the sea floor, with a few strays between them. Each
 * column has a tight core and a wider scatter, so it reads as a stream rather than a band.
 */
function makeBubbles() {
  const bubble = (x) => ({
    x,
    offset: Math.random(),
    radius: 0.7 + Math.pow(Math.random(), 2.4) * 7,
    phase: Math.random() * Math.PI * 2,
  });
  bubbles = [];
  for (const vent of BUBBLE_VENTS) {
    for (let i = 0; i < BUBBLES_PER_VENT; i++) {
      const spread = i % 3 === 0 ? 0.12 : 0.035;
      bubbles.push(bubble(vent + (Math.random() - 0.5) * spread));
    }
  }
  for (let i = 0; i < STRAY_BUBBLES; i++) bubbles.push(bubble(Math.random()));
}

/**
 * The bubbles: small ones stay round and rise almost straight; big ones rise faster, zigzag, flatten and wobble. All of
 * them swell a little as they rise, and fade in at the bottom and out near the top.
 */
function drawBubbles(ctx, info, seconds) {
  const { width: w, height: h } = info;
  for (const b of bubbles) {
    const big = Math.min(1, Math.max(0, (b.radius - 2.5) / 5));
    const rise = (b.offset + seconds * (0.026 + b.radius * 0.006)) % 1;
    const y = h * (1.04 - rise);
    const sway = Math.sin(seconds * (0.9 + b.radius * 0.14) + b.phase);
    const x = b.x * w + sway * (1.5 + big * 9);
    const r = b.radius * (0.8 + 0.32 * rise);
    const flat = 1 - big * (0.22 + 0.08 * Math.sin(seconds * 6 + b.phase));
    const light = (0.30 + 0.57 * rise) * Math.min(1, rise * 12, (1 - rise) * 14);
    const rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rim.addColorStop(0, `rgba(170,214,236,${light * 0.82})`);
    rim.addColorStop(0.47, `rgba(88,140,170,${light * 0.16})`);
    rim.addColorStop(1, `rgba(109,170,204,${light * 0.65})`);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * flat, sway * 0.25 * big, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(8,19,29,${light * 0.19})`;
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(0.55, r * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.29, y - r * 0.42 * flat, r * 0.28, r * 0.12, -0.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(195,226,242,${light * 0.75})`;
    ctx.fill();
  }
}

floor({
  fps: FPS,
  layout(ctx, info) {
    if (water === undefined) water = makeWater();
    sizeWater(info);
    makeBubbles();
  },
  draw(ctx, now, info) {
    // With reduce motion on, one still picture: the water at a moment of its own, a few bubbles on their way up.
    const seconds = info.still ? 20 : now / 1000;
    drawWater(ctx, info, seconds);
    drawBubbles(ctx, info, seconds);
  },
});
