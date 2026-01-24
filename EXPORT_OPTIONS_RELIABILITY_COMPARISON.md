# Export Options: Reliability & Feasibility Analysis

## User Concerns Addressed

1. **Is building a custom MusicXML generator reliable?**
2. **Are there JavaScript MIDI libraries we could use instead?**

---

## TL;DR Recommendations

### Most Reliable: **MIDI Export** ⭐⭐⭐⭐⭐
- Simplest format (well-documented binary spec)
- Excellent JavaScript libraries (midi-writer-js)
- Universally supported by notation software
- **Recommended as primary export**

### Also Reliable: **ABC Export** ⭐⭐⭐⭐
- Simple text format
- Visual preview with abcjs
- Users can convert to MusicXML themselves if needed
- **Recommended as secondary export**

### Risky: **Custom MusicXML Generator** ⭐⭐⭐
- Complex spec, edge cases
- Requires extensive testing
- **Skip for v1, reconsider if MIDI proves insufficient**

---

## Option 1: MIDI Export (Recommended)

### Why MIDI is Better Than MusicXML

| Aspect | MIDI | MusicXML |
|--------|------|----------|
| **Spec Complexity** | Simple (binary format) | Complex (600+ page XML spec) |
| **Libraries** | Excellent (midi-writer-js) | Limited (musicxml-interfaces) |
| **File Size** | Very small (~1KB) | Larger (~10-50KB) |
| **Reliability** | High (binary, validated) | Medium (XML, many edge cases) |
| **Testing** | Easy (play in any DAW) | Requires notation software |
| **Learning Curve** | Low | Medium-High |
| **Support** | Universal | Universal |
| **Percussion** | Channel 10, GM standard | Multiple notations, complex |

### JavaScript MIDI Libraries

#### **midi-writer-js** ⭐ RECOMMENDED

**npm**: [midi-writer-js](https://www.npmjs.com/package/midi-writer-js)
**GitHub**: [grimmdude/MidiWriterJS](https://github.com/grimmdude/MidiWriterJS)
**Version**: 2.1.4
**License**: MIT
**Bundle Size**: ~30KB

**Example - Pulse Lab Pattern:**
```javascript
import MidiWriter from 'midi-writer-js';

function exportMIDI(tracks, tempo, patternLength) {
  const midiTrack = new MidiWriter.Track();

  // Set tempo
  midiTrack.setTempo(tempo);

  // Set percussion channel
  midiTrack.addEvent(new MidiWriter.ProgramChangeEvent({
    instrument: 1,
    channel: 10  // Channel 10 = percussion
  }));

  // Add notes from pattern
  tracks.forEach((track, trackIndex) => {
    const midiNote = getMidiNoteForTrack(trackIndex); // 36=Kick, 38=Snare, etc.

    track.pattern.forEach((pulse, pulseIndex) => {
      if (pulse === 'X') {
        midiTrack.addEvent(new MidiWriter.NoteEvent({
          pitch: midiNote,
          duration: '16',  // 16th note
          velocity: 100,
          channel: 10
        }));
      } else {
        // Add rest
        midiTrack.addEvent(new MidiWriter.NoteEvent({
          pitch: midiNote,
          duration: '16',
          velocity: 0  // Rest
        }));
      }
    });
  });

  // Generate MIDI file
  const writer = new MidiWriter.Writer(midiTrack);
  return writer.dataUri();  // For download
}

function getMidiNoteForTrack(trackIndex) {
  // General MIDI Percussion Map (Channel 10)
  const drumMap = {
    0: 36,  // Acoustic Bass Drum
    1: 38,  // Acoustic Snare
    2: 42,  // Closed Hi-Hat
    3: 46,  // Open Hi-Hat
    4: 49,  // Crash Cymbal 1
    5: 51,  // Ride Cymbal 1
    6: 50,  // High Tom
    7: 47   // Low-Mid Tom
  };

  return drumMap[trackIndex] || 36;
}
```

**Pros**:
- ✅ Very simple API
- ✅ Built for browsers (data URI export)
- ✅ Excellent documentation
- ✅ Active maintenance
- ✅ MIT license (permissive)
- ✅ ~100 lines of code total

**Cons**:
- ⚠️ +30KB bundle size
- ⚠️ MIDI import to notation software has limitations (see below)

#### **jsmidgen**

**npm**: [jsmidgen](https://www.npmjs.com/package/jsmidgen)
**Version**: 0.1.8 (updated 9 days ago)
**License**: MIT
**Bundle Size**: ~20KB

**Example**:
```javascript
import Midi from 'jsmidgen';

const file = new Midi.File();
const track = new Midi.Track();
file.addTrack(track);

track.setTempo(120);
track.setInstrument(0, 0);  // Channel 10 for drums

// Add notes
track.addNote(0, 'C2', 16, 0, 100);  // (channel, note, duration, time, velocity)
track.addNote(0, 'D2', 16, 16, 100);

// Export
const bytes = file.toBytes();
const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
```

**Pros**:
- ✅ Smaller bundle (~20KB)
- ✅ Fluent API
- ✅ Recently maintained

**Cons**:
- ⚠️ Less documentation
- ⚠️ More low-level (less intuitive)

### MIDI Import to Notation Software: Limitations

From research, **MIDI drum import has known issues**:

#### MuseScore
- [MIDI import doesn't show drum notes properly](https://musescore.org/en/node/14987)
- Requires proper channel 10 assignment
- May need manual quantization

#### Sibelius
- [Requires drums on channel 10 for correct import](https://www.sibeliusforum.com/viewtopic.php?t=3821)
- Uses PAS (Percussive Arts Society) standard
- [Often requires cleanup after import](https://www.rpmseattle.com/of_note/clean-up-midi-import-for-drums-and-percussion-in-sibelius/)

#### Finale
- Accepts MIDI but requires manual drum map assignment
- Note: [Finale discontinued technical support as of August 26, 2025](https://www.makemusic.com/)

**Common Issues**:
- Timing quantization (notes not exactly on beat)
- Drum mapping (wrong sounds/noteheads)
- Requires manual cleanup after import

**Mitigation**:
- ✅ Set channel 10 explicitly
- ✅ Use General MIDI drum map
- ✅ Quantize to exact 16th note grid (we already do this!)
- ✅ Export with clear tempo/time signature

**Verdict**: MIDI import works but may require user cleanup in notation software.

---

## Option 2: ABC Export (Also Recommended)

### Why ABC is Great for Pulse Lab

ABC notation is **perfectly suited** for rhythm patterns:

**Example**:
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
C4z12 C4z12 | DzDzDzDzDzDzDzDz |
```

### abcjs Library

**npm**: [abcjs](https://www.npmjs.com/package/abcjs)
**Version**: 6.6.0 (published 10 days ago)
**License**: MIT
**Bundle Size**: ~100KB

**Features**:
- ✅ Render ABC to beautiful SVG notation
- ✅ Generate MIDI from ABC
- ✅ Play audio in browser
- ✅ Active development (v7 planned)
- ✅ Excellent documentation

**Example**:
```javascript
import abcjs from 'abcjs';

const abc = generateABC(tracks, tempo, patternLength);

// Render preview
abcjs.renderAbc('notation-preview', abc);

// Generate MIDI from ABC
const midi = abcjs.synth.getMidiFile(abc);

// Download ABC text
downloadFile(abc, 'pattern.abc', 'text/plain');
```

### ABC to MusicXML Conversion

**Problem**: No client-side JavaScript converter exists.

**Solutions**:
1. User downloads ABC, converts using external tool ([abc2xml](https://wim.vree.org/svgParse/abc2xml.html))
2. User uses Michael Eskin's online tool (requires his server)
3. We provide MIDI export instead (see Option 1)

**Verdict**: ABC is excellent for preview and export, but user must handle MusicXML conversion themselves.

---

## Option 3: Custom MusicXML Generator

### Complexity Assessment

**Full MusicXML Spec**: 600+ pages
**Required for Pulse Lab**: ~10 pages

**Elements Needed**:
```xml
<score-partwise>
  <work> ... </work>
  <part-list> ... </part-list>
  <part>
    <measure>
      <attributes>
        <divisions>4</divisions>
        <time>4/4</time>
        <clef>percussion</clef>
      </attributes>
      <note>
        <unpitched> ... </unpitched>
        <duration>1</duration>
        <type>16th</type>
      </note>
      <note>
        <rest/>
        <duration>1</duration>
      </note>
    </measure>
  </part>
</score-partwise>
```

**Simplifications for Percussion**:
- ✅ No pitch (unpitched elements only)
- ✅ No harmony/chords
- ✅ No articulations needed
- ✅ No dynamics needed
- ✅ Simple time signatures
- ✅ Fixed note values (16ths)

### Risk Assessment

**Risks**:
- ❌ Edge cases in time signature handling
- ❌ XML escaping for track names
- ❌ Duration calculation errors
- ❌ Measure boundary issues
- ❌ Invalid XML structure
- ❌ Notation software rejection

**Mitigations**:
- ✅ Use XML template library (no string concatenation)
- ✅ Validate with `musicxml-interfaces` parser
- ✅ Test in MuseScore extensively
- ✅ Start with minimal spec, expand gradually
- ✅ Copy proven templates from working files

### Using musicxml-interfaces for Validation

```javascript
import { parseScorePartwise } from 'musicxml-interfaces';

class MusicXMLExporter {
  generate() {
    const xml = this.buildXML();

    // Validate before returning
    try {
      parseScorePartwise(xml);
      console.log('✅ Valid MusicXML');
    } catch (error) {
      console.error('❌ Invalid MusicXML:', error);
      throw new Error('Generated invalid MusicXML: ' + error.message);
    }

    return xml;
  }
}
```

**Verdict**: Feasible but risky. Use validation to catch errors before users download broken files.

---

## Hybrid Approach: Generate MusicXML via MIDI

### Concept

Some MIDI libraries can export MusicXML:

```javascript
// Generate MIDI
const midi = generateMIDI(tracks, tempo);

// Convert MIDI → MusicXML (if library supports it)
const musicxml = midi.toMusicXML();
```

**Research**: ❌ No JavaScript library found that does MIDI → MusicXML conversion

**Alternative**: Let notation software do it
1. Export MIDI from Pulse Lab
2. User imports MIDI to MuseScore
3. User exports as MusicXML from MuseScore

**Verdict**: Requires user to do conversion manually (poor UX).

---

## Recommended Implementation Strategy

### Phase 1: MIDI + ABC Export (6-8 hours)

**Priority 1: MIDI Export** (4-5 hours)
```javascript
import MidiWriter from 'midi-writer-js';

class MIDIExporter {
  generate(tracks, tempo, patternLength) {
    // ... implementation (~150 lines)
  }
}
```

**Priority 2: ABC Export** (2-3 hours)
```javascript
class ABCExporter {
  generate(tracks, tempo, patternLength) {
    // ... implementation (~50 lines)
  }
}
```

**Benefits**:
- ✅ MIDI: Universal, reliable, import to any software
- ✅ ABC: Visual preview, human-readable, MIDI generation
- ✅ Both: Client-side, no server needed
- ✅ Total: ~200 lines of code

**UI**:
```html
<div class="export-pattern-actions">
  <button id="export-copy-btn">Copy to Clipboard</button>
  <button id="export-download-txt">Download .txt</button>
  <button id="export-download-midi">Download MIDI</button>
  <button id="export-download-abc">Download ABC</button>
</div>

<div id="abc-notation-preview"></div>
```

### Phase 2: Custom MusicXML (Optional, 6-8 hours)

**Only if**:
- Users report MIDI import issues
- Direct MusicXML needed for specific features
- You have time to test extensively

**Use**:
- `musicxml-interfaces` for validation
- MuseScore for testing
- Start with minimal spec

---

## Comparison Matrix

| Feature | MIDI | ABC | Custom MusicXML |
|---------|------|-----|-----------------|
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Code Complexity** | ⭐⭐⭐⭐⭐ (Simple) | ⭐⭐⭐⭐⭐ (Simple) | ⭐⭐ (Complex) |
| **Dev Time** | 4-5 hours | 2-3 hours | 6-8 hours |
| **Bundle Size** | +30KB | +100KB | 0KB (or +50KB with validation) |
| **Testing Effort** | Low | Low | High |
| **Notation Import** | ✅ Universal (may need cleanup) | ❌ Requires conversion | ✅ Direct |
| **Visual Preview** | ❌ No | ✅ Yes (abcjs) | ❌ No |
| **Human Readable** | ❌ Binary | ✅ Text | ⚠️ Verbose XML |
| **Editing** | ❌ Not practical | ✅ Easy | ⚠️ Possible |
| **GitHub Pages** | ✅ Compatible | ✅ Compatible | ✅ Compatible |
| **Maintenance** | ✅ Library maintained | ✅ Library maintained | ❌ You maintain |
| **Risk** | Low | Low | Medium-High |

---

## Final Recommendation

### 🏆 Implement MIDI + ABC Export

**Phase 1** (Week 1):
1. MIDI export with `midi-writer-js`
2. ABC export with generation code
3. ABC visual preview with `abcjs`

**Phase 2** (Optional):
1. Add MusicXML export with validation
2. Use if MIDI proves insufficient

**Benefits**:
- ✅ **Lowest risk** (proven libraries)
- ✅ **Fastest implementation** (6-8 hours total)
- ✅ **Best UX** (visual preview, multiple formats)
- ✅ **Most reliable** (MIDI is simple, well-tested)
- ✅ **Future-proof** (can add MusicXML later if needed)

**Trade-offs**:
- ⚠️ MIDI import may require user cleanup in notation software
- ⚠️ ABC requires external tool for MusicXML conversion
- ⚠️ +130KB bundle size (30KB MIDI + 100KB ABC)

**Mitigation**:
- Document MIDI import process in help text
- Provide links to abc2xml tool
- Consider MusicXML in Phase 2 if needed

---

## Code Skeleton: MIDI Export

```javascript
import MidiWriter from 'midi-writer-js';

class MIDIExporter {
  constructor(tracks, tempo, patternLength) {
    this.tracks = tracks;
    this.tempo = tempo;
    this.patternLength = patternLength;
  }

  generate() {
    const midiTracks = this.tracks.map((track, index) =>
      this.buildTrack(track, index)
    );

    const writer = new MidiWriter.Writer(midiTracks);
    return writer.buildFile();  // Returns Uint8Array
  }

  buildTrack(track, trackIndex) {
    const midiTrack = new MidiWriter.Track();

    // Set tempo (only in first track)
    if (trackIndex === 0) {
      midiTrack.setTempo(this.tempo);
    }

    // Set time signature
    const timeSignature = this.calculateTimeSignature();
    midiTrack.addEvent(new MidiWriter.TimeSignatureEvent({
      numerator: timeSignature.beats,
      denominator: timeSignature.beatType
    }));

    // Add percussion events
    const midiNote = this.getMIDINote(trackIndex);

    track.pattern.forEach((pulse, index) => {
      const event = new MidiWriter.NoteEvent({
        pitch: midiNote,
        duration: '16',  // 16th note
        velocity: pulse === 'X' ? 100 : 0,  // 0 velocity = rest
        channel: 10  // Percussion channel
      });

      midiTrack.addEvent(event);
    });

    return midiTrack;
  }

  getMIDINote(trackIndex) {
    // General MIDI Drum Map (Channel 10)
    const drumMap = [
      36,  // Acoustic Bass Drum
      38,  // Acoustic Snare
      42,  // Closed Hi-Hat
      46,  // Open Hi-Hat
      49,  // Crash Cymbal 1
      51,  // Ride Cymbal 1
      50,  // High Tom
      47,  // Low-Mid Tom
      45,  // Low Tom
      41,  // Low Floor Tom
      43,  // High Floor Tom
      48   // Hi-Mid Tom
    ];

    return drumMap[trackIndex] || 36;
  }

  calculateTimeSignature() {
    const quarters = this.patternLength / 4;
    if (quarters === 4) return { beats: 4, beatType: 4 };
    if (quarters === 3) return { beats: 3, beatType: 4 };
    if (quarters === 2) return { beats: 2, beatType: 4 };
    return { beats: quarters, beatType: 4 };
  }

  download() {
    const bytes = this.generate();
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-pattern-${Date.now()}.mid`;
    a.click();

    URL.revokeObjectURL(url);
  }
}

// Usage
const exporter = new MIDIExporter(tracks, tempo, patternLength);
exporter.download();
```

---

## Sources

- [midi-writer-js on npm](https://www.npmjs.com/package/midi-writer-js)
- [jsmidgen on npm](https://www.npmjs.com/package/jsmidgen)
- [Scribbletune](https://scribbletune.com/)
- [abcjs on npm](https://www.npmjs.com/package/abcjs)
- [MuseScore MIDI import issues](https://musescore.org/en/node/14987)
- [Sibelius drum import cleanup](https://www.rpmseattle.com/of_note/clean-up-midi-import-for-drums-and-percussion-in-sibelius/)
- [Dynamically generating MIDI in JavaScript by Sergi Mansilla](https://sergimansilla.com/blog/dynamically-generating-midi-in-javascript/)

---

## Conclusion

**Your concern about custom MusicXML reliability is completely valid.** MIDI export is:
- ✅ Simpler to implement
- ✅ More reliable (proven library)
- ✅ Easier to test
- ✅ Faster to ship

**Recommendation**: Start with MIDI + ABC, reconsider MusicXML only if absolutely necessary.
