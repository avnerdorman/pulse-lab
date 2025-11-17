# Pulse Lab — Drum Machine & Pulse Tools

Browser-based drum machine and pulse exploration tools built on the Web Audio API. No Tone.js, no eval, and runs entirely in the browser (embed-friendly).

Samples courtesy of https://github.com/oramics/sampled/

## Features
- Web Audio step sequencer with precise timing (WAAClock)
- Always-on pulse row for visual metronome (silent, non-interactive)
- Toussaint-inspired pattern presets (2–3 groupings, cross-rhythms)
- Export pattern as text (copy or download)
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

## Development

Watch and rebuild `bundle.js` during development:

```zsh
./watch.sh
```

One-time build:

```zsh
npx browserify src/app.js -o bundle.js
```

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
- `index.html` – Main app shell (controls, transport, tracker area)
- `src/app.js` – Core audio + scheduler wiring (bundled to `bundle.js`)
- `src/simple-tracker.js` – WAAClock timing + DOM highlight loop
- `src/tracker-table.js` – Tracker grid (includes Pulse row above tracks)
- `script.js` – UI enhancements (presets, export, URL sharing, embed flag)
- `main.css` – UI styling (+ `.embedded` compact rules)

## License

MIT © [Dennis Iversen](https://github.com/diversen) and contributors

