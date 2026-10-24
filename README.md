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

## Let Claude drive the studio (MCP)

Labs Studio ships an [MCP](https://modelcontextprotocol.io) server (`mcp/labs-studio-mcp.js`, no extra dependencies) so Claude can edit your videos directly, and **look at the result** before telling you it's done.

| Tool | What it does |
|---|---|
| `studio_status`, `start_studio` | Check or start the local server and open the studio |
| `list_projects`, `list_templates`, `create_project`, `get_project` | Browse and create projects |
| `list_layer_types` | Layer types with their properties, animation presets, easings |
| `add_layer`, `update_layer`, `set_keyframes`, `move_layer`, `remove_layer`, `update_composition` | Edit the composition |
| `render_frames` | Render one frame or a labelled contact sheet and return it as an image |
| `export_video`, `export_audio` | Export MP4 / MP3 + WAV to `output/` |
| `list_voices`, `generate_voice` | ElevenLabs voice over (uses your paid quota, so Claude asks first) |

**Claude Code:** open Claude Code in this folder. The bundled [`.mcp.json`](.mcp.json) registers the server, and Claude Code asks you to approve it once. From another folder:

```bash
claude mcp add labs-studio -- node /path/to/labs-studio/mcp/labs-studio-mcp.js
```

**Claude Desktop and other MCP clients:** add this to the client's MCP config:

```json
{ "mcpServers": { "labs-studio": { "command": "node", "args": ["/path/to/labs-studio/mcp/labs-studio-mcp.js"] } } }
```

Rendering, exporting and templates run in the browser, so keep a Labs Studio tab open (`start_studio` can open one). If the project is open in the editor, Claude's changes show up live and can be undone with Ctrl+Z. Set `LABS_STUDIO_URL` if the studio runs somewhere other than `http://localhost:5173`. The server speaks both the current MCP revision (2026-07-28) and the older `initialize`-based ones.

## Project layout

| Path | What |
|---|---|
| `index.html`, `src/home/` | Home: projects, templates, vibe-coding guide |
| `motion.html`, `src/motion/` | Motion editor (engine, layers, UI) |
| `chibi.html`, `src/main.js`, `src/ui/` | Chibi episode editor (script → scenes with a 3D character) |
| `src/templates/` | Project templates |
| `vite.config.js` | Local server: save/load, uploads, ElevenLabs proxy, ffmpeg export, browser bridge |
| `mcp/`, `src/core/bridge.js` | MCP server and the in-browser bridge it uses for rendering/export |
| `motion/`, `episodes/`, `media/`, `posters/`, `output/` | Your data (created on first use, git-ignored) |

## Roadmap

- Claude Code plugin bundling the MCP server with skills and slash commands.
- English UI.

## License

[MIT](LICENSE)
