# Labs Studio

**English** · [Bahasa Indonesia](README.id.md)

A local, lightweight **After Effects-style motion studio** that runs on your own machine and exports straight to MP4, built to be **extended by chatting with Claude Code**.

Layers, keyframes, easing, text animation, 3D scenes, voice over, sound effects, and a timeline, all in the browser, with no cloud render queue. New layer types, templates, and animation presets are single files that register themselves, so "add a progress bar layer I can animate" is a normal request, not a refactor.

> The UI comes in **English and Indonesian**. It follows your browser language, and the **EN / ID** button in the top bar switches it. The chibi episode editor is Indonesian-only.

## Features

- **Motion editor:** layer-based composition, keyframes on any numeric/color property, easing (including a flowing spline that passes through keyframes without stopping, and a custom bezier curve editor), automatic keyframing once a layer is animated (only the property you change gets a keyframe), a timeline that expands each layer into one row per animated property where keyframes can be dragged, multi-selected, deleted, and copied/pasted (K add, J/L previous/next, U expand), in/out animation presets (fade, pop, blur, flowing, per-word, typewriter, scatter), canvas snapping with guides, scale and crop handles, canvas zoom, undo/redo, and autosave.
- **Layer types:** text (with *accent*, `[pill]`, and `{logo}` markup, serif-italic accents), shapes, images, video, audio, synthesized SFX, liquid gradients, 3D app screens (Three.js), chibi 3D character, halftone dot fields, gradient orbs, procedural landscapes (or your own photo), glass radial diagrams, UI cards, counters, word rolls, cursors, pills, logos, a game-engine level editor UI, and a 3D world builder (WebGL terrain that rises from the editor grid, lakes, rivers, instanced forests, a city of windowed towers, and an orbit view of the planet).
- **Templates:** blank, kinetic text, 3D character, liquid-gradient app intro, editorial promo (about 60 s, with voice-over timing), a one-shot "Building Indonesia" world build (a command typed in the level editor → the Lake Toba highlands rise → the camera flies down a street between the towers of a lakeside city → orbit over the archipelago), and a script-to-video chibi episode editor.
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

Labs Studio ships an [MCP](https://modelcontextprotocol.io) server (`plugins/labs-studio/mcp/labs-studio-mcp.mjs`, no extra dependencies) so Claude can edit your videos directly, and **look at the result** before telling you it's done.

| Tool | What it does |
|---|---|
| `studio_status`, `start_studio` | Check or start the local server and open the studio |
| `list_projects`, `list_templates`, `create_project`, `get_project` | Browse and create projects |
| `list_layer_types` | Layer types with their properties, animation presets, easings |
| `add_layer`, `update_layer`, `set_keyframes`, `move_layer`, `remove_layer`, `update_composition` | Edit the composition |
| `render_frames` | Render one frame or a labelled contact sheet and return it as an image |
| `export_video`, `export_audio` | Export MP4 / MP3 + WAV to `output/` |
| `list_voices`, `generate_voice` | ElevenLabs voice over (uses your paid quota, so Claude asks first) |

**Claude Code plugin (recommended):** installs the MCP server plus skills: a Labs Studio guide Claude loads on its own, and the commands `/labs-studio:make-video`, `/labs-studio:render-check`, `/labs-studio:new-layer` and `/labs-studio:new-template`. In Claude Code (2.1.275 or later):

```
/plugin install labs-studio --marketplace thoriqalqi/labs-studio
```

On older versions, run `/plugin marketplace add thoriqalqi/labs-studio`, then `/plugin install labs-studio@labs-studio`. The plugin drives the studio app, so you still need this repository cloned (`npm install`). Set the plugin's **Studio folder** option to the clone (`/plugin configure labs-studio@labs-studio`) so Claude can start the studio for you, or just open Claude Code inside the clone.

**Claude Code without the plugin:** open Claude Code in this folder. The bundled [`.mcp.json`](.mcp.json) registers the server, and Claude Code asks you to approve it once. From another folder:

```bash
claude mcp add labs-studio -- node /path/to/labs-studio/plugins/labs-studio/mcp/labs-studio-mcp.mjs
```

**Claude Desktop and other MCP clients:** add this to the client's MCP config:

```json
{ "mcpServers": { "labs-studio": { "command": "node", "args": ["/path/to/labs-studio/plugins/labs-studio/mcp/labs-studio-mcp.mjs"] } } }
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
| `plugins/labs-studio/`, `.claude-plugin/` | Claude Code plugin (MCP server + skills) and its marketplace |
| `src/core/bridge.js` | In-browser bridge the MCP server uses for rendering/export |
| `motion/`, `episodes/`, `media/`, `posters/`, `output/` | Your data (created on first use, git-ignored) |

## Contributing

Ideas and pull requests are welcome: new layer types, templates, presets, translations. The fastest route is the Claude Code plugin's `/labs-studio:new-layer` and `/labs-studio:new-template` commands. UI text lives in Indonesian in the code, with English in [`src/core/i18n-en.js`](src/core/i18n-en.js).

## License

[MIT](LICENSE)

The Indonesia coastline in `src/motion/data/indonesia.js` is derived from [Natural Earth](https://www.naturalearthdata.com/) (public domain).
