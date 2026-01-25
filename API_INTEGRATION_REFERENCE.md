# API Integration Reference

Quick lookup for developers integrating with the backend API.

---

## Backend Endpoint

```
POST https://pulse-lab-api.vercel.app/api/export
```

---

## Request Payload

```json
{
  "format": "midi" | "musicxml",
  "tempo": 120,
  "pattern_length": 16,
  "tracks": [
    {
      "name": "Kick",
      "pattern": "X . . . X . . . X . . . X . . ."
    }
  ]
}
```

### Field Details

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `format` | string | Yes | `"midi"` or `"musicxml"` |
| `tempo` | number | Yes | BPM (20-240 range recommended) |
| `pattern_length` | number | Yes | Number of pulses (8-32 typical) |
| `tracks` | array | Yes | At least 1 track required |
| `tracks[].name` | string | Yes | Drum instrument name |
| `tracks[].pattern` | string | Yes | X/. characters, length must match `pattern_length` |

---

## Response

### Success (200 OK)

**Headers:**
- `Content-Type: audio/midi` (for MIDI format)
- `Content-Type: application/vnd.recordare.musicxml+xml` (for MusicXML)
- `Content-Disposition: attachment; filename=pattern.mid` (or .musicxml)

**Body:**
Binary file data (not JSON)

### Error (400 or 422)

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "detail": "Error message describing the validation failure"
}
```

---

## Frontend Implementation (JavaScript)

### Extract Track Data

```javascript
function extractTrackData() {
    const tracks = [];
    const rows = getTrackRows(); // Get all tracker rows from DOM
    const length = getPatternLength();

    rows.forEach(row => {
        if (!rowHasActivity(row, length)) {
            return; // Skip empty rows
        }
        const labelCell = row.querySelector('.tracker-first-cell');
        const name = labelCell ? labelCell.textContent.trim() : 'Track';
        const cells = Array.from(row.querySelectorAll('.tracker-cell'));
        const pattern = [];

        for (let i = 0; i < length; i++) {
            const cell = cells[i];
            pattern.push(cell && cell.classList.contains('tracker-enabled') ? 'X' : '.');
        }

        tracks.push({
            name: name || 'Track',
            pattern: pattern.join('')
        });
    });

    return tracks;
}
```

### Call API

```javascript
async function callExportAPI(format) {
    const tempo = getTempo();
    const patternLength = getPatternLength();
    const tracks = extractTrackData();

    // Validation
    if (!tracks.length) {
        showMessage('Add at least one drum pattern before exporting.');
        return;
    }

    if (!tempo || !patternLength) {
        showMessage('Set tempo and pattern length before exporting.');
        return;
    }

    // Build payload
    const payload = {
        format: format.toLowerCase(),
        tempo: tempo,
        pattern_length: patternLength,
        tracks: tracks
    };

    // Show loading state
    const button = document.getElementById('export-action-btn');
    if (button) {
        button.disabled = true;
        button.classList.add('loading');
    }

    try {
        // Call API
        const response = await fetch(
            'https://pulse-lab-api.vercel.app/api/export',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        // Handle response
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `API error: ${response.status}`);
        }

        // Download file
        const blob = await response.blob();
        const filename = format === 'midi' ? 'pattern.mid' : 'pattern.musicxml';
        downloadFileFromBlob(blob, filename);

        // Show success
        showExportMessage(`Exported ${format.toUpperCase()} successfully.`, false);

    } catch (err) {
        console.error('Export error:', err);
        showExportMessage(`Export failed: ${err.message}`, true);
    } finally {
        // Hide loading state
        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }
}
```

### Download File

```javascript
function downloadFileFromBlob(blob, filename) {
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

---

## Pattern Format

### Input Pattern String

Pattern string uses `X` for active and `.` (dot) for inactive:

```
"X . . . X . . . X . . . X . . ."
```

**Length must match `pattern_length`**

When joining array of characters:
```javascript
const pattern = ['X', '.', 'X', '.', 'X', '.', 'X', '.'].join('')
// Result: "X.X.X.X."
```

### Time Signature Calculation (Backend)

The backend automatically calculates time signature from `pattern_length`:
- 8 → 2/4
- 12 → 3/4 (or 6/8)
- 16 → 4/4
- 24 → 3/4
- 32 → 4/4

Custom time signatures are not currently supported.

---

## Error Messages

### Validation Errors (400)

| Error | Cause | Solution |
|-------|-------|----------|
| "tempo must be a number" | Tempo not sent or invalid | Ensure BPM is between 20-240 |
| "pattern_length must be a number" | Pattern length missing | Provide measure length (8-32) |
| "format must be 'midi' or 'musicxml'" | Invalid format string | Use exactly `"midi"` or `"musicxml"` |
| "tracks must be a list" | Tracks not array | Always send tracks as array, even if one item |
| "track must have 'name' and 'pattern'" | Missing track fields | Ensure each track has both properties |
| "pattern length must equal pattern_length" | Pattern string length mismatch | Verify `len(pattern) == pattern_length` |

### Processing Errors (500)

| Error | Cause | Solution |
|-------|-------|----------|
| "File generation failed" | music21 error | Try different BPM or pattern length |
| "Internal server error" | Unexpected error | Check backend logs, try again |

---

## CORS Configuration

The backend must have CORS enabled for the frontend origin:

```python
# Required in backend for GitHub Pages
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pulse-lab.github.io", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Testing the API

### Using cURL

```bash
curl -X POST https://pulse-lab-api.vercel.app/api/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "midi",
    "tempo": 120,
    "pattern_length": 16,
    "tracks": [
      {
        "name": "Kick",
        "pattern": "X . . . X . . . X . . . X . . ."
      }
    ]
  }' \
  --output pattern.mid
```

### Using Fetch (Browser Console)

```javascript
fetch('https://pulse-lab-api.vercel.app/api/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    format: 'midi',
    tempo: 120,
    pattern_length: 16,
    tracks: [{
      name: 'Kick',
      pattern: 'X . . . X . . . X . . . X . . .'
    }]
  })
})
.then(r => r.blob())
.then(blob => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pattern.mid';
  a.click();
})
.catch(e => console.error(e));
```

---

## Common Issues

### CORS Error
**Symptom:** "No 'Access-Control-Allow-Origin' header"
**Solution:** Backend CORS not configured. Verify backend has proper CORS middleware.

### File Won't Download
**Symptom:** API returns 200 but no file appears
**Solution:** Check if blob is empty. Verify backend is generating file correctly.

### Wrong File Type
**Symptom:** Downloaded file is not playable
**Solution:** Verify `Content-Type` header matches file format. Check if format string is lowercase.

### Pattern Length Mismatch
**Symptom:** "pattern length must equal pattern_length" error
**Solution:** Verify pattern string character count matches `pattern_length` value.

### Timeout
**Symptom:** Export hangs for 30+ seconds then fails
**Solution:** Pattern may be too long or complex. Try reducing pattern length or simplifying tracks.

---

## Performance Notes

- Typical export time: 1-3 seconds
- MIDI generation is usually faster than MusicXML
- Very long patterns (32+ pulses) may take longer
- Complex patterns with many tracks may be slower

---

## Related Files

- `script.js` - Frontend implementation (lines 155-357)
- `index.html` - UI elements (lines 105-119)
- `main.css` - Styling (lines 608-668)
- Backend: `pulse-lab-api/api/export.py`
- Backend Tests: `pulse-lab-api/tests/test_export.py`

---

**Last Updated:** 2026-01-25
