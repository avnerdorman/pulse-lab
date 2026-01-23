# JavaScript MusicXML Libraries Comparison

## Overview
Based on research of available JavaScript/TypeScript libraries for MusicXML generation and manipulation, here's an assessment of options for Pulse Lab's export feature.

---

## Key Finding: Most Libraries Focus on **Parsing/Rendering**, Not **Generation**

The vast majority of MusicXML JavaScript libraries are designed to:
- ✅ **Import** MusicXML files and render them
- ❌ **Not** generate MusicXML from scratch

This is because most use cases involve displaying existing sheet music, not creating it programmatically.

---

## Library Options

### 1. **musicxml-interfaces** ⭐ RECOMMENDED
- **npm**: [`musicxml-interfaces`](https://www.npmjs.com/package/musicxml-interfaces)
- **GitHub**: [jocelyn-stericker/musicxml-interfaces](https://github.com/jocelyn-stericker/musicxml-interfaces)
- **Last Published**: 3 years ago (v0.0.21)
- **License**: AGPL-3.0

#### Features
- ✅ Low-level parsing, serialization, building, and patching
- ✅ One-to-one mapping of MusicXML to JSON
- ✅ Full TypeScript definitions (documents entire MusicXML spec)
- ✅ Can **generate** MusicXML from JavaScript objects
- ❌ No rendering utilities (focused on data only)

#### Example Usage
```typescript
import { ScoreTimewise, serializeScoreTimewise } from 'musicxml-interfaces';

const score: ScoreTimewise = {
  version: '3.1',
  work: {
    workTitle: 'Pulse Lab Pattern'
  },
  partList: [
    {
      scorePartElement: {
        id: 'P1',
        partName: 'Track 1',
        scoreInstrument: [
          {
            id: 'P1-I1',
            instrumentName: 'Percussion'
          }
        ]
      }
    }
  ],
  measures: [
    // ... measure data
  ]
};

const xmlString = serializeScoreTimewise(score);
```

#### Pros for Pulse Lab
- ✅ **Perfect for generation** - designed for building MusicXML
- ✅ TypeScript types prevent invalid structures
- ✅ Lightweight (no rendering overhead)
- ✅ Well-documented via TypeScript definitions
- ✅ Used by 4 other npm projects (proven)

#### Cons
- ⚠️ Not updated in 3 years (but MusicXML spec is stable)
- ⚠️ AGPL-3.0 license (copyleft - requires open source)
- ⚠️ Verbose API (lots of nested objects)
- ⚠️ Learning curve for MusicXML structure

#### Verdict
**Best choice for Pulse Lab** - handles exactly what we need (generation) without bloat.

---

### 2. **@stringsync/musicxml**
- **GitHub**: [stringsync/musicxml](https://github.com/stringsync/musicxml)
- **npm**: Not published (GitHub only)
- **Status**: ⚠️ API marked as "unstable"

#### Features
- ✅ TypeScript wrapper for MusicXML
- ✅ Builder pattern with method chaining
- ✅ Validation (guarantees valid output)
- ✅ Type predicates for element variations
- ❌ Not available on npm
- ❌ Unstable API (frequent breaking changes)

#### Example Usage
```typescript
import * as elements from '@stringsync/musicxml';

const note = new elements.Note()
  .setColor('#800080')
  .setStaff(new elements.Staff())
  .setDuration(4);
```

#### Pros for Pulse Lab
- ✅ Fluent API (easier to use than musicxml-interfaces)
- ✅ Strong typing
- ✅ Active development

#### Cons
- ❌ **Not published to npm** - would need to bundle from GitHub
- ❌ **Unstable API** - could break with updates
- ❌ Less mature than musicxml-interfaces
- ⚠️ License unclear

#### Verdict
**Skip for now** - not production-ready, not on npm.

---

### 3. **OpenSheetMusicDisplay (OSMD)**
- **npm**: [`opensheetmusicdisplay`](https://www.npmjs.com/package/opensheetmusicdisplay)
- **GitHub**: [opensheetmusicdisplay/opensheetmusicdisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay)
- **Last Published**: 1 month ago (v1.9.3) - actively maintained
- **License**: BSD-3-Clause

#### Features
- ✅ Renders MusicXML in browser using VexFlow
- ✅ Very active development
- ✅ Excellent documentation
- ❌ **Primarily a renderer**, not generator
- ⚠️ Export feature only for sponsors (premium)

#### Pros for Pulse Lab
- ✅ Could render preview before export
- ✅ Well-maintained, large community
- ✅ Permissive license

#### Cons
- ❌ **Not designed for generation** - reads MusicXML, doesn't write it
- ❌ Very large library (~1MB+) for just export
- ❌ Export feature requires sponsorship
- ❌ Overkill if we only need file export

#### Verdict
**Skip for v1** - consider for v2 if we want visual preview.

---

### 4. **VexFlow + vexflow-musicxml**
- **VexFlow npm**: [`vexflow`](https://www.vexflow.com/)
- **MusicXML plugin**: [`vexflow-musicxml`](https://www.npmjs.com/package/vexflow-musicxml)
- **License**: MIT

#### Features
- ✅ VexFlow: Powerful music notation rendering
- ✅ vexflow-musicxml: Parses MusicXML for display
- ❌ **No export capability** - only import/render
- ❌ Multiple competing forks with different features

#### Verdict
**Not applicable** - handles opposite direction (MusicXML → rendering).

---

### 5. **Flat.io JavaScript SDK**
- **Website**: [flat.io/developers](https://flat.io/developers/docs/embed/javascript-editor)
- **Type**: Commercial SaaS API

#### Features
- ✅ Full music notation editor
- ✅ MusicXML import/export
- ✅ MIDI export
- ❌ **Requires cloud service** (not GitHub Pages compatible)
- ❌ Commercial product (pricing required)

#### Verdict
**Not suitable** - violates GitHub Pages constraint, adds external dependency.

---

## Recommendation Matrix

| Library | Generation | Parsing | Rendering | License | npm | Size | Verdict |
|---------|------------|---------|-----------|---------|-----|------|---------|
| **musicxml-interfaces** | ✅ | ✅ | ❌ | AGPL-3.0 | ✅ | ~50KB | ⭐ **BEST** |
| @stringsync/musicxml | ✅ | ✅ | ❌ | ? | ❌ | ? | Skip (not on npm) |
| OSMD | ❌ | ✅ | ✅ | BSD-3 | ✅ | ~1MB | Overkill |
| VexFlow | ❌ | ❌ | ✅ | MIT | ✅ | ~200KB | Wrong direction |
| Flat.io | ✅ | ✅ | ✅ | Commercial | ✅ | N/A | Not self-hosted |
| **Custom** | ✅ | ❌ | ❌ | Your choice | N/A | ~5KB | ⭐ **LIGHTWEIGHT** |

---

## Detailed Recommendation

### Option A: Use `musicxml-interfaces` ⭐ Recommended for Robustness

**Installation**:
```bash
npm install musicxml-interfaces
```

**Pros**:
- Proven library (used by other projects)
- TypeScript definitions = self-documenting
- Handles all MusicXML complexity
- Validation built-in

**Cons**:
- AGPL-3.0 license (your project must be open source)
- Verbose API
- Adds ~50KB to bundle
- Need to learn library API

**Implementation Effort**: 6-8 hours (learning curve + integration)

**Code Example**:
```javascript
import { serializeScorePartwise } from 'musicxml-interfaces';

function generateMusicXML(tracks, tempo, patternLength) {
  const score = {
    version: '3.1',
    work: { workTitle: 'Pulse Lab Pattern' },
    identification: {
      creator: [{ $: 'Pulse Lab', type: 'software' }]
    },
    partList: tracks.map((track, i) => ({
      scorePartElement: {
        id: `P${i + 1}`,
        partName: track.name,
        scoreInstrument: [{
          id: `P${i + 1}-I1`,
          instrumentName: 'Percussion'
        }]
      }
    })),
    parts: tracks.map((track, i) => buildPart(track, i, tempo))
  };

  return serializeScorePartwise(score);
}
```

**Recommendation**: Use if you want **maximum correctness** and don't mind the learning curve.

---

### Option B: Custom Generator ⭐ Recommended for Simplicity

**Pros**:
- ✅ Full control over output
- ✅ No dependencies (0 bytes)
- ✅ Easy to debug
- ✅ Tailored to percussion notation (simpler than full spec)
- ✅ Any license you want
- ✅ ~200-300 lines of code

**Cons**:
- You maintain it
- Need to test against notation software
- Manual XML escaping
- No built-in validation

**Implementation Effort**: 4-6 hours (as estimated before)

**Code Example**:
```javascript
class MusicXMLExporter {
  generate(tracks, tempo, patternLength) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  ${this.buildHeader()}
  ${this.buildPartList(tracks)}
  ${this.buildParts(tracks, tempo)}
</score-partwise>`;
  }
}
```

**Recommendation**: Use if you want **minimal complexity** and full control.

---

## Final Recommendation: Custom Generator (Option B)

### Why Custom is Better for Pulse Lab:

1. **Percussion notation is simple** - doesn't need full MusicXML spec
2. **No license concerns** - you control it
3. **Zero bundle bloat** - keeps site fast
4. **GitHub Pages compatible** - no external dependencies
5. **Easy to extend** - add features as needed
6. **Learning investment** - you understand every line

### When to Use a Library:

- If you need **pitched instruments** (not just drums)
- If you want **complex notation** (articulations, dynamics, etc.)
- If you need **MusicXML import** (reverse direction)
- If validation is critical and you don't trust your code

---

## Hybrid Approach (Best of Both Worlds)

**Phase 1**: Build custom generator (4-6 hours)
- Get basic export working
- Test with MuseScore/Finale
- Iterate on edge cases

**Phase 2**: Add validation with `musicxml-interfaces` (2-3 hours)
```javascript
import { parseScorePartwise } from 'musicxml-interfaces';

function validateMusicXML(xmlString) {
  try {
    const parsed = parseScorePartwise(xmlString);
    return { valid: true, parsed };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Use after generation
const xml = exporter.generate();
const result = validateMusicXML(xml);
if (!result.valid) {
  console.error('Invalid MusicXML:', result.error);
}
```

This gives you:
- ✅ Custom generator (simple, fast)
- ✅ Library validation (correctness)
- ✅ Best of both worlds

---

## License Considerations

### AGPL-3.0 (musicxml-interfaces)
- **Requires**: Your entire project must be open source
- **Impact**: Pulse Lab is already on GitHub, so this is probably fine
- **Caveat**: If you ever want to make parts proprietary, this prevents it

### Custom Code
- **Choose**: MIT, BSD, Apache, or keep same as Pulse Lab
- **Freedom**: No restrictions on future use

---

## Summary Table

| Aspect | Custom Generator | musicxml-interfaces | Hybrid |
|--------|------------------|---------------------|--------|
| **Bundle Size** | 0 KB | +50 KB | +50 KB |
| **Dev Time** | 4-6 hours | 6-8 hours | 6-9 hours |
| **Complexity** | Low | Medium | Medium |
| **Correctness** | Manual testing | Guaranteed | Guaranteed |
| **Flexibility** | Full control | Library constraints | Full control + validation |
| **Maintenance** | You own it | Library updates | Hybrid |
| **License** | Your choice | AGPL-3.0 | AGPL-3.0 |
| **Learning Curve** | Minimal | Steep | Moderate |

---

## Verdict

For Pulse Lab's MusicXML export feature:

### 🏆 **Recommended: Custom Generator (Phase 1)**

Reasons:
1. Percussion notation is well within custom scope
2. Zero dependencies keeps GitHub Pages deployment simple
3. Full control over output format
4. Easy to understand and modify
5. Fast implementation (4-6 hours)

### 🎯 **Optional: Add musicxml-interfaces validation (Phase 2)**

If you want extra confidence:
1. Generate with custom code (fast, simple)
2. Validate with library (correctness check)
3. Log warnings if validation fails
4. Best of both worlds

### ❌ **Skip: OpenSheetMusicDisplay, VexFlow, Flat.io**

Reasons:
- OSMD/VexFlow: Wrong direction (render, not generate)
- Flat.io: External dependency, not self-hosted
- All: Overkill for simple percussion export

---

## Code Size Comparison

### Custom Generator
```javascript
// ~250 lines total
class MusicXMLExporter { /* ... */ }
```

### With musicxml-interfaces
```javascript
import { serializeScorePartwise } from 'musicxml-interfaces'; // +50KB

// ~150 lines (less XML templating)
// + library complexity
```

**Winner**: Custom is more transparent, library is more guaranteed correct.

---

## Next Steps

1. ✅ Start with custom generator (as documented in MUSICXML_EXPORT_ASSESSMENT.md)
2. ✅ Test output in MuseScore (free, cross-platform)
3. ✅ Test in Finale/Sibelius if available
4. ⏭️ If validation issues arise, add musicxml-interfaces for checking
5. ⏭️ If users request pitched instruments, consider full library

**This approach minimizes risk while maximizing speed and control.**
