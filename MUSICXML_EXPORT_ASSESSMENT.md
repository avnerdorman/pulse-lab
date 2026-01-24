# MusicXML Export Assessment

## Overview
This document assesses options for adding MusicXML export functionality to Pulse Lab, enabling users to export rhythm patterns to notation software like MuseScore, Finale, Sibelius, etc.

---

## Current State Analysis

### Existing Export Format (`script.js:353-443`)
```
Tempo: 80 BPM
Pattern length: 16 pulses
Repeats: ∞ (loop)

Pulses:           ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●
Track 1:          X . . . X . . . X . . . X . . .
Track 2:          X . X . X . X . X . X . X . X .
```

### Data Model
- **Pulses**: Grid cells with `.tracker-enabled` class = onset (X), absence = rest/continuation (.)
- **Tempo**: BPM value (typically 60-240)
- **Pattern Length**: 8-36 pulses (common: 12, 16, 24, 32, 36)
- **Tracks**: Multiple independent percussion voices

---

## Key Design Decisions

### 1. Pulse Duration Representation

**Challenge**: Map abstract "pulses" to musical note durations

**Options**:

#### A. **Fixed Mapping (Simplest - RECOMMENDED for v1)**
- **Default**: 1 pulse = 1 sixteenth note
- **Time Signature**: Auto-select based on pattern length
  - 12 pulses → 3/4 (3 beats of quarter notes)
  - 16 pulses → 4/4 (4 beats of quarter notes)
  - 24 pulses → 6/4 or 3/2 (6 beats)
  - 32 pulses → 4/4 (2 measures)

**Pros**:
- Zero user input needed
- Consistent, predictable
- Works well with existing tempo system
- Easy to implement

**Cons**:
- No flexibility for other musical contexts
- May not match user's mental model

#### B. **User-Selectable Pulse Duration**
Add UI controls in export panel:
```html
<select id="pulse-duration">
  <option value="32">32nd note</option>
  <option value="16" selected>16th note</option>
  <option value="8">8th note</option>
  <option value="4">Quarter note</option>
</select>
```

**Pros**:
- Flexible for different musical styles
- User controls interpretation
- Enables both simple and complex rhythms

**Cons**:
- Requires UI changes
- May confuse non-musicians
- Need to recalculate tempo relationship

#### C. **Smart Inference (Advanced)**
Analyze pattern to suggest optimal note value:
- Short patterns (8-12) → 8th notes
- Medium patterns (16-24) → 16th notes
- Long patterns (32+) → 32nd notes

**Pros**:
- Intelligent defaults
- Can still allow override

**Cons**:
- Complex logic
- May not match user intent
- Harder to test

**RECOMMENDATION**: **Option A** for initial implementation, **Option B** for future enhancement

---

### 2. Meter (Time Signature) Choice

**Challenge**: Determine time signature for MusicXML

**Options**:

#### A. **Auto-Calculate from Pattern Length (RECOMMENDED)**
```javascript
function getTimeSignature(pulseCount, pulseDuration = 16) {
  // Assuming 16th notes, calculate quarter notes
  const quarters = pulseCount / (16 / pulseDuration);

  // Common time signatures
  if (quarters === 4) return { beats: 4, beatType: 4 }; // 4/4
  if (quarters === 3) return { beats: 3, beatType: 4 }; // 3/4
  if (quarters === 6) return { beats: 6, beatType: 8 }; // 6/8
  if (quarters === 5) return { beats: 5, beatType: 4 }; // 5/4
  if (quarters === 7) return { beats: 7, beatType: 4 }; // 7/4

  // Default: use quarter note count
  return { beats: quarters, beatType: 4 };
}
```

**Pros**:
- Automatic, no user input
- Mathematically correct
- Handles odd meters

**Cons**:
- May produce unusual meters (13/4, etc.)
- Doesn't account for compound meter preferences

#### B. **User Selection with Smart Default**
```html
<select id="time-signature">
  <option value="4/4">4/4 (Common Time)</option>
  <option value="3/4">3/4 (Waltz)</option>
  <option value="6/8">6/8 (Compound)</option>
  <option value="5/4">5/4</option>
  <option value="7/8">7/8</option>
  <option value="custom">Custom...</option>
</select>
```

**Pros**:
- User control over musical interpretation
- Can choose between simple/compound meter
- Handles edge cases

**Cons**:
- More UI complexity
- Could confuse users if selection doesn't match pattern

#### C. **Multiple Measures**
For long patterns, split across multiple measures:
- 32 pulses → 2 measures of 4/4
- 24 pulses → 2 measures of 3/4 or 1 measure of 6/4

**Pros**:
- More conventional notation
- Easier to read

**Cons**:
- Adds complexity
- May not match looping intent

**RECOMMENDATION**: **Option A** for v1 with **Option C** for patterns > 16 pulses

---

### 3. Empty Cells: Rests vs. Continuation

**Challenge**: Interpret the meaning of '.' (non-onset pulses)

**Current Behavior**: `.` simply means "no onset at this pulse"

**Options**:

#### A. **All Empty Cells = Rests (Simplest - RECOMMENDED for v1)**
```
X . . . X . . .  →  [quarter] [rest] [rest] [rest] [quarter] [rest] [rest] [rest]
```

**Pros**:
- Simplest to implement
- Clear, unambiguous
- Works for all percussion instruments

**Cons**:
- Doesn't show duration of sounds
- Ignores sustain/decay
- No tied notes

**MusicXML**:
```xml
<note>
  <unpitched><display-step>C</display-step><display-octave>4</display-octave></unpitched>
  <duration>1</duration>
  <type>16th</type>
</note>
<note>
  <rest/>
  <duration>3</duration>
  <type>16th</type>
</note>
```

#### B. **Consolidate Consecutive Rests**
```
X . . . X . . .  →  [quarter] [dotted-quarter-rest] [quarter] [dotted-quarter-rest]
```

**Pros**:
- Cleaner notation
- More readable scores
- Standard music notation practice

**Cons**:
- Requires rest-grouping algorithm
- Must respect measure boundaries
- Complex edge cases

#### C. **Duration-Based (Advanced)**
Allow user to specify note duration:
```
Duration: 2 pulses
X . . . X . . .  →  [eighth] [eighth-rest] [eighth-rest] [eighth] [eighth-rest] [eighth-rest]
```

**Pros**:
- Represents sustain
- More musical interpretation
- Can show tied notes

**Cons**:
- Requires additional user input
- More complex logic
- Ambiguous for overlapping sounds

#### D. **User Toggle**
```html
<label>
  <input type="radio" name="rest-mode" value="individual" checked> Each pulse = rest/note
</label>
<label>
  <input type="radio" name="rest-mode" value="consolidated"> Combine consecutive rests
</label>
<label>
  <input type="radio" name="rest-mode" value="duration"> Use note duration
  <input type="number" id="note-duration" min="1" max="16" value="1"> pulses
</label>
```

**RECOMMENDATION**: **Option A** for v1, **Option B** for v2 (better notation), **Option C** as advanced feature

---

### 4. Ensuring Proper Rhythmic Notation

**Challenge**: Generate valid, well-formed MusicXML

**Strategies**:

#### A. **Use Established MusicXML Library**

**Client-Side Options** (GitHub Pages compatible):
1. **Build from Scratch** (RECOMMENDED)
   - Direct XML string generation
   - Full control over output
   - No dependencies
   - ~200-300 lines of code

2. **opensheetmusicdisplay** (OSMD)
   - Can both render AND export MusicXML
   - Large library (~1MB+)
   - Might be overkill for export-only

3. **Vexflow** (rendering only, not generation)
   - Great for display, not for export

**RECOMMENDATION**: Build custom MusicXML generator
- Percussion notation is relatively simple
- Full control over structure
- No heavy dependencies
- Easy to debug and extend

#### B. **Validation Strategy**

```javascript
function validateMusicXML(xmlString) {
  // 1. Parse as XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // 2. Check for parse errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML structure");
  }

  // 3. Validate required elements
  const scorePartwise = xmlDoc.querySelector("score-partwise");
  if (!scorePartwise) {
    throw new Error("Missing score-partwise root element");
  }

  // 4. Validate duration totals match time signature
  // ... (detailed validation)

  return true;
}
```

#### C. **Testing Against Notation Software**
- Export samples and test in:
  - MuseScore (free, open-source)
  - Finale NotePad (free version)
  - Sibelius First (free trial)
  - Dorico SE (free version)

**Test Cases**:
1. Simple pattern (4/4, all quarter notes)
2. Euclidean pattern (syncopation)
3. Multiple tracks (percussion ensemble)
4. Odd meter (5/4, 7/8)
5. Long pattern (2+ measures)

---

### 5. GitHub Pages Compatibility

**Constraint**: All processing must be client-side JavaScript

**Architecture**:

#### A. **Pure JavaScript Implementation (RECOMMENDED)**
```javascript
// In script.js or new file: musicxml-export.js

class MusicXMLExporter {
  constructor(config) {
    this.pulseDuration = config.pulseDuration || 16; // 16th note
    this.tempo = config.tempo || 120;
    this.patternLength = config.patternLength;
    this.tracks = config.tracks;
  }

  generate() {
    return this.buildMusicXML();
  }

  buildMusicXML() {
    // Generate XML string
    const parts = [
      this.xmlHeader(),
      this.scoreHeader(),
      this.partList(),
      ...this.parts(),
      this.xmlFooter()
    ];
    return parts.join('\n');
  }

  // ... (implementation details below)
}
```

**File Structure**:
```
pulse-lab/
├── src/
│   ├── musicxml-exporter.js  (new - ~300 lines)
│   └── musicxml-templates.js  (new - XML templates)
├── script.js                  (add export button handler)
└── index.html                 (add "Download MusicXML" button)
```

**Bundle Integration**:
- Add to browserify bundle: `require('./src/musicxml-exporter.js')`
- Or include as separate `<script>` tag for faster iteration

#### B. **Download Mechanism**
```javascript
function downloadMusicXML() {
  const exporter = new MusicXMLExporter({
    tempo: getTempo(),
    patternLength: getPatternLength(),
    tracks: extractTrackData()
  });

  const xmlString = exporter.generate();
  const blob = new Blob([xmlString], { type: 'application/vnd.recordare.musicxml+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `pulse-pattern-${Date.now()}.musicxml`;
  a.click();

  URL.revokeObjectURL(url);
}
```

**UI Integration**:
```html
<div class="export-pattern-actions">
  <button type="button" id="export-copy-btn">Copy to Clipboard</button>
  <button type="button" id="export-download-btn">Download .txt</button>
  <button type="button" id="export-musicxml-btn">Download MusicXML</button>
</div>
```

---

## Recommended Implementation Plan

### Phase 1: Minimal Viable MusicXML Export (v1)

**Features**:
- Fixed pulse duration (16th notes)
- Auto-calculated time signature
- Each pulse = note or rest (no consolidation)
- Single percussion part per track
- Download button in export panel

**User Interface**:
- No additional inputs required
- Single "Download MusicXML" button
- Same simplicity as current .txt export

**File Changes**:
1. Create `src/musicxml-exporter.js`
2. Add button to `index.html` (line ~111)
3. Wire up handler in `script.js`
4. Update bundle if using browserify

**Estimated Effort**: 4-6 hours

---

### Phase 2: Enhanced Options (v2)

**Features**:
- User-selectable pulse duration (dropdown)
- Manual time signature override (dropdown)
- Consolidate consecutive rests (checkbox)
- Multi-measure support for long patterns

**User Interface**:
```html
<section id="musicxml-options" class="export-options">
  <h4>MusicXML Options</h4>

  <div class="field">
    <label for="pulse-value">Pulse equals:</label>
    <select id="pulse-value">
      <option value="16" selected>16th note</option>
      <option value="8">8th note</option>
      <option value="4">Quarter note</option>
    </select>
  </div>

  <div class="field">
    <label for="time-sig">Time signature:</label>
    <select id="time-sig">
      <option value="auto" selected>Auto (4/4, 3/4, etc.)</option>
      <option value="4/4">4/4</option>
      <option value="3/4">3/4</option>
      <option value="6/8">6/8</option>
      <option value="5/4">5/4</option>
    </select>
  </div>

  <div class="field checkbox-field">
    <label class="inline-checkbox">
      <input type="checkbox" id="consolidate-rests" checked>
      Combine consecutive rests
    </label>
  </div>
</section>
```

**Estimated Effort**: 3-4 hours

---

### Phase 3: Advanced Features (v3)

**Features**:
- Note duration configuration (sustain/tied notes)
- Instrument name customization
- Multi-measure patterns with repeat signs
- Batch export (multiple patterns)

**Estimated Effort**: 6-8 hours

---

## MusicXML Structure Example

### Minimal Valid MusicXML for Percussion

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Pulse Lab Pattern</work-title>
  </work>
  <identification>
    <creator type="software">Pulse Lab</creator>
  </identification>
  <defaults>
    <scaling>
      <millimeters>7</millimeters>
      <tenths>40</tenths>
    </scaling>
  </defaults>

  <part-list>
    <score-part id="P1">
      <part-name>Track 1</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Percussion</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>10</midi-channel>
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>

  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions> <!-- 4 divisions per quarter note = 16th notes -->
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>percussion</sign>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>120</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="120"/>
      </direction>

      <!-- Note: X -->
      <note>
        <unpitched>
          <display-step>C</display-step>
          <display-octave>4</display-octave>
        </unpitched>
        <duration>1</duration>
        <type>16th</type>
        <stem>up</stem>
      </note>

      <!-- Rest: . . . -->
      <note>
        <rest/>
        <duration>3</duration>
        <type>16th</type>
      </note>

      <!-- Continue pattern... -->

    </measure>
  </part>
</score-partwise>
```

### Key Elements Explained

1. **`<divisions>4</divisions>`**:
   - 4 divisions per quarter note
   - Each 16th note = 1 division
   - Each quarter note = 4 divisions

2. **`<unpitched>`**:
   - For percussion without specific pitch
   - `display-step` = line on staff (C, D, E, F, G)
   - `display-octave` = which octave (typically 4 or 5)

3. **`<duration>`**:
   - In divisions (not beats)
   - 16th note = 1, 8th = 2, quarter = 4, half = 8

4. **`<type>`**:
   - Visual note shape: 16th, eighth, quarter, half, whole

5. **MIDI Channel 10**: Standard for percussion

---

## Code Skeleton

### `src/musicxml-exporter.js`

```javascript
/**
 * MusicXML Exporter for Pulse Lab
 * Converts rhythm patterns to MusicXML format for notation software
 */

export class MusicXMLExporter {
  constructor(options = {}) {
    this.tempo = options.tempo || 120;
    this.patternLength = options.patternLength || 16;
    this.tracks = options.tracks || [];
    this.pulseDuration = options.pulseDuration || 16; // 16th note default
    this.consolidateRests = options.consolidateRests !== false;
    this.timeSignature = options.timeSignature || this.calculateTimeSignature();
  }

  /**
   * Calculate time signature based on pattern length
   */
  calculateTimeSignature() {
    const divisionsPerQuarter = 4;
    const pulsesPerQuarter = 16 / this.pulseDuration;
    const quarterNotes = this.patternLength / pulsesPerQuarter;

    // Common time signatures
    if (quarterNotes === 4) return { beats: 4, beatType: 4 };
    if (quarterNotes === 3) return { beats: 3, beatType: 4 };
    if (quarterNotes === 6) return { beats: 6, beatType: 4 };
    if (quarterNotes === 2) return { beats: 2, beatType: 4 };

    // Default: use calculated quarter notes
    return { beats: Math.floor(quarterNotes), beatType: 4 };
  }

  /**
   * Generate complete MusicXML document
   */
  generate() {
    const parts = [
      this.xmlDeclaration(),
      this.scoreHeader(),
      this.partList(),
      this.partsContent(),
      this.scoreFooter()
    ];

    return parts.join('\n');
  }

  xmlDeclaration() {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
           '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"\n' +
           '  "http://www.musicxml.org/dtds/partwise.dtd">';
  }

  scoreHeader() {
    return `<score-partwise version="3.1">
  <work>
    <work-title>Pulse Lab Pattern</work-title>
  </work>
  <identification>
    <creator type="software">Pulse Lab</creator>
    <encoding>
      <software>Pulse Lab</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <defaults>
    <scaling>
      <millimeters>7</millimeters>
      <tenths>40</tenths>
    </scaling>
  </defaults>`;
  }

  partList() {
    let xml = '\n  <part-list>';

    this.tracks.forEach((track, index) => {
      const partId = `P${index + 1}`;
      xml += `
    <score-part id="${partId}">
      <part-name>${this.escapeXML(track.name)}</part-name>
      <score-instrument id="${partId}-I1">
        <instrument-name>Percussion</instrument-name>
      </score-instrument>
      <midi-instrument id="${partId}-I1">
        <midi-channel>10</midi-channel>
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>`;
    });

    xml += '\n  </part-list>';
    return xml;
  }

  partsContent() {
    let xml = '';

    this.tracks.forEach((track, index) => {
      xml += this.generatePart(track, index);
    });

    return xml;
  }

  generatePart(track, index) {
    const partId = `P${index + 1}`;
    const measures = this.splitIntoMeasures(track.pattern);

    let xml = `\n  <part id="${partId}">`;

    measures.forEach((measure, measureNum) => {
      xml += this.generateMeasure(measure, measureNum, index === 0);
    });

    xml += '\n  </part>';
    return xml;
  }

  generateMeasure(events, measureNumber, isFirstPart) {
    const divisionsPerQuarter = 4;
    let xml = `\n    <measure number="${measureNumber + 1}">`;

    // First measure of first part: add attributes
    if (measureNumber === 0 && isFirstPart) {
      xml += `
      <attributes>
        <divisions>${divisionsPerQuarter}</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>${this.timeSignature.beats}</beats>
          <beat-type>${this.timeSignature.beatType}</beat-type>
        </time>
        <clef>
          <sign>percussion</sign>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${this.tempo}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${this.tempo}"/>
      </direction>`;
    }

    // Add notes and rests
    events.forEach(event => {
      if (event.type === 'note') {
        xml += this.generateNote(event.duration);
      } else {
        xml += this.generateRest(event.duration);
      }
    });

    xml += '\n    </measure>';
    return xml;
  }

  generateNote(duration) {
    const durationType = this.getDurationType(duration);
    return `
      <note>
        <unpitched>
          <display-step>C</display-step>
          <display-octave>4</display-octave>
        </unpitched>
        <duration>${duration}</duration>
        <type>${durationType}</type>
        <stem>up</stem>
      </note>`;
  }

  generateRest(duration) {
    const durationType = this.getDurationType(duration);
    return `
      <note>
        <rest/>
        <duration>${duration}</duration>
        <type>${durationType}</type>
      </note>`;
  }

  getDurationType(duration) {
    // duration in divisions (divisionsPerQuarter = 4)
    if (duration >= 16) return 'whole';
    if (duration >= 8) return 'half';
    if (duration >= 4) return 'quarter';
    if (duration >= 2) return 'eighth';
    return '16th';
  }

  splitIntoMeasures(pattern) {
    // Pattern is array of 'X' or '.'
    const divisionsPerQuarter = 4;
    const pulsesPerQuarter = 16 / this.pulseDuration;
    const pulsesPerMeasure = this.timeSignature.beats * pulsesPerQuarter;

    const measures = [];
    for (let i = 0; i < pattern.length; i += pulsesPerMeasure) {
      const measurePattern = pattern.slice(i, i + pulsesPerMeasure);
      measures.push(this.patternToEvents(measurePattern));
    }

    return measures;
  }

  patternToEvents(pattern) {
    // Convert ['X', '.', '.', 'X'] to events with durations
    const events = [];
    let i = 0;

    while (i < pattern.length) {
      if (pattern[i] === 'X') {
        events.push({ type: 'note', duration: 1 });
        i++;
      } else {
        // Count consecutive rests
        let restDuration = 0;
        while (i < pattern.length && pattern[i] === '.') {
          restDuration++;
          i++;
        }

        if (this.consolidateRests) {
          events.push({ type: 'rest', duration: restDuration });
        } else {
          for (let j = 0; j < restDuration; j++) {
            events.push({ type: 'rest', duration: 1 });
          }
        }
      }
    }

    return events;
  }

  scoreFooter() {
    return '</score-partwise>';
  }

  escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

---

## Integration with Existing Code

### Changes to `script.js`

```javascript
// Import the exporter
import { MusicXMLExporter } from './src/musicxml-exporter.js';

// Add button handler
const exportMusicXMLBtn = document.getElementById('export-musicxml-btn');
if (exportMusicXMLBtn) {
  exportMusicXMLBtn.addEventListener('click', handleMusicXMLExport);
}

function handleMusicXMLExport() {
  const tracks = extractTrackData();
  const exporter = new MusicXMLExporter({
    tempo: getTempo(),
    patternLength: getPatternLength(),
    tracks: tracks,
    pulseDuration: 16, // Could read from UI later
    consolidateRests: true
  });

  const xmlString = exporter.generate();
  downloadFile(xmlString, `pulse-pattern-${Date.now()}.musicxml`, 'application/vnd.recordare.musicxml+xml');
}

function extractTrackData() {
  const rows = getTrackRows();
  return rows
    .filter(row => rowHasActivity(row, getPatternLength()))
    .map(row => {
      const labelCell = row.querySelector('.tracker-first-cell');
      const name = labelCell ? labelCell.textContent.trim() : `Track ${row.dataset.id}`;
      const cells = Array.from(row.querySelectorAll('.tracker-cell'));
      const pattern = buildRowPattern(cells, getPatternLength())
        .split(' ')
        .filter(s => s.length)
        .map(s => s === 'X' ? 'X' : '.');

      return { name, pattern };
    });
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Changes to `index.html`

```html
<!-- Line ~111 -->
<div class="export-pattern-actions">
  <button type="button" id="export-copy-btn">Copy to Clipboard</button>
  <button type="button" id="export-download-btn">Download .txt</button>
  <button type="button" id="export-musicxml-btn">Download MusicXML</button>
</div>
```

---

## Testing Checklist

- [ ] Export simple 16-pulse pattern (4/4)
- [ ] Export 12-pulse pattern (3/4)
- [ ] Export 24-pulse pattern (6/4 or 2 measures)
- [ ] Export multiple tracks
- [ ] Open in MuseScore - verify notation renders
- [ ] Open in Finale/Sibelius - verify compatibility
- [ ] Verify tempo marking matches BPM input
- [ ] Verify track names appear correctly
- [ ] Test with special characters in track names
- [ ] Test empty patterns (no crashes)
- [ ] Test single-track vs multi-track
- [ ] Verify XML is well-formed (no parse errors)

---

## Future Enhancements

1. **Instrument Selection**: Map tracks to specific percussion instruments (kick, snare, hi-hat, etc.)
2. **Dynamics**: Add velocity/volume markings
3. **Articulations**: Accents, ghost notes
4. **Repeat Signs**: Use MusicXML repeat syntax for looping patterns
5. **Multiple Patterns**: Export sequence of different patterns
6. **Import MusicXML**: Reverse direction (load patterns from .musicxml files)
7. **Visual Preview**: Render notation in-browser before export (using VexFlow or OSMD)

---

## Recommended Approach Summary

**For GitHub Pages compatibility and ease of implementation:**

1. ✅ **Pure client-side JavaScript** - no server needed
2. ✅ **Custom MusicXML generator** - ~300 lines, full control
3. ✅ **Start simple (v1)**:
   - Fixed 16th note pulses
   - Auto time signature
   - Individual rests
   - Download button only
4. ✅ **Iterate with user feedback**:
   - Add UI options based on real usage
   - Enhance notation quality
   - Support more musical contexts

**Estimated initial implementation**: 4-6 hours for working v1

**Files to create/modify**:
- `src/musicxml-exporter.js` (new, ~300 lines)
- `script.js` (add ~50 lines)
- `index.html` (add 1 button)

This approach maintains the simplicity of the current export system while enabling professional music notation software compatibility.
