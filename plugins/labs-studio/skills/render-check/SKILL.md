---
name: render-check
description: Visually review a Labs Studio project — render contact sheets at every scene and transition, list problems (overlap, cut-off or unreadable text, empty frames, jumps) and offer fixes.
argument-hint: "[project id — optional, defaults to the most recent project]"
disable-model-invocation: true
---

Review the Labs Studio project `$ARGUMENTS` visually. If no project id was given, use the most recently updated motion project from `list_projects`.

1. `get_project` (with `include_audio: false`) and collect the interesting moments: each layer's start + 0.3 s, its middle, and its end − 0.2 s; drop moments closer than 0.25 s to one already chosen; always include 0.2 s and the last 0.3 s.
2. Render them with `render_frames`, up to 16 times per call, in time order, as many calls as needed.
3. Inspect every frame and note concrete problems with their time and layer name:
   - text overlapping other text or busy imagery, cut off by the frame edge, too small (< 26 px at 1080p) or low contrast
   - frames that are empty or nearly empty where something should be on screen
   - elements jumping instead of moving (missing easing, abrupt cut where `flowIn`/`flowOut` would help)
   - layout off-centre or crammed against the edges
4. Report a short list ordered by severity (time, layer, problem, suggested fix). Ask before changing anything; once the user agrees, fix with `update_layer` / `set_keyframes` and re-render the affected moments to confirm.
