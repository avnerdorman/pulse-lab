/**
 * MIDI Exporter for Pulse Lab
 * Converts rhythm patterns to MIDI files for use in DAWs and notation software
 */

const MidiWriter = require('midi-writer-js');

/**
 * General MIDI Drum Map (Channel 10 Standard)
 * Maps track indices to MIDI note numbers for common percussion sounds
 */
const GM_DRUM_MAP = {
    0: 36,  // Acoustic Bass Drum
    1: 38,  // Acoustic Snare
    2: 42,  // Closed Hi-Hat
    3: 46,  // Open Hi-Hat
    4: 49,  // Crash Cymbal 1
    5: 51,  // Ride Cymbal 1
    6: 50,  // High Tom
    7: 47,  // Low-Mid Tom
    8: 45,  // Low Tom
    9: 41,  // Low Floor Tom
    10: 43, // High Floor Tom
    11: 48, // Hi-Mid Tom
    12: 56, // Cowbell
    13: 54, // Tambourine
    14: 39, // Hand Clap
    15: 37  // Side Stick
};

class MIDIExporter {
    /**
     * @param {Object} options
     * @param {Array} options.tracks - Array of track objects with {name, pattern}
     * @param {number} options.tempo - BPM (beats per minute)
     * @param {number} options.patternLength - Number of pulses in pattern
     */
    constructor(options = {}) {
        this.tracks = options.tracks || [];
        this.tempo = options.tempo || 120;
        this.patternLength = options.patternLength || 16;
    }

    /**
     * Calculate time signature based on pattern length
     * Assumes 16th note pulses by default
     */
    calculateTimeSignature() {
        const quarters = this.patternLength / 4; // 4 sixteenth notes = 1 quarter note

        // Common time signatures
        if (quarters === 4) return { numerator: 4, denominator: 4 };
        if (quarters === 3) return { numerator: 3, denominator: 4 };
        if (quarters === 2) return { numerator: 2, denominator: 4 };
        if (quarters === 6) return { numerator: 6, denominator: 4 };
        if (quarters === 5) return { numerator: 5, denominator: 4 };
        if (quarters === 7) return { numerator: 7, denominator: 4 };

        // Default: use calculated quarters
        const roundedQuarters = Math.round(quarters);
        return {
            numerator: roundedQuarters > 0 ? roundedQuarters : 4,
            denominator: 4
        };
    }

    /**
     * Get MIDI note number for a track index
     */
    getMIDINote(trackIndex) {
        return GM_DRUM_MAP[trackIndex] || GM_DRUM_MAP[0]; // Default to bass drum
    }

    /**
     * Build a MIDI track for a single pattern track
     */
    buildTrack(track, trackIndex) {
        const midiTrack = new MidiWriter.Track();

        // Set tempo (only in first track)
        if (trackIndex === 0) {
            midiTrack.setTempo(this.tempo);
        }

        // Set time signature (only in first track)
        if (trackIndex === 0) {
            const timeSignature = this.calculateTimeSignature();
            midiTrack.addEvent(new MidiWriter.TimeSignatureEvent({
                numerator: timeSignature.numerator,
                denominator: timeSignature.denominator,
                thirtyseconds: 8 // Standard value
            }));
        }

        // Add track name
        midiTrack.addEvent(new MidiWriter.TrackNameEvent({
            text: track.name || `Track ${trackIndex + 1}`
        }));

        // Get MIDI note for this percussion instrument
        const midiNote = this.getMIDINote(trackIndex);

        // Convert pattern to MIDI events
        // Each pulse is a 16th note
        track.pattern.forEach((pulse) => {
            if (pulse === 'X') {
                // Note onset
                midiTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: midiNote,
                    duration: '16', // 16th note
                    velocity: 100,
                    channel: 10 // MIDI Channel 10 is reserved for percussion
                }));
            } else {
                // Rest (pulse with no onset)
                midiTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: midiNote,
                    duration: '16',
                    velocity: 0, // Zero velocity = rest/silence
                    channel: 10
                }));
            }
        });

        return midiTrack;
    }

    /**
     * Generate complete MIDI file
     * @returns {Uint8Array} - MIDI file bytes
     */
    generate() {
        if (!this.tracks || this.tracks.length === 0) {
            throw new Error('No tracks to export');
        }

        // Build MIDI track for each pattern track
        const midiTracks = this.tracks.map((track, index) =>
            this.buildTrack(track, index)
        );

        // Create MIDI writer and build file
        const writer = new MidiWriter.Writer(midiTracks);
        return writer.buildFile();
    }

    /**
     * Download MIDI file to user's computer
     */
    download(filename) {
        const bytes = this.generate();
        const blob = new Blob([bytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `pulse-pattern-${Date.now()}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    /**
     * Get data URI for MIDI file (useful for previewing)
     */
    getDataURI() {
        const bytes = this.generate();
        const writer = new MidiWriter.Writer([]);
        writer.tracks = this.tracks.map((track, index) =>
            this.buildTrack(track, index)
        );
        return writer.dataUri();
    }
}

module.exports = MIDIExporter;
