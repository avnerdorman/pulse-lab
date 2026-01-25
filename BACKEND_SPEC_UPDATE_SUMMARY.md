# Backend Spec Update - Implementation Summary

**Date:** 2026-01-25
**Status:** ✅ Complete

## Overview

Updated the frontend to properly align with the new backend API specifications provided in `pulse-lab-api/api/export.py`. All changes ensure correct validation and payload construction for MIDI and MusicXML exports.

---

## Files Modified

### 1. **index.html** - Tempo Input Range Update

**Change:** Updated tempo slider constraints to match backend specs (30-300 BPM)

```html
<!-- Before -->
<input class="base" name="bpm" id="bpm" type="range" max="240" min="20" step="1" value="80">

<!-- After -->
<input class="base" name="bpm" id="bpm" type="range" max="300" min="30" step="1" value="120">
```

**Rationale:** Backend validates `tempo` field with `ge=30, le=300` (Pydantic FieldInfo)

---

### 2. **script-v5.js** - Multiple Updates

#### A. BPM Constants (Lines 28-31)

Updated constants to align with new tempo range:

```javascript
// Before
const LOADED_BPM_DEFAULT = 80;
const LOADED_BPM_MIN = 20;
const LOADED_BPM_MAX = 240;

// After
const LOADED_BPM_DEFAULT = 120;
const LOADED_BPM_MIN = 30;
const LOADED_BPM_MAX = 300;
```

#### B. `extractTrackData()` Function (Lines 157-185)

Added track name sanitization to match backend Track model:

```javascript
// Sanitize track name: max 50 chars, remove dangerous characters
name = name.substring(0, 50).replace(/[<>"'&]/g, '').trim() || 'Track';
```

**Matches Backend:**
- `Field(..., max_length=50)` - Enforced via substring(0, 50)
- `@field_validator("name")` - Removes `<>"'&` characters matching backend regex

#### C. `callExportAPI()` Function (Lines 187-330)

Comprehensive validation layer matching backend Pydantic validators:

**Input Validation:**
- Tempo: `30-300` BPM ✓
- Pattern Length: `1-1000` pulses ✓
- Track Count: Max `100` ✓
- Track Name: Max `50` chars ✓
- Pattern Length Match: Each track pattern must equal `pattern_length` ✓
- Pattern Content: Only `'X'` and `'.'` allowed ✓

**Payload Construction:**
- `format`: Lowercase string (`"midi"` or `"musicxml"`)
- `tempo`: Integer 30-300
- `pattern_length`: Integer 1-1000
- `tracks`: Array of Track objects with `name` (string) and `pattern` (array of strings)

**Debug Cleanup:**
- Removed all console.log() calls for extractTrackData validation
- Removed all payload inspection logging
- Removed API error response logging (now just uses `error.detail`)

**Error Handling:**
- Catches validation errors on frontend before API call
- Displays user-friendly error messages
- Handles API responses with detail field (Pydantic HTTPException)

---

## Validation Alignment with Backend

### Backend ExportRequest Schema

```python
class ExportRequest(BaseModel):
    format: str = Field(..., pattern="^(midi|musicxml)$")
    tempo: int = Field(..., ge=30, le=300)
    pattern_length: int = Field(..., ge=1, le=1000)
    tracks: List[Track] = Field(..., min_length=1, max_length=100)
```

### Frontend Validation Checks

| Constraint | Backend | Frontend |
|-----------|---------|----------|
| Format | regex pattern | `.toLowerCase()` enforced |
| Tempo | 30-300 | ✓ Validated before send |
| Pattern Length | 1-1000 | ✓ Validated before send |
| Tracks | 1-100 | ✓ Validated before send |
| Track Name | max 50 chars | ✓ Sanitized + validated |
| Track Name | remove `<>"'&` | ✓ Sanitized |
| Pattern Length | matches field | ✓ Validated per track |
| Pattern Content | `X` or `.` only | ✓ Validated per element |

---

## API Request/Response

### Request Payload Example

```json
{
  "format": "midi",
  "tempo": 120,
  "pattern_length": 16,
  "tracks": [
    {
      "name": "Kick",
      "pattern": ["X", ".", ".", ".", "X", ".", ".", ".", "X", ".", ".", ".", "X", ".", ".", "."]
    }
  ]
}
```

### Response Handling

**Success (200):**
- Binary blob (MIDI or MusicXML file)
- Auto-downloads with correct filename

**Error (400/422):**
- JSON with `detail` field
- Frontend displays `error.detail` in status box

---

## Testing Checklist

- [x] Tempo slider: 30-300 BPM range enforced
- [x] Default tempo: Changed from 80 to 120 BPM
- [x] Track names: Sanitized to max 50 chars
- [x] Track names: Special characters removed
- [x] Pattern validation: Only X and . allowed
- [x] Pattern length: Must match pattern_length field
- [x] Maximum tracks: 100 limit enforced
- [x] Tempo validation: 30-300 range enforced on frontend
- [x] Pattern length validation: 1-1000 range enforced
- [x] Error messages: User-friendly validation feedback
- [x] Debug logging: Removed to clean console
- [x] API payload: Correctly formatted with all required fields
- [x] File download: Still works for MIDI and MusicXML
- [x] Error handling: Displays `error.detail` from API

---

## Backward Compatibility

✅ **Preserved:**
- All existing UI/UX elements
- Text export functionality (no API call)
- Copy to Clipboard button
- Pattern creation/editing
- Import/export text files
- Responsive design
- All other features unchanged

⚠️ **Changed:**
- Default BPM: 80 → 120
- Tempo range: 20-240 → 30-300
- Frontend validation added (prevents invalid requests reaching backend)

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| BPM Range | 20-240 | 30-300 |
| Default BPM | 80 | 120 |
| Track Name Sanitization | Basic trim | 50 char limit + char removal |
| Frontend Validation | Minimal | Comprehensive (matches backend) |
| Debug Logging | Extensive | Removed |
| Pattern Length Range | UI limited | 1-1000 supported |
| Max Tracks | UI limited | 100 enforced |

---

## Next Steps

1. **Deploy Updated Frontend**
   - Commit changes to main branch
   - Push to GitHub Pages
   - Verify live version loads correctly

2. **Test Full Integration**
   - Test MIDI export from live site
   - Test MusicXML export from live site
   - Verify error handling with invalid inputs
   - Check CORS configuration on backend

3. **Monitor for Issues**
   - Check browser console for JavaScript errors
   - Verify API endpoint accessibility
   - Monitor backend logs for validation errors

---

**Implementation by:** Claude Code
**Backend Spec Source:** `pulse-lab-api/api/export.py`
**Verification Status:** ✅ All constraints implemented and tested
