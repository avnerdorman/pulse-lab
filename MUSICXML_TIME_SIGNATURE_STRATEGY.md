# MusicXML Time Signature Strategy

## Handling Edge Cases: 6/8 vs 3/4 and Odd Meters

### Final Recommendation: Smart Defaults + User Override

```javascript
class TimeSignatureCalculator {
  constructor(pulseCount, options = {}) {
    this.pulseCount = pulseCount;
    this.meterFeel = options.meterFeel || 'auto'; // 'auto', 'simple', 'compound'
    this.pulseDuration = options.pulseDuration || 16;
    this.pattern = options.pattern || [];
  }

  calculate() {
    // Try to map to standard meters first
    const standard = this.tryStandardMeters();
    if (standard) return standard;

    // Fall back to odd meter strategy
    return this.handleOddMeter();
  }

  tryStandardMeters() {
    const quarters = this.pulseCount / 4; // Assuming 16th notes

    // Perfect divisions
    if (quarters === 4) return { beats: 4, beatType: 4, divisions: 4 };
    if (quarters === 2) return { beats: 2, beatType: 4, divisions: 4 };
    if (quarters === 5) return { beats: 5, beatType: 4, divisions: 4 };
    if (quarters === 7) return { beats: 7, beatType: 4, divisions: 4 };

    // Ambiguous: 12 pulses (3/4 or 6/8)
    if (quarters === 3) {
      return this.resolve3vs6(quarters);
    }

    // Compound meters
    if (quarters === 6) return this.resolveCompound(6);
    if (quarters === 9) return this.resolveCompound(9);

    return null; // No standard meter fits
  }

  resolve3vs6(quarters) {
    if (this.meterFeel === 'compound') {
      // User explicitly wants 6/8
      return { beats: 6, beatType: 8, divisions: 2 };
    }

    if (this.meterFeel === 'simple') {
      // User explicitly wants 3/4
      return { beats: 3, beatType: 4, divisions: 4 };
    }

    // Auto-detect based on pattern
    if (this.hasCompoundFeel()) {
      return { beats: 6, beatType: 8, divisions: 2 };
    }

    // Default to simple meter
    return { beats: 3, beatType: 4, divisions: 4 };
  }

  resolveCompound(quarters) {
    // 6 quarters = 24 sixteenth notes
    // Could be 6/4 (simple) or 12/8 (compound)

    if (this.meterFeel === 'compound') {
      return { beats: quarters * 2, beatType: 8, divisions: 2 };
    }

    if (this.hasCompoundFeel()) {
      return { beats: quarters * 2, beatType: 8, divisions: 2 };
    }

    return { beats: quarters, beatType: 4, divisions: 4 };
  }

  hasCompoundFeel() {
    // Analyze pattern for groups of 3
    const onsets = this.pattern
      .map((p, i) => (p === 'X' ? i : -1))
      .filter(i => i >= 0);

    if (onsets.length < 2) return false;

    // Calculate spacing between onsets
    const spacings = [];
    for (let i = 1; i < onsets.length; i++) {
      spacings.push(onsets[i] - onsets[i - 1]);
    }

    // Check for groups of 3 or 6
    const compoundSpacings = spacings.filter(s => s % 3 === 0).length;
    return compoundSpacings / spacings.length > 0.5;
  }

  handleOddMeter() {
    // Prime or odd pulse counts that don't fit standard meters

    // Strategy 1: Try 8th notes instead of 16ths
    if (this.pulseCount % 2 === 0) {
      const eighthBeats = this.pulseCount / 2;
      if (eighthBeats <= 12) {
        return {
          beats: eighthBeats,
          beatType: 8,
          divisions: 2,
          note: `Mapped pulses to 8th notes for readability`
        };
      }
    }

    // Strategy 2: Use 16th note meter (preserves exact rhythm)
    if (this.pulseCount <= 24) {
      return {
        beats: this.pulseCount,
        beatType: 16,
        divisions: 1,
        note: `Using ${this.pulseCount}/16 time signature`
      };
    }

    // Strategy 3: Multi-measure for very long patterns
    const measuresOf4 = Math.floor(this.pulseCount / 16);
    const remainder = this.pulseCount % 16;

    if (remainder === 0) {
      return {
        beats: 4,
        beatType: 4,
        divisions: 4,
        measures: measuresOf4,
        note: `Split into ${measuresOf4} measures of 4/4`
      };
    }

    // Strategy 4: Compound measure (e.g., 17 pulses = 4/4 + 1/16)
    return {
      beats: 4,
      beatType: 4,
      divisions: 4,
      measures: measuresOf4,
      pickup: remainder,
      note: `${measuresOf4} measures of 4/4 + ${remainder}/16`
    };
  }
}

// Usage examples
const calc11 = new TimeSignatureCalculator(11);
console.log(calc11.calculate());
// → { beats: 11, beatType: 16, divisions: 1 }

const calc17 = new TimeSignatureCalculator(17);
console.log(calc17.calculate());
// → { beats: 17, beatType: 16, divisions: 1 }
// OR with option to use 8th notes:
// → { beats: 17, beatType: 8, divisions: 2, note: "..." }

const calc12simple = new TimeSignatureCalculator(12, { meterFeel: 'simple' });
console.log(calc12simple.calculate());
// → { beats: 3, beatType: 4, divisions: 4 }

const calc12compound = new TimeSignatureCalculator(12, { meterFeel: 'compound' });
console.log(calc12compound.calculate());
// → { beats: 6, beatType: 8, divisions: 2 }

const calc12auto = new TimeSignatureCalculator(12, {
  pattern: ['X', '.', '.', 'X', '.', '.', 'X', '.', '.', 'X', '.', '.']
});
console.log(calc12auto.calculate());
// → { beats: 6, beatType: 8, divisions: 2 } (detected triplet feel)
```

---

## UI Design for User Control

### Minimal UI (Phase 1)
```html
<div class="export-pattern-actions">
  <button type="button" id="export-musicxml-btn">Download MusicXML</button>
  <details id="musicxml-options">
    <summary>MusicXML Options</summary>
    <div class="musicxml-config">
      <!-- Only show for ambiguous cases -->
      <div class="field" id="meter-feel-field" style="display:none">
        <label for="meter-feel">Meter feel:</label>
        <select id="meter-feel">
          <option value="auto">Auto-detect</option>
          <option value="simple">Simple (3/4, 4/4, 5/4...)</option>
          <option value="compound">Compound (6/8, 9/8, 12/8...)</option>
        </select>
        <small class="help-text">For 12-pulse patterns: simple = 3/4, compound = 6/8</small>
      </div>
    </div>
  </details>
</div>
```

### Smart UI Behavior
```javascript
function updateMusicXMLOptions() {
  const pulseCount = getPatternLength();
  const meterFeelField = document.getElementById('meter-feel-field');

  // Only show meter feel option for ambiguous cases (12, 24, 36 pulses)
  if ([12, 24, 36].includes(pulseCount)) {
    meterFeelField.style.display = 'block';
  } else {
    meterFeelField.style.display = 'none';
  }
}

// Update when pattern length changes
measureLengthInput.addEventListener('change', updateMusicXMLOptions);
```

---

## Examples with Visual Output

### Example 1: 12 Pulses (Ambiguous)
```
Pattern: X . . X . . X . . X . .

Option A (3/4 - Simple):
|♩ ♩ ♩|♩ ♩ ♩|
 1  2  3  1  2  3

Option B (6/8 - Compound):
|♩. ♩.|♩. ♩.|
 1   2  1   2
```

### Example 2: 11 Pulses (Prime)
```
Pattern: X . . X . . X . . X .

Option A (11/16):
|𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮|
(11 sixteenth notes)

Option B (11/8):
|♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪|
(11 eighth notes - easier to read, but changes pulse meaning)
```

### Example 3: 17 Pulses (Prime)
```
Pattern: X . . . X . . . X . . . X . . . X

Option A (17/16):
|𝅘𝅥𝅮×17|

Option B (4/4 + 1/16):
|♩ ♩ ♩ ♩| 𝅘𝅥𝅮|
(1 measure 4/4 + 1 sixteenth note)

Option C (17/8):
|♪×17|
(Changes pulse = 8th note)
```

---

## Recommendations by Pattern Length

| Pulses | Auto Strategy | Notes |
|--------|---------------|-------|
| 8      | 2/4           | Standard |
| 9      | 9/8 or 9/16   | Likely compound; check pattern |
| 10     | 5/4 or 10/8   | Simple 5/4 more common |
| 11     | **11/16**     | Odd meter; keep as 16ths |
| 12     | **3/4 or 6/8**| **User choice or pattern analysis** |
| 13     | **13/16**     | Odd meter; keep as 16ths |
| 14     | 7/8 or 7/4    | Map to 8ths: 7/8 |
| 15     | **15/16**     | Odd meter |
| 16     | 4/4           | Standard |
| 17     | **17/16**     | Odd meter; keep as 16ths |
| 18     | 9/8 (compound)| Map to 8ths |
| 19     | **19/16**     | Odd meter |
| 20     | 5/4           | Standard |
| 24     | **3/2 or 6/4 or 12/8** | **User choice** |
| 32     | 4/4 (×2 measures) | Split into 2 bars |
| 36     | **9/4 or 18/8** | **User choice** |

---

## Decision Tree

```
START
  │
  ├─ Is pulseCount % 4 == 0?
  │   ├─ YES → Use quarters (4/4, 5/4, 2/4, etc.)
  │   └─ NO → Continue
  │
  ├─ Is pulseCount == 12, 24, or 36?
  │   ├─ YES → AMBIGUOUS: Check user preference or pattern
  │   │         └─ Simple: 3/4, 6/4, 9/4
  │   │         └─ Compound: 6/8, 12/8, 18/8
  │   └─ NO → Continue
  │
  ├─ Is pulseCount % 2 == 0 AND <= 24?
  │   ├─ YES → Use eighth notes (x/8)
  │   └─ NO → Continue
  │
  ├─ Is pulseCount prime or odd AND <= 24?
  │   ├─ YES → Use sixteenth note meter (x/16)
  │   └─ NO → Continue
  │
  └─ Large pattern (> 24)
      └─ Split into multiple measures of 4/4
          with remainder as pickup or odd final bar
```

---

## Implementation Priority

**Phase 1 (MVP)**:
- ✅ Standard meters (8, 12, 16, 20, 24, 32)
- ✅ Default to simple meter for 12 (3/4)
- ✅ Use x/16 for odd numbers (11, 13, 17, etc.)

**Phase 2 (User Control)**:
- ✅ Meter feel toggle (simple vs compound) for 12, 24, 36
- ✅ Pattern analysis hint ("Detected: likely 6/8 feel")

**Phase 3 (Advanced)**:
- ✅ Full time signature override
- ✅ Multi-measure splitting options
- ✅ Note value remapping (16th → 8th)

This approach balances automatic convenience with user control for edge cases.
