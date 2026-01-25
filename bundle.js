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

},{"obj-type":9}],7:[function(require,module,exports){
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
'use strict';
module.exports = function (obj) {
	return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
};

},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":12}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const simpleTracker = require('./simple-tracker');
const FileSaver = require('file-saver');

const getSetControls = require('./get-set-controls');
const getSetAudioOptions = new getSetControls();

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

},{"./default-track":14,"./get-set-controls":15,"./simple-tracker":16,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":5,"load-sample-set":7,"select-element":10}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"get-set-form-values":5}],16:[function(require,module,exports){
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

},{"./tracker-table":17,"has-class":6,"waaclock":11}],17:[function(require,module,exports){
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

},{}]},{},[13]);
