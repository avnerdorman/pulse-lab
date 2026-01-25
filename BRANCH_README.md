# Branch: claude/add-musicxml-export-QQN8m

## Purpose

This branch contains comprehensive research and planning for adding MIDI/MusicXML export functionality to Pulse Lab.

**Decision**: Use Python backend (music21) instead of client-side JavaScript for reliable export.

**Implementation Repo**: https://github.com/avnerdorman/pulse-lab-api

---

## What's In This Branch

### Assessment Documents (Keep These!)

1. **MUSICXML_EXPORT_ASSESSMENT.md**
   - Initial assessment of MusicXML export options
   - User requirements for pulse duration, meter, rest handling
   - Custom generator vs library comparison

2. **MUSICXML_TIME_SIGNATURE_STRATEGY.md**
   - Detailed strategy for handling 6/8 vs 3/4 ambiguity
   - Prime/odd number patterns (11, 13, 17, etc.)
   - Edge case handling

3. **MUSICXML_LIBRARY_COMPARISON.md**
   - Comparison of JavaScript MusicXML libraries
   - musicxml-interfaces, opensheetmusicdisplay, VexFlow
   - Reliability vs complexity analysis

4. **ABC_LILYPOND_ANALYSIS.md**
   - Analysis of ABC notation as intermediate format
   - LilyPond evaluation
   - Why intermediate formats don't work without server

5. **EXPORT_OPTIONS_RELIABILITY_COMPARISON.md**
   - Comprehensive comparison: MIDI vs ABC vs MusicXML
   - Client-side vs server-side approaches
   - Final recommendation for Python backend

6. **BACKEND_IMPLEMENTATION_PLAN.md** ⭐ **MAIN DOCUMENT**
   - Complete implementation specification
   - Backend architecture (FastAPI + music21)
   - Frontend integration
   - Security, testing, deployment
   - Use this for implementation!

---

## What Was Removed

### Buggy Client-Side MIDI Implementation (Removed)

The following were removed because they didn't work reliably:

- Client-side MIDI export code (script.js)
- MIDI export button (index.html)
- midi-writer-js dependency (package.json)
- MIDI_EXPORT_TESTING_GUIDE.md

**Why removed**:
- Copilot review identified bugs in rest handling
- MIDI import to notation software unreliable
- Debugging browser MIDI not worth the effort
- Python backend approach is more reliable

---

## How to Use This Branch

### For Implementation (New Chat Session)

**Step 1**: Start fresh chat with Claude

**Step 2**: Provide this context:
```
I need to implement MIDI/MusicXML export for Pulse Lab.

Backend repo: https://github.com/avnerdorman/pulse-lab-api
Frontend repo: https://github.com/avnerdorman/pulse-lab

Please read BACKEND_IMPLEMENTATION_PLAN.md from the pulse-lab repository
branch claude/add-musicxml-export-QQN8m and implement the backend step by step.
```

**Step 3**: Claude will implement:
1. Complete Python backend (FastAPI + music21)
2. Frontend integration (fetch API calls)
3. Testing strategy
4. Deployment to Vercel

---

## Decision Rationale

### Why Python Backend?

**Assessed Options**:
1. ❌ Custom JavaScript MusicXML generator - Too complex, unreliable
2. ❌ musicxml-interfaces library - AGPL license, verbose API
3. ❌ ABC notation conversion - No client-side ABC→MusicXML converter
4. ❌ Client-side MIDI (midi-writer-js) - Buggy, notation import issues
5. ✅ **Python backend (music21)** - Proven, reliable, easy to maintain

**Key Benefits**:
- music21 is battle-tested (15+ years, academic research)
- Perfect MusicXML export (no edge cases)
- Perfect MIDI export (no tick math bugs)
- Free hosting (Vercel free tier)
- GitHub Pages URLs unchanged (student links preserved)
- Easy to add features (velocity, swing, dynamics, etc.)

**Trade-offs**:
- Requires backend deployment (but still free)
- Adds network dependency (but minimal latency)
- Loses "pure static site" status (but gains reliability)

---

## Architecture Summary

```
┌──────────────────────────────────────────────┐
│  Frontend (pulse-lab)                         │
│  GitHub Pages URL: unchanged                  │
│  • User interface: unchanged                  │
│  • Pattern creation: unchanged                │
│  • Export buttons: call backend API           │
└────────────────┬─────────────────────────────┘
                 │
                 │ POST /api/export
                 │
┌────────────────▼─────────────────────────────┐
│  Backend (pulse-lab-api)                      │
│  Vercel: pulse-lab-api.vercel.app             │
│  • FastAPI endpoint                           │
│  • music21 library                            │
│  • Returns MIDI or MusicXML file              │
└──────────────────────────────────────────────┘
```

**Student Experience**: Identical (same URL, same interface, just more reliable)

---

## Research Highlights

### Key Findings

**Client-Side MIDI Export Issues**:
- midi-writer-js `wait` parameter handling complex
- Zero-velocity notes don't create proper rests
- Tick calculation prone to errors (PPQ, divisions, etc.)
- Percussion MIDI import buggy in MuseScore/Sibelius
- Browser differences create inconsistencies

**ABC Notation Limitations**:
- abcjs great for rendering, NOT for export
- No JavaScript ABC→MusicXML converter exists
- Michael Eskin's tool uses server for MusicXML export
- Would require external dependency or custom server

**MusicXML Direct Generation Challenges**:
- 600-page spec with many edge cases
- Percussion notation simpler but still complex
- Time signature ambiguity (6/8 vs 3/4)
- Prime/odd patterns need special handling
- Difficult to test without notation software

**music21 Advantages**:
- Handles ALL complexity automatically
- Perfect notation software compatibility
- Used by thousands of music scholars
- Built-in support for MIDI, MusicXML, ABC, LilyPond, audio
- Easy to add features (velocity, dynamics, swing)

---

## Timeline

- **Research Phase**: Completed (this branch)
- **Implementation Phase**: Ready to start (use BACKEND_IMPLEMENTATION_PLAN.md)
- **Estimated Time**: 6-10 hours (backend + frontend + testing)

---

## Next Steps

1. ✅ Research completed (this branch)
2. ✅ Backend repo created (pulse-lab-api)
3. ⏭️ Implement backend (new chat session)
4. ⏭️ Deploy to Vercel
5. ⏭️ Integrate frontend
6. ⏭️ Test with students
7. ⏭️ Merge to main

---

## Questions?

All questions answered in **BACKEND_IMPLEMENTATION_PLAN.md**:
- Security? ✅ Covered (input validation, CORS, rate limiting)
- Testing? ✅ Covered (pytest unit tests, manual tests, student beta)
- Deployment? ✅ Covered (step-by-step Vercel guide)
- Costs? ✅ Covered (free Vercel tier sufficient)
- Rollback? ✅ Covered (revert plan included)

---

## Summary

This branch represents ~20 hours of research into export options. The conclusion is clear: **Python backend with music21 is the right choice**.

All implementation details are in **BACKEND_IMPLEMENTATION_PLAN.md** - ready to hand off to a fresh Claude chat for implementation.

Frontend stays on GitHub Pages. Student URLs don't change. Export just works better.

**Let's build it!** 🎵
