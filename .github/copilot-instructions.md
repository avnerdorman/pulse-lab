# Copilot Instructions for Pulse Lab / Drum Machine

## Project Overview
Browser-based drum machine/sequencer using Web Audio API. Entry point is `src/app.js` which coordinates audio scheduling, UI rendering, and local storage. The app loads external drum samples from GitHub (oramics/sampled) and provides a step sequencer interface with real-time audio effects.

## Architecture

### Core Components
- **`src/app.js`**: Main orchestrator - initializes AudioContext, loads samples, manages storage, and wires up event handlers
- **`src/simple-tracker.js`**: Beat scheduler using WAAClock for precise timing. Handles playback loop, beat column scheduling, and UI state sync (e.g., `tracker-current` CSS class)
- **`src/tracker-table.js`**: Generates HTML table structure for sequencer grid. Includes special "pulse row" for visual metronome
- **`src/get-set-controls.js`**: Bidirectional form data sync between DOM controls and settings object. Parses string values to floats/booleans

### Audio Chain
Audio routing in `scheduleAudioBeat()`:
1. Load buffer from `buffers[instrumentName]`
2. Apply detune via `source.detune.value`
3. Route through `routeGain()` - uses `adsr-gain-node` for envelope (attack/decay/sustain/release)
4. Optionally route through `routeDelay()` - creates feedback loop with delay → feedbackGain → filter → delay
5. Connect to `ctx.destination`

### Data Model
Tracks stored as JSON in localStorage with structure:
```javascript
{
  beat: [{rowId: "0", colId: "0", enabled: true}, ...],
  settings: {measureLength: 16, bpm: 460, sampleSet: "...", detune: 0, ...}
}
```
Default track defined in `src/default-track.js` (504 lines of beat array).

## Build System
- **Development**: Run `./watch.sh` or `npm run watch` (uses watchify)
- **Production**: Run `./build.sh` (browserify → babel transpilation)
- **Entry**: `src/app.js` bundles to `bundle.js`, loaded by `index.html`
- Note: `package.json` lists `src/main.js` but actual entry is `src/app.js` per watch.sh

## Key Patterns

### Sample Loading
Uses `load-sample-set` package to fetch JSON manifests from GitHub URLs (e.g., TR-909, CR-78). Returns `{buffers, data}` where `buffers` are AudioBuffers keyed by instrument name, `data` has metadata like `filename` array.

### Scheduling
- WAAClock schedules callbacks at precise audio context times (`ctx.currentTime + scheduleForward`)
- `scheduleAudioBeat()` gets called back at trigger time, not when scheduled
- Clicking cells while playing schedules beat immediately if ahead of playhead
- `tracker-enabled` CSS class drives both visual state and beat data

### Event Handling
jQuery used for some event delegation (`.base` change handler). Modern querySelector for tracker cells. Beat cells use `data-row-id` and `data-col-id` attributes for grid coordinates.

### Audio Node Cleanup
Uses `disconnectNode()` helper with setTimeout based on ADSR total time to prevent memory leaks from orphaned nodes.

## Working with the Sequencer

### Adding New Audio Effects
1. Create routing function in `scheduleAudioBeat()` following `routeGain`/`routeDelay` pattern
2. Add form controls in `index.html` under `#trackerControls`
3. Add corresponding logic in `get-set-controls.js` for parsing
4. Chain nodes: `node = routeNewEffect(node)` before final `connect(ctx.destination)`

### Modifying Grid Layout
- `tracker-table.js` generates HTML - modify `getCells()` or `setPulseRow()`
- Pulse row uses `pulse-step` class and is always enabled (visual metronome)
- Header row shows 1-indexed beat numbers

### Storage Operations
`tracksLocalStorage` class in `app.js` handles:
- Save: Writes JSON to localStorage, updates select dropdown
- Load: Parses JSON, updates form, reinitializes sample set
- Delete: Removes from localStorage, refreshes UI

## Important Constraints
- Measure length changes require full tracker rebuild (see `measureLength` input handler)
- Sample set changes reload buffers and reset tracker
- AudioContext must be resumed on user interaction (see play button handler)
- Form values are strings by default - always parse to numbers in `get-set-controls.js`
