# Implementation Plan: Euclidean Generator & Necklace View

**Date:** 2025-11-29
**Project:** Pulse Lab - Drum Machine JavaScript
**Educational Context:** Post-tonal rhythm theory course

---

## Overview

Two major pedagogical features to add:
1. **Euclidean Rhythm Generator** - Generate maximally even distributions (Bjorklund algorithm)
2. **Necklace/Circle View** - Geometric visualization of rhythmic patterns

Both features align with Toussaint-style rhythm analysis and enhance student understanding of cyclic patterns.

---

## Feature 1: Euclidean Rhythm Generator

### Difficulty: EASY ⭐⚪⚪⚪⚪
**Estimated Time:** 30-60 minutes

### What It Does
Generates maximally even rhythmic distributions using the Bjorklund algorithm. Students can create patterns like E(5,16) or E(3,8) directly, exploring the mathematical properties of even distribution.

### Implementation Steps

#### 1. Add Bjorklund Algorithm to `script.js`
```javascript
// Add after line 28 (after initialize())
function bjorklund(steps, pulses) {
    steps = Math.round(steps);
    pulses = Math.round(pulses);

    if(pulses > steps || pulses == 0 || steps == 0) {
        return [];
    }

    let pattern = [];
    let counts = [];
    let remainders = [];
    let divisor = steps - pulses;
    remainders.push(pulses);
    let level = 0;

    while(true) {
        counts.push(Math.floor(divisor / remainders[level]));
        remainders.push(divisor % remainders[level]);
        divisor = remainders[level];
        level += 1;
        if (remainders[level] <= 1) {
            break;
        }
    }

    counts.push(divisor);

    let r = 0;
    let build = function(level) {
        r++;
        if (level > -1) {
            for (let i=0; i < counts[level]; i++) {
                build(level-1);
            }
            if (remainders[level] != 0) {
                build(level-2);
            }
        } else if (level == -1) {
            pattern.push(0);
        } else if (level == -2) {
            pattern.push(1);
        }
    };

    build(level);
    return pattern.reverse();
}

// Convert binary array to X/. pattern string
function bjorklundToPattern(steps, pulses) {
    const binary = bjorklund(steps, pulses);
    return binary.map(b => b === 1 ? 'X' : '.').join('');
}
```

#### 2. Add UI to Track Options Menu

**Update `tracker-table.js` line 88-94:**

```javascript
// Current:
str += `<button type="button" class="track-options-item" data-row-id="${rowId}" data-every="2" role="menuitem">Every 2</button>`;
str += `<button type="button" class="track-options-item" data-row-id="${rowId}" data-every="3" role="menuitem">Every 3</button>`;
str += `<button type="button" class="track-options-item" data-row-id="${rowId}" data-every="4" role="menuitem">Every 4</button>`;
str += `<button type="button" class="track-options-item" data-row-id="${rowId}" data-every="5" role="menuitem">Every 5</button>`;

// Add after:
str += `<hr class="track-options-sep">`;
str += `<button type="button" class="track-options-item euclidean-trigger" data-row-id="${rowId}" role="menuitem">Euclidean...</button>`;
```

#### 3. Add Modal/Popup for Euclidean Input

**Add to `index.html` before closing `</body>`:**

```html
<!-- Euclidean Rhythm Modal -->
<div id="euclidean-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <h3>Generate Euclidean Rhythm</h3>
        <p>Create a maximally even distribution E(k,n)</p>
        <div class="euclidean-inputs">
            <label>
                Onsets (k):
                <input type="number" id="euclidean-pulses" min="1" max="32" value="5">
            </label>
            <label>
                Steps (n):
                <input type="number" id="euclidean-steps" min="1" max="32" value="16">
            </label>
        </div>
        <div class="euclidean-presets">
            <p>Common patterns:</p>
            <button type="button" class="preset-btn" data-k="3" data-n="8">E(3,8)</button>
            <button type="button" class="preset-btn" data-k="5" data-n="8">E(5,8)</button>
            <button type="button" class="preset-btn" data-k="5" data-n="12">E(5,12)</button>
            <button type="button" class="preset-btn" data-k="7" data-n="12">E(7,12)</button>
            <button type="button" class="preset-btn" data-k="5" data-n="16">E(5,16)</button>
            <button type="button" class="preset-btn" data-k="7" data-n="16">E(7,16)</button>
        </div>
        <div class="modal-actions">
            <button type="button" id="euclidean-apply">Apply</button>
            <button type="button" id="euclidean-cancel">Cancel</button>
        </div>
    </div>
</div>
```

#### 4. Wire Up Event Handlers in `script.js`

**Add after `clearRowById()` function (around line 925):**

```javascript
function setupEuclideanModal() {
    const modal = document.getElementById('euclidean-modal');
    const pulsesInput = document.getElementById('euclidean-pulses');
    const stepsInput = document.getElementById('euclidean-steps');
    const applyBtn = document.getElementById('euclidean-apply');
    const cancelBtn = document.getElementById('euclidean-cancel');
    let currentRowId = null;

    // Open modal when "Euclidean..." clicked
    trackerParent.addEventListener('click', event => {
        const trigger = event.target && event.target.closest('.euclidean-trigger');
        if (trigger) {
            currentRowId = trigger.dataset.rowId;
            const length = getPatternLength() || 16;
            stepsInput.value = length;
            stepsInput.max = length;
            pulsesInput.max = length;
            modal.style.display = 'block';
            event.stopPropagation();
        }
    });

    // Preset buttons
    modal.addEventListener('click', event => {
        const preset = event.target && event.target.closest('.preset-btn');
        if (preset) {
            pulsesInput.value = preset.dataset.k;
            stepsInput.value = preset.dataset.n;
        }
    });

    // Apply
    applyBtn.addEventListener('click', () => {
        const k = parseInt(pulsesInput.value, 10);
        const n = parseInt(stepsInput.value, 10);
        if (currentRowId !== null && k && n) {
            applyEuclideanPattern(currentRowId, k, n);
        }
        modal.style.display = 'none';
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on outside click
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function applyEuclideanPattern(rowId, pulses, steps) {
    const pattern = bjorklundToPattern(steps, pulses);
    const patternSet = {
        length: steps,
        clearAll: false,
        patterns: [{
            rowId: String(rowId),
            pattern: pattern
        }]
    };
    const applied = applyPatternSetNow(patternSet);
    if (!applied) {
        queuePatternSet(patternSet);
    }
    showMessage(`Applied E(${pulses},${steps}) pattern`);
}
```

**Add to `initialize()` function:**
```javascript
setupEuclideanModal();
```

#### 5. Add CSS Styling for Modal

**Add to `main.css`:**

```css
/* Euclidean Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background-color: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.modal-content h3 {
    margin-top: 0;
    color: #f8fafc;
}

.euclidean-inputs {
    display: flex;
    gap: 16px;
    margin: 16px 0;
}

.euclidean-inputs label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #cbd5e1;
}

.euclidean-inputs input {
    padding: 8px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background-color: rgba(30, 41, 59, 0.5);
    color: #f8fafc;
    font-size: 16px;
}

.euclidean-presets {
    margin: 16px 0;
}

.euclidean-presets p {
    color: #cbd5e1;
    margin-bottom: 8px;
}

.preset-btn {
    margin: 4px;
    padding: 6px 12px;
    background-color: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: 6px;
    color: #93c5fd;
    cursor: pointer;
    font-family: monospace;
}

.preset-btn:hover {
    background-color: rgba(59, 130, 246, 0.3);
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
}

.modal-actions button {
    padding: 8px 20px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background-color: rgba(59, 130, 246, 0.2);
    color: #f8fafc;
    cursor: pointer;
}

.modal-actions button:hover {
    background-color: rgba(59, 130, 246, 0.3);
}
```

### Testing Checklist
- [ ] Modal opens when clicking "Euclidean..." in track options
- [ ] Preset buttons populate input fields
- [ ] Apply button generates correct pattern
- [ ] Pattern syncs with current measure length
- [ ] E(3,8), E(5,8), E(5,12), E(7,12), E(5,16), E(7,16) all generate correctly
- [ ] Modal closes on cancel or outside click
- [ ] Pattern exports correctly in .txt format

### Pedagogical Value
- **Direct exploration** of maximally even distributions
- **Connection to theory** - E(k,n) notation matches mathematical literature
- **Cultural patterns** - many world music rhythms are Euclidean
- **Preset buttons** provide scaffolded entry points

---

## Feature 2: Necklace/Circle View

### Difficulty: MEDIUM ⭐⭐⭐⚪⚪
**Estimated Time:** 4-7 hours (read-only) | 8-12 hours (interactive)

### What It Does
Displays each drum track as a circle with pulses evenly distributed around the circumference. Onsets are shown as filled circles, rests as empty circles. During playback, the current pulse is highlighted, creating an animated "clock" effect for each track.

### Phase 2A: Read-Only Visualization (Recommended First)

#### Implementation Steps

##### 1. Create Necklace Renderer Module

**Create new file: `src/necklace-view.js`**

```javascript
function NecklaceView() {
    this.canvas = null;
    this.ctx = null;
    this.circles = [];
    this.currentPulse = 0;
    this.isPlaying = false;

    // Visual constants
    this.CIRCLE_RADIUS = 80;
    this.PULSE_DOT_RADIUS = 4;
    this.ONSET_DOT_RADIUS = 8;
    this.CURRENT_PULSE_RADIUS = 12;
    this.GRID_COLS = 3;
    this.PADDING = 120;

    this.init = function(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return false;
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        return true;
    };

    this.resizeCanvas = function() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = Math.max(600, container.clientHeight);
    };

    this.loadFromTracker = function() {
        const rows = Array.from(document.querySelectorAll('#tracker-table .tracker-row[data-id]'));
        const length = getPatternLength() || 16;

        this.circles = rows.map((row, index) => {
            const labelCell = row.querySelector('.tracker-first-cell');
            const label = labelCell ? labelCell.textContent.trim() : `Track ${index}`;
            const cells = Array.from(row.querySelectorAll('.tracker-cell'));
            const pattern = cells.slice(0, length).map(cell =>
                cell.classList.contains('tracker-enabled')
            );

            return {
                label: label,
                pattern: pattern,
                length: length,
                rowId: row.dataset.id
            };
        });

        this.draw();
    };

    this.draw = function() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = 'rgba(3, 7, 17, 0.95)';
        ctx.fillRect(0, 0, width, height);

        // Calculate grid layout
        const cols = this.GRID_COLS;
        const rows = Math.ceil(this.circles.length / cols);
        const cellWidth = (width - this.PADDING * 2) / cols;
        const cellHeight = (height - this.PADDING * 2) / rows;

        this.circles.forEach((circle, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const centerX = this.PADDING + col * cellWidth + cellWidth / 2;
            const centerY = this.PADDING + row * cellHeight + cellHeight / 2;

            this.drawCircle(ctx, circle, centerX, centerY);
        });
    };

    this.drawCircle = function(ctx, circle, centerX, centerY) {
        const radius = this.CIRCLE_RADIUS;
        const numPulses = circle.length;

        // Draw label
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(circle.label, centerX, centerY - radius - 15);

        // Draw circle outline
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw pulses
        for (let i = 0; i < numPulses; i++) {
            const angle = (i / numPulses) * Math.PI * 2 - Math.PI / 2; // Start at top
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const isOnset = circle.pattern[i];
            const isCurrent = this.isPlaying && i === this.currentPulse;

            if (isCurrent) {
                // Highlight current pulse
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(x, y, this.CURRENT_PULSE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            } else if (isOnset) {
                // Onset (filled circle)
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.arc(x, y, this.ONSET_DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Rest (empty circle)
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, this.PULSE_DOT_RADIUS, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    };

    this.setCurrentPulse = function(pulseIndex) {
        this.currentPulse = pulseIndex;
        this.draw();
    };

    this.setPlaying = function(playing) {
        this.isPlaying = playing;
        this.draw();
    };
}

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NecklaceView;
}
```

##### 2. Add Canvas to HTML

**Add to `index.html` after the tracker parent (around line 103):**

```html
<!-- Necklace View Toggle -->
<div id="necklace-view-container" style="display: none;">
    <div class="view-controls">
        <button type="button" id="toggle-necklace">Hide Necklace View</button>
    </div>
    <canvas id="necklace-canvas"></canvas>
</div>
```

##### 3. Add Toggle Button

**Add to transport panel in `index.html` (around line 79):**

```html
<button id="toggle-necklace-view" type="button" class="icon-btn">Circle View</button>
```

##### 4. Wire Up in `script.js`

**Add after imports:**
```javascript
const NecklaceView = require('./src/necklace-view');
const necklaceView = new NecklaceView();
```

**Add to `setupTrackerListeners()` or create new function:**
```javascript
function setupNecklaceView() {
    const toggleBtn = document.getElementById('toggle-necklace-view');
    const container = document.getElementById('necklace-view-container');

    if (!toggleBtn || !container) return;

    toggleBtn.addEventListener('click', () => {
        const isVisible = container.style.display !== 'none';
        container.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent = isVisible ? 'Circle View' : 'Grid View';

        if (!isVisible) {
            necklaceView.init('necklace-canvas');
            necklaceView.loadFromTracker();
        }
    });

    // Reload necklace when tracker changes
    if (trackerParent) {
        const observer = new MutationObserver(() => {
            if (container.style.display !== 'none') {
                necklaceView.loadFromTracker();
            }
        });
        observer.observe(trackerParent, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
}
```

**Call in `initialize()`:**
```javascript
setupNecklaceView();
```

##### 5. Sync with Playback

**Modify `simple-tracker.js` to emit current pulse:**

Around line 90, where `tracker-current` class is added:
```javascript
let event = this.clock.callbackAtTime(() => {
    let elems = document.querySelectorAll(selector);
    elems.forEach( (e) => {
        e.classList.add('tracker-current')
    })

    // Notify necklace view
    if (window.necklaceView) {
        window.necklaceView.setCurrentPulse(this.current);
        window.necklaceView.setPlaying(this.running);
    }
}, now + this.scheduleForward);
```

**Expose necklace view globally in `script.js`:**
```javascript
window.necklaceView = necklaceView;
```

##### 6. Add CSS

**Add to `main.css`:**

```css
#necklace-view-container {
    width: 100%;
    margin-top: 24px;
    background-color: rgba(15, 18, 30, 0.92);
    border-radius: 16px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    padding: 16px;
}

#necklace-canvas {
    width: 100%;
    height: 600px;
    border-radius: 12px;
}

.view-controls {
    margin-bottom: 12px;
    text-align: center;
}
```

### Phase 2B: Interactive Editing (Future Enhancement)

**Adds click-to-edit functionality:**

1. Add click handler to canvas
2. Detect which circle and which pulse was clicked
3. Toggle cell in tracker grid
4. Redraw necklace view

**Implementation notes saved for future:**
- Hit testing: calculate distance from click to each pulse dot
- Bidirectional sync: necklace → grid and grid → necklace
- Mobile touch support
- Visual feedback on hover

---

## Testing Strategy

### Euclidean Generator
1. Test all preset patterns match expected output
2. Verify pattern length matches current measure length
3. Test with different measure lengths (8, 12, 16, 24, 32)
4. Verify import/export round-trip with Euclidean patterns
5. Test edge cases: E(0,16), E(16,16), E(1,16)

### Necklace View
1. Toggle between grid and necklace views
2. Verify all tracks appear in necklace view
3. Test playback synchronization (pulse highlighting)
4. Verify pattern changes update necklace automatically
5. Test with different numbers of tracks (3, 6, 9, 12, 15)
6. Responsive testing on different screen sizes

---

## Pedagogical Integration

### Lesson Plan Ideas

**Euclidean Rhythms:**
- Compare E(3,8), E(5,8), E(7,8) - increasing density
- Explore E(5,12) vs E(5,16) - same onsets, different spacing
- Create traditional patterns: E(3,8) = tresillo, E(5,8) = cinquillo

**Necklace Analysis:**
- Identify visual symmetry in patterns
- Compare rotation operations in both views
- Analyze interval spacing geometrically
- Connect to Toussaint's "Geometry of Musical Rhythm"

### Student Assignments
1. Generate E(k,n) patterns for various k and n values
2. Document visual properties using necklace view screenshots
3. Compare grid vs. circle representations for understanding
4. Analyze cultural rhythm patterns using both views

---

## Future Enhancements

### Priority 1 (Post-Implementation)
- [ ] Export necklace view as SVG/PNG
- [ ] Rotation controls in necklace view
- [ ] Pattern complement visualization
- [ ] Interval vector calculator integration

### Priority 2 (Advanced)
- [ ] Multiple necklace views side-by-side for comparison
- [ ] Animated pattern morphing
- [ ] Color coding by inter-onset intervals
- [ ] MIDI export functionality

### Priority 3 (Research Features)
- [ ] Hamming distance calculator between patterns
- [ ] Automatic pattern classification
- [ ] Pattern library with cultural annotations
- [ ] Integration with notation software

---

## Build Process

After implementing these features:

```bash
# Rebuild bundle
./build.sh

# Or watch mode during development
./watch.sh

# Test in browser
open index.html
```

---

## Notes for Future Sessions

### Key Files Modified
- `script.js` - Main UI logic, Bjorklund algorithm, modal handlers
- `tracker-table.js` - Track options menu update
- `index.html` - Modal HTML, necklace canvas, toggle button
- `main.css` - Modal styling, necklace view styling
- `src/necklace-view.js` - NEW FILE - Circle rendering logic
- `src/simple-tracker.js` - Playback pulse notification

### Important Patterns
- Pattern generation uses same `applyPatternSetNow()` as existing features
- Necklace view observes DOM via MutationObserver for automatic updates
- Modal follows existing pattern from track options
- All educational features preserve export/import functionality

### Educational Context Preserved
- Euclidean generator uses E(k,n) notation from mathematics
- Necklace view connects to Toussaint's geometric approach
- Both features enhance "see, hear, manipulate" learning cycle
- Maintains accessibility for students without music tech background

---

**End of Implementation Plan**
