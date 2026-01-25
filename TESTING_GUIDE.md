# Quick Testing Guide

## Before You Start

1. Open the app in a browser: `https://pulse-lab.github.io` (or localhost if developing)
2. Open DevTools: Press `F12` or `Cmd+Option+I`
3. Go to Console tab to watch for errors

---

## Test 1: Basic UI

**Should take 1 minute**

1. Scroll down to "Export Pattern" section
2. Look for:
   - Textarea with export text
   - Dropdown with 3 options: TXT, MIDI, MusicXML
   - Action button (text should match format)
   - Copy to Clipboard button
   - Empty status message area below
3. Change dropdown selection
   - Button text should update to match format
4. Console should have no red errors

---

## Test 2: Create a Simple Pattern

**Should take 2 minutes**

1. Create a basic drum pattern:
   - Click cells in the tracker to enable them
   - Make sure at least one track has activity (e.g., Kick or Snare)
2. Verify export text updates:
   - Should show "Tempo: 80 BPM"
   - Should show "Pattern length: 16 pulses"
   - Should show your tracks in the textarea
3. If you don't see this, something is wrong with existing functionality

---

## Test 3: TXT Export (Existing Feature)

**Should take 1 minute**

1. Select "TXT" from dropdown
2. Click "Download .txt"
3. File should download as `pattern.txt`
4. Open file in text editor
5. Verify it contains:
   - Tempo: 80 BPM
   - Pattern length: 16 pulses
   - Your tracks with X and . characters

**Result:** ✅ Pass - TXT export working

---

## Test 4: MIDI Export (New Feature)

**Should take 2-3 minutes**

### Setup
1. Make sure pattern has:
   - At least 1 active track
   - Tempo set (80 BPM is fine)
   - Pattern length set (16 is fine)

### Test Steps
1. Select "MIDI" from dropdown
2. Button text changes to "Export MIDI"
3. Click "Export MIDI"
4. Watch status message:
   - Should show "Exporting..." in blue
   - Button should become semi-transparent
5. Wait 1-3 seconds for backend to process
6. Status should change to "Exported MIDI successfully." in green
7. File should download as `pattern.mid`
8. Status message should disappear after ~2 seconds
9. Button should re-enable

### Verify File
- Open `pattern.mid` in:
  - Web player (e.g., tonejs.org)
  - DAW (Logic, Ableton, etc.)
  - Notation software (MuseScore, etc.)
- Should hear drum sounds at correct tempo
- Should match your pattern

**Result:** ✅ Pass - MIDI export working

---

## Test 5: MusicXML Export (New Feature)

**Should take 2-3 minutes**

### Test Steps
1. Keep same pattern from Test 4
2. Select "MusicXML" from dropdown
3. Button text changes to "Export MusicXML"
4. Click "Export MusicXML"
5. Same feedback as MIDI:
   - "Exporting..." message
   - Button disabled
   - "Exported MusicXML successfully." message
6. File downloads as `pattern.musicxml`

### Verify File
- Open in notation software:
  - MuseScore (free)
  - Finale
  - Dorico
  - Online viewers (noteflight.com, etc.)
- Should display as music notation
- Should show correct time signature based on pattern length

**Result:** ✅ Pass - MusicXML export working

---

## Test 6: Error Handling

**Should take 2 minutes**

### No Pattern
1. Click "Clear Grid" button (left panel)
2. Select MIDI format
3. Click "Export MIDI"
4. Should see: "Add at least one drum pattern before exporting."
5. Status box should NOT appear (uses showMessage instead)

### No Tempo
1. Create any pattern again
2. Set Tempo slider to blank (delete BPM value)
3. Select MIDI
4. Click "Export MIDI"
5. Should see: "Set tempo and pattern length before exporting."

### API Down (Simulate)
1. Create pattern with tempo and length set
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Select MIDI and click export
5. Status should show: "Export failed: [error]"
6. Message should be red with error styling
7. Turn throttling back to "No throttling"

**Result:** ✅ Pass - Error handling working

---

## Test 7: Edge Cases

**Should take 3 minutes**

### Very Long Pattern
1. Set pattern length to 32
2. Create pattern with all tracks
3. Export to MIDI
4. Should work without crashing
5. File should play correctly

### Very Fast Tempo
1. Set BPM to 240
2. Export MIDI
3. File should play at fast tempo
4. Should sound correct (not broken/distorted)

### Very Slow Tempo
1. Set BPM to 20
2. Export MIDI
3. File should play very slow
4. Should still be valid

### Multiple Exports
1. Export same pattern as MIDI
2. Change BPM to 120
3. Export again as MIDI
4. Download two different files
5. Both should play at different tempos

**Result:** ✅ Pass - Edge cases handled

---

## Test 8: UI Responsiveness

**Should take 2 minutes**

### Mobile View
1. Open DevTools → Device toolbar (Cmd+Shift+M)
2. Select iPhone layout
3. All elements should be readable
4. Dropdown should work on mobile
5. Button clicks should register

### Desktop View
1. Resize window smaller/larger
2. Export panel should remain visible
3. Dropdown should not overflow
4. No horizontal scroll needed

**Result:** ✅ Pass - Responsive design working

---

## Test 9: Copy to Clipboard

**Existing feature - should still work**

1. Create a pattern
2. Select TXT from dropdown
3. Click "Copy to Clipboard"
4. Should see notification: "Pattern copied to clipboard."
5. Paste into text editor
6. Should have full export text

---

## Summary Checklist

- [ ] Test 1: UI loads correctly
- [ ] Test 2: Pattern creation works
- [ ] Test 3: TXT export works
- [ ] Test 4: MIDI export works
- [ ] Test 5: MusicXML export works
- [ ] Test 6: Error messages appear
- [ ] Test 7: Edge cases work
- [ ] Test 8: Mobile/responsive works
- [ ] Test 9: Copy still works
- [ ] No red errors in console
- [ ] All downloaded files valid

---

## If Something Breaks

**Console Errors:**
- Check DevTools Console tab
- Look for red text
- Screenshot error and report with steps to reproduce

**Export Button Doesn't Respond:**
- Check Network tab to see if API call was made
- Verify `https://pulse-lab-api.vercel.app/api/health` returns 200
- Check status box for error message

**File Won't Download:**
- Check if MIDI/MusicXML player recognizes format
- Try opening in different application
- Try downloading TXT first (to verify download works)

**Status Message Stuck:**
- Refresh page
- Try different format
- Check if button re-enables after export

---

## Success Criteria

✅ All 9 tests pass
✅ No console errors
✅ All 3 export formats work
✅ Error messages are clear
✅ UI is responsive
✅ Downloaded files are valid and playable

**Estimated total time:** 15-20 minutes

If all tests pass, the integration is complete and ready! 🎉
