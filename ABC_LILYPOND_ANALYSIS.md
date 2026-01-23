# ABC Notation & LilyPond as Intermediate Formats

## Analysis of Using Intermediate Formats for MusicXML Export

This document evaluates whether converting Pulse Lab patterns to ABC notation or LilyPond, then using their export tools to generate MusicXML, would be simpler than direct MusicXML generation.

---

## TL;DR Recommendation

❌ **Don't use ABC/LilyPond as intermediate format for MusicXML export**

**Why**: No client-side JavaScript converter exists for either format → MusicXML. Both require server-side processing, violating the GitHub Pages constraint.

✅ **Alternative**: Generate ABC for preview/editing (using abcjs), PLUS direct MusicXML for export

---

## ABC Notation Analysis

### What is ABC Notation?

ABC is a simple text-based music notation format designed for folk and traditional music. It's human-readable and compact.

**Example - Simple Drum Pattern**:
```abc
X:1
T:Pulse Lab Pattern
M:4/4
L:1/16
Q:120
K:C clef=perc
%%MIDI channel 10
%%MIDI drummap C 36  % Bass Drum
%%MIDI drummap D 38  % Snare
C4 z4 C4 z4 | D2 z2 D2 z2 D2 z2 D2 z2 |
```

**Pulse Lab Pattern**:
```
Track 1: X . . . X . . . X . . . X . . .
```

**ABC Equivalent**:
```abc
X:1
T:Pulse Lab - Track 1
M:4/4
L:1/16
Q:120
K:C clef=perc
%%MIDI channel 10
C4 z12 C4 z12 C4 z12 C4 z12 |
```

### ABC Syntax for Percussion

Based on the [ABC standard](https://abcnotation.com/wiki/abc:standard:v2.1) and [drum notation examples](https://kmgoto.jp/public/ABC/):

```abc
K:C clef=perc          % Percussion clef
%%MIDI channel 10      % MIDI percussion channel
L:1/16                 % Default note length (16th note)

% Duration syntax:
C    % Single 16th note (default from L:1/16)
C2   % Two 16th notes = 8th note
C4   % Four 16th notes = quarter note
z    % Rest (visible)
x    % Rest (invisible)
z4   % Quarter note rest

% MIDI Drum Mapping:
%%MIDI drummap C 36    % Bass drum
%%MIDI drummap D 38    % Snare
%%MIDI drummap E 42    % Closed hi-hat
%%MIDI drummap F 46    % Open hi-hat
```

---

## JavaScript Library: abcjs

### Overview
- **npm**: [`abcjs`](https://www.npmjs.com/package/abcjs)
- **GitHub**: [paulrosen/abcjs](https://github.com/paulrosen/abcjs)
- **Latest Version**: 6.6.0 (published 10 days ago - actively maintained!)
- **License**: MIT
- **Bundle Size**: ~100KB

### Features
- ✅ **Renders ABC to sheet music** (SVG/Canvas)
- ✅ **Generates MIDI** from ABC
- ✅ **Plays audio** in browser
- ✅ **Very active development** (v7 in planning)
- ✅ **Excellent documentation**
- ❌ **NO ABC → MusicXML export**

### Installation
```bash
npm install abcjs
```

### Usage Example
```javascript
import abcjs from 'abcjs';

const abcNotation = `
X:1
T:Pulse Lab Pattern
M:4/4
L:1/16
Q:120
K:C clef=perc
%%MIDI channel 10
C4 z12 C4 z12 C4 z12 C4 z12 |
`;

// Render to SVG
abcjs.renderAbc('output-div', abcNotation);

// Generate MIDI
const midi = abcjs.synth.getMidiFile(abcNotation);

// Play audio
abcjs.renderMidi('midi-container', abcNotation);
```

---

## ABC to MusicXML Conversion

### Available Tools

#### 1. **abc2xml** by Willem Vree
- **Type**: Python command-line tool
- **URL**: [wim.vree.org/svgParse/abc2xml.html](https://wim.vree.org/svgParse/abc2xml.html)
- **Platforms**: Windows, macOS, Linux

**Pros**:
- Well-established (most popular ABC → MusicXML converter)
- Handles most ABC elements
- Open source

**Cons**:
- ❌ **Requires Python installation** (not browser-compatible)
- ❌ **Command-line only** (can't run in browser)
- ❌ **Needs server** if used via web service
- ⚠️ Some translations only partially implemented

#### 2. **abc2xml.appspot.com** (Online Service)
- **Type**: Web service
- **URL**: http://abc2xml.appspot.com/

**Pros**:
- No installation needed
- HTTP API potential

**Cons**:
- ❌ **External dependency** (violates GitHub Pages self-hosting)
- ⚠️ Service reliability unclear (discussions about it being down)
- ❌ **Requires internet** (can't work offline)
- ❌ **Privacy concerns** (sends user data to third party)

#### 3. **abc2xmlGUI** by Michael Strasser
- **Type**: Python GUI wrapper
- **GitHub**: [mist13/abc2xmlGUI](https://github.com/mist13/abc2xmlGUI)

**Pros**:
- User-friendly interface

**Cons**:
- ❌ **Still requires Python + abc2xml**
- ❌ **Not browser-compatible**
- ❌ **User must download and install**

#### 4. **JavaScript ABC → MusicXML Library?**

**Status**: ❌ **DOES NOT EXIST**

From [GitHub discussion](https://github.com/paulrosen/abcjs/issues/719):
> "There appears to be no way to do ABC to MusicXML conversion entirely client-side in Javascript at this time with existing open-source libraries"

---

## LilyPond Analysis

### What is LilyPond?

LilyPond is a powerful text-based music engraving system that produces professional-quality sheet music.

**Example - Drum Pattern**:
```lilypond
\version "2.24.0"

\new DrumStaff <<
  \drummode {
    \time 4/4
    \tempo 4 = 120
    bd4 r4 bd4 r4 |
    sn8 r8 sn8 r8 sn8 r8 sn8 r8 |
  }
>>
```

### LilyPond to MusicXML Conversion

#### Available Tools

1. **musicxml2ly** (MusicXML → LilyPond)
   - Built into LilyPond
   - Goes WRONG DIRECTION for our needs

2. **ly2xml**
   - **GitHub**: [uliska/ly2xml](https://github.com/uliska/ly2xml)
   - **Status**: Experimental, "far from production-ready"
   - **Quality**: Described as producing "terrible results"

3. **openlilylib/lilypond-export**
   - **GitHub**: [openlilylib/lilypond-export](https://github.com/openlilylib/lilypond-export)
   - **Status**: Export infrastructure for simple scores
   - **Quality**: "Far from production-ready"

### JavaScript Libraries for LilyPond?

**Status**: ❌ **NONE EXIST**

- LilyPond is a C++ application
- No JavaScript port available
- Cannot run in browser
- Requires installation on user's machine

---

## Comparison: Direct MusicXML vs Intermediate Formats

| Aspect | Direct MusicXML | ABC → MusicXML | LilyPond → MusicXML |
|--------|-----------------|----------------|---------------------|
| **Client-side?** | ✅ Yes | ❌ No (needs server) | ❌ No (needs C++ app) |
| **GitHub Pages?** | ✅ Compatible | ❌ Requires external service | ❌ Requires installation |
| **Dependencies** | None (or musicxml-interfaces) | abcjs + abc2xml service | None available |
| **Code to write** | ~250 lines | ~50 lines ABC + server | ~100 lines LilyPond + server |
| **Complexity** | Medium | Low (ABC) + High (server) | Medium (LilyPond) + High (server) |
| **Quality** | Full control | Depends on abc2xml | Poor (experimental tools) |
| **Maintenance** | You own it | Depend on abc2xml | Depend on unstable tools |
| **Bundle size** | 0-50KB | ~100KB (abcjs) | N/A (not possible) |
| **Offline?** | ✅ Yes | ❌ No (needs service) | ❌ No (needs app) |

---

## Why Intermediate Format Doesn't Work

### The Fatal Flaw: Conversion Step

```
Pulse Lab Pattern
    ↓
ABC Notation (✅ easy to generate)
    ↓
??? ABC → MusicXML converter ???
    ↓ (requires server or external app)
MusicXML
```

**Problem**: The conversion step violates GitHub Pages constraint.

### Options for ABC → MusicXML

1. **Use external service** (abc2xml.appspot.com)
   - ❌ External dependency
   - ❌ Requires internet
   - ❌ Privacy concerns
   - ❌ Service may go down

2. **Set up your own server**
   - ❌ No longer GitHub Pages
   - ❌ Hosting costs
   - ❌ Maintenance burden
   - ❌ Defeats simplicity goal

3. **Tell users to download abc2xml**
   - ❌ Terrible UX
   - ❌ Requires Python installation
   - ❌ Multi-step process
   - ❌ Platform-specific

4. **Write JavaScript ABC → MusicXML converter**
   - ⚠️ Essentially same work as direct MusicXML generation
   - ⚠️ ABC parsing adds complexity
   - ⚠️ No benefit over direct approach

---

## Alternative: Dual Export (ABC + MusicXML)

### The Best of Both Worlds

Instead of using ABC as an *intermediate* format, use it as a *parallel* format:

```
Pulse Lab Pattern
    ├──→ ABC Notation (for preview/editing)
    └──→ MusicXML (for export to notation software)
```

### Architecture

```javascript
class PulseExporter {
  constructor(tracks, tempo, patternLength) {
    this.tracks = tracks;
    this.tempo = tempo;
    this.patternLength = patternLength;
  }

  // Generate ABC notation
  toABC() {
    return this.buildABC(); // ~50 lines
  }

  // Generate MusicXML
  toMusicXML() {
    return this.buildMusicXML(); // ~250 lines
  }

  // Render ABC preview using abcjs
  renderPreview(elementId) {
    const abc = this.toABC();
    abcjs.renderAbc(elementId, abc);
  }

  // Download ABC file
  downloadABC() {
    const abc = this.toABC();
    this.download(abc, 'pattern.abc', 'text/plain');
  }

  // Download MusicXML file
  downloadMusicXML() {
    const xml = this.toMusicXML();
    this.download(xml, 'pattern.musicxml', 'application/vnd.recordare.musicxml+xml');
  }
}
```

### Benefits

1. ✅ **ABC preview** - Show notation in browser before export
2. ✅ **ABC export** - Users can use ABC tools if they prefer
3. ✅ **MusicXML export** - Direct to notation software
4. ✅ **No server needed** - Both formats generated client-side
5. ✅ **Best UX** - Preview what you're exporting

### UI Design

```html
<section id="export-pattern-panel">
  <h3>Export Pattern</h3>

  <!-- Preview -->
  <div id="notation-preview"></div>

  <!-- Export options -->
  <div class="export-pattern-actions">
    <button id="export-copy-btn">Copy to Clipboard</button>
    <button id="export-download-txt">Download .txt</button>
    <button id="export-download-abc">Download ABC</button>
    <button id="export-download-musicxml">Download MusicXML</button>
  </div>
</section>
```

---

## ABC Generation Code (Much Simpler!)

### Example Implementation

```javascript
class ABCExporter {
  constructor(tracks, tempo, patternLength) {
    this.tracks = tracks;
    this.tempo = tempo;
    this.patternLength = patternLength;
  }

  generate() {
    const parts = [
      'X:1',
      'T:Pulse Lab Pattern',
      `M:${this.getTimeSignature()}`,
      'L:1/16',
      `Q:1/4=${this.tempo}`,
      'K:C clef=perc',
      '%%MIDI channel 10',
      ...this.getDrumMaps(),
      '',
      ...this.getNotation()
    ];
    return parts.join('\n');
  }

  getTimeSignature() {
    const quarters = this.patternLength / 4;
    if (quarters === 4) return '4/4';
    if (quarters === 3) return '3/4';
    if (quarters === 2) return '2/4';
    return `${quarters}/4`;
  }

  getDrumMaps() {
    return this.tracks.map((track, i) => {
      const pitch = String.fromCharCode(67 + i); // C, D, E, F...
      const midiNote = 36 + i; // Start at Bass Drum
      return `%%MIDI drummap ${pitch} ${midiNote}`;
    });
  }

  getNotation() {
    return this.tracks.map((track, i) => {
      const pitch = String.fromCharCode(67 + i);
      const notes = track.pattern.map(p => {
        return p === 'X' ? pitch : 'z'; // Note or rest
      }).join('');

      return `% ${track.name}\n${notes} |`;
    });
  }
}
```

**Result**:
```abc
X:1
T:Pulse Lab Pattern
M:4/4
L:1/16
Q:1/4=120
K:C clef=perc
%%MIDI channel 10
%%MIDI drummap C 36
%%MIDI drummap D 38

% Track 1
Cz4 Cz4 Cz4 Cz4 |
% Track 2
DzDzDzDzDzDzDzDz |
```

---

## Implementation Recommendation

### Phase 1: Direct MusicXML Export (4-6 hours)
- Custom MusicXML generator (~250 lines)
- Download button
- Test in MuseScore

### Phase 2: Add ABC Export + Preview (3-4 hours)
- ABC generator (~50 lines)
- Add abcjs for preview rendering
- Download ABC button
- Visual confirmation before export

### Phase 3 (Optional): ABC Editing
- Allow users to edit ABC text
- Re-import to grid
- Round-trip workflow

---

## Conclusion

### ❌ Don't Use ABC/LilyPond as Intermediate Format

**Reasons**:
1. No client-side JavaScript converters exist
2. Requires server/external service
3. Violates GitHub Pages constraint
4. Adds complexity without benefit
5. Poor UX (multi-step process)

### ✅ Do Generate ABC as Parallel Export

**Reasons**:
1. ABC is simple to generate (~50 lines)
2. abcjs provides excellent preview
3. Some users may prefer ABC format
4. No server needed
5. Enhances UX with visual preview

### 🎯 Final Architecture

```
Pulse Lab Pattern Data
    │
    ├──→ Text Export (.txt) - existing
    ├──→ ABC Export (.abc) - NEW, simple
    │     └──→ abcjs preview (in-browser)
    └──→ MusicXML Export (.musicxml) - NEW, custom generator
          └──→ Import to MuseScore/Finale/Sibelius
```

**Total Implementation**:
- ABC generator: ~50 lines
- MusicXML generator: ~250 lines
- UI integration: ~100 lines
- Total: ~400 lines for complete solution

**Benefits**:
- ✅ No external dependencies (except abcjs for preview)
- ✅ GitHub Pages compatible
- ✅ Works offline
- ✅ Multiple export formats
- ✅ Visual preview
- ✅ Professional workflow

This approach gives users the best of all worlds: simple text, portable ABC, and professional MusicXML.

---

## Sources

- [abcjs on npm](https://www.npmjs.com/package/abcjs)
- [abcjs official website](https://www.abcjs.net/)
- [ABC notation standard v2.1](https://abcnotation.com/wiki/abc:standard:v2.1)
- [ABC drum notation examples](https://kmgoto.jp/public/ABC/)
- [abc2xml by Willem Vree](https://wim.vree.org/svgParse/abc2xml.html)
- [abc2xml GUI](https://blechtrottel.net/en/abc2xmlgui.html)
- [abcjs issue #719: ABC to MusicXML](https://github.com/paulrosen/abcjs/issues/719)
- [LilyPond export to MusicXML](https://github.com/uliska/ly2xml)
- [openlilylib MusicXML export](https://github.com/openlilylib/lilypond-export)
