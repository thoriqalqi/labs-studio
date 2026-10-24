---
name: labs-studio
description: Make, edit, check and export motion-graphics videos in Labs Studio through its MCP tools (projects, layers, keyframes, render_frames, export_video, voice over). Use whenever the user wants a video, animation, intro, promo, title card, kinetic text or similar built or changed in Labs Studio.
when_to_use: Requests such as make a 10-second intro, animate this title, add a voice over, move the logo up, export the video, why does this scene look empty, or anything else about a Labs Studio project.
---

# Working in Labs Studio

Labs Studio is a local, After Effects-style motion studio. You drive it with the `labs-studio` MCP tools. Everything is a **layer** in a **composition**; layers have static `props`, optional **keyframes** per property, and an entry/exit **animation preset**.

## Always

1. **Check the studio first.** Call `studio_status`. If the server is down or no studio tab is open, call `start_studio` (or ask the user to open the studio in a browser). Rendering, exporting, templates and `list_layer_types` need an open tab.
2. **Read before you write.** `get_project` before editing; `list_layer_types` (or `list_layer_types` with `type`) before adding a layer type you haven't used in this session, so you use real property keys.
3. **Look at your work.** After every meaningful change call `render_frames` at the moments you touched (and the transitions around them), and actually inspect the image: overlap, cut-off text, contrast, empty frames, alignment. Fix and re-render before saying you're done. Don't claim something looks right without rendering it.
4. **Ask before spending money.** `generate_voice` uses the user's paid ElevenLabs quota. Show the exact text and its character count and get a yes first; `list_voices` shows the remaining quota.
5. **Export last.** `export_video` takes a while; run it once the user is happy with the renders.

## Model essentials

- Times are seconds. A layer is visible from `start` to `start + dur`.
- Keyframe `t` is relative to the layer's start (content time), not the composition.
- `index 0` is the front-most layer. Backgrounds go last (`index: -1`).
- Common props on every layer: `x`, `y` (centre of the layer, canvas pixels), `scale` (%), `rotation` (deg), `opacity` (%), `blur`, `shadow`, `shadowColor`, `blend`, `cropTop/Bottom/Left/Right` (%).
- A property with keyframes ignores its static value; change it with `set_keyframes`.
- Easings: `easeInOut` (default), `easeOut`, `easeIn`, `linear`, `back`, `bounce`, `hold`.
- Entry/exit presets include `fadeUp`, `blur`, `pop`, `zoom`, `flowIn`/`flowOut` (smooth, recommended between scenes), and text-only `words`, `typewriter`, `scatter`.
- Text markup: `*accent words*` use the accent colour (and optional `accentFont`/`accentItalic`, e.g. Instrument Serif italic), `[pill]` draws an outlined chip, `{logo}` inserts the app mark.

## Design defaults that read well at 1920×1080

- Keep important content inside ~120 px from the edges.
- Headlines 90–140 px, body lines 40–70 px, captions 26–34 px. Fonts: Geist for clean UI, Instrument Serif italic for accents.
- One idea per scene; 2.5–4 s per scene for a brisk tempo. Narration runs about 2.5 words per second.
- Prefer `flowIn` / `flowOut` (0.3–0.5 s) so scenes hand over smoothly instead of cutting.
- Don't stack text on busy imagery; move it, add `shadow`, or put it on a `shape` panel.
- Heavy blur on big layers and many large layers at once slow playback; check `render_frames` output and keep things simple.

## Useful layer types

`text`, `shape`, `image`, `video`, `audio`, `sfx` (synthesized sound: whoosh, pop, click, chime, riser, sub…), `background`, `liquid` (animated gradient), `lines`, `cursor`, `pill`, `logo`, `screen3d` (app screen in 3D), `dots` (halftone field / dot path), `orb`, `landscape` (procedural scenery or your own photo via `url`), `radial` (glass diagram), `uicard`, `counter`, `wordroll`. Confirm exact props with `list_layer_types`.
