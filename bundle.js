(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function AdsrGainNode(ctx) {

    this.ctx = ctx;

    this.mode = 'exponentialRampToValueAtTime';
    // this.mode = 'linearRampToValueAtTime';

    this.options = {
        attackAmp: 0.1, 
        decayAmp: 0.3,
        sustainAmp: 0.7,
        releaseAmp: 0.01,
        attackTime: 0.1,
        decayTime: 0.2,
        sustainTime: 1.0, 
        releaseTime: 3.4,
        autoRelease: true
    };

    /**
     * Set options or use defaults
     * @param {object} options 
     */
    this.setOptions = function (options) {
        this.options = Object.assign(this.options, options);
    };

    this.gainNode
    this.audioTime
    
    /**
     * Get a gain node from defined options
     * @param {float} audioTime an audio context time stamp
     */
    this.getGainNode =  (audioTime) => {

        this.gainNode = this.ctx.createGain();
        this.audioTime = audioTime

        // Firefox does not like 0 -> therefor 0.0000001
        this.gainNode.gain.setValueAtTime(0.0000001, audioTime)        
        
        // Attack
        this.gainNode.gain[this.mode](
            this.options.attackAmp, 
            audioTime + this.options.attackTime)

        // Decay
        this.gainNode.gain[this.mode](
            this.options.decayAmp, 
            audioTime + this.options.attackTime + this.options.decayTime)

        // Sustain
        this.gainNode.gain[this.mode](
            this.options.sustainAmp, 
            audioTime + this.options.attackTime + this.options.sustainTime)
 
        // Check if auto-release
        // Then calculate when note should stop
        if (this.options.autoRelease) {
            this.gainNode.gain[this.mode](
                this.options.releaseAmp,
                audioTime + this.releaseTime()
            )
            
            // Disconnect the gain node 
            this.disconnect(audioTime + this.releaseTime())
        }
        return this.gainNode;
    };

    /**
     * Release the note dynamicaly
     * E.g. if your are making a keyboard, and you want the note
     * to be released according to current audio time + the ADSR release time 
     */
    this.releaseNow = () => {
        this.gainNode.gain[this.mode](
            this.options.releaseAmp,
            this.ctx.currentTime + this.options.releaseTime) 
        this.disconnect(this.options.releaseTime)
    }

    /**
     * Get release time according to the adsr release time
     */
    this.releaseTime = function() {
        return this.options.attackTime + this.options.decayTime + this.options.sustainTime + this.options.releaseTime
    }

    /**
     * Get release time according to 'now'
     */
    this.releaseTimeNow = function () {
        return this.ctx.currentTime + this.releaseTime()
    }
    
    /**
     * 
     * @param {float} disconnectTime the time when gainNode should disconnect 
     */
    this.disconnect = (disconnectTime) => {
        setTimeout( () => {
            this.gainNode.disconnect();
        },
        disconnectTime * 1000);
    };
}

module.exports = AdsrGainNode;

},{}],2:[function(require,module,exports){
// From: https://dev.opera.com/articles/drum-sounds-webaudio/
function audioBufferInstrument(context, buffer) {
    this.context = context;
    this.buffer = buffer;
}

audioBufferInstrument.prototype.setup = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.context.destination);
};

audioBufferInstrument.prototype.get = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    return this.source;
};

audioBufferInstrument.prototype.trigger = function (time) {
    this.setup();
    this.source.start(time);
};

module.exports = audioBufferInstrument;
},{}],3:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],4:[function(require,module,exports){
function getJSONPromise(url) {

    var promise = new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();

        request.open('get', url, true);
        request.responseType = 'text';
        request.onload = function () {
            if (request.status === 200) {
                try {
                    resolve(JSON.parse(request.responseText));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject('JSON could not be loaded ' + url);
            }
        };
        request.send();
    });

    return promise;
}

module.exports = getJSONPromise;

},{}],5:[function(require,module,exports){
function getFormValues(formElement) {
    var formElements = formElement.elements;
    var formParams = {};
    var i = 0;
    var elem = null;
    for (i = 0; i < formElements.length; i += 1) {
        elem = formElements[i];
        switch (elem.type) {

            case 'submit':
                break;

            case 'radio':
                if (elem.checked) {
                    formParams[elem.name] = elem.value;
                }
                break;

            case 'checkbox':
                if (elem.checked) {
                    formParams[elem.name] = elem.value;
                }
                break;

            case 'select-multiple':
                var selectValues = getSelectValues(elem);
                if (selectValues.length > 0) {
                    formParams[elem.name] = selectValues;
                }
                break;
            default:
                if (elem.value !== undefined) {
                    formParams[elem.name] = elem.value;
                }
        }
    }
    return formParams;
}

function setFormValues(formElement, values) {
    var formElements = formElement.elements;
    var i = 0;
    var elem = null;
    for (i = 0; i < formElements.length; i += 1) {
        elem = formElements[i];

        switch (elem.type) {
            case 'submit':
                break;
            case 'radio':
                if (values[elem.name] === elem.value) {
                    elem.checked = true;
                } else {
                    elem.checked = false;
                }
                break;
            case 'checkbox':
                if (values[elem.name] === elem.value) {
                    elem.checked = true;
                } else {
                    elem.checked = false;
                }
                break;
            case 'select-multiple':
                if (values[elem.name]) {
                    setSelectValues(elem, values[elem.name]);
                }
                break;
            default:
                if (values[elem.name] !== undefined) {
                    elem.value = values[elem.name];
                }

        }
    }
}

function setSelectValues(selectElem, values) {
    var options = selectElem.options;
    var opt;

    for (var i = 0, iLen = options.length; i < iLen; i++) {
        opt = options[i];
        if (values.indexOf(opt.value) > -1) {
            opt.selected = true;
        } else {
            opt.selected = false;
        }
    }
}

function getSelectValues(select) {
    var result = [];
    var options = select && select.options;
    var opt;

    for (var i = 0, iLen = options.length; i < iLen; i++) {
        opt = options[i];

        if (opt.selected) {
            result.push(opt.value || opt.text);
        }
    }
    return result;
}

function getSetFormValues() {
    this.set = setFormValues;
    this.get = getFormValues;
}

module.exports = getSetFormValues;

},{}],6:[function(require,module,exports){
'use strict';
var objType = require('obj-type');

module.exports = function (el, str) {
	if (objType(el).indexOf('element') === -1) {
		throw new TypeError('Expected an HTML DOM element as first argument');
	}

	if (typeof str !== 'string') {
		throw new TypeError('Expected a string as second argument');
	}

	if (el.classList) {
		return el.classList.contains(str);
	}

	return new RegExp('(^| )' + str + '( |$)', 'gi').test(el.className);
};

},{"obj-type":10}],7:[function(require,module,exports){
var tinySampleLoader = require('tiny-sample-loader');
var audioBufferInstrument = require('audio-buffer-instrument');
var getJSON = require('get-json-promise');

var buffers = {};
function getSamplePromises (ctx, data) {
    var baseUrl = data.samples;
    var promises = [];

    data.filename = [];
    var i = 0;
    data.files.forEach(function (val) {
        var filename = val.replace(/\.[^/.]+$/, "");
        data.filename.push(filename);
        var remoteUrl = baseUrl + val;

        let loaderPromise = tinySampleLoader(ctx, remoteUrl);
        loaderPromise.then(function (buffer) {
            buffers[filename] = new audioBufferInstrument(ctx, buffer);
        });

        promises.push(loaderPromise);

    });
    
    return promises;
}

function sampleAllPromise(ctx, dataUrl) {
    var promise = new Promise((resolve, reject) => {
        var jsonPromise = getJSON(dataUrl);
        jsonPromise.then(function(data) {
            var samplePromises = getSamplePromises(ctx, data);
            Promise.all(samplePromises).then(function() {
                resolve({data: data, buffers: buffers});
            }).catch(function (error) {
                console.log(error);
            });
        }).catch (function (error) {
            reject(error);
        });
    });

    return promise;
}

function loadSampleSet(ctx, dataUrl) {
    return sampleAllPromise(ctx, dataUrl);
}

module.exports = loadSampleSet;

},{"audio-buffer-instrument":2,"get-json-promise":4,"tiny-sample-loader":8}],8:[function(require,module,exports){
function sampleLoader (context, url) {
    
    var promise = new Promise((resolve, reject) => { 
        var request = new XMLHttpRequest();
    
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            if(request.status === 200){
                context.decodeAudioData(request.response, function (buffer) {
                    resolve(buffer);
                });
            } else {
                reject('tiny-sample-loader request failed');
            }

        };
        request.send();
    });
    
    return promise;
};

module.exports = sampleLoader;

},{}],9:[function(require,module,exports){
(function (process,Buffer){(function (){
'use strict';

/**
 * MIDI file format constants.
 * @return {Constants}
 */
var Constants = {
    VERSION: '3.1.1',
    HEADER_CHUNK_TYPE: [0x4d, 0x54, 0x68, 0x64],
    HEADER_CHUNK_LENGTH: [0x00, 0x00, 0x00, 0x06],
    HEADER_CHUNK_FORMAT0: [0x00, 0x00],
    HEADER_CHUNK_FORMAT1: [0x00, 0x01],
    HEADER_CHUNK_DIVISION: [0x00, 0x80],
    TRACK_CHUNK_TYPE: [0x4d, 0x54, 0x72, 0x6b],
    META_EVENT_ID: 0xFF,
    META_SMTPE_OFFSET: 0x54
};

// src/utils.ts
var fillStr = (s, n) => Array(Math.abs(n) + 1).join(s);

// src/named.ts
function isNamed(src) {
  return src !== null && typeof src === "object" && typeof src.name === "string" ? true : false;
}

// src/pitch.ts
function isPitch(pitch) {
  return pitch !== null && typeof pitch === "object" && typeof pitch.step === "number" && typeof pitch.alt === "number" ? true : false;
}
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
var STEPS_TO_OCTS = FIFTHS.map(
  (fifths) => Math.floor(fifths * 7 / 12)
);
function encode(pitch) {
  const { step, alt, oct, dir = 1 } = pitch;
  const f = FIFTHS[step] + 7 * alt;
  if (oct === void 0) {
    return [dir * f];
  }
  const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
}

// src/note.ts
var NoNote = { empty: true, name: "", pc: "", acc: "" };
var cache = /* @__PURE__ */ new Map();
var stepToLetter = (step) => "CDEFGAB".charAt(step);
var altToAcc = (alt) => alt < 0 ? fillStr("b", -alt) : fillStr("#", alt);
var accToAlt = (acc) => acc[0] === "b" ? -acc.length : acc.length;
function note(src) {
  const stringSrc = JSON.stringify(src);
  const cached = cache.get(stringSrc);
  if (cached) {
    return cached;
  }
  const value = typeof src === "string" ? parse(src) : isPitch(src) ? note(pitchName(src)) : isNamed(src) ? note(src.name) : NoNote;
  cache.set(stringSrc, value);
  return value;
}
var REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
function tokenizeNote(str) {
  const m = REGEX.exec(str);
  return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
}
var mod = (n, m) => (n % m + m) % m;
var SEMI = [0, 2, 4, 5, 7, 9, 11];
function parse(noteName) {
  const tokens = tokenizeNote(noteName);
  if (tokens[0] === "" || tokens[3] !== "") {
    return NoNote;
  }
  const letter = tokens[0];
  const acc = tokens[1];
  const octStr = tokens[2];
  const step = (letter.charCodeAt(0) + 3) % 7;
  const alt = accToAlt(acc);
  const oct = octStr.length ? +octStr : void 0;
  const coord = encode({ step, alt, oct });
  const name = letter + acc + octStr;
  const pc = letter + acc;
  const chroma = (SEMI[step] + alt + 120) % 12;
  const height = oct === void 0 ? mod(SEMI[step] + alt, 12) - 12 * 99 : SEMI[step] + alt + 12 * (oct + 1);
  const midi = height >= 0 && height <= 127 ? height : null;
  const freq = oct === void 0 ? null : Math.pow(2, (height - 69) / 12) * 440;
  return {
    empty: false,
    acc,
    alt,
    chroma,
    coord,
    freq,
    height,
    letter,
    midi,
    name,
    oct,
    pc,
    step
  };
}
function pitchName(props) {
  const { step, alt, oct } = props;
  const letter = stepToLetter(step);
  if (!letter) {
    return "";
  }
  const pc = letter + altToAcc(alt);
  return oct || oct === 0 ? pc + oct : pc;
}

// index.ts
function isMidi(arg) {
  return +arg >= 0 && +arg <= 127;
}
function toMidi(note$1) {
  if (isMidi(note$1)) {
    return +note$1;
  }
  const n = note(note$1);
  return n.empty ? null : n.midi;
}

/**
 * Static utility functions used throughout the library.
 */
var Utils = /** @class */ (function () {
    function Utils() {
    }
    /**
     * Gets MidiWriterJS version number.
     * @return {string}
     */
    Utils.version = function () {
        return Constants.VERSION;
    };
    /**
     * Convert a string to an array of bytes
     * @param {string} string
     * @return {array}
     */
    Utils.stringToBytes = function (string) {
        return string.split('').map(function (char) { return char.charCodeAt(0); });
    };
    /**
     * Checks if argument is a valid number.
     * @param {*} n - Value to check
     * @return {boolean}
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Utils.isNumeric = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    /**
     * Returns the correct MIDI number for the specified pitch.
     * Uses Tonal Midi - https://github.com/danigb/tonal/tree/master/packages/midi
     * @param {(string|number)} pitch - 'C#4' or midi note code
     * @param {string} middleC
     * @return {number}
     */
    Utils.getPitch = function (pitch, middleC) {
        if (middleC === void 0) { middleC = 'C4'; }
        return 60 - toMidi(middleC) + toMidi(pitch);
    };
    /**
     * Translates number of ticks to MIDI timestamp format, returning an array of
     * hex strings with the time values. Midi has a very particular time to express time,
     * take a good look at the spec before ever touching this function.
     * Thanks to https://github.com/sergi/jsmidi
     *
     * @param {number} ticks - Number of ticks to be translated
     * @return {array} - Bytes that form the MIDI time value
     */
    Utils.numberToVariableLength = function (ticks) {
        ticks = Math.round(ticks);
        var buffer = ticks & 0x7F;
        // eslint-disable-next-line no-cond-assign
        while (ticks = ticks >> 7) {
            buffer <<= 8;
            buffer |= ((ticks & 0x7F) | 0x80);
        }
        var bList = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
            bList.push(buffer & 0xff);
            if (buffer & 0x80)
                buffer >>= 8;
            else {
                break;
            }
        }
        return bList;
    };
    /**
     * Counts number of bytes in string
     * @param {string} s
     * @return {number}
     */
    Utils.stringByteCount = function (s) {
        return encodeURI(s).split(/%..|./).length - 1;
    };
    /**
     * Get an int from an array of bytes.
     * @param {array} bytes
     * @return {number}
     */
    Utils.numberFromBytes = function (bytes) {
        var hex = '';
        var stringResult;
        bytes.forEach(function (byte) {
            stringResult = byte.toString(16);
            // ensure string is 2 chars
            if (stringResult.length == 1)
                stringResult = "0" + stringResult;
            hex += stringResult;
        });
        return parseInt(hex, 16);
    };
    /**
     * Takes a number and splits it up into an array of bytes.  Can be padded by passing a number to bytesNeeded
     * @param {number} number
     * @param {number} bytesNeeded
     * @return {array} - Array of bytes
     */
    Utils.numberToBytes = function (number, bytesNeeded) {
        bytesNeeded = bytesNeeded || 1;
        var hexString = number.toString(16);
        if (hexString.length & 1) { // Make sure hex string is even number of chars
            hexString = '0' + hexString;
        }
        // Split hex string into an array of two char elements
        var hexArray = hexString.match(/.{2}/g);
        // Now parse them out as integers
        var intArray = hexArray.map(function (item) { return parseInt(item, 16); });
        // Prepend empty bytes if we don't have enough
        if (intArray.length < bytesNeeded) {
            while (bytesNeeded - intArray.length > 0) {
                intArray.unshift(0);
            }
        }
        return intArray;
    };
    /**
     * Converts value to array if needed.
     * @param {any} value
     * @return {array}
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Utils.toArray = function (value) {
        if (Array.isArray(value))
            return value;
        return [value];
    };
    /**
     * Converts velocity to value 0-127
     * @param {number} velocity - Velocity value 1-100
     * @return {number}
     */
    Utils.convertVelocity = function (velocity) {
        // Max passed value limited to 100
        velocity = velocity > 100 ? 100 : velocity;
        return Math.round(velocity / 100 * 127);
    };
    /**
     * Gets the total number of ticks of a specified duration.
     * Note: type=='note' defaults to quarter note, type==='rest' defaults to 0
     * @param {(string|array)} duration
     * @return {number}
     */
    Utils.getTickDuration = function (duration) {
        if (Array.isArray(duration)) {
            // Recursively execute this method for each item in the array and return the sum of tick durations.
            return duration.map(function (value) {
                return Utils.getTickDuration(value);
            }).reduce(function (a, b) {
                return a + b;
            }, 0);
        }
        duration = duration.toString();
        if (duration.toLowerCase().charAt(0) === 't') {
            // If duration starts with 't' then the number that follows is an explicit tick count
            var ticks = parseInt(duration.substring(1));
            if (isNaN(ticks) || ticks < 0) {
                throw new Error(duration + ' is not a valid duration.');
            }
            return ticks;
        }
        // Need to apply duration here.  Quarter note == Constants.HEADER_CHUNK_DIVISION
        var quarterTicks = Utils.numberFromBytes(Constants.HEADER_CHUNK_DIVISION);
        var tickDuration = quarterTicks * Utils.getDurationMultiplier(duration);
        return Utils.getRoundedIfClose(tickDuration);
    };
    /**
     * Due to rounding errors in JavaScript engines,
     * it's safe to round when we're very close to the actual tick number
     *
     * @static
     * @param {number} tick
     * @return {number}
     */
    Utils.getRoundedIfClose = function (tick) {
        var roundedTick = Math.round(tick);
        return Math.abs(roundedTick - tick) < 0.000001 ? roundedTick : tick;
    };
    /**
     * Due to low precision of MIDI,
     * we need to keep track of rounding errors in deltas.
     * This function will calculate the rounding error for a given duration.
     *
     * @static
     * @param {number} tick
     * @return {number}
     */
    Utils.getPrecisionLoss = function (tick) {
        var roundedTick = Math.round(tick);
        return roundedTick - tick;
    };
    /**
     * Gets what to multiple ticks/quarter note by to get the specified duration.
     * Note: type=='note' defaults to quarter note, type==='rest' defaults to 0
     * @param {string} duration
     * @return {number}
     */
    Utils.getDurationMultiplier = function (duration) {
        // Need to apply duration here.
        // Quarter note == Constants.HEADER_CHUNK_DIVISION ticks.
        if (duration === '0')
            return 0;
        var match = duration.match(/^(?<dotted>d+)?(?<base>\d+)(?:t(?<tuplet>\d*))?/);
        if (match) {
            var base = Number(match.groups.base);
            // 1 or any power of two:
            var isValidBase = base === 1 || ((base & (base - 1)) === 0);
            if (isValidBase) {
                // how much faster or slower is this note compared to a quarter?
                var ratio = base / 4;
                var durationInQuarters = 1 / ratio;
                var _a = match.groups, dotted = _a.dotted, tuplet = _a.tuplet;
                if (dotted) {
                    var thisManyDots = dotted.length;
                    var divisor = Math.pow(2, thisManyDots);
                    durationInQuarters = durationInQuarters + (durationInQuarters * ((divisor - 1) / divisor));
                }
                if (typeof tuplet === 'string') {
                    var fitInto = durationInQuarters * 2;
                    // default to triplet:
                    var thisManyNotes = Number(tuplet || '3');
                    durationInQuarters = fitInto / thisManyNotes;
                }
                return durationInQuarters;
            }
        }
        throw new Error(duration + ' is not a valid duration.');
    };
    return Utils;
}());

/**
 * Holds all data for a "controller change" MIDI event
 * @param {object} fields {controllerNumber: integer, controllerValue: integer, delta: integer}
 * @return {ControllerChangeEvent}
 */
var ControllerChangeEvent = /** @class */ (function () {
    function ControllerChangeEvent(fields) {
        this.channel = fields.channel - 1 || 0;
        this.controllerValue = fields.controllerValue;
        this.controllerNumber = fields.controllerNumber;
        this.delta = fields.delta || 0x00;
        this.name = 'ControllerChangeEvent';
        this.status = 0xB0;
        this.data = Utils.numberToVariableLength(fields.delta).concat(this.status | this.channel, this.controllerNumber, this.controllerValue);
    }
    return ControllerChangeEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {CopyrightEvent}
 */
var CopyrightEvent = /** @class */ (function () {
    function CopyrightEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'CopyrightEvent';
        this.text = fields.text;
        this.type = 0x02;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return CopyrightEvent;
}());

/**
 * Object representation of a cue point meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {CuePointEvent}
 */
var CuePointEvent = /** @class */ (function () {
    function CuePointEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'CuePointEvent';
        this.text = fields.text;
        this.type = 0x07;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return CuePointEvent;
}());

/**
 * Object representation of a end track meta event.
 * @param {object} fields {delta: integer}
 * @return {EndTrackEvent}
 */
var EndTrackEvent = /** @class */ (function () {
    function EndTrackEvent(fields) {
        this.delta = (fields === null || fields === void 0 ? void 0 : fields.delta) || 0x00;
        this.name = 'EndTrackEvent';
        this.type = [0x2F, 0x00];
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type);
    }
    return EndTrackEvent;
}());

/**
 * Object representation of an instrument name meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {InstrumentNameEvent}
 */
var InstrumentNameEvent = /** @class */ (function () {
    function InstrumentNameEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'InstrumentNameEvent';
        this.text = fields.text;
        this.type = 0x04;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return InstrumentNameEvent;
}());

/**
 * Object representation of a key signature meta event.
 * @return {KeySignatureEvent}
 */
var KeySignatureEvent = /** @class */ (function () {
    function KeySignatureEvent(sf, mi) {
        this.name = 'KeySignatureEvent';
        this.type = 0x59;
        var mode = mi || 0;
        sf = sf || 0;
        //	Function called with string notation
        if (typeof mi === 'undefined') {
            var fifths = [
                ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'],
                ['ab', 'eb', 'bb', 'f', 'c', 'g', 'd', 'a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'a#']
            ];
            var _sflen = sf.length;
            var note = sf || 'C';
            if (sf[0] === sf[0].toLowerCase())
                mode = 1;
            if (_sflen > 1) {
                switch (sf.charAt(_sflen - 1)) {
                    case 'm':
                        mode = 1;
                        note = sf.charAt(0).toLowerCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                    case '-':
                        mode = 1;
                        note = sf.charAt(0).toLowerCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                    case 'M':
                        mode = 0;
                        note = sf.charAt(0).toUpperCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                    case '+':
                        mode = 0;
                        note = sf.charAt(0).toUpperCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                }
            }
            var fifthindex = fifths[mode].indexOf(note);
            sf = fifthindex === -1 ? 0 : fifthindex - 7;
        }
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(0x00).concat(Constants.META_EVENT_ID, this.type, [0x02], // Size
        Utils.numberToBytes(sf, 1), // Number of sharp or flats ( < 0 flat; > 0 sharp)
        Utils.numberToBytes(mode, 1));
    }
    return KeySignatureEvent;
}());

/**
 * Object representation of a lyric meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {LyricEvent}
 */
var LyricEvent = /** @class */ (function () {
    function LyricEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'LyricEvent';
        this.text = fields.text;
        this.type = 0x05;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return LyricEvent;
}());

/**
 * Object representation of a marker meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {MarkerEvent}
 */
var MarkerEvent = /** @class */ (function () {
    function MarkerEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'MarkerEvent';
        this.text = fields.text;
        this.type = 0x06;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return MarkerEvent;
}());

/**
 * Holds all data for a "note on" MIDI event
 * @param {object} fields {data: []}
 * @return {NoteOnEvent}
 */
var NoteOnEvent = /** @class */ (function () {
    function NoteOnEvent(fields) {
        this.name = 'NoteOnEvent';
        this.channel = fields.channel || 1;
        this.pitch = fields.pitch;
        this.wait = fields.wait || 0;
        this.velocity = fields.velocity || 50;
        this.tick = fields.tick || null;
        this.delta = null;
        this.data = fields.data;
        this.status = 0x90;
    }
    /**
     * Builds int array for this event.
     * @param {Track} track - parent track
     * @return {NoteOnEvent}
     */
    NoteOnEvent.prototype.buildData = function (track, precisionDelta, options) {
        if (options === void 0) { options = {}; }
        this.data = [];
        // Explicitly defined startTick event
        if (this.tick) {
            this.tick = Utils.getRoundedIfClose(this.tick);
            // If this is the first event in the track then use event's starting tick as delta.
            if (track.tickPointer == 0) {
                this.delta = this.tick;
            }
        }
        else {
            this.delta = Utils.getTickDuration(this.wait);
            this.tick = Utils.getRoundedIfClose(track.tickPointer + this.delta);
        }
        this.deltaWithPrecisionCorrection = Utils.getRoundedIfClose(this.delta - precisionDelta);
        this.data = Utils.numberToVariableLength(this.deltaWithPrecisionCorrection)
            .concat(this.status | this.channel - 1, Utils.getPitch(this.pitch, options.middleC), Utils.convertVelocity(this.velocity));
        return this;
    };
    return NoteOnEvent;
}());

/**
 * Holds all data for a "note off" MIDI event
 * @param {object} fields {data: []}
 * @return {NoteOffEvent}
 */
var NoteOffEvent = /** @class */ (function () {
    function NoteOffEvent(fields) {
        this.name = 'NoteOffEvent';
        this.channel = fields.channel || 1;
        this.pitch = fields.pitch;
        this.velocity = fields.velocity || 50;
        this.tick = fields.tick || null;
        this.data = fields.data;
        this.delta = fields.delta || Utils.getTickDuration(fields.duration);
        this.status = 0x80;
    }
    /**
     * Builds int array for this event.
     * @param {Track} track - parent track
     * @return {NoteOffEvent}
     */
    NoteOffEvent.prototype.buildData = function (track, precisionDelta, options) {
        if (options === void 0) { options = {}; }
        if (this.tick === null) {
            this.tick = Utils.getRoundedIfClose(this.delta + track.tickPointer);
        }
        this.deltaWithPrecisionCorrection = Utils.getRoundedIfClose(this.delta - precisionDelta);
        this.data = Utils.numberToVariableLength(this.deltaWithPrecisionCorrection)
            .concat(this.status | this.channel - 1, Utils.getPitch(this.pitch, options.middleC), Utils.convertVelocity(this.velocity));
        return this;
    };
    return NoteOffEvent;
}());

/**
 * Wrapper for noteOnEvent/noteOffEvent objects that builds both events.
 * @param {object} fields - {pitch: '[C4]', duration: '4', wait: '4', velocity: 1-100}
 * @return {NoteEvent}
 */
var NoteEvent = /** @class */ (function () {
    function NoteEvent(fields) {
        this.data = [];
        this.name = 'NoteEvent';
        this.pitch = Utils.toArray(fields.pitch);
        this.channel = fields.channel || 1;
        this.duration = fields.duration || '4';
        this.grace = fields.grace;
        this.repeat = fields.repeat || 1;
        this.sequential = fields.sequential || false;
        this.tick = fields.startTick || fields.tick || null;
        this.velocity = fields.velocity || 50;
        this.wait = fields.wait || 0;
        this.tickDuration = Utils.getTickDuration(this.duration);
        this.restDuration = Utils.getTickDuration(this.wait);
        this.events = []; // Hold actual NoteOn/NoteOff events
    }
    /**
     * Builds int array for this event.
     * @return {NoteEvent}
     */
    NoteEvent.prototype.buildData = function () {
        var _this = this;
        // Reset data array
        this.data = [];
        // Apply grace note(s) and subtract ticks (currently 1 tick per grace note) from tickDuration so net value is the same
        if (this.grace) {
            var graceDuration_1 = 1;
            this.grace = Utils.toArray(this.grace);
            this.grace.forEach(function () {
                var noteEvent = new NoteEvent({ pitch: _this.grace, duration: 'T' + graceDuration_1 });
                _this.data = _this.data.concat(noteEvent.data);
            });
        }
        // fields.pitch could be an array of pitches.
        // If so create note events for each and apply the same duration.
        // By default this is a chord if it's an array of notes that requires one NoteOnEvent.
        // If this.sequential === true then it's a sequential string of notes that requires separate NoteOnEvents.
        if (!this.sequential) {
            // Handle repeat
            for (var j = 0; j < this.repeat; j++) {
                // Note on
                this.pitch.forEach(function (p, i) {
                    var noteOnNew;
                    if (i == 0) {
                        noteOnNew = new NoteOnEvent({
                            channel: _this.channel,
                            wait: _this.wait,
                            delta: Utils.getTickDuration(_this.wait),
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick,
                        });
                    }
                    else {
                        // Running status (can ommit the note on status)
                        //noteOn = new NoteOnEvent({data: [0, Utils.getPitch(p), Utils.convertVelocity(this.velocity)]});
                        noteOnNew = new NoteOnEvent({
                            channel: _this.channel,
                            wait: 0,
                            delta: 0,
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick,
                        });
                    }
                    _this.events.push(noteOnNew);
                });
                // Note off
                this.pitch.forEach(function (p, i) {
                    var noteOffNew;
                    if (i == 0) {
                        //noteOff = new NoteOffEvent({data: Utils.numberToVariableLength(tickDuration).concat(this.getNoteOffStatus(), Utils.getPitch(p), Utils.convertVelocity(this.velocity))});
                        noteOffNew = new NoteOffEvent({
                            channel: _this.channel,
                            duration: _this.duration,
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick !== null ? Utils.getTickDuration(_this.duration) + _this.tick : null,
                        });
                    }
                    else {
                        // Running status (can omit the note off status)
                        //noteOff = new NoteOffEvent({data: [0, Utils.getPitch(p), Utils.convertVelocity(this.velocity)]});
                        noteOffNew = new NoteOffEvent({
                            channel: _this.channel,
                            duration: 0,
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick !== null ? Utils.getTickDuration(_this.duration) + _this.tick : null,
                        });
                    }
                    _this.events.push(noteOffNew);
                });
            }
        }
        else {
            // Handle repeat
            for (var j = 0; j < this.repeat; j++) {
                this.pitch.forEach(function (p, i) {
                    var noteOnNew = new NoteOnEvent({
                        channel: _this.channel,
                        wait: (i > 0 ? 0 : _this.wait),
                        delta: (i > 0 ? 0 : Utils.getTickDuration(_this.wait)),
                        velocity: _this.velocity,
                        pitch: p,
                        tick: _this.tick,
                    });
                    var noteOffNew = new NoteOffEvent({
                        channel: _this.channel,
                        duration: _this.duration,
                        velocity: _this.velocity,
                        pitch: p,
                    });
                    _this.events.push(noteOnNew, noteOffNew);
                });
            }
        }
        return this;
    };
    return NoteEvent;
}());

/**
 * Holds all data for a "Pitch Bend" MIDI event
 * [ -1.0, 0, 1.0 ] ->  [ 0, 8192, 16383]
 * @param {object} fields { bend : float, channel : int, delta: int }
 * @return {PitchBendEvent}
 */
var PitchBendEvent = /** @class */ (function () {
    function PitchBendEvent(fields) {
        this.channel = fields.channel || 0;
        this.delta = fields.delta || 0x00;
        this.name = 'PitchBendEvent';
        this.status = 0xE0;
        var bend14 = this.scale14bits(fields.bend);
        var lsbValue = bend14 & 0x7f;
        var msbValue = (bend14 >> 7) & 0x7f;
        this.data = Utils.numberToVariableLength(this.delta).concat(this.status | this.channel, lsbValue, msbValue);
    }
    PitchBendEvent.prototype.scale14bits = function (zeroOne) {
        if (zeroOne <= 0) {
            return Math.floor(16384 * (zeroOne + 1) / 2);
        }
        return Math.floor(16383 * (zeroOne + 1) / 2);
    };
    return PitchBendEvent;
}());

/**
 * Holds all data for a "program change" MIDI event
 * @param {object} fields {instrument: integer, delta: integer}
 * @return {ProgramChangeEvent}
 */
var ProgramChangeEvent = /** @class */ (function () {
    function ProgramChangeEvent(fields) {
        this.channel = fields.channel || 0;
        this.delta = fields.delta || 0x00;
        this.instrument = fields.instrument;
        this.status = 0xC0;
        this.name = 'ProgramChangeEvent';
        // delta time defaults to 0.
        this.data = Utils.numberToVariableLength(this.delta).concat(this.status | this.channel, this.instrument);
    }
    return ProgramChangeEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {bpm: integer, delta: integer}
 * @return {TempoEvent}
 */
var TempoEvent = /** @class */ (function () {
    function TempoEvent(fields) {
        this.bpm = fields.bpm;
        this.delta = fields.delta || 0x00;
        this.tick = fields.tick;
        this.name = 'TempoEvent';
        this.type = 0x51;
        var tempo = Math.round(60000000 / this.bpm);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, [0x03], // Size
        Utils.numberToBytes(tempo, 3));
    }
    return TempoEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {TextEvent}
 */
var TextEvent = /** @class */ (function () {
    function TextEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.text = fields.text;
        this.name = 'TextEvent';
        this.type = 0x01;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(fields.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return TextEvent;
}());

/**
 * Object representation of a time signature meta event.
 * @return {TimeSignatureEvent}
 */
var TimeSignatureEvent = /** @class */ (function () {
    function TimeSignatureEvent(numerator, denominator, midiclockspertick, notespermidiclock) {
        this.name = 'TimeSignatureEvent';
        this.type = 0x58;
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(0x00).concat(Constants.META_EVENT_ID, this.type, [0x04], // Size
        Utils.numberToBytes(numerator, 1), // Numerator, 1 bytes
        Utils.numberToBytes(Math.log2(denominator), 1), // Denominator is expressed as pow of 2, 1 bytes
        Utils.numberToBytes(midiclockspertick || 24, 1), // MIDI Clocks per tick, 1 bytes
        Utils.numberToBytes(notespermidiclock || 8, 1));
    }
    return TimeSignatureEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {TrackNameEvent}
 */
var TrackNameEvent = /** @class */ (function () {
    function TrackNameEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'TrackNameEvent';
        this.text = fields.text;
        this.type = 0x03;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return TrackNameEvent;
}());

/**
 * Holds all data for a track.
 * @param {object} fields {type: number, data: array, size: array, events: array}
 * @return {Track}
 */
var Track = /** @class */ (function () {
    function Track() {
        this.type = Constants.TRACK_CHUNK_TYPE;
        this.data = [];
        this.size = [];
        this.events = [];
        this.explicitTickEvents = [];
        // If there are any events with an explicit tick defined then we will create a "sub" track for those
        // and merge them in and the end.
        this.tickPointer = 0; // Each time an event is added this will increase
    }
    /**
     * Adds any event type to the track.
     * Events without a specific startTick property are assumed to be added in order of how they should output.
     * Events with a specific startTick property are set aside for now will be merged in during build process.
     *
     * TODO: Don't put startTick events in their own array.  Just lump everything together and sort it out during buildData();
     * @param {(NoteEvent|ProgramChangeEvent)} events - Event object or array of Event objects.
     * @param {Function} mapFunction - Callback which can be used to apply specific properties to all events.
     * @return {Track}
     */
    Track.prototype.addEvent = function (events, mapFunction) {
        var _this = this;
        Utils.toArray(events).forEach(function (event, i) {
            if (event instanceof NoteEvent) {
                // Handle map function if provided
                if (typeof mapFunction === 'function') {
                    var properties = mapFunction(i, event);
                    if (typeof properties === 'object') {
                        Object.assign(event, properties);
                    }
                }
                // If this note event has an explicit startTick then we need to set aside for now
                if (event.tick !== null) {
                    _this.explicitTickEvents.push(event);
                }
                else {
                    // Push each on/off event to track's event stack
                    event.buildData().events.forEach(function (e) { return _this.events.push(e); });
                }
            }
            else {
                _this.events.push(event);
            }
        });
        return this;
    };
    /**
     * Builds int array of all events.
     * @param {object} options
     * @return {Track}
     */
    Track.prototype.buildData = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Reset
        this.data = [];
        this.size = [];
        this.tickPointer = 0;
        var precisionLoss = 0;
        this.events.forEach(function (event) {
            // Build event & add to total tick duration
            if (event instanceof NoteOnEvent || event instanceof NoteOffEvent) {
                var built = event.buildData(_this, precisionLoss, options);
                precisionLoss = Utils.getPrecisionLoss(event.deltaWithPrecisionCorrection || 0);
                _this.data = _this.data.concat(built.data);
                _this.tickPointer = Utils.getRoundedIfClose(event.tick);
            }
            else if (event instanceof TempoEvent) {
                _this.tickPointer = Utils.getRoundedIfClose(event.tick);
                _this.data = _this.data.concat(event.data);
            }
            else {
                _this.data = _this.data.concat(event.data);
            }
        });
        this.mergeExplicitTickEvents();
        // If the last event isn't EndTrackEvent, then tack it onto the data.
        if (!this.events.length || !(this.events[this.events.length - 1] instanceof EndTrackEvent)) {
            this.data = this.data.concat((new EndTrackEvent).data);
        }
        this.size = Utils.numberToBytes(this.data.length, 4); // 4 bytes long
        return this;
    };
    Track.prototype.mergeExplicitTickEvents = function () {
        var _this = this;
        if (!this.explicitTickEvents.length)
            return;
        // First sort asc list of events by startTick
        this.explicitTickEvents.sort(function (a, b) { return a.tick - b.tick; });
        // Now this.explicitTickEvents is in correct order, and so is this.events naturally.
        // For each explicit tick event, splice it into the main list of events and
        // adjust the delta on the following events so they still play normally.
        this.explicitTickEvents.forEach(function (noteEvent) {
            // Convert NoteEvent to it's respective NoteOn/NoteOff events
            // Note that as we splice in events the delta for the NoteOff ones will
            // Need to change based on what comes before them after the splice.
            noteEvent.buildData().events.forEach(function (e) { return e.buildData(_this); });
            // Merge each event individually into this track's event list.
            noteEvent.events.forEach(function (event) { return _this.mergeSingleEvent(event); });
        });
        // Hacky way to rebuild track with newly spliced events.  Need better solution.
        this.explicitTickEvents = [];
        this.buildData();
    };
    /**
     * Merges another track's events with this track.
     * @param {Track} track
     * @return {Track}
     */
    Track.prototype.mergeTrack = function (track) {
        var _this = this;
        // First build this track to populate each event's tick property
        this.buildData();
        // Then build track to be merged so that tick property is populated on all events & merge each event.
        track.buildData().events.forEach(function (event) { return _this.mergeSingleEvent(event); });
        return this;
    };
    /**
     * Merges a single event into this track's list of events based on event.tick property.
     * @param {AbstractEvent} - event
     * @return {Track}
     */
    Track.prototype.mergeSingleEvent = function (event) {
        // There are no events yet, so just add it in.
        if (!this.events.length) {
            this.addEvent(event);
            return;
        }
        // Find index of existing event we need to follow with
        var lastEventIndex;
        for (var i = 0; i < this.events.length; i++) {
            if (this.events[i].tick > event.tick)
                break;
            lastEventIndex = i;
        }
        var splicedEventIndex = lastEventIndex + 1;
        // Need to adjust the delta of this event to ensure it falls on the correct tick.
        event.delta = event.tick - this.events[lastEventIndex].tick;
        // Splice this event at lastEventIndex + 1
        this.events.splice(splicedEventIndex, 0, event);
        // Now adjust delta of all following events
        for (var i = splicedEventIndex + 1; i < this.events.length; i++) {
            // Since each existing event should have a tick value at this point we just need to
            // adjust delta to that the event still falls on the correct tick.
            this.events[i].delta = this.events[i].tick - this.events[i - 1].tick;
        }
    };
    /**
     * Removes all events matching specified type.
     * @param {string} eventName - Event type
     * @return {Track}
     */
    Track.prototype.removeEventsByName = function (eventName) {
        var _this = this;
        this.events.forEach(function (event, index) {
            if (event.name === eventName) {
                _this.events.splice(index, 1);
            }
        });
        return this;
    };
    /**
     * Sets tempo of the MIDI file.
     * @param {number} bpm - Tempo in beats per minute.
     * @param {number} tick - Start tick.
     * @return {Track}
     */
    Track.prototype.setTempo = function (bpm, tick) {
        if (tick === void 0) { tick = 0; }
        return this.addEvent(new TempoEvent({ bpm: bpm, tick: tick }));
    };
    /**
     * Sets time signature.
     * @param {number} numerator - Top number of the time signature.
     * @param {number} denominator - Bottom number of the time signature.
     * @param {number} midiclockspertick - Defaults to 24.
     * @param {number} notespermidiclock - Defaults to 8.
     * @return {Track}
     */
    Track.prototype.setTimeSignature = function (numerator, denominator, midiclockspertick, notespermidiclock) {
        return this.addEvent(new TimeSignatureEvent(numerator, denominator, midiclockspertick, notespermidiclock));
    };
    /**
     * Sets key signature.
     * @param {*} sf -
     * @param {*} mi -
     * @return {Track}
     */
    Track.prototype.setKeySignature = function (sf, mi) {
        return this.addEvent(new KeySignatureEvent(sf, mi));
    };
    /**
     * Adds text to MIDI file.
     * @param {string} text - Text to add.
     * @return {Track}
     */
    Track.prototype.addText = function (text) {
        return this.addEvent(new TextEvent({ text: text }));
    };
    /**
     * Adds copyright to MIDI file.
     * @param {string} text - Text of copyright line.
     * @return {Track}
     */
    Track.prototype.addCopyright = function (text) {
        return this.addEvent(new CopyrightEvent({ text: text }));
    };
    /**
     * Adds Sequence/Track Name.
     * @param {string} text - Text of track name.
     * @return {Track}
     */
    Track.prototype.addTrackName = function (text) {
        return this.addEvent(new TrackNameEvent({ text: text }));
    };
    /**
     * Sets instrument name of track.
     * @param {string} text - Name of instrument.
     * @return {Track}
     */
    Track.prototype.addInstrumentName = function (text) {
        return this.addEvent(new InstrumentNameEvent({ text: text }));
    };
    /**
     * Adds marker to MIDI file.
     * @param {string} text - Marker text.
     * @return {Track}
     */
    Track.prototype.addMarker = function (text) {
        return this.addEvent(new MarkerEvent({ text: text }));
    };
    /**
     * Adds cue point to MIDI file.
     * @param {string} text - Text of cue point.
     * @return {Track}
     */
    Track.prototype.addCuePoint = function (text) {
        return this.addEvent(new CuePointEvent({ text: text }));
    };
    /**
     * Adds lyric to MIDI file.
     * @param {string} text - Lyric text to add.
     * @return {Track}
     */
    Track.prototype.addLyric = function (text) {
        return this.addEvent(new LyricEvent({ text: text }));
    };
    /**
     * Channel mode messages
     * @return {Track}
     */
    Track.prototype.polyModeOn = function () {
        var event = new NoteOnEvent({ data: [0x00, 0xB0, 0x7E, 0x00] });
        return this.addEvent(event);
    };
    /**
     * Sets a pitch bend.
     * @param {float} bend - Bend value ranging [-1,1], zero meaning no bend.
     * @return {Track}
     */
    Track.prototype.setPitchBend = function (bend) {
        return this.addEvent(new PitchBendEvent({ bend: bend }));
    };
    /**
     * Adds a controller change event
     * @param {number} number - Control number.
     * @param {number} value - Control value.
     * @param {number} channel - Channel to send controller change event on (1-based).
     * @param {number} delta - Track tick offset for cc event.
     * @return {Track}
     */
    Track.prototype.controllerChange = function (number, value, channel, delta) {
        return this.addEvent(new ControllerChangeEvent({ controllerNumber: number, controllerValue: value, channel: channel, delta: delta }));
    };
    return Track;
}());

var VexFlow = /** @class */ (function () {
    function VexFlow() {
    }
    /**
     * Support for converting VexFlow voice into MidiWriterJS track
     * @return MidiWriter.Track object
     */
    VexFlow.prototype.trackFromVoice = function (voice, options) {
        var _this = this;
        if (options === void 0) { options = { addRenderedAccidentals: false }; }
        var track = new Track;
        var wait = [];
        voice.tickables.forEach(function (tickable) {
            if (tickable.noteType === 'n') {
                track.addEvent(new NoteEvent({
                    pitch: tickable.keys.map(function (pitch, index) { return _this.convertPitch(pitch, index, tickable, options.addRenderedAccidentals); }),
                    duration: _this.convertDuration(tickable),
                    wait: wait
                }));
                // reset wait
                wait = [];
            }
            else if (tickable.noteType === 'r') {
                // move on to the next tickable and add this to the stack
                // of the `wait` property for the next note event
                wait.push(_this.convertDuration(tickable));
            }
        });
        // There may be outstanding rests at the end of the track,
        // pad with a ghost note (zero duration and velocity), just to capture the wait.
        if (wait.length > 0) {
            track.addEvent(new NoteEvent({ pitch: '[c4]', duration: '0', wait: wait, velocity: '0' }));
        }
        return track;
    };
    /**
     * Converts VexFlow pitch syntax to MidiWriterJS syntax
     * @param pitch string
     * @param index pitch index
     * @param note struct from Vexflow
     * @param addRenderedAccidentals adds Vexflow rendered accidentals
     */
    VexFlow.prototype.convertPitch = function (pitch, index, note, addRenderedAccidentals) {
        var _a;
        if (addRenderedAccidentals === void 0) { addRenderedAccidentals = false; }
        // Splits note name from octave
        var pitchParts = pitch.split('/');
        // Retrieves accidentals from pitch
        // Removes natural accidentals since they are not accepted in Tonal Midi
        var accidentals = pitchParts[0].substring(1).replace('n', '');
        if (addRenderedAccidentals) {
            (_a = note.getAccidentals()) === null || _a === void 0 ? void 0 : _a.forEach(function (accidental) {
                if (accidental.index === index) {
                    if (accidental.type === 'n') {
                        accidentals = '';
                    }
                    else {
                        accidentals += accidental.type;
                    }
                }
            });
        }
        return pitchParts[0][0] + accidentals + pitchParts[1];
    };
    /**
     * Converts VexFlow duration syntax to MidiWriterJS syntax
     * @param note struct from VexFlow
     */
    VexFlow.prototype.convertDuration = function (note) {
        return 'd'.repeat(note.dots) + this.convertBaseDuration(note.duration) + (note.tuplet ? 't' + note.tuplet.num_notes : '');
    };
    /**
     * Converts VexFlow base duration syntax to MidiWriterJS syntax
     * @param duration Vexflow duration
     * @returns MidiWriterJS duration
     */
    VexFlow.prototype.convertBaseDuration = function (duration) {
        switch (duration) {
            case 'w':
                return '1';
            case 'h':
                return '2';
            case 'q':
                return '4';
            default:
                return duration;
        }
    };
    return VexFlow;
}());

/**
 * Object representation of a header chunk section of a MIDI file.
 * @param {number} numberOfTracks - Number of tracks
 * @return {Header}
 */
var Header = /** @class */ (function () {
    function Header(numberOfTracks) {
        this.type = Constants.HEADER_CHUNK_TYPE;
        var trackType = numberOfTracks > 1 ? Constants.HEADER_CHUNK_FORMAT1 : Constants.HEADER_CHUNK_FORMAT0;
        this.data = trackType.concat(Utils.numberToBytes(numberOfTracks, 2), // two bytes long,
        Constants.HEADER_CHUNK_DIVISION);
        this.size = [0, 0, 0, this.data.length];
    }
    return Header;
}());

/**
 * Object that puts together tracks and provides methods for file output.
 * @param {array|Track} tracks - A single {Track} object or an array of {Track} objects.
 * @param {object} options - {middleC: 'C4'}
 * @return {Writer}
 */
var Writer = /** @class */ (function () {
    function Writer(tracks, options) {
        if (options === void 0) { options = {}; }
        // Ensure tracks is an array
        this.tracks = Utils.toArray(tracks);
        this.options = options;
    }
    /**
     * Builds array of data from chunkschunks.
     * @return {array}
     */
    Writer.prototype.buildData = function () {
        var _this = this;
        var data = [];
        data.push(new Header(this.tracks.length));
        // For each track add final end of track event and build data
        this.tracks.forEach(function (track) {
            data.push(track.buildData(_this.options));
        });
        return data;
    };
    /**
     * Builds the file into a Uint8Array
     * @return {Uint8Array}
     */
    Writer.prototype.buildFile = function () {
        var build = [];
        // Data consists of chunks which consists of data
        this.buildData().forEach(function (d) { return build = build.concat(d.type, d.size, d.data); });
        return new Uint8Array(build);
    };
    /**
     * Convert file buffer to a base64 string.  Different methods depending on if browser or node.
     * @return {string}
     */
    Writer.prototype.base64 = function () {
        if (typeof btoa === 'function') {
            var binary = '';
            var bytes = this.buildFile();
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        return Buffer.from(this.buildFile()).toString('base64');
    };
    /**
     * Get the data URI.
     * @return {string}
     */
    Writer.prototype.dataUri = function () {
        return 'data:audio/midi;base64,' + this.base64();
    };
    /**
     * Set option on instantiated Writer.
     * @param {string} key
     * @param {any} value
     * @return {Writer}
     */
    Writer.prototype.setOption = function (key, value) {
        this.options[key] = value;
        return this;
    };
    /**
     * Output to stdout
     * @return {string}
     */
    Writer.prototype.stdout = function () {
        return process.stdout.write(Buffer.from(this.buildFile()));
    };
    return Writer;
}());

var main = {
    Constants: Constants,
    ControllerChangeEvent: ControllerChangeEvent,
    CopyrightEvent: CopyrightEvent,
    CuePointEvent: CuePointEvent,
    EndTrackEvent: EndTrackEvent,
    InstrumentNameEvent: InstrumentNameEvent,
    KeySignatureEvent: KeySignatureEvent,
    LyricEvent: LyricEvent,
    MarkerEvent: MarkerEvent,
    NoteOnEvent: NoteOnEvent,
    NoteOffEvent: NoteOffEvent,
    NoteEvent: NoteEvent,
    PitchBendEvent: PitchBendEvent,
    ProgramChangeEvent: ProgramChangeEvent,
    TempoEvent: TempoEvent,
    TextEvent: TextEvent,
    TimeSignatureEvent: TimeSignatureEvent,
    Track: Track,
    TrackNameEvent: TrackNameEvent,
    Utils: Utils,
    VexFlow: VexFlow,
    Writer: Writer
};

module.exports = main;

}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":22,"buffer":20}],10:[function(require,module,exports){
'use strict';
module.exports = function (obj) {
	return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
};

},{}],11:[function(require,module,exports){
function selectElement(appendToID, selectID, options, selected) {

    this.appendToID = appendToID;
    this.selectID = selectID;
    this.options = options;
    this.selected = selected;

    this.selectList;
    
    this.create = function(cb) {
        var appendToID = document.getElementById(this.appendToID);
        this.selectList = document.createElement("select");
        this.selectList.id = this.selectID;        
        appendToID.appendChild(this.selectList);
        this.update(selectID, this.options, this.selected);
    };

    this.onChange = function (cb) {
        this.selectList.addEventListener('change', function(){
            cb(this.value)
        });
    }

    this.update = function (elem, options, selected) {
        this.delete(elem);
        var selectList = document.getElementById(elem);
        for (var key in options) {
            var option = document.createElement("option");
            option.value = key;
            option.text = options[key];
            selectList.appendChild(option);

            if (key === selected) {
                option.setAttribute('selected', true);
            }
        }
    };
    
    this.getSelected = function (elem) {
        var selectList = document.getElementById(elem);
        var opt;
        for ( var i = 0, len = selectList.options.length; i < len; i++ ) {
            opt = selectList.options[i];
            if ( opt.selected === true ) {
                return opt.value;
                break;
            }
        }
        return false;
    };
    
    this.delete = function (elem) {
        var selectList=document.getElementById(elem);
        for (var option in selectList){
            selectList.remove(option);
        }
    };
    
    this.getAsString = function () {
        var element = document.getElementById(this.appendToID);
        var elementHtml = element.outerHTML;
        return elementHtml;
    };
}

module.exports = selectElement;
},{}],12:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":13}],13:[function(require,module,exports){
var isBrowser = (typeof window !== 'undefined')

var CLOCK_DEFAULTS = {
  toleranceLate: 0.10,
  toleranceEarly: 0.001
}

// ==================== Event ==================== //
var Event = function(clock, deadline, func) {
  this.clock = clock
  this.func = func
  this._cleared = false // Flag used to clear an event inside callback

  this.toleranceLate = clock.toleranceLate
  this.toleranceEarly = clock.toleranceEarly
  this._latestTime = null
  this._earliestTime = null
  this.deadline = null
  this.repeatTime = null

  this.schedule(deadline)
}

// Unschedules the event
Event.prototype.clear = function() {
  this.clock._removeEvent(this)
  this._cleared = true
  return this
}

// Sets the event to repeat every `time` seconds.
Event.prototype.repeat = function(time) {
  if (time === 0)
    throw new Error('delay cannot be 0')
  this.repeatTime = time
  if (!this.clock._hasEvent(this))
    this.schedule(this.deadline + this.repeatTime)
  return this
}

// Sets the time tolerance of the event.
// The event will be executed in the interval `[deadline - early, deadline + late]`
// If the clock fails to execute the event in time, the event will be dropped.
Event.prototype.tolerance = function(values) {
  if (typeof values.late === 'number')
    this.toleranceLate = values.late
  if (typeof values.early === 'number')
    this.toleranceEarly = values.early
  this._refreshEarlyLateDates()
  if (this.clock._hasEvent(this)) {
    this.clock._removeEvent(this)
    this.clock._insertEvent(this)
  }
  return this
}

// Returns true if the event is repeated, false otherwise
Event.prototype.isRepeated = function() { return this.repeatTime !== null }

// Schedules the event to be ran before `deadline`.
// If the time is within the event tolerance, we handle the event immediately.
// If the event was already scheduled at a different time, it is rescheduled.
Event.prototype.schedule = function(deadline) {
  this._cleared = false
  this.deadline = deadline
  this._refreshEarlyLateDates()

  if (this.clock.context.currentTime >= this._earliestTime) {
    this._execute()
  
  } else if (this.clock._hasEvent(this)) {
    this.clock._removeEvent(this)
    this.clock._insertEvent(this)
  
  } else this.clock._insertEvent(this)
}

Event.prototype.timeStretch = function(tRef, ratio) {
  if (this.isRepeated())
    this.repeatTime = this.repeatTime * ratio

  var deadline = tRef + ratio * (this.deadline - tRef)
  // If the deadline is too close or past, and the event has a repeat,
  // we calculate the next repeat possible in the stretched space.
  if (this.isRepeated()) {
    while (this.clock.context.currentTime >= deadline - this.toleranceEarly)
      deadline += this.repeatTime
  }
  this.schedule(deadline)
}

// Executes the event
Event.prototype._execute = function() {
  if (this.clock._started === false) return
  this.clock._removeEvent(this)

  if (this.clock.context.currentTime < this._latestTime)
    this.func(this)
  else {
    if (this.onexpired) this.onexpired(this)
    console.warn('event expired')
  }
  // In the case `schedule` is called inside `func`, we need to avoid
  // overrwriting with yet another `schedule`.
  if (!this.clock._hasEvent(this) && this.isRepeated() && !this._cleared)
    this.schedule(this.deadline + this.repeatTime) 
}

// Updates cached times
Event.prototype._refreshEarlyLateDates = function() {
  this._latestTime = this.deadline + this.toleranceLate
  this._earliestTime = this.deadline - this.toleranceEarly
}

// ==================== WAAClock ==================== //
var WAAClock = module.exports = function(context, opts) {
  var self = this
  opts = opts || {}
  this.tickMethod = opts.tickMethod || 'ScriptProcessorNode'
  this.toleranceEarly = opts.toleranceEarly || CLOCK_DEFAULTS.toleranceEarly
  this.toleranceLate = opts.toleranceLate || CLOCK_DEFAULTS.toleranceLate
  this.context = context
  this._events = []
  this._started = false
}

// ---------- Public API ---------- //
// Schedules `func` to run after `delay` seconds.
WAAClock.prototype.setTimeout = function(func, delay) {
  return this._createEvent(func, this._absTime(delay))
}

// Schedules `func` to run before `deadline`.
WAAClock.prototype.callbackAtTime = function(func, deadline) {
  return this._createEvent(func, deadline)
}

// Stretches `deadline` and `repeat` of all scheduled `events` by `ratio`, keeping
// their relative distance to `tRef`. In fact this is equivalent to changing the tempo.
WAAClock.prototype.timeStretch = function(tRef, events, ratio) {
  events.forEach(function(event) { event.timeStretch(tRef, ratio) })
  return events
}

// Removes all scheduled events and starts the clock 
WAAClock.prototype.start = function() {
  if (this._started === false) {
    var self = this
    this._started = true
    this._events = []

    if (this.tickMethod === 'ScriptProcessorNode') {
      var bufferSize = 256
      // We have to keep a reference to the node to avoid garbage collection
      this._clockNode = this.context.createScriptProcessor(bufferSize, 1, 1)
      this._clockNode.connect(this.context.destination)
      this._clockNode.onaudioprocess = function () {
        setTimeout(function() { self.tick() }, 0)
      }
    } else if (this.tickMethod === 'manual') null // tick is called manually

    else throw new Error('invalid tickMethod ' + this.tickMethod)
  }
}

// Stops the clock
WAAClock.prototype.stop = function() {
  if (this._started === true) {
    this._started = false
    this._clockNode.disconnect()
  }  
}

// ---------- Private ---------- //

// This function is ran periodically, and at each tick it executes
// events for which `currentTime` is included in their tolerance interval.
WAAClock.prototype.tick = function() {
  var event = this._events.shift()

  while(event && event._earliestTime <= this.context.currentTime) {
    event._execute()
    event = this._events.shift()
  }

  // Put back the last event
  if(event) this._events.unshift(event)
}

// Creates an event and insert it to the list
WAAClock.prototype._createEvent = function(func, deadline) {
  return new Event(this, deadline, func)
}

// Inserts an event to the list
WAAClock.prototype._insertEvent = function(event) {
  this._events.splice(this._indexByTime(event._earliestTime), 0, event)
}

// Removes an event from the list
WAAClock.prototype._removeEvent = function(event) {
  var ind = this._events.indexOf(event)
  if (ind !== -1) this._events.splice(ind, 1)
}

// Returns true if `event` is in queue, false otherwise
WAAClock.prototype._hasEvent = function(event) {
 return this._events.indexOf(event) !== -1
}

// Returns the index of the first event whose deadline is >= to `deadline`
WAAClock.prototype._indexByTime = function(deadline) {
  // performs a binary search
  var low = 0
    , high = this._events.length
    , mid
  while (low < high) {
    mid = Math.floor((low + high) / 2)
    if (this._events[mid]._earliestTime < deadline)
      low = mid + 1
    else high = mid
  }
  return low
}

// Converts from relative time to absolute time
WAAClock.prototype._absTime = function(relTime) {
  return relTime + this.context.currentTime
}

// Converts from absolute time to relative time 
WAAClock.prototype._relTime = function(absTime) {
  return absTime - this.context.currentTime
}

},{}],14:[function(require,module,exports){
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const simpleTracker = require('./simple-tracker');
const FileSaver = require('file-saver');
const MidiWriter = require('midi-writer-js');

const getSetControls = require('./get-set-controls');
const getSetAudioOptions = new getSetControls();

// Expose MidiWriter globally for use in script.js
window.MidiWriter = MidiWriter;

const ctx = new AudioContext();
const defaultTrack = require('./default-track');

var buffers;
var currentSampleData;
var storage;

function initializeSampleSet(ctx, dataUrl, track) {

    var sampleSetPromise = loadSampleSet(ctx, dataUrl);
    sampleSetPromise.then(function (data) {

        buffers = data.buffers;
        sampleData = data.data;

        if (!track) {
            track = storage.getTrack();
        }

        if (!track.settings.measureLength) {
            track.settings.measureLength = 16;
        }

        currentSampleData = sampleData;
        setupTrackerHtml(sampleData, track.settings.measureLength);
        schedule.loadTrackerValues(track.beat);
        schedule.setupEvents();
    });
   
}

window.onload = function () {

    let formValues = new getSetFormValues();
    let form = document.getElementById("trackerControls");

    formValues.set(form, defaultTrack.settings);
    getSetAudioOptions.setTrackerControls(defaultTrack.settings);

    initializeSampleSet(ctx, defaultTrack.settings.sampleSet, defaultTrack);
    setupBaseEvents();

    storage = new tracksLocalStorage();
    storage.setupStorage();
};

var instrumentData = {};
function setupTrackerHtml(data, measureLength) {
    instrumentData = data;
    instrumentData.title = instrumentData.filename;
    schedule.drawTracker(data.filename.length, measureLength, instrumentData);
    return;
}

function disconnectNode(node, options) {
    let totalLength =
        options.attackTime + options.sustainTime + options.releaseTime;
    setTimeout(() => {
        node.disconnect();
    }, totalLength * 1000);
}

function scheduleAudioBeat(beat, triggerTime) {

    let instrumentName = instrumentData.filename[beat.rowId];
    let instrument = buffers[instrumentName].get();
    let options = getSetAudioOptions.getTrackerControls();


    function play(source) {

        source.detune.value = options.detune;

        // Gain
        let node = routeGain(source)
        node = routeDelay(node);
        // node = routeCompressor(node);
        node.connect(ctx.destination);
        source.start(triggerTime);

    }


    function routeGain (source) {
        let gain = new adsrGainNode(ctx);
        gain.mode = 'linearRampToValueAtTime';
        let options = getSetAudioOptions.getTrackerControls();

        let gainNode; 

        // Not enabled - default gain
        if (!options.gainEnabled) {
            gainNode = gain.getGainNode(triggerTime);
            source.connect(gainNode);
            return applyInstrumentGain(gainNode);
        }

        gain.setOptions(options);
        gainNode = gain.getGainNode(triggerTime);
        source.connect(gainNode);
        return applyInstrumentGain(gainNode);


    }

    function applyInstrumentGain(node) {
        const level = ctx.createGain();
        level.gain.value = getInstrumentGain(instrumentName);
        node.connect(level);
        return level;
    }

    function getInstrumentGain(name) {
        if (!name) {
            return 1;
        }
        if (/hi[\-\s]?hat.*closed/i.test(name) || /hihat.*closed/i.test(name)) {
            return 0.7;
        }
        return 1;
    }

    // Note delay always uses above gain - even if not enabled
    function routeDelay(node) {
        if (!options.delayEnabled) {
            return node;
        }

        // create delay node
        let delay = ctx.createDelay();
        delay.delayTime.value = options.delay;

        // create adsr gain node
        let gain = new adsrGainNode(ctx);
        gain.mode = 'linearRampToValueAtTime';
        gain.setOptions(options);
        let feedbackGain = gain.getGainNode(triggerTime);

        // create filter
        let filter = ctx.createBiquadFilter();
        filter.frequency.value = options.filter;

        // delay -> feedbackGain
        delay.connect(feedbackGain);
        disconnectNode(delay, options);

        // feedback -> filter
        feedbackGain.connect(filter);

        // filter ->delay
        filter.connect(delay);

        node.connect(delay);

        return delay;
    }
    play(instrument);
}

var schedule = new simpleTracker(ctx, scheduleAudioBeat);

function setupBaseEvents() {

    // var initializedCtx;
    document.getElementById('play').addEventListener('click', function (e) {

        ctx.resume().then(() => {
            console.log('Playback resumed successfully');
        });

        let storage = new tracksLocalStorage();
        let track = storage.getTrack();

        schedule.measureLength = track.settings.measureLength;
        schedule.stop();

            schedule.runSchedule(getSetAudioOptions.options.bpm * 4);

        // Dispatch play event for circle view
        document.dispatchEvent(new CustomEvent('tracker:play'));
    });

    document.getElementById('pause').addEventListener('click', function (e) {
        schedule.stop();

        // Dispatch pause event for circle view
        document.dispatchEvent(new CustomEvent('tracker:pause'));
    });

    document.getElementById('stop').addEventListener('click', function (e) {
        schedule.stop();
        schedule = new simpleTracker(ctx, scheduleAudioBeat);

        // Dispatch stop event for circle view
        document.dispatchEvent(new CustomEvent('tracker:stop'));
    });

    // Spacebar to toggle play/stop
    document.addEventListener('keydown', (e) => {
        if (e.code !== 'Space' && e.key !== ' ') return;
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
            return; // don't hijack typing
        }
        e.preventDefault();
        if (schedule.running) {
            // Stop
            schedule.stop();
            schedule = new simpleTracker(ctx, scheduleAudioBeat);

            // Dispatch stop event for circle view
            document.dispatchEvent(new CustomEvent('tracker:stop'));
        } else {
            // Play
            ctx.resume && ctx.resume();
            let storage = new tracksLocalStorage();
            let track = storage.getTrack();
            schedule.measureLength = track.settings.measureLength;
            schedule.stop();
            schedule.runSchedule(getSetAudioOptions.options.bpm * 4);

            // Dispatch play event for circle view
            document.dispatchEvent(new CustomEvent('tracker:play'));
        }
    });

    document.getElementById('bpm').addEventListener('change', function (e) {
        getSetAudioOptions.setTrackerControls();
        if (schedule.running) {
            schedule.stop();
                schedule.runSchedule(getSetAudioOptions.options.bpm * 4);
        }
    });

    document.getElementById('measureLength').addEventListener('change', (e) => {
        let value = document.getElementById('measureLength').value;
        let length = parseInt(value);

        if (length < 1) return;
        if (length > 32) {
            length = 32;
            document.getElementById('measureLength').value = 32;
        }
        schedule.measureLength = length;

        let track = schedule.getTrackerValues();
        setupTrackerHtml(currentSampleData, length);
        schedule.measureLength = length;
        schedule.loadTrackerValues(track)
        schedule.setupEvents();
    });

    $('.base').on('change', function () {
        getSetAudioOptions.setTrackerControls();
    });
}

$('#sampleSet').on('change', function () {
    initializeSampleSet(ctx, this.value);
});

function tracksLocalStorage() {

    this.setLocalStorage = function (update) {
        var storage = {};
        storage['Select'] = 'Select';


        for (var i = 0, len = localStorage.length; i < len; ++i) {
            let item = localStorage.key(i);
            storage[item] = item;
        }

        // Create select element
        var s = new selectElement(
            'load-storage', // id to append the select list to
            'beat-list', // id of the select list
            storage //
        );

        if (update) {
            s.update('beat-list', storage);
        } else {
            s.create();
        }
    };

    this.getFilename = function () {
        let filename = $('#filename').val();
        if (!filename) {
            filename = 'untitled';
        }
        return filename;
    }

    /**
     * Get complete song
     */
    this.getTrack = function () {
        let formData = getSetAudioOptions.getTrackerControls();

        let beat = schedule.getTrackerValues();
        let song = { "beat": beat, "settings": formData };
        
        return song;
    }

    this.alert = function (message) {
        let appMessage = document.getElementById('app-message');

        appMessage.innerHTML = message
        appMessage.style.display = 'block'
        setTimeout(function () {
            appMessage.style.display = 'none'
        }, 2000)
    }

    this.setupStorage = function () {

        this.setLocalStorage();
        document.getElementById('save').addEventListener('click', (e) => {
            e.preventDefault();

            let song = this.getTrack();
            let json = JSON.stringify(song);

            let filename = this.getFilename();

            localStorage.setItem(filename, json);
            this.setLocalStorage('update');

            $("#beat-list").val(filename);

            this.alert(`The track has been saved to local storage as <strong>${filename}</strong>`)

        });

        // saveAsJson
        document.getElementById('saveAsJson').addEventListener('click', (e) => {
            e.preventDefault();

            let song = this.getTrack();
            let json = JSON.stringify(song);

            let filename = this.getFilename();

            var blob = new Blob([json], {type: "application/json"});
            FileSaver.saveAs(blob, filename + ".json");


        });

        $('#filename').bind('keypress keydown keyup', (e) => {
            if (e.keyCode == 13) {
                e.preventDefault();
            }
        });

        document.getElementById('beat-list').addEventListener('change', (e) => {
            let item = $('#beat-list').val();
            if (item === 'Select') {
                document.getElementById('filename').value = '';
                return;
            }

            document.getElementById('filename').value = item;
            let track = JSON.parse(localStorage.getItem(item));
            let formValues = new getSetFormValues();
            let form = document.getElementById("trackerControls");

            formValues.set(form, track.settings);
            getSetAudioOptions.setTrackerControls(track.settings);
            schedule.stop();
            schedule.measureLength = track.settings.measureLength;

            initializeSampleSet(ctx, track.settings.sampleSet, track);

        });

        document.getElementById('delete').addEventListener('click', (e) => {

            e.preventDefault();

            let elem = document.getElementById('beat-list');
            let toDelete = elem.options[elem.selectedIndex].text;

            localStorage.removeItem(toDelete);
            document.getElementById('filename').value = '';
            this.setLocalStorage('update');

            this.alert(`Track has been deleted`)

        });
    };
}

},{"./default-track":15,"./get-set-controls":16,"./simple-tracker":17,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":5,"load-sample-set":7,"midi-writer-js":9,"select-element":11}],15:[function(require,module,exports){
module.exports = {
  beat: [
    { rowId: "0", colId: "0", enabled: false },
    { rowId: "0", colId: "1", enabled: false },
    { rowId: "0", colId: "2", enabled: false },
    { rowId: "0", colId: "3", enabled: false },
    { rowId: "0", colId: "4", enabled: false },
    { rowId: "0", colId: "5", enabled: false },
    { rowId: "0", colId: "6", enabled: false },
    { rowId: "0", colId: "7", enabled: false },
    { rowId: "0", colId: "8", enabled: false },
    { rowId: "0", colId: "9", enabled: false },
    { rowId: "0", colId: "10", enabled: false },
    { rowId: "0", colId: "11", enabled: false },
    { rowId: "0", colId: "12", enabled: false },
    { rowId: "0", colId: "13", enabled: false },
    { rowId: "0", colId: "14", enabled: false },
    { rowId: "0", colId: "15", enabled: false },
    { rowId: "0", colId: "16", enabled: false },
    { rowId: "0", colId: "17", enabled: false },
    { rowId: "0", colId: "18", enabled: false },
    { rowId: "0", colId: "19", enabled: false },
    { rowId: "0", colId: "20", enabled: false },
    { rowId: "0", colId: "21", enabled: false },
    { rowId: "0", colId: "22", enabled: false },
    { rowId: "0", colId: "23", enabled: false },
    { rowId: "0", colId: "24", enabled: false },
    { rowId: "0", colId: "25", enabled: false },
    { rowId: "0", colId: "26", enabled: false },
    { rowId: "0", colId: "27", enabled: false },
    { rowId: "0", colId: "28", enabled: false },
    { rowId: "0", colId: "29", enabled: false },
    { rowId: "0", colId: "30", enabled: false },
    { rowId: "0", colId: "31", enabled: false },
    { rowId: "1", colId: "0", enabled: false },
    { rowId: "1", colId: "1", enabled: false },
    { rowId: "1", colId: "2", enabled: false },
    { rowId: "1", colId: "3", enabled: false },
    { rowId: "1", colId: "4", enabled: false },
    { rowId: "1", colId: "5", enabled: false },
    { rowId: "1", colId: "6", enabled: false },
    { rowId: "1", colId: "7", enabled: false },
    { rowId: "1", colId: "8", enabled: false },
    { rowId: "1", colId: "9", enabled: false },
    { rowId: "1", colId: "10", enabled: false },
    { rowId: "1", colId: "11", enabled: false },
    { rowId: "1", colId: "12", enabled: false },
    { rowId: "1", colId: "13", enabled: false },
    { rowId: "1", colId: "14", enabled: false },
    { rowId: "1", colId: "15", enabled: false },
    { rowId: "1", colId: "16", enabled: false },
    { rowId: "1", colId: "17", enabled: false },
    { rowId: "1", colId: "18", enabled: false },
    { rowId: "1", colId: "19", enabled: false },
    { rowId: "1", colId: "20", enabled: false },
    { rowId: "1", colId: "21", enabled: false },
    { rowId: "1", colId: "22", enabled: false },
    { rowId: "1", colId: "23", enabled: false },
    { rowId: "1", colId: "24", enabled: false },
    { rowId: "1", colId: "25", enabled: false },
    { rowId: "1", colId: "26", enabled: false },
    { rowId: "1", colId: "27", enabled: false },
    { rowId: "1", colId: "28", enabled: false },
    { rowId: "1", colId: "29", enabled: false },
    { rowId: "1", colId: "30", enabled: false },
    { rowId: "1", colId: "31", enabled: false },
    { rowId: "2", colId: "0", enabled: false },
    { rowId: "2", colId: "1", enabled: false },
    { rowId: "2", colId: "2", enabled: false },
    { rowId: "2", colId: "3", enabled: false },
    { rowId: "2", colId: "4", enabled: true },
    { rowId: "2", colId: "5", enabled: false },
    { rowId: "2", colId: "6", enabled: false },
    { rowId: "2", colId: "7", enabled: false },
    { rowId: "2", colId: "8", enabled: false },
    { rowId: "2", colId: "9", enabled: false },
    { rowId: "2", colId: "10", enabled: false },
    { rowId: "2", colId: "11", enabled: false },
    { rowId: "2", colId: "12", enabled: false },
    { rowId: "2", colId: "13", enabled: false },
    { rowId: "2", colId: "14", enabled: false },
    { rowId: "2", colId: "15", enabled: false },
    { rowId: "2", colId: "16", enabled: false },
    { rowId: "2", colId: "17", enabled: false },
    { rowId: "2", colId: "18", enabled: false },
    { rowId: "2", colId: "19", enabled: false },
    { rowId: "2", colId: "20", enabled: false },
    { rowId: "2", colId: "21", enabled: false },
    { rowId: "2", colId: "22", enabled: false },
    { rowId: "2", colId: "23", enabled: true },
    { rowId: "2", colId: "24", enabled: false },
    { rowId: "2", colId: "25", enabled: false },
    { rowId: "2", colId: "26", enabled: false },
    { rowId: "2", colId: "27", enabled: false },
    { rowId: "2", colId: "28", enabled: false },
    { rowId: "2", colId: "29", enabled: false },
    { rowId: "2", colId: "30", enabled: false },
    { rowId: "2", colId: "31", enabled: false },
    { rowId: "3", colId: "0", enabled: false },
    { rowId: "3", colId: "1", enabled: true },
    { rowId: "3", colId: "2", enabled: false },
    { rowId: "3", colId: "3", enabled: false },
    { rowId: "3", colId: "4", enabled: false },
    { rowId: "3", colId: "5", enabled: false },
    { rowId: "3", colId: "6", enabled: true },
    { rowId: "3", colId: "7", enabled: false },
    { rowId: "3", colId: "8", enabled: false },
    { rowId: "3", colId: "9", enabled: false },
    { rowId: "3", colId: "10", enabled: false },
    { rowId: "3", colId: "11", enabled: false },
    { rowId: "3", colId: "12", enabled: false },
    { rowId: "3", colId: "13", enabled: false },
    { rowId: "3", colId: "14", enabled: false },
    { rowId: "3", colId: "15", enabled: false },
    { rowId: "3", colId: "16", enabled: false },
    { rowId: "3", colId: "17", enabled: true },
    { rowId: "3", colId: "18", enabled: false },
    { rowId: "3", colId: "19", enabled: false },
    { rowId: "3", colId: "20", enabled: false },
    { rowId: "3", colId: "21", enabled: false },
    { rowId: "3", colId: "22", enabled: false },
    { rowId: "3", colId: "23", enabled: false },
    { rowId: "3", colId: "24", enabled: false },
    { rowId: "3", colId: "25", enabled: false },
    { rowId: "3", colId: "26", enabled: false },
    { rowId: "3", colId: "27", enabled: false },
    { rowId: "3", colId: "28", enabled: false },
    { rowId: "3", colId: "29", enabled: false },
    { rowId: "3", colId: "30", enabled: false },
    { rowId: "3", colId: "31", enabled: false },
    { rowId: "4", colId: "0", enabled: true },
    { rowId: "4", colId: "1", enabled: false },
    { rowId: "4", colId: "2", enabled: true },
    { rowId: "4", colId: "3", enabled: false },
    { rowId: "4", colId: "4", enabled: false },
    { rowId: "4", colId: "5", enabled: false },
    { rowId: "4", colId: "6", enabled: false },
    { rowId: "4", colId: "7", enabled: false },
    { rowId: "4", colId: "8", enabled: false },
    { rowId: "4", colId: "9", enabled: false },
    { rowId: "4", colId: "10", enabled: false },
    { rowId: "4", colId: "11", enabled: false },
    { rowId: "4", colId: "12", enabled: true },
    { rowId: "4", colId: "13", enabled: false },
    { rowId: "4", colId: "14", enabled: true },
    { rowId: "4", colId: "15", enabled: false },
    { rowId: "4", colId: "16", enabled: false },
    { rowId: "4", colId: "17", enabled: false },
    { rowId: "4", colId: "18", enabled: false },
    { rowId: "4", colId: "19", enabled: false },
    { rowId: "4", colId: "20", enabled: false },
    { rowId: "4", colId: "21", enabled: true },
    { rowId: "4", colId: "22", enabled: false },
    { rowId: "4", colId: "23", enabled: false },
    { rowId: "4", colId: "24", enabled: false },
    { rowId: "4", colId: "25", enabled: true },
    { rowId: "4", colId: "26", enabled: false },
    { rowId: "4", colId: "27", enabled: false },
    { rowId: "4", colId: "28", enabled: false },
    { rowId: "4", colId: "29", enabled: false },
    { rowId: "4", colId: "30", enabled: false },
    { rowId: "4", colId: "31", enabled: false },
    { rowId: "5", colId: "0", enabled: false },
    { rowId: "5", colId: "1", enabled: false },
    { rowId: "5", colId: "2", enabled: false },
    { rowId: "5", colId: "3", enabled: false },
    { rowId: "5", colId: "4", enabled: true },
    { rowId: "5", colId: "5", enabled: false },
    { rowId: "5", colId: "6", enabled: false },
    { rowId: "5", colId: "7", enabled: true },
    { rowId: "5", colId: "8", enabled: false },
    { rowId: "5", colId: "9", enabled: false },
    { rowId: "5", colId: "10", enabled: false },
    { rowId: "5", colId: "11", enabled: true },
    { rowId: "5", colId: "12", enabled: false },
    { rowId: "5", colId: "13", enabled: false },
    { rowId: "5", colId: "14", enabled: false },
    { rowId: "5", colId: "15", enabled: true },
    { rowId: "5", colId: "16", enabled: false },
    { rowId: "5", colId: "17", enabled: false },
    { rowId: "5", colId: "18", enabled: false },
    { rowId: "5", colId: "19", enabled: true },
    { rowId: "5", colId: "20", enabled: false },
    { rowId: "5", colId: "21", enabled: false },
    { rowId: "5", colId: "22", enabled: false },
    { rowId: "5", colId: "23", enabled: false },
    { rowId: "5", colId: "24", enabled: false },
    { rowId: "5", colId: "25", enabled: false },
    { rowId: "5", colId: "26", enabled: false },
    { rowId: "5", colId: "27", enabled: false },
    { rowId: "5", colId: "28", enabled: false },
    { rowId: "5", colId: "29", enabled: false },
    { rowId: "5", colId: "30", enabled: false },
    { rowId: "5", colId: "31", enabled: false },
    { rowId: "6", colId: "0", enabled: false },
    { rowId: "6", colId: "1", enabled: false },
    { rowId: "6", colId: "2", enabled: false },
    { rowId: "6", colId: "3", enabled: false },
    { rowId: "6", colId: "4", enabled: false },
    { rowId: "6", colId: "5", enabled: false },
    { rowId: "6", colId: "6", enabled: false },
    { rowId: "6", colId: "7", enabled: false },
    { rowId: "6", colId: "8", enabled: false },
    { rowId: "6", colId: "9", enabled: false },
    { rowId: "6", colId: "10", enabled: false },
    { rowId: "6", colId: "11", enabled: false },
    { rowId: "6", colId: "12", enabled: false },
    { rowId: "6", colId: "13", enabled: false },
    { rowId: "6", colId: "14", enabled: false },
    { rowId: "6", colId: "15", enabled: false },
    { rowId: "6", colId: "16", enabled: false },
    { rowId: "6", colId: "17", enabled: false },
    { rowId: "6", colId: "18", enabled: false },
    { rowId: "6", colId: "19", enabled: false },
    { rowId: "6", colId: "20", enabled: false },
    { rowId: "6", colId: "21", enabled: false },
    { rowId: "6", colId: "22", enabled: false },
    { rowId: "6", colId: "23", enabled: false },
    { rowId: "6", colId: "24", enabled: false },
    { rowId: "6", colId: "25", enabled: false },
    { rowId: "6", colId: "26", enabled: false },
    { rowId: "6", colId: "27", enabled: true },
    { rowId: "6", colId: "28", enabled: false },
    { rowId: "6", colId: "29", enabled: false },
    { rowId: "6", colId: "30", enabled: false },
    { rowId: "6", colId: "31", enabled: true },
    { rowId: "7", colId: "0", enabled: false },
    { rowId: "7", colId: "1", enabled: false },
    { rowId: "7", colId: "2", enabled: false },
    { rowId: "7", colId: "3", enabled: false },
    { rowId: "7", colId: "4", enabled: false },
    { rowId: "7", colId: "5", enabled: false },
    { rowId: "7", colId: "6", enabled: false },
    { rowId: "7", colId: "7", enabled: false },
    { rowId: "7", colId: "8", enabled: false },
    { rowId: "7", colId: "9", enabled: true },
    { rowId: "7", colId: "10", enabled: false },
    { rowId: "7", colId: "11", enabled: false },
    { rowId: "7", colId: "12", enabled: false },
    { rowId: "7", colId: "13", enabled: false },
    { rowId: "7", colId: "14", enabled: false },
    { rowId: "7", colId: "15", enabled: false },
    { rowId: "7", colId: "16", enabled: false },
    { rowId: "7", colId: "17", enabled: false },
    { rowId: "7", colId: "18", enabled: false },
    { rowId: "7", colId: "19", enabled: false },
    { rowId: "7", colId: "20", enabled: false },
    { rowId: "7", colId: "21", enabled: false },
    { rowId: "7", colId: "22", enabled: false },
    { rowId: "7", colId: "23", enabled: false },
    { rowId: "7", colId: "24", enabled: false },
    { rowId: "7", colId: "25", enabled: false },
    { rowId: "7", colId: "26", enabled: false },
    { rowId: "7", colId: "27", enabled: false },
    { rowId: "7", colId: "28", enabled: false },
    { rowId: "7", colId: "29", enabled: false },
    { rowId: "7", colId: "30", enabled: false },
    { rowId: "7", colId: "31", enabled: false },
    { rowId: "8", colId: "0", enabled: false },
    { rowId: "8", colId: "1", enabled: false },
    { rowId: "8", colId: "2", enabled: false },
    { rowId: "8", colId: "3", enabled: false },
    { rowId: "8", colId: "4", enabled: false },
    { rowId: "8", colId: "5", enabled: false },
    { rowId: "8", colId: "6", enabled: false },
    { rowId: "8", colId: "7", enabled: false },
    { rowId: "8", colId: "8", enabled: false },
    { rowId: "8", colId: "9", enabled: false },
    { rowId: "8", colId: "10", enabled: false },
    { rowId: "8", colId: "11", enabled: false },
    { rowId: "8", colId: "12", enabled: false },
    { rowId: "8", colId: "13", enabled: false },
    { rowId: "8", colId: "14", enabled: false },
    { rowId: "8", colId: "15", enabled: false },
    { rowId: "8", colId: "16", enabled: false },
    { rowId: "8", colId: "17", enabled: false },
    { rowId: "8", colId: "18", enabled: false },
    { rowId: "8", colId: "19", enabled: false },
    { rowId: "8", colId: "20", enabled: false },
    { rowId: "8", colId: "21", enabled: false },
    { rowId: "8", colId: "22", enabled: false },
    { rowId: "8", colId: "23", enabled: false },
    { rowId: "8", colId: "24", enabled: false },
    { rowId: "8", colId: "25", enabled: false },
    { rowId: "8", colId: "26", enabled: false },
    { rowId: "8", colId: "27", enabled: false },
    { rowId: "8", colId: "28", enabled: false },
    { rowId: "8", colId: "29", enabled: true },
    { rowId: "8", colId: "30", enabled: false },
    { rowId: "8", colId: "31", enabled: false },
    { rowId: "9", colId: "0", enabled: false },
    { rowId: "9", colId: "1", enabled: false },
    { rowId: "9", colId: "2", enabled: false },
    { rowId: "9", colId: "3", enabled: false },
    { rowId: "9", colId: "4", enabled: false },
    { rowId: "9", colId: "5", enabled: false },
    { rowId: "9", colId: "6", enabled: false },
    { rowId: "9", colId: "7", enabled: false },
    { rowId: "9", colId: "8", enabled: false },
    { rowId: "9", colId: "9", enabled: false },
    { rowId: "9", colId: "10", enabled: false },
    { rowId: "9", colId: "11", enabled: false },
    { rowId: "9", colId: "12", enabled: false },
    { rowId: "9", colId: "13", enabled: false },
    { rowId: "9", colId: "14", enabled: false },
    { rowId: "9", colId: "15", enabled: false },
    { rowId: "9", colId: "16", enabled: false },
    { rowId: "9", colId: "17", enabled: false },
    { rowId: "9", colId: "18", enabled: false },
    { rowId: "9", colId: "19", enabled: false },
    { rowId: "9", colId: "20", enabled: false },
    { rowId: "9", colId: "21", enabled: false },
    { rowId: "9", colId: "22", enabled: false },
    { rowId: "9", colId: "23", enabled: false },
    { rowId: "9", colId: "24", enabled: false },
    { rowId: "9", colId: "25", enabled: false },
    { rowId: "9", colId: "26", enabled: false },
    { rowId: "9", colId: "27", enabled: false },
    { rowId: "9", colId: "28", enabled: false },
    { rowId: "9", colId: "29", enabled: false },
    { rowId: "9", colId: "30", enabled: false },
    { rowId: "9", colId: "31", enabled: false },
    { rowId: "10", colId: "0", enabled: false },
    { rowId: "10", colId: "1", enabled: false },
    { rowId: "10", colId: "2", enabled: false },
    { rowId: "10", colId: "3", enabled: false },
    { rowId: "10", colId: "4", enabled: false },
    { rowId: "10", colId: "5", enabled: false },
    { rowId: "10", colId: "6", enabled: false },
    { rowId: "10", colId: "7", enabled: false },
    { rowId: "10", colId: "8", enabled: false },
    { rowId: "10", colId: "9", enabled: false },
    { rowId: "10", colId: "10", enabled: false },
    { rowId: "10", colId: "11", enabled: false },
    { rowId: "10", colId: "12", enabled: false },
    { rowId: "10", colId: "13", enabled: false },
    { rowId: "10", colId: "14", enabled: false },
    { rowId: "10", colId: "15", enabled: false },
    { rowId: "10", colId: "16", enabled: false },
    { rowId: "10", colId: "17", enabled: false },
    { rowId: "10", colId: "18", enabled: false },
    { rowId: "10", colId: "19", enabled: false },
    { rowId: "10", colId: "20", enabled: false },
    { rowId: "10", colId: "21", enabled: false },
    { rowId: "10", colId: "22", enabled: false },
    { rowId: "10", colId: "23", enabled: false },
    { rowId: "10", colId: "24", enabled: false },
    { rowId: "10", colId: "25", enabled: false },
    { rowId: "10", colId: "26", enabled: false },
    { rowId: "10", colId: "27", enabled: false },
    { rowId: "10", colId: "28", enabled: false },
    { rowId: "10", colId: "29", enabled: false },
    { rowId: "10", colId: "30", enabled: false },
    { rowId: "10", colId: "31", enabled: false },
    { rowId: "11", colId: "0", enabled: false },
    { rowId: "11", colId: "1", enabled: false },
    { rowId: "11", colId: "2", enabled: false },
    { rowId: "11", colId: "3", enabled: false },
    { rowId: "11", colId: "4", enabled: false },
    { rowId: "11", colId: "5", enabled: false },
    { rowId: "11", colId: "6", enabled: false },
    { rowId: "11", colId: "7", enabled: false },
    { rowId: "11", colId: "8", enabled: false },
    { rowId: "11", colId: "9", enabled: false },
    { rowId: "11", colId: "10", enabled: false },
    { rowId: "11", colId: "11", enabled: false },
    { rowId: "11", colId: "12", enabled: false },
    { rowId: "11", colId: "13", enabled: false },
    { rowId: "11", colId: "14", enabled: false },
    { rowId: "11", colId: "15", enabled: false },
    { rowId: "11", colId: "16", enabled: false },
    { rowId: "11", colId: "17", enabled: false },
    { rowId: "11", colId: "18", enabled: false },
    { rowId: "11", colId: "19", enabled: false },
    { rowId: "11", colId: "20", enabled: false },
    { rowId: "11", colId: "21", enabled: false },
    { rowId: "11", colId: "22", enabled: false },
    { rowId: "11", colId: "23", enabled: false },
    { rowId: "11", colId: "24", enabled: false },
    { rowId: "11", colId: "25", enabled: false },
    { rowId: "11", colId: "26", enabled: false },
    { rowId: "11", colId: "27", enabled: false },
    { rowId: "11", colId: "28", enabled: false },
    { rowId: "11", colId: "29", enabled: false },
    { rowId: "11", colId: "30", enabled: false },
    { rowId: "11", colId: "31", enabled: false },
    { rowId: "12", colId: "0", enabled: false },
    { rowId: "12", colId: "1", enabled: false },
    { rowId: "12", colId: "2", enabled: false },
    { rowId: "12", colId: "3", enabled: false },
    { rowId: "12", colId: "4", enabled: false },
    { rowId: "12", colId: "5", enabled: false },
    { rowId: "12", colId: "6", enabled: false },
    { rowId: "12", colId: "7", enabled: false },
    { rowId: "12", colId: "8", enabled: false },
    { rowId: "12", colId: "9", enabled: false },
    { rowId: "12", colId: "10", enabled: false },
    { rowId: "12", colId: "11", enabled: false },
    { rowId: "12", colId: "12", enabled: false },
    { rowId: "12", colId: "13", enabled: false },
    { rowId: "12", colId: "14", enabled: false },
    { rowId: "12", colId: "15", enabled: false },
    { rowId: "12", colId: "16", enabled: false },
    { rowId: "12", colId: "17", enabled: false },
    { rowId: "12", colId: "18", enabled: false },
    { rowId: "12", colId: "19", enabled: false },
    { rowId: "12", colId: "20", enabled: false },
    { rowId: "12", colId: "21", enabled: false },
    { rowId: "12", colId: "22", enabled: false },
    { rowId: "12", colId: "23", enabled: true },
    { rowId: "12", colId: "24", enabled: false },
    { rowId: "12", colId: "25", enabled: true },
    { rowId: "12", colId: "26", enabled: false },
    { rowId: "12", colId: "27", enabled: false },
    { rowId: "12", colId: "28", enabled: false },
    { rowId: "12", colId: "29", enabled: false },
    { rowId: "12", colId: "30", enabled: false },
    { rowId: "12", colId: "31", enabled: false },
    { rowId: "13", colId: "0", enabled: false },
    { rowId: "13", colId: "1", enabled: false },
    { rowId: "13", colId: "2", enabled: false },
    { rowId: "13", colId: "3", enabled: false },
    { rowId: "13", colId: "4", enabled: false },
    { rowId: "13", colId: "5", enabled: false },
    { rowId: "13", colId: "6", enabled: false },
    { rowId: "13", colId: "7", enabled: false },
    { rowId: "13", colId: "8", enabled: false },
    { rowId: "13", colId: "9", enabled: false },
    { rowId: "13", colId: "10", enabled: false },
    { rowId: "13", colId: "11", enabled: false },
    { rowId: "13", colId: "12", enabled: false },
    { rowId: "13", colId: "13", enabled: false },
    { rowId: "13", colId: "14", enabled: false },
    { rowId: "13", colId: "15", enabled: false },
    { rowId: "13", colId: "16", enabled: false },
    { rowId: "13", colId: "17", enabled: false },
    { rowId: "13", colId: "18", enabled: false },
    { rowId: "13", colId: "19", enabled: false },
    { rowId: "13", colId: "20", enabled: false },
    { rowId: "13", colId: "21", enabled: false },
    { rowId: "13", colId: "22", enabled: false },
    { rowId: "13", colId: "23", enabled: false },
    { rowId: "13", colId: "24", enabled: true },
    { rowId: "13", colId: "25", enabled: false },
    { rowId: "13", colId: "26", enabled: false },
    { rowId: "13", colId: "27", enabled: false },
    { rowId: "13", colId: "28", enabled: true },
    { rowId: "13", colId: "29", enabled: false },
    { rowId: "13", colId: "30", enabled: false },
    { rowId: "13", colId: "31", enabled: false },
    { rowId: "14", colId: "0", enabled: false },
    { rowId: "14", colId: "1", enabled: false },
    { rowId: "14", colId: "2", enabled: false },
    { rowId: "14", colId: "3", enabled: false },
    { rowId: "14", colId: "4", enabled: false },
    { rowId: "14", colId: "5", enabled: false },
    { rowId: "14", colId: "6", enabled: false },
    { rowId: "14", colId: "7", enabled: false },
    { rowId: "14", colId: "8", enabled: false },
    { rowId: "14", colId: "9", enabled: false },
    { rowId: "14", colId: "10", enabled: false },
    { rowId: "14", colId: "11", enabled: false },
    { rowId: "14", colId: "12", enabled: false },
    { rowId: "14", colId: "13", enabled: false },
    { rowId: "14", colId: "14", enabled: false },
    { rowId: "14", colId: "15", enabled: false },
    { rowId: "14", colId: "16", enabled: false },
    { rowId: "14", colId: "17", enabled: false },
    { rowId: "14", colId: "18", enabled: false },
    { rowId: "14", colId: "19", enabled: false },
    { rowId: "14", colId: "20", enabled: false },
    { rowId: "14", colId: "21", enabled: false },
    { rowId: "14", colId: "22", enabled: false },
    { rowId: "14", colId: "23", enabled: false },
    { rowId: "14", colId: "24", enabled: false },
    { rowId: "14", colId: "25", enabled: false },
    { rowId: "14", colId: "26", enabled: true },
    { rowId: "14", colId: "27", enabled: false },
    { rowId: "14", colId: "28", enabled: false },
    { rowId: "14", colId: "29", enabled: false },
    { rowId: "14", colId: "30", enabled: false },
    { rowId: "14", colId: "31", enabled: false }
  ],
  settings: {
    sampleSet:
      "https://raw.githubusercontent.com/oramics/sampled/master/DRUMS/pearl-master-studio/sampled.instrument.json",
    measureLength: 16,
    bpm: 80,
    detune: 0,
    gainEnabled: "gain",
    attackAmp: 0,
    sustainAmp: 0.4,
    decayAmp: 0.7,
    releaseAmp: 1,
    attackTime: 0,
    decayTime: 0,
    sustainTime: 2,
    releaseTime: 2,
    adsrInterval: 0.1,
    delay: 0.01,
    filter: 1000
  }
};

},{}],16:[function(require,module,exports){
const getSetFormValues = require('get-set-form-values');

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
            ret[key] = parseFloat(values[key]);
        }
        return ret;
    }

    this.setTrackerControls = function (values) {
        if (!values) {
            values = this.getTrackerControls();
        }
        this.options = values;
    };  

}

module.exports = getSetControls;

},{"get-set-form-values":5}],17:[function(require,module,exports){
const WAAClock = require('waaclock');
const trackerTable = require('./tracker-table');
const hasClass = require('has-class');

/**
 * Construct object
 * @param {audioContext} ctx 
 * @param {function} scheduleAudioBeat funtion when an audio is played
 */
function tracker(ctx, scheduleAudioBeat) {

    this.measureLength = 16;
    this.scheduleAudioBeat = scheduleAudioBeat;
    this.scheduleForward = 0.1;
    this.current = 0;
    this.eventMap = {};
    this.clock = new WAAClock(ctx);
    this.clock.start();
    this.running = false;

    /**
     * Draw a tracker table by numRows and numCols
     */
    this.drawTracker = function(numRows, numCols, data) {
        
        let htmlTable = new trackerTable();

        htmlTable.setRows(numRows, numCols, data);
        let str = htmlTable.getTable();
        
        let t = document.getElementById('tracker-parent');
        t.innerHTML = '';
        t.insertAdjacentHTML('afterbegin', str);
    }

    /**
     * Push current beat one forward
     */
    this.next = function () {
        this.current++;
        if (this.current >= this.measureLength) {
            this.current = 0;
        }
    };

    /**
     * Calculate milli seconds per beat
     */
    this.milliPerBeat = function (beats) {
        if (!beats) {
            beats = 60;
        }
        return 1000 * 60 / beats;
    };

    /**
     * Get a tracker row from a cell-id
     */
    this.getTrackerRowValues = function (colId) {
        let values = [];
        let selector = `.tracker-cell[data-col-id="${colId}"]`;

        let elems = document.querySelectorAll(selector);
        elems.forEach((el) => {
            const row = el.closest('.tracker-row');
            if (row && row.classList.contains('row-muted')) {
                // Treat as disabled when muted
                let val = Object.assign({}, el.dataset);
                val.enabled = false;
                values.push(val);
                return;
            }
            let val = Object.assign({}, el.dataset);
            val.enabled = el.classList.contains('tracker-enabled');
            values.push(val);
        });
        return values;
    };

    /**
     * Schedule a beat column
     */
    this.schedule = function () {
        let beatColumn = this.getTrackerRowValues(this.current);
        let now = ctx.currentTime;

        let selector = `[data-col-id="${this.current}"]`;

        let event = this.clock.callbackAtTime(() => {
            let elems = document.querySelectorAll(selector);
            elems.forEach( (e) => {
                e.classList.add('tracker-current')
            })

            // Dispatch pulse event for circle view
            document.dispatchEvent(new CustomEvent('tracker:pulse', {
                detail: { pulseIndex: this.current }
            }));
        }, now + this.scheduleForward);

        this.clock.callbackAtTime(() => {
            let elems = document.querySelectorAll(selector);
            elems.forEach( (e) => {
                e.classList.remove('tracker-current')
            })
        }, now + this.scheduleForward + this.milliPerBeat(this.bpm) / 1000);

        beatColumn.forEach((beat) => {
            this.scheduleBeat(beat, now);
        });
    };

    this.scheduleBeat = function (beat, now) {

        let triggerTime = now + this.scheduleForward;
        this.scheduleMap[beat.colId] = triggerTime;
        if (beat.enabled) {
            this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(() => {
                this.scheduleAudioBeat(beat, triggerTime);
            }, now);
        }
    };

    this.scheduleMap = {};

    this.scheduleAudioBeatNow = function (beat) {

        if (beat.enabled) {
            let beatEvent = this.eventMap[this.getEventKey(beat)];
            if (beatEvent) {
                beatEvent.clear();
                delete this.eventMap[this.getEventKey(beat)];
            }
            return;
        }

        let triggerTime = this.scheduleMap[0] + beat.colId * this.milliPerBeat(this.bpm) / 1000;
        let now = ctx.currentTime;
        this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(() => {
            this.scheduleAudioBeat(beat, triggerTime);
        }, now);
    };

    this.interval;
    this.runSchedule = function (bpm) {
        this.running = true;
        this.bpm = bpm;
        let interval = this.milliPerBeat(bpm);

        setTimeout(() => {
            this.schedule();
            this.next();
        }, 0);

        this.interval = setInterval(() => {
            this.schedule();
            this.next();

        }, interval);
    };

    this.stop = function () {
        this.running = false;
        clearInterval(this.interval);
    };

    this.getEventKey = function getEventKey(beat) {
        return beat.rowId + beat.colId;
    };

    /**
     * Get tracker values
     */
    this.getTrackerValues = function () {
        let values = [];
        let elems = document.querySelectorAll('.tracker-cell');
        elems.forEach(function (e) {
            const row = e.closest('.tracker-row');
            let val = Object.assign({}, e.dataset);
            if (row && row.classList.contains('row-muted')) {
                val.enabled = false;
            } else {
                val.enabled = hasClass(e, "tracker-enabled");
            }
            values.push(val);
        });
        return values;
    };

    /**
     * Load tracker values in JSON format
     */
    this.loadTrackerValues = function (json) {

        let elems = document.querySelectorAll('.tracker-enabled');
        elems.forEach(function(e) {
            e.classList.remove('tracker-enabled');
        });

        json.forEach(function (data) {
            if (data.enabled === true) {
                let selector = `.tracker-cell[data-row-id="${data.rowId}"][data-col-id="${data.colId}"]`;
                let elem = document.querySelector(selector);
                if (elem) {
                    elem.classList.add("tracker-enabled");
                }
            }
        });
    };

    /**
     * Listen on tracker-cell
     * Schedule if cell is clicked and toggle css class
     */
    this.setupEvents = function () {
        
        let elems = document.querySelectorAll('.tracker-cell');
        
        elems.forEach(function (e) {
            e.addEventListener('click', function(e) {
                let val = Object.assign({}, e.target.dataset);
                val.enabled = hasClass(e.target, "tracker-enabled");
                let currentBeat = e.target.dataset.colId;
                if (val.colId > currentBeat) {
                    this.scheduleAudioBeatNow(val);
                }
                e.target.classList.toggle('tracker-enabled');
            })
        })
    }
}

module.exports = tracker;

},{"./tracker-table":18,"has-class":6,"waaclock":12}],18:[function(require,module,exports){
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
                str += c + 1;
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

},{}],19:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],20:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":19,"buffer":20,"ieee754":21}],21:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],22:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[14]);
