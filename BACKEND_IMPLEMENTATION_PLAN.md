# Backend Implementation Plan: MIDI/MusicXML Export

## Executive Summary

This document provides a complete implementation plan for adding reliable MIDI and MusicXML export to Pulse Lab using a Python backend with music21.

**Decision**: After assessing client-side options (midi-writer-js, ABC/LilyPond conversion, custom MusicXML generation), we determined that a Python backend with music21 provides the most reliable, maintainable solution.

**Key Constraint Preserved**: Student URLs on GitHub Pages remain unchanged. The frontend stays exactly where it is.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  Frontend (pulse-lab repo)                       │
│  GitHub Pages: avnerdorman.github.io/pulse-lab   │
│  • HTML/CSS/JavaScript (unchanged)               │
│  • User interface (unchanged)                    │
│  • Pattern creation (unchanged)                  │
└────────────────┬─────────────────────────────────┘
                 │
                 │ AJAX call on export
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Backend (pulse-lab-api repo - NEW)              │
│  Vercel: pulse-lab-api.vercel.app                │
│  • Python + FastAPI                              │
│  • music21 library                               │
│  • Single endpoint: POST /api/export             │
└──────────────────────────────────────────────────┘
```

---

## Repository Structure

### New Repository: `pulse-lab-api`

Create a new GitHub repository with this structure:

```
pulse-lab-api/
├── api/
│   └── export.py              # FastAPI endpoint (main file)
├── requirements.txt            # Python dependencies
├── vercel.json                # Vercel configuration
├── runtime.txt                # Python version specification
├── .gitignore                 # Ignore Python cache files
├── README.md                  # Deployment and usage docs
└── tests/
    ├── test_export.py         # Unit tests
    └── sample_patterns.json   # Test data
```

---

## Backend Implementation

### File 1: `requirements.txt`

```
fastapi==0.109.0
uvicorn==0.27.0
music21==9.1.0
python-multipart==0.0.6
```

**Why these versions**:
- FastAPI 0.109.0: Latest stable (Jan 2024)
- music21 9.1.0: Latest stable, well-tested
- uvicorn: ASGI server for FastAPI
- python-multipart: For handling file uploads (if needed later)

---

### File 2: `runtime.txt`

```
python-3.11
```

**Why Python 3.11**: Latest stable supported by Vercel, music21 compatible

---

### File 3: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/export.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/export",
      "dest": "api/export.py"
    }
  ]
}
```

**Purpose**: Tells Vercel how to build and route requests

---

### File 4: `api/export.py` (Core Implementation)

**Requirements**:

1. **Single endpoint**: `POST /api/export`
2. **Input validation**: Sanitize pattern data
3. **CORS configuration**: Allow requests from GitHub Pages
4. **Error handling**: Return clear error messages
5. **Format support**: Both MIDI and MusicXML
6. **Security**: Rate limiting, input size limits

**Input Schema**:
```python
{
    "format": "midi" | "musicxml",
    "tempo": int (30-300),
    "pattern_length": int (8-36),
    "tracks": [
        {
            "name": str (max 50 chars),
            "pattern": ["X" | "."] (length matches pattern_length)
        }
    ]
}
```

**Output**: Binary file (MIDI) or XML string (MusicXML)

**Core Logic Flow**:
1. Parse and validate JSON request
2. Create music21 Stream
3. For each track:
   - Create Part
   - Add percussion instrument
   - Convert pattern to notes/rests
4. Set tempo and time signature
5. Export to requested format
6. Return as downloadable file

**Time Signature Calculation**:
```python
def calculate_time_signature(pattern_length: int) -> tuple:
    """
    Assumes 16th note pulses.
    pattern_length=16 → 4/4
    pattern_length=12 → 3/4
    pattern_length=24 → 6/4 or 2 measures of 3/4
    """
    quarters = pattern_length / 4

    if quarters == 4:
        return (4, 4)
    elif quarters == 3:
        return (3, 4)
    elif quarters == 2:
        return (2, 4)
    elif quarters == 6:
        return (6, 4)
    elif quarters == 5:
        return (5, 4)
    elif quarters == 7:
        return (7, 4)
    else:
        # Round to nearest quarter
        return (round(quarters), 4)
```

**MIDI Note Mapping** (General MIDI Percussion):
```python
GM_DRUM_MAP = {
    0: 36,   # Acoustic Bass Drum
    1: 38,   # Acoustic Snare
    2: 42,   # Closed Hi-Hat
    3: 46,   # Open Hi-Hat
    4: 49,   # Crash Cymbal 1
    5: 51,   # Ride Cymbal 1
    6: 50,   # High Tom
    7: 47,   # Low-Mid Tom
    8: 45,   # Low Tom
    9: 41,   # Low Floor Tom
    10: 43,  # High Floor Tom
    11: 48,  # Hi-Mid Tom
    12: 56,  # Cowbell
    13: 54,  # Tambourine
    14: 39,  # Hand Clap
    15: 37,  # Side Stick
}
```

**CORS Configuration**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://avnerdorman.github.io",
        "http://localhost:8000",  # For local testing
        "http://127.0.0.1:8000"   # For local testing
    ],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)
```

**Error Handling**:
- 400: Invalid input (bad JSON, invalid pattern)
- 413: Payload too large (>100 tracks or >1000 pulses)
- 422: Validation error (tempo out of range, invalid format)
- 500: Server error (music21 export failure)

**Rate Limiting**: Vercel provides this automatically (100 requests/10 seconds)

---

### File 5: `tests/test_export.py` (Unit Tests)

**Test Cases**:

1. **Valid MIDI export** - Simple 16-pulse pattern
2. **Valid MusicXML export** - Simple 16-pulse pattern
3. **Multi-track export** - 3 tracks with different patterns
4. **Odd time signatures** - 12 pulses (3/4), 20 pulses (5/4)
5. **Empty pattern** - All rests (should still export)
6. **Invalid format** - Request "pdf" format (should fail)
7. **Invalid tempo** - Tempo = 999 (should fail)
8. **Invalid pattern length** - 1000 pulses (should fail)
9. **XSS attempt** - Track name with `<script>` tags (should sanitize)
10. **CORS validation** - Request from wrong origin (should fail)

**Testing Framework**: pytest

**Run tests**:
```bash
pytest tests/test_export.py -v
```

---

### File 6: `README.md` (Deployment Guide)

**Contents**:
1. Overview of the API
2. Local development setup
3. Vercel deployment instructions
4. API endpoint documentation
5. Example request/response
6. Troubleshooting common issues

---

## Frontend Changes

### Repository: `pulse-lab` (existing)

**Files to Modify**:
1. `script.js` - Update export functions
2. `index.html` - No changes needed (buttons already exist)

### Changes to `script.js`

**Location**: Export function area (around line 450-600)

**Current Implementation** (to remove):
```javascript
function exportMIDI() {
    // REMOVE: All current MIDI generation code
    // REMOVE: MidiWriter usage
    // REMOVE: buildMIDITrack() function
    // REMOVE: calculateMIDITimeSignature() function
    // REMOVE: getMIDINoteForTrack() function
}
```

**New Implementation** (add):

```javascript
// Configuration - API endpoint
const API_URL = 'https://pulse-lab-api.vercel.app/api/export';

/**
 * Export pattern to MIDI format via backend API
 */
async function exportMIDI() {
    const patternData = {
        format: 'midi',
        tempo: getTempo() || 120,
        pattern_length: getPatternLength(),
        tracks: extractTrackData()
    };

    try {
        showMessage('Generating MIDI file...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patternData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Export failed');
        }

        const blob = await response.blob();
        downloadFile(blob, `pulse-pattern-${Date.now()}.mid`, 'audio/midi');
        showMessage('MIDI file exported successfully');
    } catch (error) {
        console.error('MIDI export error:', error);
        showMessage('Error exporting MIDI: ' + error.message);
    }
}

/**
 * Export pattern to MusicXML format via backend API
 */
async function exportMusicXML() {
    const patternData = {
        format: 'musicxml',
        tempo: getTempo() || 120,
        pattern_length: getPatternLength(),
        tracks: extractTrackData()
    };

    try {
        showMessage('Generating MusicXML file...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patternData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Export failed');
        }

        const blob = await response.blob();
        downloadFile(blob, `pulse-pattern-${Date.now()}.musicxml`, 'application/vnd.recordare.musicxml+xml');
        showMessage('MusicXML file exported successfully');
    } catch (error) {
        console.error('MusicXML export error:', error);
        showMessage('Error exporting MusicXML: ' + error.message);
    }
}

/**
 * Extract track data in format expected by backend
 */
function extractTrackData() {
    const length = getPatternLength();
    const rows = getTrackRows();
    const activeRows = rows.filter(row => rowHasActivity(row, length));

    return activeRows.map(row => {
        const labelCell = row.querySelector('.tracker-first-cell');
        const name = labelCell ? labelCell.textContent.trim() : `Track ${row.dataset.id || ''}`.trim();
        const cells = Array.from(row.querySelectorAll('.tracker-cell'));

        // Convert cells to pattern array ['X', '.', 'X', ...]
        const pattern = [];
        for (let i = 0; i < length; i++) {
            const cell = cells[i];
            pattern.push(cell && cell.classList.contains('tracker-enabled') ? 'X' : '.');
        }

        return { name, pattern };
    });
}

/**
 * Generic file download helper
 */
function downloadFile(blob, filename, mimeType) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
```

**Button Wiring** (already exists, just verify):
```javascript
// Verify these event listeners exist
if (midiBtn) {
    midiBtn.addEventListener('click', exportMIDI);
}

// Add new MusicXML button if desired
if (musicxmlBtn) {
    musicxmlBtn.addEventListener('click', exportMusicXML);
}
```

**Dependencies to Remove**:
- Remove `window.MidiWriter` references
- Remove midi-writer-js from package.json
- Remove midi-writer-js require from src/app.js
- Rebuild bundle.js

---

## Security Considerations

### Backend Security

**1. Input Validation**:
```python
from pydantic import BaseModel, Field, validator

class Track(BaseModel):
    name: str = Field(..., max_length=50)
    pattern: list[str] = Field(..., min_items=1, max_items=1000)

    @validator('name')
    def sanitize_name(cls, v):
        # Remove potentially dangerous characters
        import re
        return re.sub(r'[<>\"\'&]', '', v)

    @validator('pattern')
    def validate_pattern(cls, v):
        # Ensure only 'X' or '.'
        if not all(p in ['X', '.'] for p in v):
            raise ValueError('Pattern must only contain "X" or "."')
        return v

class ExportRequest(BaseModel):
    format: str = Field(..., regex='^(midi|musicxml)$')
    tempo: int = Field(..., ge=30, le=300)
    pattern_length: int = Field(..., ge=1, le=1000)
    tracks: list[Track] = Field(..., min_items=1, max_items=100)

    @validator('tracks')
    def validate_track_patterns(cls, v, values):
        # Ensure all patterns match pattern_length
        pattern_length = values.get('pattern_length')
        for track in v:
            if len(track.pattern) != pattern_length:
                raise ValueError(f'Track pattern length must match pattern_length')
        return v
```

**2. Rate Limiting**:
- Vercel provides automatic rate limiting
- Additional: Implement request throttling per IP (optional)

**3. File Size Limits**:
- Maximum pattern length: 1000 pulses (prevents memory issues)
- Maximum tracks: 100 (prevents abuse)
- Maximum request size: 1MB (Vercel default)

**4. CORS Restrictions**:
- Only allow requests from specific origins (GitHub Pages URL)
- Don't use wildcard `*` in production

**5. Error Message Safety**:
- Don't expose internal errors to client
- Log detailed errors server-side
- Return generic error messages to client

**6. Dependencies**:
- Pin dependency versions in requirements.txt
- Regularly update for security patches
- Use `pip-audit` to check for vulnerabilities

### Frontend Security

**1. API URL**:
- Store as constant at top of file
- Use HTTPS only
- Verify SSL certificate (browser does this automatically)

**2. User Data**:
- Don't send sensitive data (there isn't any)
- Pattern data is not sensitive (just rhythms)

**3. Error Handling**:
- Don't expose API errors to students
- Show user-friendly messages
- Log errors to console for debugging

---

## Testing Strategy

### Backend Testing

**Unit Tests** (pytest):
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/test_export.py -v

# Run with coverage
pytest tests/test_export.py --cov=api --cov-report=html
```

**Manual Testing**:
```bash
# Start local server
uvicorn api.export:app --reload

# Test with curl
curl -X POST http://localhost:8000/api/export \
  -H "Content-Type: application/json" \
  -d @tests/sample_patterns.json \
  --output test.mid

# Verify MIDI file
# Import test.mid into MuseScore/DAW
```

**Integration Testing** (after deployment):
```javascript
// Test from browser console on GitHub Pages
const testPattern = {
    format: 'midi',
    tempo: 120,
    pattern_length: 16,
    tracks: [{
        name: 'Test',
        pattern: ['X', '.', '.', '.', 'X', '.', '.', '.', 'X', '.', '.', '.', 'X', '.', '.', '.']
    }]
};

fetch('https://pulse-lab-api.vercel.app/api/export', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(testPattern)
})
.then(r => r.blob())
.then(b => {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test.mid';
    a.click();
});
```

### Frontend Testing

**Test Cases**:

1. **Simple pattern export**
   - Create: X . . . X . . . X . . . X . . .
   - Export MIDI
   - Verify: File downloads

2. **Multi-track pattern**
   - Create 3 tracks with different patterns
   - Export MIDI
   - Import to DAW
   - Verify: All tracks present, correct sounds

3. **Odd time signature**
   - Create 12-pulse pattern
   - Export MusicXML
   - Import to MuseScore
   - Verify: Shows 3/4 time signature

4. **Error handling**
   - Disconnect internet
   - Try to export
   - Verify: User sees error message (not crash)

5. **CORS validation**
   - Open from different domain
   - Try to export
   - Verify: CORS error (expected)

6. **Edge cases**
   - Empty pattern (all rests)
   - Single track
   - Maximum tracks (16)
   - Very fast tempo (240 BPM)
   - Very slow tempo (40 BPM)

### Student Testing (Beta)

**Recruit 3-5 students for beta testing**:

1. Ask them to create normal patterns
2. Export to MIDI and MusicXML
3. Import into their preferred software
4. Collect feedback:
   - Did export work?
   - Did import work?
   - Any confusion?
   - Any errors?

**Success Criteria**:
- 95%+ export success rate
- Files import correctly into MuseScore, Ableton, Logic
- No student confusion about process
- No CORS errors

---

## Deployment Instructions

### Step 1: Create Backend Repository

```bash
# On GitHub
# 1. Go to github.com/avnerdorman
# 2. Click "New Repository"
# 3. Name: pulse-lab-api
# 4. Description: Backend API for Pulse Lab MIDI/MusicXML export
# 5. Public
# 6. Initialize with README
# 7. Create

# Locally
git clone https://github.com/avnerdorman/pulse-lab-api.git
cd pulse-lab-api

# Create structure
mkdir api tests
touch requirements.txt vercel.json runtime.txt
touch api/export.py api/__init__.py
touch tests/test_export.py tests/__init__.py
```

### Step 2: Implement Backend Code

See section "Backend Implementation" above for file contents.

### Step 3: Test Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn api.export:app --reload

# In another terminal, test
curl -X POST http://localhost:8000/api/export \
  -H "Content-Type: application/json" \
  -d '{"format":"midi","tempo":120,"pattern_length":16,"tracks":[{"name":"Test","pattern":["X",".",".","X",".",".","X",".",".","X",".",".","X",".",".","."]}]}' \
  --output test.mid

# Verify test.mid plays correctly
```

### Step 4: Deploy to Vercel

**Option A: Vercel CLI** (recommended for first time)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: pulse-lab-api
# - Directory: ./ (current)
# - Override settings? No

# Production deployment
vercel --prod

# Note the URL: https://pulse-lab-api.vercel.app
```

**Option B: Vercel GitHub Integration**

1. Go to vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import `pulse-lab-api` repository
5. Configure:
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
6. Click "Deploy"
7. Wait ~2 minutes
8. Note the URL: https://pulse-lab-api.vercel.app

**Verify Deployment**:
```bash
curl https://pulse-lab-api.vercel.app/api/export \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"format":"midi","tempo":120,"pattern_length":16,"tracks":[{"name":"Test","pattern":["X",".",".","X",".",".","X",".",".","X",".",".","X",".",".","."]}]}' \
  --output test.mid
```

### Step 5: Update Frontend

**In `pulse-lab` repository**:

```bash
cd /path/to/pulse-lab

# Update script.js with new export functions (see Frontend Changes section)
# Update API_URL to your Vercel deployment URL

git add script.js
git commit -m "Connect export to backend API"
git push origin main
```

**GitHub Pages will auto-update** (usually within 1-2 minutes)

### Step 6: Test End-to-End

1. Visit https://avnerdorman.github.io/pulse-lab
2. Create a pattern
3. Click "Download MIDI"
4. Verify file downloads
5. Import to MuseScore
6. Verify it plays correctly

### Step 7: Monitor

**Check Vercel Dashboard**:
- Go to vercel.com/dashboard
- Select pulse-lab-api project
- View logs for any errors
- Check usage (should be minimal)

**Check Browser Console**:
- Open DevTools on Pulse Lab
- Check for CORS errors
- Check for network errors

---

## Rollback Plan

If backend has issues, you can quickly rollback:

### Immediate Rollback (5 minutes)

**Option 1: Revert Frontend**
```bash
cd pulse-lab
git revert HEAD  # Reverts latest commit
git push origin main
```

**Option 2: Comment Out Backend Calls**
```javascript
// In script.js
async function exportMIDI() {
    // TEMPORARILY DISABLED - using old version
    showMessage('MIDI export temporarily unavailable');
    return;

    // ... rest of code
}
```

### Backend Rollback

**Revert to previous deployment**:
1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous working deployment
4. Click "Promote to Production"

### Full Rollback (Last Resort)

Remove MIDI export entirely:
```bash
cd pulse-lab
git revert <commit-with-backend-integration>
git push origin main
```

Students can still use all other features.

---

## Monitoring & Maintenance

### What to Monitor

**Vercel Dashboard**:
- Request count (should be low)
- Error rate (should be <1%)
- Response time (should be <1 second)

**GitHub Pages**:
- Site accessibility
- JavaScript errors (browser console)

### Alerts

**Set up email alerts** in Vercel:
- Error rate >5%
- Function crashes
- High latency (>3 seconds)

### Monthly Maintenance

**First of each month**:
1. Check Vercel usage (ensure under free tier)
2. Review error logs
3. Update Python dependencies if security patches available
4. Test export functionality manually

### Dependency Updates

**Quarterly** (every 3 months):
```bash
cd pulse-lab-api

# Update dependencies
pip install --upgrade -r requirements.txt

# Test locally
pytest tests/test_export.py

# If tests pass, commit and deploy
git add requirements.txt
git commit -m "Update dependencies"
git push origin main
```

---

## Success Criteria

### Phase 1: Backend Deployed
- ✅ API responds at https://pulse-lab-api.vercel.app/api/export
- ✅ Returns valid MIDI file for test pattern
- ✅ Returns valid MusicXML file for test pattern
- ✅ Unit tests pass (pytest)

### Phase 2: Frontend Integrated
- ✅ "Download MIDI" button calls backend
- ✅ MIDI file downloads to browser
- ✅ No CORS errors in console
- ✅ Error messages display if backend fails

### Phase 3: Student Validation
- ✅ 3 students successfully export patterns
- ✅ Files import correctly into their DAWs/notation software
- ✅ No confusion or errors reported
- ✅ Existing GitHub Pages URLs still work

### Phase 4: Production Ready
- ✅ Monitoring set up in Vercel
- ✅ Documentation updated (README)
- ✅ Rollback plan tested
- ✅ Performance acceptable (<1 second response time)

---

## Troubleshooting Guide

### Issue: CORS Error in Browser

**Symptom**: Console shows "CORS policy blocked"

**Cause**: Backend not allowing requests from frontend domain

**Fix**:
1. Check `api/export.py` CORS configuration
2. Ensure GitHub Pages URL is in `allow_origins`
3. Redeploy backend

### Issue: 500 Internal Server Error

**Symptom**: Export fails with "Server error"

**Cause**: music21 export failed

**Debug**:
1. Check Vercel logs (vercel.com dashboard)
2. Look for Python traceback
3. Common causes:
   - Invalid pattern data
   - music21 version incompatibility

**Fix**: See error message, adjust validation or music21 usage

### Issue: Slow Export (>5 seconds)

**Symptom**: Long wait for download

**Cause**: Vercel cold start or music21 initialization

**Solutions**:
- First request is slow (cold start) - normal
- Subsequent requests should be fast
- If always slow: Optimize music21 usage

### Issue: File Won't Open in MuseScore

**Symptom**: MIDI/MusicXML file doesn't open

**Cause**: Corrupted file or invalid format

**Debug**:
1. Download file
2. Check file size (should be >100 bytes)
3. Try opening in different software
4. Validate MusicXML: musicxml.com/tools/validator

**Fix**: Review backend export code, ensure proper music21 usage

### Issue: Backend Exceeds Free Tier

**Symptom**: Vercel warning email about usage

**Cause**: More traffic than expected

**Solution**:
1. Check usage dashboard
2. If legitimate: Consider paid tier ($20/month)
3. If abuse: Add rate limiting

---

## Cost Analysis

### Current Costs: $0

**GitHub Pages**:
- Free for public repositories
- No bandwidth limits for reasonable use

**Vercel Free Tier**:
- 100 GB bandwidth/month
- 100,000 serverless function invocations/month
- 100 hours compute time/month

**Expected Usage**:
- Students: ~100 per semester
- Exports per student: ~10
- Total exports: ~1,000/semester = ~167/month
- Bandwidth per export: ~10 KB
- Total bandwidth: ~1.67 MB/month

**Conclusion**: Well under free tier limits. Cost: $0

### If You Exceed Free Tier

**Vercel Pro**: $20/month
- 1 TB bandwidth
- Unlimited invocations
- 1,000 hours compute time

**Likelihood**: Very low unless thousands of students

---

## Future Enhancements

Once backend is stable, these features are easy to add:

### 1. Velocity Control (1-2 hours)
Add `velocity` parameter to pattern:
```python
# Input
{"pattern": ["X", ".", "X"], "velocity": [100, 0, 80]}

# Implementation
note.volume.velocity = velocity_value
```

**Use case**: Students can add accents

### 2. Swing/Humanization (2-3 hours)
Add `swing` parameter:
```python
# Input
{"swing": 0.6}  # 60% swing

# Implementation
Adjust note timings to create swing feel
```

**Use case**: More musical output

### 3. Multiple Measures (1-2 hours)
Add `measures` parameter:
```python
# Input
{"measures": 4}  # Repeat pattern 4 times

# Implementation
Duplicate stream content
```

**Use case**: Export longer compositions

### 4. ABC Notation Export (1 hour)
Add format option:
```python
# Input
{"format": "abc"}

# Implementation
stream.write('abc')
```

**Use case**: Students who prefer ABC notation

### 5. Audio Export (3-4 hours)
Generate MP3 from MIDI:
```python
# Input
{"format": "audio"}

# Implementation
stream.write('midi.wav') + convert to mp3
```

**Use case**: Share audio directly (no DAW needed)

### 6. Dynamics Markings (2-3 hours)
Add dynamic levels:
```python
# Input
{"dynamics": ["f", "p", "mf"]}  # Per measure

# Implementation
Add music21 dynamic objects
```

**Use case**: More expressive scores

---

## Documentation for Next Chat

### What to Share with Claude

**In the new chat, provide**:
1. This document (BACKEND_IMPLEMENTATION_PLAN.md)
2. Confirmation of Vercel account setup (or preferred platform)
3. Your GitHub username (avnerdorman)
4. Your GitHub Pages URL (avnerdorman.github.io/pulse-lab)

**Claude will need to**:
1. Create complete backend files
2. Write unit tests
3. Update frontend export functions
4. Provide deployment commands
5. Create testing checklist

### Recommended Approach

**Phase 1** (New Chat Session 1):
- Implement backend only
- Deploy to Vercel
- Test manually with curl

**Phase 2** (New Chat Session 2, or same chat):
- Update frontend
- Deploy to GitHub Pages
- Test end-to-end
- Student beta testing

---

## Questions Before Implementation

Before starting a new chat, clarify:

1. **Vercel Account**: Do you have a Vercel account? (Takes 2 minutes to create with GitHub)

2. **Python Experience**: Comfortable running `pip install` and `pytest`? (Just for testing)

3. **Preferred Deployment**: Vercel, Railway, or Render? (Recommendation: Vercel)

4. **Timeline**: When do you need this working? (Helps prioritize features)

5. **Beta Testers**: Can you recruit 2-3 students to test? (Helps validate before full rollout)

---

## Conclusion

This implementation provides:

✅ **Reliable export** using proven music21 library
✅ **Zero student impact** - GitHub Pages URLs unchanged
✅ **Both MIDI and MusicXML** from same backend
✅ **Future-proof** - easy to add features
✅ **Free hosting** - Vercel free tier sufficient
✅ **Professional quality** - imports perfectly into all software

**Estimated Total Time**: 6-10 hours (including testing and deployment)

**Risk**: Low - can rollback to current state if issues arise

**Benefit**: High - students get reliable export that "just works"

---

## Ready for Implementation

This plan is complete and ready to hand off to a fresh Claude chat session. Everything is specified:

- ✅ Exact file structure
- ✅ All configuration files
- ✅ Security considerations
- ✅ Testing strategy
- ✅ Deployment steps
- ✅ Rollback plan
- ✅ Troubleshooting guide

**Next Step**: Start a new chat with this document and request implementation.

Good luck! 🎵
