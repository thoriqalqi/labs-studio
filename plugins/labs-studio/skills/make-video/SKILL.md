---
name: make-video
description: Build a complete motion-graphics video in Labs Studio from a short brief — storyboard, layers, timing, visual check, optional voice over, MP4 export.
argument-hint: "[brief, e.g. 15-second launch teaser for my coffee app, vertical]"
disable-model-invocation: true
---

Make a video in Labs Studio from this brief: $ARGUMENTS

Follow the `labs-studio` skill rules throughout. Steps:

1. **Prepare.** `studio_status`; if needed `start_studio`. `list_templates` and `list_layer_types` so you know what's available.
2. **Storyboard.** Write a short scene list for the user (scene, seconds, what's on screen, any narration line). Pick the size from the brief (`landscape` default, `portrait` for Shorts/Reels/TikTok). If the brief is very vague, ask one or two questions; otherwise state your assumptions and continue.
3. **Create.** `create_project` (a matching template if one fits, else `kosong`), then `update_composition` for the total duration.
4. **Build scene by scene** with `add_layer` / `set_keyframes`, using `flowIn` / `flowOut` so scenes flow. Add a few `sfx` layers on transitions (whoosh, pop, chime) at modest volume.
5. **Check.** `render_frames` with a contact sheet covering every scene (its middle and the transitions). Fix anything off (overlap, cut-off or unreadable text, empty frames, cramped layout) and render again until it's clean.
6. **Voice over (optional).** If narration is wanted: `list_voices`, propose the voice and the full text with its character count, and only after the user agrees call `generate_voice` per line with `project` and `start`, then retime scenes to the clips and re-check.
7. **Deliver.** Show the final contact sheet, give the project link from `create_project`, and ask whether to `export_video` (or export straight away if the user asked for it).
