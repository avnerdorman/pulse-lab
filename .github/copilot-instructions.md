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

---

## Euclidean Rhythms & Maximally Even Distributions

### Mathematical Foundation

**Euclidean rhythms** are maximally even distributions of k onsets across n time steps, generated using the Bjorklund algorithm (originally designed for neutron timing in nuclear physics). The notation **E(k,n)** describes a pattern with:
- **k** = number of onsets (pulses to distribute)
- **n** = total steps in the cycle (measure length)

**Maximally even** means the onsets are distributed as evenly as possible:
- All inter-onset intervals differ by at most 1 step
- Mathematically optimal spacing given the constraints
- Produces patterns with strong structural coherence

### Why This Matters Pedagogically

**1. Cross-Cultural Musical Ubiquity**
Euclidean patterns appear independently in musical traditions worldwide:
- **E(3,8)** = Tresillo (Cuban, North African, Middle Eastern)
- **E(5,8)** = Cinquillo (Cuban habanera, West African timelines)
- **E(5,12)** = York-Samai pattern (Arab classical music)
- **E(7,12)** = West African bell pattern
- **E(5,16)** = Bossa nova clave
- **E(7,16)** = Brazilian samba

This demonstrates that **mathematical structure underlies musical intuition** across cultures. Students discover that patterns they hear in diverse music share a common mathematical property.

**2. Connection to Timeline Theory (Toussaint)**
Euclidean rhythms are a subset of timeline patterns studied by Godfried Toussaint:
- Timelines are cyclical, repeating rhythmic patterns that organize music
- They function as reference structures (like the pulse row in this app)
- Maximally even timelines have special perceptual salience
- Rotation creates related but distinct patterns (same intervals, different starting point)

**3. Pre-Notational Rhythm Understanding**
Euclidean patterns help students:
- Think about rhythm as **spacing** rather than durations
- Understand cyclic structure (no inherent "beginning")
- Explore patterns without pitch/notation complexity
- Connect mathematical concepts to musical perception

### Pedagogical Sequence for Teaching Euclidean Rhythms

**Stage 1: Discovery (Experimentation)**
- Students experiment with Euclidean generator
- Try different k values at fixed n (e.g., n=16)
- Listen and compare E(3,16), E(5,16), E(7,16), E(9,16)
- Question: "Which ones sound more even? Why?"

**Stage 2: Pattern Recognition (Cultural Context)**
- Introduce cultural examples after students have heard patterns
- "The pattern you just created as E(5,8) is called cinquillo in Cuban music"
- Show how same mathematical structure appears in different cultures
- Play recorded examples from various traditions

**Stage 3: Mathematical Analysis**
- Calculate inter-onset intervals for patterns
- E(5,8) = [2,1,2,2,1] (reading between X marks)
- Notice that intervals only differ by 1
- Compare to non-Euclidean patterns (irregular spacing)

**Stage 4: Rotation & Phase**
- Use shift-left/shift-right to rotate patterns
- Discover that rotations are musically related
- E(5,16) has 16 rotations, some more common than others
- Connect to timeline theory: patterns can start anywhere in cycle

**Stage 5: Layering & Polyrhythm**
- Create Euclidean patterns on multiple tracks
- E(3,16) + E(5,16) + E(7,16) simultaneously
- Explore cross-rhythms and metric dissonance
- Understand how simple patterns create complexity

**Stage 6: Composition & Application**
- Students create pieces using only Euclidean patterns
- Experiment with different sample sets (acoustic vs. electronic)
- Layer, shift, and combine patterns
- Export and document their compositional choices

### Key Insights for Course Pages

**Why the Algorithm Doesn't Force Pulse 1 Start:**
The Bjorklund algorithm produces patterns in their "natural" form—the mathematically optimal distribution. Some start with an onset, others with a rest. This is pedagogically valuable because:
- It shows patterns are **cyclical** with no privileged starting point
- Students must think beyond "downbeat orientation"
- Connects to necklace theory (rotations of the same structure)
- Encourages use of shift buttons to explore rotations

**Connecting to "Introduction to Timelines" Material:**
Your intro-to-timelines.html already introduces:
- Binary representation (X . . X . X or 1 0 1 0)
- Onset lists [0, 3, 6, 10, 13]
- Circle representations (geometry)
- Operations: rotation, complement

The Euclidean generator extends this by:
- Automatically creating maximally even patterns
- Demonstrating algorithmic rhythm generation
- Showing that mathematical structure = musical structure
- Providing examples for rotation/complement exploration

**Assessment Ideas:**

*Analysis Assignment:*
1. Generate E(5,12) and export the pattern
2. List the inter-onset intervals
3. Explain why this is "maximally even"
4. Find a musical example using this pattern
5. Create 3 rotations and describe their different "feels"

*Composition Assignment:*
1. Create a 3-layer piece using only Euclidean patterns
2. At least one pattern must be E(k,n) where k and n are coprime
3. Use rotation to create variation
4. Export and document which patterns you used
5. Explain your compositional choices

*Research Assignment:*
1. Pick a cultural music tradition (Afro-Cuban, West African, Arab, Brazilian)
2. Find a traditional timeline pattern from that culture
3. Determine if it's Euclidean (or close to it)
4. Recreate it in the app and explore variations
5. Present findings with audio examples

### Vocabulary for Course Pages

**Essential Terms:**
- **Euclidean rhythm**: Maximally even distribution of k onsets over n steps
- **Maximally even**: All intervals differ by at most 1
- **Timeline**: Repeating rhythmic pattern that organizes a musical cycle
- **Onset**: The attack point of a sound (the X in the pattern)
- **Inter-onset interval (IOI)**: The distance between consecutive onsets
- **Rotation**: Shifting a pattern by n positions (cyclic permutation)
- **Coprime**: Two numbers with no common divisors (e.g., 5 and 8)

**Advanced Concepts:**
- **Necklace**: A pattern viewed as a cycle (all rotations considered equivalent)
- **Complement**: Inverting X ↔ . (rests become onsets, vice versa)
- **Evenness**: How uniformly onsets are distributed across the cycle
- **Bjorklund algorithm**: Efficient method for generating Euclidean patterns
- **Phase relationship**: How two patterns align temporally

### Connection to Other Course Topics

**Post-Tonal Set Theory Parallels:**
- Euclidean rhythms are to time what maximally even pitch sets are to pitch
- E(5,12) rhythm ≈ pentatonic scale in pitch (both maximally even)
- E(7,12) rhythm ≈ diatonic scale in pitch
- Rotation in rhythm = transposition in pitch
- Complement in rhythm = complement in pitch

**Metric Hierarchy:**
- Euclidean patterns create implied metric layers
- E(3,16) groups 16 pulses into 3+3+3+3+2+2 (or similar)
- Students discover grouping through interval analysis
- Connects to additive meter (Bartók, Balkan music)

**Minimalism & Process Music:**
- Steve Reich's phase music uses rotation of identical patterns
- Euclidean patterns provide clear structure for phase experiments
- Students can recreate Reich-like textures using shift buttons
- Algorithmic generation connects to minimalist compositional techniques

### Sample Lesson Plan Outline

**Week 2 Wednesday: Introduction to Timelines** (existing material)
- What is a timeline? (repeating cyclical pattern)
- Three representations: binary, onset list, circle
- Operations: rotation, complement
- Interactive tool: circle visualizer
- Embedded Pulse Lab for experimentation

**Week 3 Monday: Euclidean Rhythms** (suggested new page)
- Mathematical definition: E(k,n) = maximally even distribution
- Historical context: Bjorklund algorithm from physics
- Musical ubiquity: cross-cultural examples
- Hands-on: Generate and compare E(3,8), E(5,8), E(7,8)
- Assignment: Create piece using only Euclidean patterns

**Week 3 Wednesday: Timeline Analysis** (suggested new page)
- Inter-onset interval calculation
- Evenness measurement
- Pattern comparison (Euclidean vs. non-Euclidean)
- Cultural examples deep dive
- Assignment: Analyze traditional timeline from chosen culture

**Week 4: Polyrhythm & Layering** (extension)
- Layering Euclidean patterns
- Coprime relationships (E(5,12) + E(7,12))
- Metric dissonance and tension
- Steve Reich phase techniques
- Assignment: Multi-track Euclidean composition

### Recommended Readings for Students

**Accessible:**
- Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms" (paper)
- Toussaint, "The Geometry of Musical Rhythm" (book, Chapters 1-3)
- Demaine et al., "The Distance Geometry of Music" (paper, introduction)

**Advanced:**
- Pressing, "Cognitive Complexity and the Structure of Musical Patterns" (1999)
- London, "Hearing in Time" (book, on meter perception)
- Rahn, "Turning the Analysis Around: African-Derived Rhythms" (1996)

**Online Resources:**
- Svg Rhythm (online Euclidean rhythm generator with audio)
- The Infinite Drum Machine (Google Creative Lab)
- Circular rhythm visualization tools

### Future Enhancement Ideas

**For Course Page Integration:**
1. **Embedded Euclidean Generator**: Embed the Pulse Lab with Euclidean feature in course pages
2. **Pattern Library**: Curated collection of cultural timeline patterns with context
3. **Visual Analysis Tool**: Overlay interval annotations on patterns
4. **Auto-Analysis**: Calculate and display inter-onset intervals automatically
5. **Comparison Mode**: Side-by-side pattern comparison tool
6. **Notation Export**: Generate traditional music notation from patterns

**Interactive Exercises:**
1. **Pattern Matching**: "Which E(k,n) matches this audio?"
2. **Culture Quiz**: "Identify the cultural origin of this timeline"
3. **Interval Calculation**: Auto-check student interval analysis
4. **Rotation Recognition**: "Which rotation of E(5,8) is this?"

This pedagogical framework connects mathematical concepts, cultural context, and hands-on experimentation—making abstract rhythm theory tangible and relevant to students' musical understanding.

---

## Circle View / Necklace Representation

### Mathematical & Visual Foundation

The **circle view** (also called necklace representation) displays rhythmic patterns as points distributed evenly around a circle. This geometric representation has profound pedagogical and theoretical significance:

**Circle Geometry:**
- n pulses are placed equidistant around the circle's circumference
- Onsets (attacks) appear as filled dots
- Rests appear as empty dots
- Pulse 1 starts at 12 o'clock (top of circle)
- Pulses proceed clockwise around the cycle

**Why This Representation Matters:**
1. **Reveals cyclic structure**: Patterns have no inherent beginning or end
2. **Makes rotation visible**: Shifting the pattern is literally rotating the circle
3. **Shows symmetry**: Geometric properties become visually apparent
4. **Connects to necklace theory**: Patterns are equivalent under rotation
5. **Parallels pitch-class clock**: Same visual model as 12-tone pitch-class space

### Pedagogical Applications

#### 1. Teaching Rotation as Transformation

**Visual Understanding:**
When students use the shift-left (←) or shift-right (→) buttons in the grid view, they can immediately see the effect in circle view:
- The onset pattern rotates around the circle
- The spacing between onsets remains constant
- Different rotations can sound quite different despite same interval structure

**Learning Sequence:**
1. Create a simple pattern (e.g., E(5,16))
2. Open circle view to see geometric distribution
3. Use shift buttons and watch circle rotate
4. Notice: **same shape, different starting point**
5. Listen: how does the "feel" change with different rotations?

**Key Insight:** Rotation is a **geometric transformation** that preserves interval structure but changes the relationship to the reference pulse (pulse 1).

#### 2. Visualizing Maximally Even Distributions

**Euclidean Patterns in Circle View:**
- E(5,12): Five dots evenly spread around circle (like pentagon inscribed in circle)
- E(7,12): Seven dots evenly spread (like heptagon)
- E(5,16): Five dots distributed with maximum evenness possible in 16 steps

**Student Discovery Activity:**
1. Generate E(5,12) using Euclidean generator
2. Open circle view
3. Observe how dots are "almost evenly spaced" (can't be perfect with 5 into 12)
4. Compare to E(5,10) - see perfect pentagon
5. Question: "Why are some distributions perfectly even and others not?"
6. Answer: Depends on whether k divides n evenly

**Mathematical Connection:**
- When k and n are coprime (share no common factors), patterns tend to be more "interesting"
- E(5,12) is maximally even but not perfectly even
- This connects to pitch: pentatonic scale (5 notes in 12) has same property

#### 3. Understanding Necklace Equivalence

**Necklace Theory (Combinatorics):**
A "necklace" in mathematics is a pattern where rotations are considered equivalent. The circle view makes this concept concrete:

**Example:**
- E(3,8) = [X . . X . . X .]
- This pattern has 8 rotations
- But some rotations might produce the same necklace
- Circle view shows: the pattern is the same "shape" from any starting point

**Classroom Activity:**
1. Create asymmetric pattern: [X . X . . . X . . .]
2. Open circle view - see the shape
3. Use shift buttons to create all rotations
4. Ask: "Are any rotations identical? Why or why not?"
5. Discover: only symmetric patterns have rotation-invariant forms

#### 4. Comparing Patterns Across Tracks

**Multi-Track Circle View:**
The circle view shows ALL active tracks simultaneously as separate circles in a grid:

**Pedagogical Value:**
- **Visual polyrhythm**: See how different patterns relate geometrically
- **Density comparison**: E(3,16) vs E(7,16) - visually sparse vs. dense
- **Phase relationships**: Tracks with same pattern but different rotations
- **Complementary patterns**: Pattern + its complement = full circle

**Analysis Assignment:**
1. Create 3 tracks: E(3,16), E(5,16), E(7,16)
2. Open circle view
3. Sketch the three circles
4. Calculate inter-onset intervals for each
5. Describe: How do the geometric distributions differ?
6. Listen: How do density differences affect perception?

#### 5. Connection to Cultural Timeline Notation

**Toussaint's Box Notation:**
Godfried Toussaint uses circle diagrams extensively in "The Geometry of Musical Rhythm." The app's circle view matches this scholarly representation:

**Cultural Examples in Circle View:**
- **Tresillo** [X . . X . . X .] - three evenly spaced dots in 8 (E(3,8))
- **Son Clave** [X . . X . . X . . . X . . . . .] - see the 3+2 grouping visually
- **Bossa Clave** - complex spacing becomes clear in circle form

**Research Activity:**
1. Find a traditional timeline pattern from world music
2. Enter it in the grid
3. View in circle form
4. Sketch the distribution
5. Determine if it's Euclidean (maximally even)
6. Compare to other patterns from same tradition

### Visual Learning Advantages

**Why Circle View Enhances Understanding:**

1. **Spatial Memory**: Visual geometric shapes are easier to remember than grid patterns
2. **Pattern Recognition**: Symmetries and regularities become immediately apparent
3. **Rotation Intuition**: Circular motion is more intuitive than left/right shifts
4. **Scale Independence**: Same visual representation works for any cycle length
5. **Connection to Clock**: Familiar metaphor (rhythm as cycles of time)

### Advanced Concepts Made Visible

#### Metric Hierarchy
Different groupings of the same pulse stream appear as different geometric divisions:
- 4 groups of 4 (16 pulses) = square inscribed in circle
- 3 groups of 4 (12 pulses) = triangle with subdivisions
- Visual hierarchy emerges from geometric relationships

#### Aksak Meters (Irregular Meters)
Balkan rhythms with irregular groupings (2+2+3, 3+2+2, etc.):
- Each grouping creates different visual shape
- Circle view shows why some groupings "feel" more stable
- Geometric balance corresponds to rhythmic balance

#### Complement Visualization
The complement of a pattern (X ↔ .) fills in the "empty spaces":
- Original pattern: Some dots around circle
- Complement: Dots in all remaining positions
- Together: Complete circle (all positions filled)

### Teaching Sequence for Circle View

**Week 1: Introduction**
- Show simple pattern in both grid and circle
- Explain: circle shows same information, different way
- Practice: students sketch circle representations by hand
- Connect: pulse stream as circular timeline

**Week 2: Rotation**
- Use shift buttons, observe circle view changes
- Create all rotations of a pattern
- Identify which rotations "sound best" at tempo
- Understand: rotation preserves structure

**Week 3: Euclidean Patterns**
- Generate E(k,n) patterns for various k and n
- Open circle view to see geometric distributions
- Compare even vs. uneven spacing
- Discover: mathematical patterns in music

**Week 4: Multi-Pattern Analysis**
- Layer multiple patterns
- View all circles simultaneously
- Analyze geometric relationships
- Compose using visual complement (one pattern fills another's gaps)

**Week 5: Cultural Timelines**
- Study traditional patterns (clave, gankogui, etc.)
- Visualize in circle form
- Compare geometric properties
- Research: why do similar shapes appear across cultures?

### Assessment Using Circle View

**Visual Analysis Assignment:**
1. Given: Three circle diagrams of patterns
2. Task: Convert to binary notation (X . X .)
3. Calculate: Inter-onset intervals
4. Determine: Which is Euclidean?
5. Create: Grid representation from circle diagram

**Composition with Geometric Constraints:**
1. Compose 4-track piece
2. Requirement: One track must be symmetric in circle view
3. Requirement: Two tracks must be rotations of each other
4. Requirement: One track must be complement of another
5. Export: Both grid and circle representations
6. Explain: How geometric constraints influenced your composition

**Pattern Recognition Quiz:**
1. Listen to pattern (without seeing it)
2. Sketch what the circle view would look like
3. Verify using app
4. Reflect: What aural cues helped you visualize the geometry?

### Connection to Pitch-Class Theory (Advanced)

**For Post-Tonal Theory Courses:**

The circle view creates a direct parallel between rhythm and pitch:

| Rhythm (Time) | Pitch (Frequency) |
|---------------|-------------------|
| 12 or 16 pulses | 12 chromatic pitches |
| Timeline pattern | Pitch-class set |
| Rotation | Transposition |
| E(5,12) rhythm | Pentatonic scale |
| E(7,12) rhythm | Diatonic scale |
| Complement | Set complement |
| Necklace | Prime form |

**Unified Theory Assignment:**
1. Create E(7,12) rhythm pattern
2. Observe circle view (7 dots in 12 positions)
3. Compare to C major scale (7 notes in 12 pitches)
4. Notice: **same geometric structure**
5. Question: Why does "maximally even" matter in both domains?
6. Answer: Perceptual balance, variety without chaos, mathematical beauty

### Practical Tips for Teaching with Circle View

**Introducing the Feature:**
- Start with grid view (familiar tracker interface)
- After students comfortable with patterns, introduce circle
- Present as "another way to see the same thing"
- Use analogy: like seeing building from ground vs. aerial view

**Common Student Confusions:**
1. **"Where does the pattern start?"**
   Answer: Anywhere! That's the point—it's a cycle.

2. **"Why does pulse 1 start at the top?"**
   Answer: Convention (like 12 o'clock on a clock). We could start anywhere.

3. **"Is clockwise the same as left-to-right in the grid?"**
   Answer: Yes! Clockwise = time moving forward = left-to-right in grid.

4. **"Why do the dots look uneven when it's supposed to be 'maximally even'?"**
   Answer: "Maximally even" means intervals differ by at most 1, not that spacing is perfectly equal.

**Effective Demonstrations:**
- Project circle view during playback - watch blue highlight rotate
- Show rotation: click shift button, watch circle spin
- Compare patterns: E(3,16), E(5,16), E(7,16), E(9,16) side by side
- Create complement: original + complement = complete circle

### Future Enhancements

**Interactive Circle View (Potential Features):**
1. **Click to edit**: Click dots to toggle onsets in circle view
2. **Rotation slider**: Continuous rotation control
3. **Interval labels**: Show inter-onset intervals on circle
4. **Symmetry detection**: Highlight symmetry axes
5. **Animation**: Show pattern evolution through rotations
6. **Comparison mode**: Overlay two patterns on same circle
7. **Export circle**: Save as SVG for papers/presentations

**Advanced Visualizations:**
1. **3D helix view**: Spiral showing pattern over multiple cycles
2. **Phase animation**: Two patterns gradually shifting phase
3. **Polygon inscriptions**: Show k-gons for E(k,n) patterns
4. **Color coding**: Different instruments in different colors

### Research Connections

**Scholarly References for Circle Representations:**

1. **Toussaint (2013)** - "The Geometry of Musical Rhythm"
   Extensive use of circle diagrams for timeline analysis

2. **Demaine et al. (2009)** - "The Distance Geometry of Music"
   Mathematical analysis of rhythmic patterns using geometric representations

3. **Pressing (1983)** - "Cognitive Isomorphisms in Music"
   Circular representations in cognitive rhythm theory

4. **Rahn (1996)** - "Turning the Analysis Around"
   African-derived rhythms analyzed through circular notation

**Student Research Projects:**
- Catalog traditional rhythms and their circle representations
- Analyze symmetry properties of cultural timelines
- Compare aural vs. visual pattern recognition using circle view
- Investigate why Euclidean patterns appear cross-culturally

### Conclusion: Why Circle View Matters

The circle view is not just a "nice visualization"—it's a **fundamental pedagogical tool** that:

1. **Makes abstract concepts concrete** - rotation becomes geometric transformation
2. **Connects rhythm to pitch** - unified set-theoretic approach
3. **Reveals cultural universals** - maximally even distributions across traditions
4. **Enables visual analysis** - students can "see" what they hear
5. **Supports inquiry-based learning** - geometric patterns invite exploration

When combined with the grid view (linear time) and the Euclidean generator (algorithmic creation), the circle view completes a **three-way representation system**:
- **Grid** = how we notate and perform
- **Algorithm** = how we generate and analyze
- **Circle** = how we understand and transform

This multi-modal approach supports diverse learning styles and creates deeper understanding of rhythmic structure than any single representation alone.
