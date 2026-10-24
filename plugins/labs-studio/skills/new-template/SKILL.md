---
name: new-template
description: Add a new project template to the Labs Studio codebase (one file in src/templates/), verify it by creating a project and rendering it. Only for a Labs Studio source checkout.
argument-hint: "[template idea, e.g. 15-second vertical product teaser]"
disable-model-invocation: true
---

Create a new Labs Studio project template: $ARGUMENTS

This edits the Labs Studio source, so the current folder must be a Labs Studio checkout (it has `src/templates/`). If it isn't, say so and stop. Read the project's `CLAUDE.md` first and follow its conventions.

1. **Study** `src/templates/teks-kinetik.js`, `intro-liquid.js` and `promo-editorial.js` (keyframe helper `k()`, SFX list, layer ordering, `flowIn`/`flowOut`).
2. **Write `src/templates/<id>.js`** exporting `{ id, name, description, kind: 'motion', order, create({ id, name, size }) }` that returns a document built with `newMotionDoc` / `newLayer` from `../motion/doc.js`. `doc.layers[0]` is the front-most layer; backgrounds last. Respect the requested `size` (landscape, portrait, square, feed) by laying out relative to `doc.comp.width/height`.
3. **Verify through MCP**: `list_templates` (the new id must appear), `create_project` with it, then `render_frames` with a contact sheet of every scene. Fix layout and timing until the sheet looks clean in landscape and, if supported, portrait.
4. **Document** the template in `README.md` and `README.id.md`.
