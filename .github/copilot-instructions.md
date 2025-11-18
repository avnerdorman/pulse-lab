# Copilot Instructions for Pulse Lab / Drum Machine

## Project Overview
Multi-purpose rhythm and pulse exploration toolkit with three main implementations:

1. **Main Drum Machine** (`index.html` + `src/app.js` + `script.js`) - Full-featured sequencer with Web Audio API, preset patterns, URL sharing, pattern import/export, and pedagogical utilities
2. **Single-Page Version** (`single-page-version.html`) - Standalone pulse grouping lab with embedded styles
3. **Theory IV Lab** (`theory-iv-lab/`) - Jekyll-based educational site with interactive rhythm tools for post-tonal music theory course

The main drum machine loads external samples from GitHub (oramics/sampled) and provides a step sequencer with real-time audio effects, Toussaint-inspired pattern presets, import/export capabilities, and pedagogical features for exploring pulse groupings.

## Architecture

### Core Components (Main App)
- **`src/app.js`**: Core orchestrator - initializes AudioContext, loads samples, manages localStorage, wires up audio scheduling
- **`script.js`**: UI enhancements layer - handles presets, URL parameter sharing, pattern export/import, default patterns, reset/clear utilities, and tracker mutations
- **`src/simple-tracker.js`**: Beat scheduler using WAAClock for precise timing. Manages playback loop, beat column scheduling, and UI state sync
- **`src/tracker-table.js`**: Generates HTML table for sequencer grid. Includes pulse row (visual metronome) and drum tracks
- **`src/get-set-controls.js`**: Bidirectional form data sync - parses string values to floats/booleans

### Dual-Script Architecture
The app uses **two separate JavaScript files**:
1. **`bundle.js`** - Browserified output from `src/app.js` (core audio engine and sequencer logic)
2. **`script.js`** - Standalone vanilla JS (UI features: presets, sharing, export, import, utilities)

This separation allows core audio functionality to remain isolated from UI enhancements. `script.js` observes and manipulates the DOM created by `bundle.js`.

### Audio Chain
Audio routing in `scheduleAudioBeat()` (src/app.js):
1. Load buffer from `buffers[instrumentName]`
2. Apply detune via `source.detune.value`
3. Route through `routeGain()` - uses `adsr-gain-node` for envelope (attack/decay/sustain/release)
4. Optionally route through `routeDelay()` - feedback loop: delay → feedbackGain → filter → delay
5. Connect to `ctx.destination`

### Data Model & Storage
**localStorage structure:**
```javascript
{
  beat: [{rowId: "0", colId: "0", enabled: true}, ...],
  settings: {measureLength: 16, bpm: 80, sampleSet: "...", detune: 0, ...}
}
```

**URL parameters (script.js):**
- `ss` - sample set URL (encoded)
- `len` - measure length (e.g., 16)
- `bpm` - tempo (normalized 72-84 range for shared links)
- `rows` - encoded pattern: `rowId:bitstring,rowId:bitstring` (e.g., `0:X.X.X...,1:...X...X`)

Default track defined in `src/default-track.js` (504-line beat array).

## Build System
- **Development**: `./watch.sh` or `npm run watch` (watchify on `src/app.js`)
- **Production**: `./build.sh` (browserify + babel transpilation)
- **Entry**: `src/app.js` → `bundle.js` (loaded by `index.html`)
- **Note**: `package.json` lists `src/main.js` but actual entry is `src/app.js`

## Key Patterns

### Pulse Row (Visual Metronome)
- **Already implemented** in `src/tracker-table.js`
- `setPulseRow()` generates a row of always-enabled cells with class `pulse-step tracker-enabled`
- Cells have `data-col-id` attributes and get highlighted via `tracker-current` class during playback
- **No audio trigger** - excluded from `getTrackerRowValues()` because not `.tracker-cell` class
- CSS: `pointer-events: none` prevents interaction

### Sample Loading
Uses `load-sample-set` package to fetch JSON manifests from GitHub URLs (TR-909, CR-78, etc.). Returns `{buffers, data}` where buffers are AudioBuffers keyed by instrument name.

### Scheduling & Timing
- WAAClock schedules callbacks at precise audio context times (`ctx.currentTime + scheduleForward`)
- `scheduleAudioBeat()` called back at trigger time, not when scheduled
- Clicking cells while playing schedules beat immediately if colId is ahead of playhead
- `tracker-enabled` CSS class drives both visual state and beat data

### Tempo Mapping (Important)
- UI `bpm` is musical BPM (quarter-notes/minute). The sequencer advances one grid step per 16th note.
- Therefore runtime BPM passed to the scheduler is `bpm * 4`. See `src/app.js` where `schedule.runSchedule(getSetAudioOptions.options.bpm * 4)` is invoked on Play and on BPM change.
  - `simple-tracker.milliPerBeat(beats)` computes milliseconds per step: `1000 * 60 / beats`.
  - Supplying `bpm * 4` ensures each grid step = 1/16 note at the displayed BPM.

### Pattern Presets (script.js)
Presets defined in `PRESETS` object with:
- `label` - display name
- `measureLength` - grid size
- `bpm` - tempo
- `patterns` - array of pattern configs targeting specific tracks

**Pattern matching strategies:**
```javascript
TRACK_TARGETS = {
  trackA: { matcher: /(kick|bass\s?drum|bd)/i, fallbackIndex: 0 },
  trackB: { matcher: /(snare|rim|clave|sd)/i, fallbackIndex: 1 },
  trackHat: { matcher: /(hi[-\s]?hat|hat|ride|cymbal)/i, fallbackIndex: 2 }
}
```
Patterns can specify:
- `hits: [0, 2, 5, 7]` - explicit step indices
- `pattern: "X.X...X."` - string representation
- `generator: length => buildRandomGroupingPattern(length)` - dynamic function

### Pattern Import/Export System (script.js)

**Export Format (.txt):**
```
Tempo: 80 BPM
Pattern length: 16 pulses
Repeats: ∞ (loop)

Pulses:      ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●
Kick:        X . . . X . . . X . . . X . . .
Snare:       . . X . . . X . . . X . . . X .
```

**Export features:**
- Copy to clipboard (with fallback for older browsers)
- Download as .txt file
- Auto-refresh on tracker changes via MutationObserver
- Only includes tracks with active beats (excludes silent rows)
- Label formatting: shortens `hihat-open` → `hihat-o`, `hihat-closed` → `hihat-cl`

**Import functionality:**
- File picker loads `.txt` files via FileReader API
- Parses tempo, pattern length, and track patterns from exported format
- Matches imported track labels to current sample set using:
  1. Exact lowercase label match
  2. Fuzzy regex matching (generated from label words)
  3. Falls back to track index position
- Queues pattern application if measure length needs to change
- Sets both BPM and measure length from imported data
- Normalizes loaded BPM using same 72-84 range as URL sharing

**Import workflow (script.js):**
1. `setupImportControls()` wires file input handler
2. `importPatternFromText()` parses .txt and queues pattern set
3. `parseExportedPattern()` extracts BPM, length, and row data
4. `buildRowLookup()` creates label→rowId mapping
5. `queuePatternSet()` defers application until measure length matches
6. `applyPatternSetNow()` applies patterns when tracker DOM is ready

### Pattern Utilities (script.js)

**Reset to Pulse Pattern:**
- Sets hi-hat (or similar track) to all 16th notes (XXXXXXXXXXXXXXXX)
- Uses `applyHatPulsePattern()` to find closed hi-hat track via regex matcher
- Provides pedagogical starting point for pulse subdivision exploration
- Queues pattern if measure length doesn't match current grid

**Clear All Patterns:**
- Removes all beats from all tracks (preserves pulse row)
- Uses `clearAllPatterns()` to reset grid to blank state
- Useful for starting fresh without changing tempo/length/sample set
- Applied immediately or queued depending on tracker state

**Default Hi-Hat Pattern:**
- `ensureDefaultHatPattern()` runs on page load
- Automatically applies pulse pattern to hi-hat if no saved localStorage data
- Ensures new users see/hear something immediately
- Only runs once on first visit (respects existing patterns)

**Row Shifting (Future Feature):**
- `shiftRow()` rotates pattern left/right
- `handleTrackAction()` handles shift-left/shift-right actions
- Currently wired but not exposed in UI
- Useful for exploring phase relationships between patterns

### URL Sharing (script.js)
Share button generates URLs with current state:
- Encodes row patterns as bit strings (X=1, .=0)
- Normalizes BPM to 72-84 range for pedagogical consistency
- Patterns decoded and queued until tracker rebuilds with correct length
- Uses `state.pendingPatternQueue` to defer application until DOM ready

### UI Organization (index.html)

**Transport Panel (inline layout):**
- Play/Pause button
- BPM slider with live value display (`<span id="bpm-value">80 BPM</span>`)
- Measure length number input with preset dropdown (12/16/24/32/36)
- Share button (generates URL with encoded pattern)

**Pattern Utilities Section:**
- Import Pattern button (file picker for .txt files)
- Reset to Pulse button (sets hi-hat to all 16ths)
- Clear Grid button (removes all beats)
- Grouped under "Pattern Utilities" heading

**Export Panel (inline below tracker):**
- Auto-updating textarea with formatted pattern
- Copy to Clipboard button
- Download .txt button
- Refreshes automatically when tracker changes

**Advanced Panels (collapsible):**
- Detune & Envelope controls (ADSR parameters)
- Delay & Filter controls (audio effects)

**Form Integration:**
- All controls are `<input class="base">` elements within `#trackerControls` form
- `get-set-controls.js` syncs form ↔ audio settings
- Changes trigger immediate audio parameter updates (except measure length)

### Event Handling
- jQuery used for `.base` change handlers and legacy storage UI
- Modern querySelector for tracker cells
- `script.js` uses MutationObserver to watch for tracker DOM changes (triggers export refresh)
- Beat cells use `data-row-id` and `data-col-id` attributes
- BPM input triggers `updateBpmDisplay()` to refresh live BPM value
- Measure length input triggers `syncMeasureLengthPreset()` to sync dropdown
- Import input opens file picker and parses .txt via FileReader

### Audio Node Cleanup
`disconnectNode()` helper with setTimeout based on ADSR total time to prevent memory leaks from orphaned nodes.

## Working with the System

### Adding New Presets
Edit `PRESETS` object in `script.js`:
```javascript
'my-preset': {
  label: 'My Pattern',
  measureLength: 12,
  bpm: 90,
  patterns: [
    { target: 'trackA', hits: [0, 3, 6, 9] },
    { target: 'trackB', pattern: "..X...X...X." }
  ]
}
```

### Adding New Audio Effects
1. Create routing function in `scheduleAudioBeat()` following `routeGain`/`routeDelay` pattern
2. Add form controls in `index.html` (within `#trackerControls` form)
3. Add parsing logic in `get-set-controls.js`
4. Chain nodes: `node = routeNewEffect(node)` before final `connect(ctx.destination)`

### Modifying Grid Layout
- Edit `tracker-table.js` - modify `getCells()` or `setPulseRow()`
- Pulse row always uses `pulse-step` class and is always enabled
- Header row shows 1-indexed beat numbers

### Embed/Compact Mode
- The main UI supports a compact layout for iframe/site embeds.
- Append `?embed=1` to the URL; `script.js` adds an `embedded` class to `<body>`.
- `main.css` defines `.embedded` rules (smaller paddings, font sizes, optional header hiding) to fit Google Sites-style embeds without changing functionality.

### Adding UI Features
- Add to `script.js` (not bundled, easier to modify)
- Use `getTrackRows()` to access tracker DOM
- Use `refreshExportText()` to update export panel
- Queue patterns via `queuePatternSet()` if measure length may change

## Important Constraints
- Measure length changes require full tracker rebuild (see `measureLength` input handler in `src/app.js`)
- Sample set changes reload buffers and reset tracker
- AudioContext must be resumed on user interaction (see play button handler)
- Form values are strings by default - always parse to numbers in `get-set-controls.js`
- BPM range for shared links normalized to 72-84 (pedagogical preference)
- Shared URL patterns won't apply until tracker has matching `measureLength`

## Theory IV Lab (Educational Context)
- Jekyll static site in `theory-iv-lab/` directory
- Uses includes for modular embedding of interactive tools
- Designed for MUS_CLAS 242 (Post-Tonal Theory) at Gettysburg College
- Focuses on temporal organization, grouping, and pre-notational rhythm concepts
- Separate pulse-grouping implementation with Tone.js in `theory-iv-lab/assets/js/`
