(function () {
    const panel = document.getElementById('export-pattern-panel');
    const output = document.getElementById('export-pattern-output');
    const copyBtn = document.getElementById('export-copy-btn');
    const downloadBtn = document.getElementById('export-download-btn');
    const trackerParent = document.getElementById('tracker-parent');
    const bpmInput = document.getElementById('bpm');
    const measureLengthInput = document.getElementById('measureLength');
    const sampleSetSelect = document.getElementById('sampleSet');
    const presetSelect = document.getElementById('preset-select');
    const presetBtn = document.getElementById('apply-preset-btn');
    const shareBtn = document.getElementById('share-link-btn');

    const state = {
        pendingPatternQueue: [],
        measureBindingInitialized: false,
        initialParams: parseQueryParams()
    };

    const LABEL_WIDTH = 12;
    const LOADED_BPM_DEFAULT = 80;
    const LOADED_BPM_MIN = 20;
    const LOADED_BPM_MAX = 240;

    const TRACK_TARGETS = {
        trackA: { matcher: /(kick|bass\s?drum|bd)/i, fallbackIndex: 0 },
        trackB: { matcher: /(snare|rim|clave|sd)/i, fallbackIndex: 1 },
        trackHat: { matcher: /(hi[-\s]?hat|hat|ride|cymbal)/i, fallbackIndex: 2 }
    };

    const PRESETS = {
        empty: {
            label: 'Empty',
            measureLength: 16,
            bpm: 80,
            patterns: []
        },
        'two-three-alt': {
            label: '2–3 Alternation',
            measureLength: 16,
            bpm: 78,
            patterns: [
                { target: 'trackA', hits: [0, 2, 5, 7, 10, 12] },
                { target: 'trackB', hits: [1, 4, 6, 9, 11, 14] }
            ]
        },
        'cross-23': {
            label: 'Cross 2-vs-3',
            measureLength: 12,
            bpm: 82,
            patterns: [
                { target: 'trackA', hits: [0, 2, 4, 6, 8, 10] },
                { target: 'trackB', hits: [0, 3, 6, 9] }
            ]
        },
        'offset-23': {
            label: 'Offset 2-vs-3',
            measureLength: 16,
            bpm: 84,
            patterns: [
                { target: 'trackA', hits: [0, 2, 5, 7, 10, 12, 15] },
                { target: 'trackB', hits: [1, 3, 6, 8, 11, 13] }
            ]
        },
        'random-23': {
            label: 'Random 2/3',
            measureLength: 16,
            bpm: 76,
            patterns: [
                {
                    target: 'trackA',
                    generator: length => buildRandomGroupingPattern(length)
                },
                {
                    target: 'trackHat',
                    generator: length => new Array(length).fill('X').join('')
                }
            ]
        }
    };

    initialize();

    function initialize() {
        setupExportPanel();
        setupTrackerListeners();
        setupPresetControls();
        setupShareControls();
        applyInitialParams();
        refreshExportText();
    }

    function setupExportPanel() {
        if (!panel || !output) {
            return;
        }

        panel.addEventListener('toggle', () => {
            if (panel.open) {
                refreshExportText();
            }
        });

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                refreshExportText();
                const text = output.value;
                if (!text) {
                    return;
                }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text)
                        .then(() => showMessage('Pattern copied to clipboard.'))
                        .catch(() => fallbackCopy(text));
                } else {
                    fallbackCopy(text);
                }
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                refreshExportText();
                const text = output.value;
                if (!text) {
                    return;
                }
                const blob = new Blob([text + '\n'], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'pattern.txt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });
        }
    }

    function setupTrackerListeners() {
        if (trackerParent) {
            trackerParent.addEventListener('click', event => {
                if (event.target && event.target.classList.contains('tracker-cell')) {
                    setTimeout(() => handleTrackerMutation(), 0);
                }
            });

            if (window.MutationObserver) {
                const observer = new MutationObserver(() => {
                    handleTrackerMutation();
                });
                observer.observe(trackerParent, { childList: true, subtree: true });
            }
        }

        if (bpmInput) {
            bpmInput.addEventListener('input', handleTrackerMutation);
            bpmInput.addEventListener('change', handleTrackerMutation);
        }

        if (measureLengthInput) {
            measureLengthInput.addEventListener('input', () => {
                setTimeout(handleTrackerMutation, 0);
            });
            measureLengthInput.addEventListener('change', handleTrackerMutation);
        }
    }

    function setupPresetControls() {
        if (!presetSelect || !presetBtn) {
            return;
        }
        presetBtn.addEventListener('click', () => {
            applyPreset(presetSelect.value);
        });
    }

    function setupShareControls() {
        if (!shareBtn) {
            return;
        }
        shareBtn.addEventListener('click', () => {
            const link = buildShareLink();
            if (!link) {
                return;
            }
            copyString(link, () => showMessage('Shareable link copied to clipboard.'));
        });
    }

    function handleTrackerMutation() {
        if (panel && panel.open) {
            refreshExportText();
        }
        tryApplyPendingPatterns();
    }

    function refreshExportText() {
        if (!output) {
            return;
        }
        output.value = buildExportText();
    }

    function buildExportText() {
        const length = getPatternLength();
        const lines = [];
        const tempo = getTempo();
        if (tempo !== null) {
            lines.push(`Tempo: ${tempo} BPM`);
        }
        if (length) {
            lines.push(`Pattern length: ${length} pulses`);
        }
        lines.push(`Repeats: ∞ (loop)`);
        lines.push('');
        lines.push(getPulseLine(length));
        const trackLines = buildTrackLines(length);
        lines.push(...trackLines);
        return lines.join('\n');
    }

    function getTempo() {
        if (!bpmInput) {
            return null;
        }
        const value = parseInt(bpmInput.value, 10);
        return Number.isFinite(value) ? value : null;
    }

    function getPatternLength() {
        const pulseSteps = document.querySelectorAll('.pulse-step');
        if (pulseSteps.length) {
            return pulseSteps.length;
        }
        const parsed = parseInt(measureLengthInput && measureLengthInput.value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function getPulseLine(length) {
        if (!length) {
            return padLabel('Pulses:') + '(unavailable)';
        }
        const pulses = Array.from({ length }, () => '● ').join('').trimEnd();
        return padLabel('Pulses:') + pulses;
    }

    function getTrackRows() {
        return Array.from(document.querySelectorAll('#tracker-table .tracker-row[data-id]'));
    }

    function buildTrackLines(length) {
        const rows = getTrackRows();
        const activeRows = rows.filter(row => rowHasActivity(row, length));
        return activeRows.map(row => {
            const labelCell = row.querySelector('.tracker-first-cell');
            const baseLabel = labelCell ? labelCell.textContent.trim() : `Track ${row.dataset.id || ''}`.trim();
            const label = `${baseLabel || 'Track'}:`;
            const cells = Array.from(row.querySelectorAll('.tracker-cell'));
            return padLabel(label) + buildRowPattern(cells, length);
        });
    }

    function rowHasActivity(row, length) {
        if (!row) {
            return false;
        }
        const cells = Array.from(row.querySelectorAll('.tracker-cell'));
        const limit = length ? Math.min(length, cells.length) : cells.length;
        for (let i = 0; i < limit; i++) {
            if (cells[i] && cells[i].classList.contains('tracker-enabled')) {
                return true;
            }
        }
        return false;
    }

    function buildRowPattern(cells, length) {
        if (!length) {
            length = cells.length;
        }
        if (!length) {
            return '(empty)';
        }
        const values = [];
        for (let i = 0; i < length; i++) {
            const cell = cells[i];
            values.push(cell && cell.classList.contains('tracker-enabled') ? 'X ' : '. ');
        }
        return values.join('').trimEnd();
    }

    function padLabel(label) {
        return label.padEnd(LABEL_WIDTH, ' ');
    }

    function fallbackCopy(text) {
        if (!output) {
            return;
        }
        output.focus();
        output.select();
        try {
            document.execCommand('copy');
            showMessage('Pattern copied to clipboard.');
        } catch (err) {
            console.warn('Copy failed', err);
        } finally {
            const end = output.value.length;
            output.setSelectionRange(end, end);
        }
    }

    function copyString(value, onSuccess) {
        if (!value) {
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value)
                .then(() => {
                    if (typeof onSuccess === 'function') {
                        onSuccess();
                    }
                })
                .catch(() => fallbackCopyString(value, onSuccess));
        } else {
            fallbackCopyString(value, onSuccess);
        }
    }

    function fallbackCopyString(value, onSuccess) {
        const temp = document.createElement('textarea');
        temp.value = value;
        temp.setAttribute('readonly', 'readonly');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        try {
            document.execCommand('copy');
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
        } catch (err) {
            window.prompt('Copy this link:', value);
        }
        document.body.removeChild(temp);
    }

    function showMessage(message) {
        const el = document.getElementById('app-message');
        if (!el) {
            window.alert(message);
            return;
        }
        el.innerHTML = message;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 2000);
    }

    function buildShareLink() {
        const length = getPatternLength();
        if (!length) {
            return '';
        }
        const params = new URLSearchParams();
        params.set('len', length);
        const tempo = getTempo();
        if (tempo !== null) {
            params.set('bpm', tempo);
        }
        if (sampleSetSelect && sampleSetSelect.value) {
            params.set('ss', sampleSetSelect.value);
        }
        const rowsParam = encodeRowStates(length);
        if (rowsParam) {
            params.set('rows', rowsParam);
        }
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }

    function encodeRowStates(length) {
        const rows = getTrackRows();
        if (!rows.length) {
            return '';
        }
        const parts = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('.tracker-cell'));
            const bits = cells
                .slice(0, length)
                .map(cell => (cell.classList.contains('tracker-enabled') ? '1' : '0'))
                .join('');
            return `${row.dataset.id || ''}:${bits}`;
        });
        return parts.join(',');
    }

    function decodeRowStates(param) {
        if (!param) {
            return [];
        }
        return param.split(',').map(pair => {
            const [rowId, bits] = pair.split(':');
            if (!bits) {
                return null;
            }
            return { rowId, pattern: bits };
        }).filter(Boolean);
    }

    function parseQueryParams() {
        const params = {};
        const search = window.location.search;
        if (!search || search.length <= 1) {
            return params;
        }
        const pairs = search.substring(1).split('&');
        for (const pair of pairs) {
            const [rawKey, rawValue] = pair.split('=');
            if (!rawKey) {
                continue;
            }
            const key = decodeURIComponent(rawKey);
            const value = rawValue ? decodeURIComponent(rawValue) : '';
            params[key] = value;
        }
        return params;
    }

    function applyInitialParams() {
        const params = state.initialParams;
        if (!params) {
            return;
        }
        if (params.ss && sampleSetSelect) {
            setSampleSet(params.ss);
        }
        if (params.len) {
            const len = parseInt(params.len, 10);
            if (Number.isFinite(len)) {
                setMeasureLength(len);
            }
        }
        if (params.bpm) {
            const bpm = parseInt(params.bpm, 10);
            if (Number.isFinite(bpm)) {
                setBpm(normalizeLoadedBpm(bpm));
            }
        } else if (params.rows) {
            setBpm(LOADED_BPM_DEFAULT);
        }
        if (params.rows) {
            const patterns = decodeRowStates(params.rows).map(item => ({
                rowId: item.rowId,
                pattern: item.pattern
            }));
            queuePatternSet({
                length: params.len ? parseInt(params.len, 10) : null,
                clearAll: true,
                patterns
            });
        }
    }

    function setBpm(value) {
        if (!bpmInput || !Number.isFinite(value)) {
            return;
        }
        bpmInput.value = value;
        bpmInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function normalizeLoadedBpm(value) {
        if (!Number.isFinite(value)) {
            return LOADED_BPM_DEFAULT;
        }
        if (value < LOADED_BPM_MIN) {
            return LOADED_BPM_MIN;
        }
        if (value > LOADED_BPM_MAX) {
            return LOADED_BPM_MAX;
        }
        return value;
    }

    function ensureMeasureBinding() {
        if (state.measureBindingInitialized || !measureLengthInput) {
            return;
        }
        measureLengthInput.dispatchEvent(new Event('input', { bubbles: true }));
        state.measureBindingInitialized = true;
    }

    function setMeasureLength(length) {
        if (!measureLengthInput || !Number.isFinite(length)) {
            return;
        }
        ensureMeasureBinding();
        measureLengthInput.value = length;
        const enterEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
        });
        measureLengthInput.dispatchEvent(enterEvent);
    }

    function setSampleSet(value) {
        if (!sampleSetSelect || !value) {
            return;
        }
        const optionExists = Array.from(sampleSetSelect.options).some(opt => opt.value === value);
        if (!optionExists) {
            return;
        }
        if (sampleSetSelect.value === value) {
            return;
        }
        sampleSetSelect.value = value;
        sampleSetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function applyPreset(key) {
        const preset = PRESETS[key];
        if (!preset) {
            return;
        }
        if (preset.measureLength) {
            setMeasureLength(preset.measureLength);
        }
        if (preset.bpm) {
            setBpm(normalizeLoadedBpm(preset.bpm));
        }
        const length = preset.measureLength || getPatternLength();
        const patterns = preset.patterns.map(cfg => {
            const target = TRACK_TARGETS[cfg.target] || {};
            const base = {
                matcher: cfg.matcher || target.matcher || null,
                fallbackIndex: typeof cfg.fallbackIndex === 'number' ? cfg.fallbackIndex : target.fallbackIndex
            };
            if (cfg.rowId !== undefined) {
                base.rowId = cfg.rowId;
            }
            if (cfg.pattern) {
                base.pattern = cfg.pattern;
            } else if (cfg.hits) {
                base.pattern = buildPatternFromHits(length, cfg.hits);
            } else if (typeof cfg.generator === 'function') {
                base.pattern = len => cfg.generator(len);
            }
            return base;
        });
        queuePatternSet({
            length,
            clearAll: true,
            patterns
        });
    }

    function buildPatternFromHits(length, hits) {
        const arr = new Array(length).fill('.');
        hits.forEach(idx => {
            if (idx >= 0 && idx < length) {
                arr[idx] = 'X';
            }
        });
        return arr.join('');
    }

    function buildRandomGroupingPattern(length) {
        const arr = new Array(length).fill('.');
        let i = 0;
        while (i < length) {
            arr[i] = 'X';
            i += Math.random() < 0.5 ? 2 : 3;
        }
        return arr.join('');
    }

    function queuePatternSet(patternSet) {
        state.pendingPatternQueue.push(patternSet);
        tryApplyPendingPatterns();
    }

    function tryApplyPendingPatterns() {
        if (!state.pendingPatternQueue.length) {
            return;
        }
        const rows = getTrackRows();
        if (!rows.length) {
            return;
        }
        const currentLength = getPatternLength();
        if (!currentLength) {
            return;
        }
        const next = state.pendingPatternQueue[0];
        const requiredLength = next.length || currentLength;
        if (requiredLength && requiredLength !== currentLength) {
            return;
        }
        const applied = applyPatternSetNow(next);
        if (applied) {
            state.pendingPatternQueue.shift();
            if (state.pendingPatternQueue.length) {
                tryApplyPendingPatterns();
            }
        }
    }

    function applyPatternSetNow(patternSet) {
        const rows = getTrackRows();
        if (!rows.length) {
            return false;
        }
        const targetLength = patternSet.length || getPatternLength();
        if (!targetLength) {
            return false;
        }
        if (patternSet.clearAll) {
            rows.forEach(row => clearRow(row, targetLength));
        }
        const configs = Array.isArray(patternSet.patterns) ? patternSet.patterns : [];
        configs.forEach(cfg => {
            const row = resolveRow(cfg, rows);
            if (!row) {
                return;
            }
            const patternValue = typeof cfg.pattern === 'function' ? cfg.pattern(targetLength) : cfg.pattern;
            setRowPattern(row, patternValue, targetLength);
        });
        refreshExportText();
        return true;
    }

    function resolveRow(config, rows) {
        if (config.rowId !== undefined && config.rowId !== null) {
            const match = rows.find(row => row.dataset.id === String(config.rowId));
            if (match) {
                return match;
            }
        }
        if (config.matcher instanceof RegExp) {
            const match = rows.find(row => config.matcher.test(getRowLabel(row)));
            if (match) {
                return match;
            }
        }
        if (typeof config.fallbackIndex === 'number') {
            return rows[config.fallbackIndex] || null;
        }
        return null;
    }

    function getRowLabel(row) {
        const labelCell = row.querySelector('.tracker-first-cell');
        return labelCell ? labelCell.textContent.trim() : '';
    }

    function setRowPattern(row, pattern, length) {
        if (!row) {
            return;
        }
        const cells = Array.from(row.querySelectorAll('.tracker-cell'));
        if (!cells.length) {
            return;
        }
        const normalized = typeof pattern === 'string'
            ? pattern
            : Array.isArray(pattern)
                ? pattern.join('')
                : '';
        const limit = Math.min(length || normalized.length || cells.length, cells.length);
        for (let i = 0; i < limit; i++) {
            const char = normalized[i] || '.';
            const active = char === 'X' || char === 'x' || char === '1';
            cells[i].classList.toggle('tracker-enabled', !!active);
        }
        for (let i = limit; i < cells.length; i++) {
            cells[i].classList.remove('tracker-enabled');
        }
    }

    function clearRow(row, length) {
        const cells = Array.from(row.querySelectorAll('.tracker-cell'));
        const limit = Math.min(length || cells.length, cells.length);
        for (let i = 0; i < limit; i++) {
            cells[i].classList.remove('tracker-enabled');
        }
    }
})();
