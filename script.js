(function () {
    const panel = document.getElementById('export-pattern-panel');
    const output = document.getElementById('export-pattern-output');
    const copyBtn = document.getElementById('export-copy-btn');
    const downloadBtn = document.getElementById('export-download-btn');
    const trackerParent = document.getElementById('tracker-parent');
    const bpmInput = document.getElementById('bpm');
    const bpmValue = document.getElementById('bpmValue');
    const measureLengthInput = document.getElementById('measureLength');
    const measureLengthPreset = document.getElementById('measureLengthPreset');
    const sampleSetSelect = document.getElementById('sampleSet');
    const importBtn = document.getElementById('import-pattern-btn');
    const importInput = document.getElementById('import-pattern-input');
    const resetPatternBtn = document.getElementById('reset-pattern-btn');

    const state = {
        pendingPatternQueue: [],
        measureBindingInitialized: false,
        initialParams: parseQueryParams(),
        defaultPatternQueued: false
    };

    const LABEL_WIDTH = 12;
    const LOADED_BPM_DEFAULT = 80;
    const LOADED_BPM_MIN = 20;
    const LOADED_BPM_MAX = 240;

    initialize();

    function initialize() {
        applyEmbedMode();
        setupExportPanel();
        setupTrackerListeners();
        setupImportControls();
        setupResetControl();
        applyInitialParams();
        ensureDefaultHatPattern();
        refreshExportText();
    }

    function applyEmbedMode() {
        const params = state.initialParams || {};
        const flag = params.embed;
        if (!flag) {
            return;
        }
        const isOn = flag === '1' || flag === 'true' || flag === 'yes';
        if (isOn && document && document.body) {
            document.body.classList.add('embedded');
            // In embed mode, ensure the Export panel is open and visible
            const exportPanel = document.getElementById('export-pattern-panel');
            if (exportPanel) {
                exportPanel.open = true;
            }
        }
    }

    function ensureDefaultHatPattern() {
        if (state.defaultPatternQueued) {
            return;
        }
        if (state.initialParams && state.initialParams.rows) {
            return;
        }
        applyHatPulsePattern();
        state.defaultPatternQueued = true;
    }

    function setupResetControl() {
        if (!resetPatternBtn) {
            return;
        }
        resetPatternBtn.addEventListener('click', () => {
            applyHatPulsePattern();
            showMessage('Reset to hi-hat pulse.');
        });
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
            const syncBpm = () => {
                updateBpmDisplay();
                handleTrackerMutation();
            };
            bpmInput.addEventListener('input', syncBpm);
            bpmInput.addEventListener('change', syncBpm);
            updateBpmDisplay();
        }

        if (measureLengthInput) {
            measureLengthInput.addEventListener('input', () => {
                setTimeout(handleTrackerMutation, 0);
            });
            measureLengthInput.addEventListener('change', () => {
                syncMeasureLengthPreset();
                handleTrackerMutation();
            });
        }

        if (measureLengthInput && measureLengthPreset) {
            measureLengthPreset.addEventListener('change', () => {
                const value = parseInt(measureLengthPreset.value, 10);
                if (!Number.isFinite(value)) {
                    return;
                }
                measureLengthInput.value = value;
                measureLengthInput.dispatchEvent(new Event('input', { bubbles: true }));
                measureLengthInput.dispatchEvent(new Event('change', { bubbles: true }));
            });

            syncMeasureLengthPreset();
        }
    }

    function setupImportControls() {
        if (!importBtn || !importInput) {
            return;
        }
        importBtn.addEventListener('click', () => {
            importInput.click();
        });
        importInput.addEventListener('change', event => {
            const files = event.target.files;
            if (!files || !files.length) {
                return;
            }
            const file = files[0];
            const reader = new FileReader();
            reader.onload = e => {
                const text = e && e.target ? e.target.result : '';
                importPatternFromText(typeof text === 'string' ? text : '');
                importInput.value = '';
            };
            reader.onerror = () => {
                showMessage('Unable to read the selected file.');
            };
            reader.readAsText(file);
        });
    }

    function handleTrackerMutation() {
        if (panel && panel.open) {
            refreshExportText();
        }
        tryApplyPendingPatterns();
    }

    function updateBpmDisplay() {
        if (!bpmInput || !bpmValue) {
            return;
        }
        const parsed = parseInt(bpmInput.value, 10);
        const bpmText = Number.isFinite(parsed) ? parsed : '--';
        bpmValue.textContent = `${bpmText} BPM`;
    }

    function syncMeasureLengthPreset() {
        if (!measureLengthInput || !measureLengthPreset) {
            return;
        }
        const value = measureLengthInput.value;
        const presetValues = ['12', '16', '24', '32', '36'];
        measureLengthPreset.value = presetValues.includes(String(value)) ? String(value) : '';
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

    function importPatternFromText(text) {
        const parsed = parseExportedPattern(text);
        if (!parsed) {
            showMessage('Could not parse that pattern file.');
            return;
        }
        if (parsed.length) {
            setMeasureLength(parsed.length);
        }
        if (parsed.bpm) {
            setBpm(normalizeLoadedBpm(parsed.bpm));
        }
        const rows = getTrackRows();
        if (!rows.length) {
            return;
        }
        const lookup = buildRowLookup(rows);
        const configs = parsed.rows.map(entry => {
            const info = lookup.get(entry.label.toLowerCase());
            const config = { pattern: entry.pattern };
            if (info && info.rowId) {
                config.rowId = info.rowId;
            } else if (info) {
                config.fallbackIndex = info.index;
            } else {
                config.matcher = buildLabelMatcher(entry.label);
            }
            return config;
        });
        queuePatternSet({
            length: parsed.length || (parsed.rows[0] && parsed.rows[0].pattern.length) || getPatternLength(),
            clearAll: true,
            patterns: configs
        });
        showMessage('Pattern imported.');
    }

    function parseExportedPattern(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }
        const lines = text.split(/\r?\n/);
        let bpm = null;
        let length = null;
        const rows = [];
        const labelRegex = /^\s*([^:]+):\s*(.+)$/;
        for (const rawLine of lines) {
            if (!rawLine) {
                continue;
            }
            const line = rawLine.trim();
            if (!line) {
                continue;
            }
            if (/^\s*Tempo:/i.test(rawLine)) {
                const match = rawLine.match(/Tempo:\s*(\d+)/i);
                if (match) {
                    const parsed = parseInt(match[1], 10);
                    if (Number.isFinite(parsed)) {
                        bpm = parsed;
                    }
                }
                continue;
            }
            if (/^\s*Pattern length:/i.test(rawLine)) {
                const match = rawLine.match(/Pattern length:\s*(\d+)/i);
                if (match) {
                    const parsed = parseInt(match[1], 10);
                    if (Number.isFinite(parsed)) {
                        length = parsed;
                    }
                }
                continue;
            }
            if (/^\s*(Pulses|Repeats):/i.test(rawLine)) {
                continue;
            }
            const labelMatch = rawLine.match(labelRegex);
            if (!labelMatch) {
                continue;
            }
            const label = labelMatch[1].trim();
            const patternString = labelMatch[2].trim();
            const normalizedPattern = normalizeExportedPattern(patternString);
            if (label && normalizedPattern) {
                rows.push({ label, pattern: normalizedPattern });
            }
        }
        if (!rows.length) {
            return null;
        }
        if (!length) {
            length = rows[0].pattern.length;
        }
        return { bpm, length, rows };
    }

    function normalizeExportedPattern(value) {
        if (!value) {
            return '';
        }
        const tokens = value.trim().split(/\s+/).filter(Boolean);
        if (!tokens.length) {
            return '';
        }
        return tokens.map(token => (/^(x|●|1)$/i.test(token) ? 'X' : '.')).join('');
    }

    function buildRowLookup(rows) {
        const map = new Map();
        rows.forEach((row, index) => {
            const key = getRowLabel(row).toLowerCase();
            if (key) {
                map.set(key, { rowId: row.dataset.id || null, index });
            }
        });
        return map;
    }

    function buildLabelMatcher(label) {
        if (!label) {
            return null;
        }
        return new RegExp(`^${escapeRegExp(label.trim())}$`, 'i');
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    function applyHatPulsePattern() {
        const length = getPatternLength() || 16;
        const hatPattern = new Array(length).fill('X').join('');
        const patternSet = {
            length,
            clearAll: true,
            patterns: [
                {
                    matcher: /(hi[-\s]?hat|hihat).*closed/i,
                    fallbackIndex: 2,
                    pattern: hatPattern
                }
            ]
        };
        const applied = applyPatternSetNow(patternSet);
        if (!applied) {
            queuePatternSet(patternSet);
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
