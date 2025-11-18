# Pulse Lab — Drum Machine & Pulse Tools

Browser-based drum machine and pulse exploration tools built on the Web Audio API. No Tone.js, no eval, and runs entirely in the browser (embed-friendly).

Samples courtesy of https://github.com/oramics/sampled/

## Features
- Web Audio step sequencer with precise timing (WAAClock)
- Always-on pulse row for visual metronome (silent, non-interactive)
- Toussaint-inspired pattern presets (2–3 groupings, cross-rhythms)
- **Pattern import/export** - save/load patterns as .txt files
- **Reset to pulse** - instantly set hi-hat to all 16th notes
- **Clear grid** - remove all beats from all tracks
- **Measure length presets** - quick dropdown for 12/16/24/32/36 steps
- **Inline tempo display** - live BPM value shown next to slider
- URL sharing of kit, tempo, length, and row patterns
- LocalStorage save/load (legacy panel hidden by default)

## Quick Start

```zsh
git clone https://github.com/avnerdorman/pulse-lab.git
cd drum-machine-javascript
npm install
npx browserify src/app.js -o bundle.js
open index.html
```

The app will automatically apply a default hi-hat pulse pattern on first load (can be cleared or modified immediately).

## Development

Watch and rebuild `bundle.js` during development:

```zsh
./watch.sh
```

One-time build:

```zsh
npx browserify src/app.js -o bundle.js
```

## Pattern Import/Export
**Export:** Click "Copy to Clipboard" or "Download .txt" to save your pattern in a human-readable text format with tempo, length, and pulse/track data.

**Import:** Click "Import Pattern" to load a previously exported .txt file. The app will automatically match track labels to the current sample set and apply the pattern (with tempo and length).

## Pattern Utilities
- **Reset to Pulse:** Sets hi-hat (or closest match) to all 16th notes - great starting point for exploring subdivisions
- **Clear Grid:** Removes all beats from all tracks (preserves pulse row)

## Tempo Mapping
- The UI `BPM` is musical tempo (quarter-notes per minute).
- The sequencer advances one grid step per 16th note, so runtime BPM passed to the scheduler is `BPM × 4` (implemented in `src/app.js`).

## Embed in Google Sites (Compact Mode)
Use compact styles via a URL param and an `embedded` CSS mode:

```
https://your-host/path/index.html?embed=1&len=16&bpm=80
```

Compact mode:
- Hides the large header
- Reduces paddings and font sizes
- Keeps all functionality (playback, presets, export)

## Project Structure
- `index.html` – Main app shell (controls, transport, tracker area, export panel)
- `src/app.js` – Core audio + scheduler wiring (bundled to `bundle.js`)
- `src/simple-tracker.js` – WAAClock timing + DOM highlight loop
- `src/tracker-table.js` – Tracker grid (includes Pulse row above tracks)
- `script.js` – UI enhancements (presets, export, import, URL sharing, pattern utilities, embed flag)
- `main.css` – UI styling (+ `.embedded` compact rules)

## License

MIT © [Dennis Iversen](https://github.com/diversen) and contributors

