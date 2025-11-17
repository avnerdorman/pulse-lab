const getSetFormValues = require('get-set-form-values');

const BPM_MULTIPLIER = 4;
const BPM_DISPLAY_DEFAULT = 80;

function normalizeDisplayBpm(value) {
    let bpm = parseFloat(value);
    if (!Number.isFinite(bpm) || bpm <= 0) {
        bpm = BPM_DISPLAY_DEFAULT;
    }
    return bpm;
}

function getSetControls() {

    this.getTrackerControls = function() {

        let formValues = new getSetFormValues();
        let form = document.getElementById("trackerControls");
        let values = formValues.get(form);
        let ret = {};
        for (let key in values) {
            
            if (key === 'delayEnabled') {
                ret[key] = 'delay';
                continue;
            }
            if (key === 'gainEnabled') {
                ret[key] = 'gain';
                continue;
            }
            
            if (key === 'sampleSet') { 
                ret[key] = values[key];
                continue;
            }
            if (key === 'bpm') {
                ret[key] = normalizeDisplayBpm(values[key]);
                continue;
            }
            ret[key] = parseFloat(values[key]);
        }
        return ret;
    }

    this.setTrackerControls = function (values) {
        if (!values) {
            values = this.getTrackerControls();
        }
        const cloned = Object.assign({}, values);
        if (cloned.bpm !== undefined) {
            let display = normalizeDisplayBpm(cloned.bpm);
            if (display > 240) {
                display = Math.round(display / BPM_MULTIPLIER);
            }
            cloned.bpmDisplay = display;
            cloned.bpm = display * BPM_MULTIPLIER;
        }
        this.options = cloned;
    };  

}

module.exports = getSetControls;
