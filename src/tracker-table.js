function trackerTable() {

    this.str = '';
    this.getTable = function () {
        return '<table id="tracker-table">' + this.str + '</table>';
    };

    this.setHeader = function (numRows, data) {
        this.str += `<tr class="tracker-row header">`;
        this.str += this.getCells('header', numRows, { header: true });
        this.str += `</tr>`;

    };

    this.setRows = function (numRows, numCols, data) {

        this.setHeader(numCols, data);
        this.setPulseRow(numCols);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += `<tr class="tracker-row" data-id="${rowID}">`;
            this.str += this.getCells(rowID, numCols, data);
            this.str += `</tr>`;
        }
    };

    this.setPulseRow = function (numCols) {
        this.str += `<tr class="tracker-row pulse-row">`;
        this.str += this.getPulseCells(numCols);
        this.str += `</tr>`;
    };

    this.getFirstCell = function (rowID, data) {
        var str = '';
        
        str += `<td class="tracker-first-cell" data-row-id="${rowID}">`;
        if (rowID === 'header') {
            if (data.title) {
                str += data.title[rowID] || '';
            }
            str += `</td>`;
            return str;
        }

        const fallbackLabel = typeof rowID === 'number' ? `Track ${rowID + 1}` : '';
        const label = data.title && data.title[rowID] ? data.title[rowID] : fallbackLabel;
        str += `<div class="track-label">${label}</div>`;
        str += `</td>`;
        return str;
    };

    this.getCells = function (rowID, numRows, data) {
        var str = '';

        str += this.getFirstCell(rowID, data);

        let cssClass = 'tracker-cell'

        if (rowID == 'header') {
            cssClass = 'tracker-cell-header'
        }

        for (let c = 0; c < numRows; c++) {
            str += `<td class="${cssClass}" data-row-id="${rowID}" data-col-id="${c}">`;
            if (data.header) {
                str += c;
            }
            str += `</td>`;
        }

        if (rowID === 'header') {
            str += `<td class="tracker-action-cell tracker-action-header"></td>`;
        } else {
            str += this.getActionCell(rowID, data);
        }
        return str;
    };

    this.getActionCell = function (rowID, data) {
        const fallbackLabel = typeof rowID === 'number' ? `Track ${rowID + 1}` : 'Track';
        const label = data.title && data.title[rowID] ? data.title[rowID] : fallbackLabel;
        let str = `<td class="tracker-action-cell" data-row-id="${rowID}">`;
        str += `<div class="track-actions" role="group" aria-label="${label} controls">`;
        str += `<button type="button" class="track-action-btn" data-row-id="${rowID}" data-action="shift-left" aria-label="Shift ${label} left">←</button>`;
        str += `<button type="button" class="track-action-btn" data-row-id="${rowID}" data-action="shift-right" aria-label="Shift ${label} right">→</button>`;
        str += `<button type="button" class="track-action-btn" data-row-id="${rowID}" data-action="mute" aria-label="Mute ${label}">⨯</button>`;
        str += `<button type="button" class="track-action-btn" data-row-id="${rowID}" data-action="options" aria-label="${label} options">⋮</button>`;
        // Compact options menu (hidden by default, toggled by Options button)
        str += `<div class="track-options-menu" data-row-id="${rowID}" role="menu" aria-label="${label} options">`;
        str += `<button type="button" class="track-options-item" data-row-id="${rowID}" data-every="2" role="menuitem">Every 2</button>`;
        str += `<button type="button" class="track-options-item" data-row-id="${rowID}" data-every="3" role="menuitem">Every 3</button>`;
        str += `<button type="button" class="track-options-item" data-row-id="${rowID}" data-every="4" role="menuitem">Every 4</button>`;
        str += `<button type="button" class="track-options-item" data-row-id="${rowID}" data-every="5" role="menuitem">Every 5</button>`;
        str += `<hr class="track-options-sep">`;
        str += `<button type="button" class="track-options-item euclidean-trigger" data-row-id="${rowID}" role="menuitem">Euclidean...</button>`;
        str += `<hr class="track-options-sep">`;
        str += `<button type="button" class="track-options-item" data-row-id="${rowID}" data-clear="1" role="menuitem">Clear row</button>`;
        str += `</div>`;
        str += `</div>`;
        str += `</td>`;
        return str;
    };

    this.getPulseCells = function (numCols) {
        let str = `<td class="tracker-first-cell pulse-label">Pulse</td>`;
        for (let c = 0; c < numCols; c++) {
            str += `<td class="pulse-step tracker-enabled" data-col-id="${c}" aria-hidden="true"></td>`;
        }
        str += `<td class="tracker-action-cell pulse-action-spacer"></td>`;
        return str;
    };
}

module.exports = trackerTable;
