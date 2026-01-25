# Backend Specification Implementation Mapping

**Date:** 2026-01-25
**Reference:** `pulse-lab-api/api/export.py`
**Status:** ✅ All specifications implemented

---

## ExportRequest Pydantic Model Mapping

### FastAPI Backend Definition

```python
class ExportRequest(BaseModel):
    format: str = Field(..., pattern="^(midi|musicxml)$")
    tempo: int = Field(..., ge=30, le=300)
    pattern_length: int = Field(..., ge=1, le=1000)
    tracks: List[Track] = Field(..., min_length=1, max_length=100)

    @field_validator("tracks")
    @classmethod
    def validate_track_patterns(cls, v, info):
        """Ensure all patterns match pattern_length"""
        pattern_length = info.data.get("pattern_length")
        if pattern_length:
            for track in v:
                if len(track.pattern) != pattern_length:
                    raise ValueError(...)
        return v
```

### JavaScript Frontend Implementation

| Backend Constraint | Implementation | Location |
|-------------------|-----------------|----------|
| `format` string enum | `.toLowerCase()` converts to lowercase | [script-v5.js:248](script-v5.js#L248) |
| `format` pattern validation | Enforced by dropdown options (midi/musicxml) | [index.html:111-112](index.html#L111-L112) |
| `tempo` integer | `parseInt(getTempo(), 10)` | [script-v5.js:189](script-v5.js#L189) |
| `tempo` minimum (30) | Validate `tempo < 30` and show error | [script-v5.js:205-207](script-v5.js#L205-L207) |
| `tempo` maximum (300) | Validate `tempo > 300` and show error | [script-v5.js:205-207](script-v5.js#L205-L207) |
| `tempo` slider range | HTML input `min="30" max="300"` | [index.html:84](index.html#L84) |
| `pattern_length` integer | `parseInt(getPatternLength(), 10)` | [script-v5.js:190](script-v5.js#L190) |
| `pattern_length` minimum (1) | Validate `patternLength < 1` and show error | [script-v5.js:210-213](script-v5.js#L210-L213) |
| `pattern_length` maximum (1000) | Validate `patternLength > 1000` and show error | [script-v5.js:210-213](script-v5.js#L210-L213) |
| `tracks` minimum length (1) | Validate `!tracks.length` and show error | [script-v5.js:194-196](script-v5.js#L194-L196) |
| `tracks` maximum length (100) | Validate `tracks.length > 100` and show error | [script-v5.js:216-219](script-v5.js#L216-L219) |

---

## Track Pydantic Model Mapping

### FastAPI Backend Definition

```python
class Track(BaseModel):
    name: str = Field(..., max_length=50)
    pattern: List[str] = Field(..., min_length=1, max_length=1000)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v):
        """Remove potentially dangerous characters from track name"""
        return re.sub(r'[<>"\'&]', '', v).strip()

    @field_validator("pattern")
    @classmethod
    def validate_pattern(cls, v):
        """Ensure pattern only contains 'X' or '.'"""
        if not all(p in ["X", "."] for p in v):
            raise ValueError('Pattern must only contain "X" or "."')
        return v
```

### JavaScript Frontend Implementation

| Backend Constraint | Implementation | Location |
|-------------------|-----------------|----------|
| `name` max length (50) | `.substring(0, 50)` truncates to 50 chars | [script-v5.js:170](script-v5.js#L170) |
| `name` sanitization regex | `.replace(/[<>"'&]/g, '')` removes chars | [script-v5.js:170](script-v5.js#L170) |
| `name` additional trim | `.trim()` removes whitespace | [script-v5.js:170](script-v5.js#L170) |
| `name` fallback | `\|\| 'Track'` ensures non-empty | [script-v5.js:170](script-v5.js#L170) |
| `name` length validation | Validate post-sanitization length | [script-v5.js:226-229](script-v5.js#L226-L229) |
| `pattern` type | `Array<string>` with X and . only | [script-v5.js:172-176](script-v5.js#L172-L176) |
| `pattern` minimum length (1) | Ensured by UI (always >0) | N/A |
| `pattern` maximum length (1000) | Limited by `pattern_length` field | [script-v5.js:210-213](script-v5.js#L210-L213) |
| `pattern` content validation | Loop validates each element | [script-v5.js:238-243](script-v5.js#L238-L243) |
| `pattern` length match | Validate `pattern.length === patternLength` | [script-v5.js:232-235](script-v5.js#L232-L235) |

---

## Request Payload Structure Verification

### Backend Expected Format

```python
# From ExportRequest.__doc__
{
    "format": "midi" or "musicxml",
    "tempo": 120,
    "pattern_length": 16,
    "tracks": [
        {
            "name": "Bass Drum",
            "pattern": ["X", ".", ".", ".", "X", ".", ".", "."]
        }
    ]
}
```

### Frontend Payload Construction

```javascript
// Lines 247-252 in script-v5.js
const payload = {
    format: format.toLowerCase(),              // ✓ String, validated
    tempo: tempo,                               // ✓ Integer, validated 30-300
    pattern_length: patternLength,              // ✓ Integer, validated 1-1000
    tracks: tracks                              // ✓ Array of Track objects
};

// Each track object (from extractTrackData):
{
    name: name,                                 // ✓ String, max 50, sanitized
    pattern: pattern                            // ✓ Array<'X' | '.'>, length = patternLength
}
```

---

## Validation Flow Chart

```
User clicks Export
    ↓
extractTrackData()
    ├→ Get all active rows
    ├→ Sanitize names (50 char limit, remove <>"'&)
    └→ Extract pattern as array of 'X' and '.'
    ↓
callExportAPI(format)
    ├→ Get tempo, patternLength, tracks
    ├→ Parse integers with parseInt()
    ├→ VALIDATE: At least 1 track
    ├→ VALIDATE: Tempo and patternLength exist
    ├→ VALIDATE: Tempo in [30, 300]
    ├→ VALIDATE: Pattern length in [1, 1000]
    ├→ VALIDATE: Max 100 tracks
    ├→ FOR EACH TRACK:
    │   ├→ VALIDATE: Name length ≤ 50
    │   ├→ VALIDATE: Pattern length = patternLength
    │   └→ VALIDATE: All pattern elements are 'X' or '.'
    ├→ Show "Exporting..." status
    └→ Build payload and POST to API
    ↓
Response Handler
    ├→ Success (200): Download file
    └→ Error (4xx/5xx): Show error.detail message
```

---

## Frontend Validation Complete Checklist

### Input Validation (Lines 194-245)

- [x] Track count minimum (≥1)
- [x] Track count maximum (≤100)
- [x] Tempo existence check
- [x] Pattern length existence check
- [x] Tempo minimum bound (≥30)
- [x] Tempo maximum bound (≤300)
- [x] Pattern length minimum bound (≥1)
- [x] Pattern length maximum bound (≤1000)
- [x] Per-track name length (≤50)
- [x] Per-track pattern length match
- [x] Per-track pattern content (X/. only)

### Data Transformation (Lines 157-185)

- [x] Name truncation (substring 0-50)
- [x] Name character removal (<>"'&)
- [x] Name trimming whitespace
- [x] Name fallback to "Track"
- [x] Pattern array creation (not string)
- [x] Pattern content as 'X' or '.'

### Payload Construction (Lines 247-252)

- [x] Format lowercase conversion
- [x] Tempo as integer
- [x] Pattern_length as integer
- [x] Tracks as array
- [x] Track structure (name + pattern)

### Error Handling (Lines 273-330)

- [x] API error JSON parsing
- [x] Error.detail extraction
- [x] User-friendly error messages
- [x] Status display (error styling)
- [x] Button state management

### HTML/CSS (index.html)

- [x] Tempo slider min/max updated (30-300)
- [x] Default tempo updated (120)
- [x] Export buttons present and functional

---

## Key Improvements from Previous Implementation

| Aspect | Old | New |
|--------|-----|-----|
| Tempo Range | 20-240 | 30-300 |
| Default BPM | 80 | 120 |
| Input Validation | Basic | Comprehensive |
| Track Name Length | Unlimited | 50 chars max |
| Track Name Sanitization | Not enforced | Frontend enforced |
| Pattern Length Range | Implied | Explicit 1-1000 |
| Max Tracks | Implied | Explicit 100 |
| Debug Logging | Extensive | Removed |
| Error Messages | Generic | Specific validation feedback |
| Frontend Error Prevention | Minimal | Complete pre-flight checks |

---

## Testing Scenarios Covered

### Valid Exports
- Single track with standard pattern length (16)
- Multiple tracks with various pattern lengths
- Boundary values (tempo=30, tempo=300, pattern_length=1)
- Long pattern lengths (up to 1000)
- Many tracks (up to 100)

### Invalid Cases Caught by Frontend
- Missing tracks → Shows "Add at least one drum pattern"
- Missing tempo → Shows "Set tempo and pattern length"
- Missing pattern length → Shows "Set tempo and pattern length"
- Tempo < 30 → Shows "Tempo must be between 30 and 300 BPM"
- Tempo > 300 → Shows "Tempo must be between 30 and 300 BPM"
- Pattern length < 1 → Shows "Pattern length must be between 1 and 1000"
- Pattern length > 1000 → Shows "Pattern length must be between 1 and 1000"
- More than 100 tracks → Shows "Maximum 100 tracks allowed"
- Track name > 50 chars → Shows "Track X name exceeds 50 characters"
- Pattern length mismatch → Shows "Track X pattern length doesn't match"
- Invalid pattern character → Shows "Track X has invalid pattern character"

### API Error Cases
- Network failure → Shows "Export failed: [error message]"
- Validation error from backend → Shows "Export failed: [error.detail from API]"

---

## Conclusion

All backend specifications from `pulse-lab-api/api/export.py` have been properly implemented in the frontend. The frontend now:

1. **Validates all inputs** before sending to backend (prevents 422 errors)
2. **Sanitizes track names** matching backend `@field_validator`
3. **Enforces all field constraints** (min/max values, length limits)
4. **Constructs correct payload** matching ExportRequest schema
5. **Handles errors gracefully** with user-friendly messages
6. **Removed debug logging** for cleaner operation

The implementation is **production-ready** and fully compliant with the backend API specification.
