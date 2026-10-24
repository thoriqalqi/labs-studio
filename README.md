# Labs Studio

**English** · [Bahasa Indonesia](README.id.md)

A local, lightweight **After Effects-style motion studio** that runs on your own machine and exports straight to MP4, built to be **extended by chatting with Claude Code**.

Layers, keyframes, easing, text animation, 3D scenes, voice over, sound effects, and a timeline, all in the browser, with no cloud render queue. New layer types, templates, and animation presets are single files that register themselves, so "add a progress bar layer I can animate" is a normal request, not a refactor.

> The UI is currently in Indonesian. English UI is on the roadmap; contributions are welcome.

## Features

- **Motion editor:** layer-based composition, keyframes on any numeric/color property, easing, in/out animation presets (fade, pop, blur, flowing, per-word, typewriter, scatter), canvas snapping with guides, scale and crop handles, canvas zoom, undo/redo, and autosave.
- **Layer types:** text (with *accent*, `[pill]`, and `{logo}` markup, serif-italic accents), shapes, images, video, audio, synthesized SFX, liquid gradients, 3D app screens (Three.js), chibi 3D character, halftone dot fields, gradient orbs, procedural landscapes (or your own photo), glass radial diagrams, UI cards, counters, word rolls, cursors, pills, and logos.
- **Templates:** blank, kinetic text, 3D character, liquid-gradient app intro, editorial promo (about 60 s, with voice-over timing), and a script-to-video chibi episode editor.
- **Audio:** import audio/video (video tracks stay visual, the sound goes to its own layer), speed and trim, synthesized SFX with no audio files, and optional **ElevenLabs** voice over that runs through the local server so your key never reaches the browser.
- **Export:** MP4 (WebCodecs H.264 + ffmpeg mux, frame-accurate), audio (MP3 + WAV), and PNG frames.
- **Local and private:** projects are plain JSON files in this folder.

## Requirements

- **Node.js 18+**
- **ffmpeg** on your PATH for MP4 export and video import: `winget install ffmpeg` (Windows), `brew install ffmpeg` (macOS), `sudo apt install ffmpeg` (Linux). The editor still runs without it.
- Optional: an **ElevenLabs** API key for voice over. It is stored only in `settings.local.json`, which is git-ignored.
- A Chromium-based browser (Chrome or Edge) is recommended for WebCodecs export.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Shortcuts: double-click `Labs Studio.bat` (Windows) or run `sh labs-studio.sh` (macOS/Linux).

## Extending it with Claude Code

Open Claude Code in this folder and ask in plain language, for example:

- "Make a *Progress bar* layer whose percentage I can keyframe."
- "Add a template for a 15-second vertical product teaser."
- "Add an entry animation that slides in with a slight bounce."

[`CLAUDE.md`](CLAUDE.md) documents the architecture and extension points, so Claude knows where things go:

| Extension | Where | Registers automatically |
|---|---|---|
| Layer type | `src/motion/layers/<name>.js` | yes |
| Project template | `src/templates/<name>.js` | yes |
| In/out animation preset | `src/motion/presets.js` | yes |
| Multi-layer snippet | `src/motion/snippets.js` | yes |
| Synthesized sound | `SFX` in `src/audio.js` + label in `src/catalog.js` | yes |

Rendering is a pure function of `(document, time)`, so seeking and frame-by-frame export always match the preview.

## Project layout

| Path | What |
|---|---|
| `index.html`, `src/home/` | Home: projects, templates, vibe-coding guide |
| `motion.html`, `src/motion/` | Motion editor (engine, layers, UI) |
| `chibi.html`, `src/main.js`, `src/ui/` | Chibi episode editor (script → scenes with a 3D character) |
| `src/templates/` | Project templates |
| `vite.config.js` | Local server: save/load, uploads, ElevenLabs proxy, ffmpeg export |
| `motion/`, `episodes/`, `media/`, `posters/`, `output/` | Your data (created on first use, git-ignored) |

## Roadmap

- MCP server so Claude (Code or Desktop) can open projects, edit layers and keyframes, **render a frame to look at it**, and export.
- Claude Code plugin bundling that MCP server with skills and slash commands.
- English UI.

## License

[MIT](LICENSE)
