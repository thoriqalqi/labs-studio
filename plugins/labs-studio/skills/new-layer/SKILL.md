---
name: new-layer
description: Add a new layer type to the Labs Studio codebase (one file in src/motion/layers/), then test it by rendering. Only for a Labs Studio source checkout.
argument-hint: "[what the layer should draw, e.g. progress bar with animated percentage]"
disable-model-invocation: true
---

Create a new Labs Studio layer type: $ARGUMENTS

This edits the Labs Studio source, so the current folder must be a Labs Studio checkout (it has `motion.html` and `src/motion/layers/`). If it isn't, say so and stop. Read the project's `CLAUDE.md` first and follow its conventions (UI labels and code comments in the project's language).

1. **Look at examples**: `src/motion/layers/shape.js`, `text.js`, `counter.js`. Pick a unique `type` and a fitting `category`.
2. **Write `src/motion/layers/<type>.js`** exporting the definition: `type`, `name`, `icon`, `category`, `order`, `defaults`, `schema` (inspector fields; mark animatable numeric/colour fields with `animatable: true`), `size(p, env)` and `draw(ctx, p, env)`. It registers itself; no other file needs changing.
3. **Rules**:
   - `draw` must be a pure function of `p` and `env` (no state between frames); use a fixed seed for randomness.
   - Never name your own props `x`, `y`, `scale`, `rotation`, `opacity`, `blur`, `shadow`, `shadowColor`, `blend` or `cropTop/Bottom/Left/Right`; the engine owns them.
   - `size()` must match what `draw` paints (crop and selection use it).
   - Stay under ~33 ms per frame: no full-canvas `ctx.filter` blur, cache expensive static drawing in an offscreen canvas.
4. **Test through MCP**: `create_project` (blank, short duration), `add_layer` with your type and a couple of keyframes, `render_frames` at several times, and inspect the image. Fix until it looks right, then remove the test project if the user doesn't want it.
5. **Document**: add the layer to the feature list in `README.md` and `README.id.md`, and to the layer notes in `CLAUDE.md`.
