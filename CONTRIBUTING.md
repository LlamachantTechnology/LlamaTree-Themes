# Contributing a theme

A theme is a JSON file of colours that LlamaTree applies to the whole app: its own page, the terminals and the diff editor. It's data: the app takes the names it knows and checks every value, so a theme can't restyle anything else or load a file. Its one piece of code can be a [floor of its own](#a-floor-of-its-own), which LlamaTree runs sandboxed, apart from the app.

## Layout

One file per theme under `themes/`. The file's name is the theme's id: letters, digits and hyphens, 40 at most, not starting or ending with a hyphen, and not `light`, `dark`, `system` or the name of a theme LlamaTree comes with (`nerds`, `tron`, `matrix`). It's how the app knows the theme once installed, so it can't change without the theme becoming a new one.

```
themes/<id>.json
```

```json
{
  "name": "Deep Sea",
  "version": "1.0.0",
  "description": "Navy water with sea-glass teal for lines and the accent",
  "author": "Your name",
  "base": "dark",
  "accent": { "line": "#3ec7c2", "strong": "#136b72" },
  "colors": { "chrome": "#0b1622", "text": "#c9dbe8" },
  "terminal": { "background": "#08121c", "foreground": "#c9dbe8" },
  "diff": { "insertedLine": "#1f6b4a44" }
}
```

- **For the gallery:** `name`, `version` (major.minor.patch) and `description` are needed; `author` and `minAppVersion` (the oldest LlamaTree it works with) are optional.
- **The look:** `base` (`dark` or `light`: what fills in every colour you leave out), `font`, `glow`, `grid`, `rain`, `cursor` (`"light-cycle"`), `monochrome` (everything in shades of the accent), `terminalBackground` (0 to 100: how solid the terminals are over the window's floor), `accent` (its own, in place of the one the user picked) or `accents` (ones it suggests), and the three colour sections. See [Themes in LlamaTree's guide](https://github.com/LlamachantTechnology/LlamaTree/blob/main/docs/customize.md#your-own-theme) for what each colour is.
- `schema/theme.schema.json` describes all of it for your editor; `node tools/validate.mjs` checks it the way the app does, strictly: anything the app would leave out of a theme is an error here.

The quickest start is LlamaTree's **Save as a new theme…** (palette button), which writes the theme on screen with every colour spelled out. Change it from there, keeping it under 64 KB. Write out every colour you care about: one you leave out comes from Light or Dark, and may not suit your others.

## A floor of its own

A theme can draw the window's floor itself, the way Matrix's rain does: an animated scene behind LlamaTree's title bar, tabs and panels. It's a script beside the theme's file:

```
themes/<id>.json
themes/<id>.floor.js
```

```js
let stars = [];
floor({
  fps: 30,                        // how often draw is called: 30 if left out, 60 at most
  layout(ctx, info) {             // at the start, and when the window's size changes
    stars = Array.from({ length: 200 }, () => ({ x: Math.random() * info.width, y: Math.random() * info.height }));
  },
  draw(ctx, now, info) {          // each frame: now is in milliseconds
    ctx.fillStyle = info.colors.chrome;
    ctx.fillRect(0, 0, info.width, info.height);
    ctx.fillStyle = info.colors.accent;
    for (const s of stars) ctx.fillRect(s.x, (s.y + now / 50) % info.height, 1.5, 1.5);
  },
});
```

`ctx` is a 2D canvas context the size of the window. `info` holds its `width`, `height` and `dpr`; `still` (draw a picture that stands still: reduce motion is on); the theme's `colors`, with the accent picked; and `sessions`, how many are `working`, `waiting`, `asking`, `idle` and `stopped`, and the `total`. [A floor of its own](https://github.com/LlamachantTechnology/LlamaTree/blob/main/docs/customize.md#a-floor-of-its-own) in LlamaTree's guide has the details.

**What a floor runs in.** LlamaTree never runs a floor on its own page. It runs it in a web worker inside a sandboxed frame with no network (no requests of any kind), no storage, nothing of the app, and no pointer or keyboard. It tells the floor only what's in `info`: never a session's name, folder or output. It pauses the floor while the window is hidden, and takes it away if it stops answering or fails. A floor that tries to do more than draw gets nowhere.

**What's checked here**, on top of that:

- `node tools/validate.mjs` compiles the floor (it's never run here), checks it calls `floor({ draw })` and stays under 256K characters, and refuses one that names the network, storage or messaging (`fetch`, `WebSocket`, `importScripts`, `indexedDB`, `postMessage`, `eval` and the like): a floor has no use for them. Draw everything with the canvas; there are no images or web fonts to load.
- A theme with a floor needs `"minAppVersion": "1.3.2"` or later, since older LlamaTree doesn't draw one (it shows the theme's colours without it).
- **A maintainer reads every floor** before it's merged (`.github/CODEOWNERS`), and the pull request check flags each one it adds or changes. Keep it readable: no minified or generated code, and name things plainly.
- Keep it light: it runs all the time behind someone's work. Draw what changed rather than everything at 60 frames a second, and draw once and stop when `info.still` is true.

## Adding or changing a theme

1. Branch, add or change `themes/<id>.json` (and `themes/<id>.floor.js` for a floor). A changed theme, or a changed floor, needs a higher `version`.
2. Run `node tools/validate.mjs` and `node tools/catalog.mjs --readme`, and commit the README too.
3. Try it: copy the file into your themes folder (palette button › **Open the themes folder**) and pick it. Look at a few sessions, the Git panel, a diff and a dialog, in a running Claude session too.
4. Open a pull request with a screenshot. The validate workflow checks the theme, that a changed theme has a new version, and that the README table is current. A review is needed to merge.

## Publishing

Merging to `main` publishes it: the catalog workflow rebuilds `catalog.json` from every theme and puts it on the rolling [`catalog`](https://github.com/LlamachantTechnology/LlamaTree-Themes/releases/tag/catalog) release. LlamaTree's **Get themes…** lists it from then on (the app keeps what it read for a few minutes; its refresh button reads it again), and anyone with an older version installed is offered the update.
