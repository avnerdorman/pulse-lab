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

    this.loadFromTracker = function(getPatternLengthFn) {
        // Try multiple selectors to find tracker rows
        let rows = Array.from(document.querySelectorAll('#tracker-table .tracker-row[data-id]'));
        if (rows.length === 0) {
            rows = Array.from(document.querySelectorAll('.tracker-row[data-id]'));
        }
        const length = getPatternLengthFn ? getPatternLengthFn() : 16;

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
        }).filter(circle => {
            // Only include rows that have at least one onset
            return circle.pattern.some(onset => onset === true);
        });

        console.log('Necklace view loaded:', this.circles.length, 'tracks');
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
            const angle = (i / numPulses) * Math.PI * 2 - Math.PI / 2; // Start at top (12 o'clock)
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

            // Draw pulse number for reference (small text)
            if (numPulses <= 16) {
                ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const labelRadius = radius + 20;
                const labelX = centerX + Math.cos(angle) * labelRadius;
                const labelY = centerY + Math.sin(angle) * labelRadius;
                ctx.fillText(String(i + 1), labelX, labelY);
            }
        }

        // Reset text baseline
        ctx.textBaseline = 'alphabetic';
    };

    this.setCurrentPulse = function(pulseIndex) {
        this.currentPulse = pulseIndex;
        this.draw();
    };

    this.setPlaying = function(playing) {
        this.isPlaying = playing;
        this.draw();
    };

    this.refresh = function(getPatternLengthFn) {
        this.loadFromTracker(getPatternLengthFn);
    };
}

// Export for use in script.js (CommonJS for bundle) and browser (global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NecklaceView;
}
// Also expose as global for browser usage
if (typeof window !== 'undefined') {
    window.NecklaceView = NecklaceView;
}
