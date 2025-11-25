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

## Educational Context & Pedagogical Goals

### Primary Use: Post-Tonal/Rhythm Theory Course
This application is designed as an **educational tool for teaching rhythm theory** in a post-tonal music theory course. The focus is on:

1. **Pulse and Meter Fundamentals**
   - Understanding pulse as the fundamental unit of rhythmic organization
   - The pulse row serves as a constant reference point (visual metronome)
   - Exploring how different groupings emerge from the same underlying pulse stream

2. **Toussaint-Style Rhythm Patterns**
   - Named after Godfried Toussaint's work on computational rhythm analysis
   - Focus on cross-cultural rhythmic patterns (clave, tresillo, etc.)
   - Exploring mathematical properties of rhythmic patterns (evenness, maximally even sets)
   - Understanding rhythmic spacing and interval patterns

3. **Polyrhythm and Metric Dissonance**
   - Layering different groupings (2s, 3s, 4s, 5s) over the same pulse
   - Creating tension through conflicting metric layers
   - Exploring phase relationships via row shifting
   - Understanding metric modulation concepts

4. **Pre-Notational Rhythm Exploration**
   - Working with rhythm directly without traditional notation
   - Grid-based representation (like tracker software or drum machines)
   - Immediate auditory feedback for theoretical concepts
   - Separation from pitch-based thinking

5. **Pattern Analysis and Transformation**
   - Visual pattern recognition in grid format
   - Pattern rotation (cyclic permutation) via shift buttons
   - Pattern complementarity and inverse relationships
   - Export to text for analysis and documentation

### Pedagogical Features

**Visual Learning:**
- Grid representation maps directly to time (columns = temporal positions)
- Always-visible pulse row reinforces beat subdivision
- Real-time highlighting shows playback position
- Export panel provides text-based pattern analysis

**Interactive Experimentation:**
- Immediate audio feedback when clicking cells
- Easy pattern manipulation (shift, clear, every-N)
- Multiple sample sets for different sonic characters
- Tempo control for exploring patterns at different speeds

**Pattern Sharing & Documentation:**
- URL sharing for distributing examples to students
- Import/export for homework submissions
- Text format readable without software
- Embeddable in course websites (Google Sites, LMS)

**Scaffolded Exploration:**
- "Reset to Pulse" provides starting point (all 16ths)
- "Every N" buttons create basic patterns (kick every 4, etc.)
- Preset patterns demonstrate concepts (Toussaint rhythms)
- Clear Grid allows starting fresh

### Common Educational Use Cases

1. **Exploring Euclidean Rhythms**
   - Use "Every N" buttons to create evenly-spaced patterns
   - E.g., "Every 3" in 16 steps creates near-Euclidean distribution
   - Compare E(5,16) vs E(7,16) patterns
   - Discuss maximally even distribution

2. **Analyzing Traditional Rhythms**
   - Import/create clave patterns (son, rumba)
   - Explore African bell patterns (gankogui, kidi)
   - Study metric hierarchies in Western drumming
   - Compare patterns across cultures

3. **Understanding Additive Rhythm**
   - Build patterns using groupings (3+3+2, 2+2+3+2+3, etc.)
   - Visualize how 12 or 16 pulses can be grouped differently
   - Explore asymmetric meters (5/8, 7/8, 11/8)
   - Connect to Bartók and Stravinsky rhythm practices

4. **Phase Music / Minimalism**
   - Set up repeating patterns on multiple tracks
   - Shift one track to create gradual phase relationships
   - Explore Steve Reich-style phase patterns
   - Understand how identical patterns interact at different phases

5. **Metric Modulation Concepts**
   - Set tempo, then change to show same pattern at different speeds
   - Layer patterns that imply different tempos
   - Explore 3:4 and 2:3 relationships
   - Connect to Carter's metric modulation technique

### Student Workflow

**Typical Assignment Pattern:**
1. Teacher shares URL with base pattern
2. Students modify/experiment with pattern
3. Students export their work as .txt file
4. Submit .txt file or share URL for feedback
5. Teacher imports patterns for review/discussion

**In-Class Activities:**
1. Project app on screen
2. Build patterns collaboratively
3. Immediate playback for group listening
4. Export pattern for later analysis
5. Compare multiple student solutions

### Technical Pedagogical Considerations

**Why This Architecture Matters for Teaching:**
- **No Installation Required**: Browser-based, works on any device
- **Platform Independent**: Windows, Mac, Chromebook, tablet
- **Offline Capable**: Can run from local files if needed
- **Shareable**: URLs encode complete musical state
- **Accessible**: No DAW knowledge required
- **Focused**: Limited controls keep attention on rhythm concepts
- **Embeddable**: Can be integrated into LMS (Canvas, Moodle, etc.)

**Sample Library Pedagogical Value:**
- Classic drum machines (TR-909, CR-78) connect to electronic music history
- Acoustic kits (Pearl) for traditional drumming context
- Different timbres help distinguish layered patterns
- Sample selection doesn't require audio engineering knowledge

### Integration with Other Course Materials

**Theory IV Lab (Educational Context):**
- Jekyll static site in `theory-iv-lab/` directory
- Uses includes for modular embedding of interactive tools
- Designed for MUS_CLAS 242 (Post-Tonal Theory) at Gettysburg College
- Focuses on temporal organization, grouping, and pre-notational rhythm concepts
- Separate pulse-grouping implementation with Tone.js in `theory-iv-lab/assets/js/`

**Recommended Complementary Resources:**
- Toussaint's "The Geometry of Musical Rhythm" (book)
- AABA or circular rhythm visualization tools
- Traditional music notation software for comparison
- Audio examples from various musical traditions

### Future Pedagogical Enhancements (Ideas)

**Potential Features for Educational Use:**
- Visual analysis overlays (grouping brackets, accent marks)
- Pattern similarity calculator (Hamming distance)
- Automatic detection of pattern properties (evenness, balance)
- Export to notation software formats (MusicXML)
- Collaborative editing (multiple students editing same pattern)
- Pattern library with cultural/historical annotations
- Built-in exercises with auto-checking
- Video record function for presentations

**Assessment Features:**
- Pattern comparison tool (student vs. reference pattern)
- Rubric-based evaluation (complexity, creativity, accuracy)
- Progress tracking across assignments
- Portfolio of exported patterns

### Important Teaching Notes

**For AI Assistants Helping with This Project:**
- **Primary goal is EDUCATION, not production music**
- Prioritize clarity and simplicity over advanced features
- UI changes should support pedagogical objectives
- Keep the interface focused on rhythm/pulse concepts
- Documentation should explain WHY features exist pedagogically
- New features should have clear learning objectives
- Performance is less critical than accessibility and reliability
- Pattern sharing and export are CRITICAL features (don't break)
- The pulse row is essential for pedagogical grounding

**When Adding Features, Consider:**
- Does this help students understand rhythm theory?
- Will this distract from core learning objectives?
- Is it accessible to students without music tech background?
- Can students document/share their work?
- Does it work on basic school computers/Chromebooks?
- Can it be demonstrated clearly in class?

**Key Pedagogical Principles:**
1. **See the pattern** (visual grid)
2. **Hear the pattern** (immediate audio)
3. **Manipulate the pattern** (interactive editing)
4. **Share the pattern** (URLs, export)
5. **Analyze the pattern** (text representation)
6. **Compare patterns** (multiple tracks, shifting)

This tool bridges theoretical understanding and practical musical experience, making abstract rhythmic concepts tangible and explorable.
