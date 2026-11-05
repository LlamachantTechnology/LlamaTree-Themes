# LlamaTree themes

Themes for [LlamaTree](https://github.com/LlamachantTechnology/LlamaTree), one file each under [`themes/`](themes). A theme is only data: colours for the app, its terminals and its diffs, and a few effects the app already knows (a glow, the Grid, digital rain, a light cycle cursor). It can't restyle anything else, or load or run anything.

## The themes

<!-- themes:start -->
| Theme | What it looks like | Version | Base | Effects |
|---|---|---|---|---|
| [Deep Sea](themes/deep-sea.json) | Navy water with sea-glass teal for lines and the accent, coral for what went wrong and sand for what needs you | 1.0.0 | dark |  |
| [Ember](themes/ember.json) | Warm charcoal lit by a coal-orange accent with a faint glow, olive for what went well and rose for a question | 1.0.0 | dark | glow |
| [Parchment](themes/parchment.json) | A light theme on warm paper, with ink-brown text, a sepia accent and muted greens and reds that are easy on the eyes | 1.0.0 | light |  |
<!-- themes:end -->

The table is written by `node tools/catalog.mjs --readme` from the theme files.

## Installing one

In LlamaTree, click the palette button at the top right and choose **Get themes…**. Every theme here is listed with a picture of it; **Try it on** shows it on the whole app before you install it, and **Install and use** puts it in your themes folder and switches to it. A theme with a newer version here offers **Update**.

LlamaTree reads [`catalog.json`](https://github.com/LlamachantTechnology/LlamaTree-Themes/releases/tag/catalog), which the catalog workflow rebuilds from `themes/` on every push to `main`.

You can also download a theme's file and put it in your themes folder yourself (palette button › **Open the themes folder**).

## Making one

See [CONTRIBUTING.md](CONTRIBUTING.md): what a theme file holds ([`schema/theme.schema.json`](schema/theme.schema.json)), the checks (`node tools/validate.mjs`), and how a theme gets published (merge to `main`). The quickest start is **Save as a new theme…** in LlamaTree's palette menu, which writes the theme on screen with every colour spelled out.

## Licence

Apache License 2.0, the same as LlamaTree: see [LICENSE](LICENSE) and [NOTICE](NOTICE).
