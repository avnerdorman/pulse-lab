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
    const clearPatternBtn = document.getElementById('clear-pattern-btn');
    const necklaceViewBtn = document.getElementById('necklace-view-btn');
    const necklaceModal = document.getElementById('necklace-modal');
    const necklaceCloseBtn = document.getElementById('necklace-close');

    const state = {
        pendingPatternQueue: [],
        measureBindingInitialized: false,
        initialParams: parseQueryParams(),
        defaultPatternQueued: false
    };

    const LABEL_WIDTH = 17;
    const LOADED_BPM_DEFAULT = 80;
    const LOADED_BPM_MIN = 20;
    const LOADED_BPM_MAX = 240;

    // Bjorklund algorithm for Euclidean rhythms
    function bjorklund(steps, pulses) {
        steps = Math.round(steps);
        pulses = Math.round(pulses);

        if (pulses > steps || pulses == 0 || steps == 0) {
            return [];
        }

        let pattern = [];
        let counts = [];
        let remainders = [];
        let divisor = steps - pulses;
        remainders.push(pulses);
        let level = 0;

        while (true) {
            counts.push(Math.floor(divisor / remainders[level]));
            remainders.push(divisor % remainders[level]);
            divisor = remainders[level];
            level += 1;
            if (remainders[level] <= 1) {
                break;
            }
        }

        counts.push(divisor);

        let r = 0;
        let build = function(level) {
            r++;
            if (level > -1) {
                for (let i = 0; i < counts[level]; i++) {
                    build(level - 1);
                }
                if (remainders[level] != 0) {
                    build(level - 2);
                }
            } else if (level == -1) {
                pattern.push(0);
            } else if (level == -2) {
                pattern.push(1);
            }
        };

        build(level);
        return pattern.reverse();
    }

    // Convert binary array to X/. pattern string
    function bjorklundToPattern(steps, pulses) {
        const binary = bjorklund(steps, pulses);
        return binary.map(b => b === 1 ? 'X' : '.').join('');
    }

    // Necklace view variables (module loaded separately)
    let necklaceView = null;
    let necklaceViewInitialized = false;

    initialize();

    function initialize() {
        applyEmbedMode();
        setupExportPanel();
        setupTrackerListeners();
        setupImportControls();
        setupResetControl();
        setupClearControl();
        setupEuclideanModal();
        setupNecklaceView();
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
            // In embed mode, ensure the Export panel text is visible
            const exportPanel = document.getElementById('export-pattern-panel');
            if (exportPanel) {
                exportPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
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

    function setupClearControl() {
        if (!clearPatternBtn) {
            return;
        }
        clearPatternBtn.addEventListener('click', () => {
            clearAllPatterns();
            showMessage('Grid cleared.');
        });
    }

    function setupExportPanel() {
        if (!output) {
            return;
        }

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
                const actionBtn = event.target && event.target.closest('.track-action-btn');
                if (actionBtn) {
                    const rowId = actionBtn.dataset.rowId;
                    const action = actionBtn.dataset.action;
                    handleTrackAction(action, rowId);
                    event.stopPropagation();
                    return;
                }
                if (event.target && event.target.classList.contains('tracker-cell')) {
                    setTimeout(() => handleTrackerMutation(), 0);
                }
            });

            // Handle click on compact options menu items (every N)
            trackerParent.addEventListener('click', event => {
                const item = event.target && event.target.closest('.track-options-item');
                if (item) {
                    const rowId = item.dataset.rowId;
                    if (item.dataset.clear) {
                        clearRowById(rowId);
                    } else {
                        const n = parseInt(item.dataset.every, 10);
                        if (Number.isFinite(n)) {
                            applyEveryN(rowId, n);
                        }
                    }
                    const actionCell = item.closest('.tracker-action-cell');
                    if (actionCell) actionCell.classList.remove('show-options');
                    event.stopPropagation();
                    return;
                }
            });

            // Click outside to close any open options menus
            document.addEventListener('click', (e) => {
                const open = document.querySelectorAll('.tracker-action-cell.show-options');
                open.forEach(cell => {
                    if (!cell.contains(e.target)) {
                        cell.classList.remove('show-options');
                    }
                });
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
        if (panel) {
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
        autoSizeExportOutput();
    }

    function autoSizeExportOutput() {
        if (!output) {
            return;
        }
        output.style.height = 'auto';
        output.style.height = `${output.scrollHeight}px`;
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

    function clearAllPatterns() {
        const length = getPatternLength();
        if (!length) {
            return;
        }
        const patternSet = {
            length,
            clearAll: true,
            patterns: []
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

    function handleTrackAction(action, rowId) {
        if (!action || rowId === undefined) {
            return;
        }
        if (action === 'shift-left') {
            shiftRow(rowId, 'left');
        } else if (action === 'shift-right') {
            shiftRow(rowId, 'right');
            } else if (action === 'mute') {
                const row = document.querySelector(`#tracker-table .tracker-row[data-id="${rowId}"]`);
                if (row) {
                    row.classList.toggle('row-muted');
                }
        } else if (action === 'options') {
            const actionCell = document.querySelector(`.tracker-action-cell[data-row-id="${rowId}"]`);
            if (actionCell) {
                actionCell.classList.toggle('show-options');
                const select = actionCell.querySelector('.track-options-select');
                if (select) {
                    select.focus();
                }
            }
        }
    }

    function shiftRow(rowId, direction) {
        const row = document.querySelector(`#tracker-table .tracker-row[data-id="${rowId}"]`);
        if (!row) {
            return;
        }
        const cells = Array.from(row.querySelectorAll('.tracker-cell'));
        if (!cells.length) {
            return;
        }
        const length = Math.min(getPatternLength() || cells.length, cells.length);
        const pattern = cells.slice(0, length).map(cell => cell.classList.contains('tracker-enabled'));
        if (!pattern.length) {
            return;
        }
        if (direction === 'left') {
            const first = pattern.shift();
            pattern.push(first);
        } else if (direction === 'right') {
            const last = pattern.pop();
            pattern.unshift(last);
        }
        const patternString = pattern.map(val => (val ? 'X' : '.')).join('');
        const patternSet = {
            length,
            clearAll: false,
            patterns: [
                {
                    rowId: String(rowId),
                    pattern: patternString
                }
            ]
        };
        const applied = applyPatternSetNow(patternSet);
        if (!applied) {
            queuePatternSet(patternSet);
        }
    }

    function applyEveryN(rowId, n) {
        const length = getPatternLength() || 16;
        if (!n || n < 1) return;
        const pattern = Array.from({ length }, (_, i) => (i % n === 0 ? 'X' : '.')).join('');
        const patternSet = {
            length,
            clearAll: false,
            patterns: [
                {
                    rowId: String(rowId),
                    pattern
                }
            ]
        };
        const applied = applyPatternSetNow(patternSet);
        if (!applied) {
            queuePatternSet(patternSet);
        }
    }

    function clearRowById(rowId) {
        const length = getPatternLength() || 16;
        const pattern = new Array(length).fill('.').join('');
        const patternSet = {
            length,
            clearAll: false,
            patterns: [
                {
                    rowId: String(rowId),
                    pattern
                }
            ]
        };
        const applied = applyPatternSetNow(patternSet);
        if (!applied) {
            queuePatternSet(patternSet);
        }
    }

    function setupEuclideanModal() {
        const modal = document.getElementById('euclidean-modal');
        const pulsesInput = document.getElementById('euclidean-pulses');
        const stepsInput = document.getElementById('euclidean-steps');
        const applyBtn = document.getElementById('euclidean-apply');
        const cancelBtn = document.getElementById('euclidean-cancel');

        if (!modal || !pulsesInput || !stepsInput || !applyBtn || !cancelBtn) {
            return;
        }

        let currentRowId = null;

        // Open modal when "Euclidean..." clicked
        trackerParent.addEventListener('click', event => {
            const trigger = event.target && event.target.closest('.euclidean-trigger');
            if (trigger) {
                currentRowId = trigger.dataset.rowId;
                const length = getPatternLength() || 16;
                stepsInput.value = length;
                stepsInput.disabled = true; // Lock to current measure length
                pulsesInput.max = length;
                pulsesInput.value = Math.min(5, length); // Default to 5 or length if smaller

                // Update preset buttons for current measure length
                updateEuclideanPresets(length);

                modal.style.display = 'flex';
                event.stopPropagation();

                // Close the options menu
                const actionCell = trigger.closest('.tracker-action-cell');
                if (actionCell) actionCell.classList.remove('show-options');
            }
        });

        // Preset buttons - only set k value (n is locked to measure length)
        modal.addEventListener('click', event => {
            const preset = event.target && event.target.closest('.preset-btn');
            if (preset) {
                pulsesInput.value = preset.dataset.k;
                // Note: preset.dataset.n is ignored since n is locked to current measure length
            }
        });

        // Apply
        applyBtn.addEventListener('click', () => {
            const k = parseInt(pulsesInput.value, 10);
            const n = parseInt(stepsInput.value, 10);
            if (currentRowId !== null && k && n) {
                applyEuclideanPattern(currentRowId, k, n);
            }
            modal.style.display = 'none';
        });

        // Cancel
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Close on outside click
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        });
    }

    function updateEuclideanPresets(n) {
        const presetsContainer = document.querySelector('.euclidean-presets');
        if (!presetsContainer) return;

        // Common k values that work well for various lengths
        const commonPatterns = [
            { k: 3, label: 'Tresillo' },
            { k: 5, label: 'Cinquillo' },
            { k: 7, label: 'Seven' },
            { k: Math.floor(n / 4), label: 'Quarter' },
            { k: Math.floor(n / 3), label: 'Third' },
            { k: Math.floor(n / 2), label: 'Half' }
        ].filter(p => p.k > 0 && p.k < n); // Only show valid patterns

        // Remove duplicates by k value
        const unique = [];
        const seen = new Set();
        for (const p of commonPatterns) {
            if (!seen.has(p.k)) {
                seen.add(p.k);
                unique.push(p);
            }
        }

        // Sort by k value and limit to 6 presets
        const presets = unique.sort((a, b) => a.k - b.k).slice(0, 6);

        // Update the preset buttons
        const buttonsHTML = presets.map(p =>
            `<button type="button" class="preset-btn" data-k="${p.k}">E(${p.k},${n})</button>`
        ).join('');

        const buttons = presetsContainer.querySelector('p');
        if (buttons && buttons.nextSibling) {
            // Remove old buttons
            while (buttons.nextSibling) {
                buttons.nextSibling.remove();
            }
        }

        // Add new buttons
        buttons.insertAdjacentHTML('afterend', buttonsHTML);
    }

    function applyEuclideanPattern(rowId, pulses, steps) {
        const pattern = bjorklundToPattern(steps, pulses);
        const patternSet = {
            length: steps,
            clearAll: false,
            patterns: [{
                rowId: String(rowId),
                pattern: pattern
            }]
        };
        const applied = applyPatternSetNow(patternSet);
        if (!applied) {
            queuePatternSet(patternSet);
        }
        showMessage(`Applied E(${pulses},${steps}) pattern`);
    }

    function setupNecklaceView() {
        if (!necklaceViewBtn || !necklaceModal || !necklaceCloseBtn) {
            return;
        }

        // Handle rotation from canvas arrow clicks
        function rotateTrack(rowId, direction) {
            const row = document.querySelector(`.tracker-row[data-id="${rowId}"]`);
            if (!row) return;

            const cells = Array.from(row.querySelectorAll('.tracker-cell'));
            const length = getPatternLength() || 16;
            const pattern = cells.slice(0, length).map(cell =>
                cell.classList.contains('tracker-enabled') ? 'X' : '.'
            );

            // Rotate the pattern
            let rotated;
            if (direction === 'left') {
                rotated = pattern.slice(1).concat(pattern[0]);
            } else {
                rotated = [pattern[pattern.length - 1]].concat(pattern.slice(0, -1));
            }

            // Apply rotated pattern
            cells.forEach((cell, i) => {
                if (i < length) {
                    if (rotated[i] === 'X') {
                        cell.classList.add('tracker-enabled');
                    } else {
                        cell.classList.remove('tracker-enabled');
                    }
                }
            });

            // Refresh circle view
            if (necklaceViewInitialized) {
                necklaceView.refresh(getPatternLength);
            }
        }

        // Open necklace view
        necklaceViewBtn.addEventListener('click', () => {
            if (!necklaceViewInitialized) {
                // Lazy-load NecklaceView class
                if (typeof NecklaceView === 'undefined') {
                    console.error('NecklaceView class not loaded');
                    return;
                }
                necklaceView = new NecklaceView();
                const initialized = necklaceView.init('necklace-canvas');
                if (!initialized) {
                    console.error('Failed to initialize necklace view');
                    return;
                }

                // Set up rotation callback
                necklaceView.setRotateCallback(rotateTrack);

                necklaceViewInitialized = true;
            }

            // Show modal first so canvas can be sized properly
            necklaceModal.style.display = 'flex';

            // Resize canvas now that modal is visible
            necklaceView.resizeCanvas();

            // Load current patterns from tracker
            necklaceView.loadFromTracker(getPatternLength);

            // Sync with current playback state
            const app = window.simpleTrackerApp;
            if (app && app.scheduler && app.scheduler.playing) {
                necklaceView.setPlaying(true);
            }
        });

        // Close necklace view
        necklaceCloseBtn.addEventListener('click', () => {
            necklaceModal.style.display = 'none';
        });

        // Close on outside click
        necklaceModal.addEventListener('click', event => {
            if (event.target === necklaceModal) {
                necklaceModal.style.display = 'none';
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && necklaceModal.style.display !== 'none') {
                necklaceModal.style.display = 'none';
            }
        });

        // Refresh necklace view when patterns change
        trackerParent.addEventListener('click', event => {
            const cell = event.target.closest('.tracker-cell');
            if (cell && necklaceViewInitialized && necklaceModal.style.display !== 'none') {
                // Delay to let the cell state update
                setTimeout(() => {
                    necklaceView.refresh(getPatternLength);
                }, 50);
            }
        });

        // Update necklace view during playback
        document.addEventListener('tracker:pulse', event => {
            if (necklaceViewInitialized && necklaceModal.style.display !== 'none') {
                necklaceView.setCurrentPulse(event.detail.pulseIndex);
            }
        });

        // Update playing state
        document.addEventListener('tracker:play', () => {
            if (necklaceViewInitialized && necklaceModal.style.display !== 'none') {
                necklaceView.setPlaying(true);
            }
        });

        document.addEventListener('tracker:stop', () => {
            if (necklaceViewInitialized && necklaceModal.style.display !== 'none') {
                necklaceView.setPlaying(false);
                necklaceView.setCurrentPulse(0);
            }
        });

        document.addEventListener('tracker:pause', () => {
            if (necklaceViewInitialized && necklaceModal.style.display !== 'none') {
                necklaceView.setPlaying(false);
            }
        });
    }
})();