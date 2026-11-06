# Contributing a theme

A theme is a JSON file of colours that LlamaTree applies to the whole app: its own page, the terminals and the diff editor. It's only data: the app takes the names it knows and checks every value, so a theme can't restyle anything else, load a file or run anything.

## Layout

One file per theme under `themes/`. The file's name is the theme's id: letters, digits and hyphens, 40 at most, not starting or ending with a hyphen, and not `light`, `dark` or `system`. It's how the app knows the theme once installed, so it can't change without the theme becoming a new one.

**The themes LlamaTree comes with**, Matrix, Nerds and Tron, live here too. The app ships a copy of each, so they're there without Get themes. A newer version published here reaches people through Get themes (it offers **Update**, and the newer copy takes the place of the app's own), and the next LlamaTree release ships it: a release checks its copies match what's published here (`tools/sync-themes.mjs` in LlamaTree).

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

## Adding or changing a theme

1. Branch, add or change `themes/<id>.json`. A changed theme needs a higher `version`.
2. Run `node tools/validate.mjs` and `node tools/catalog.mjs --readme`, and commit the README too.
3. Try it: copy the file into your themes folder (palette button › **Open the themes folder**) and pick it. Look at a few sessions, the Git panel, a diff and a dialog, in a running Claude session too.
4. Open a pull request with a screenshot. The validate workflow checks the theme, that a changed theme has a new version, and that the README table is current. A review is needed to merge.

## Publishing

Merging to `main` publishes it: the catalog workflow rebuilds `catalog.json` from every theme and puts it on the rolling [`catalog`](https://github.com/LlamachantTechnology/LlamaTree-Themes/releases/tag/catalog) release. LlamaTree's **Get themes…** lists it from then on (the app keeps what it read for a few minutes; its refresh button reads it again), and anyone with an older version installed is offered the update.
