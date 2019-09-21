import Tone from "../core/Tone";
import "../event/Event"; // GET RID OF THIS?
import "../core/Transport";
import "../type/Type";

/**
 *  @class Tone.Random TODO!!!! creates a looped callback at the 
 *         specified interval. The callback can be 
 *         started, stopped and scheduled along
 *         the Transport's timeline. 
 *  @example
 * var rand = new Tone.Random(function(time){
 * 	//triggered every eighth note. 
 * 	console.log(time);
 * }, [5, 10], "gaussian").start(0);
 * Tone.Transport.start();
 *  @extends {Tone}
 *  @param {Function} callback The callback to invoke with the event.
 *  @param {Time} interval The time between successive callback calls. 
 */
Tone.Random = function(){

	var options = Tone.defaults(arguments, ["callback", "range", "type"], Tone.Random);
	Tone.call(this);

	/**
	 *  The event which produces the callbacks
	 */
	this._event = new Tone.Event({
		"callback" : this._tick.bind(this),
		"loop" : false,
		"loopEnd" : "1m",
		"playbackRate" : options.playbackRate,
		"probability" : options.probability,
		// "callback": Tone.noOp,
		"mute" : false,
		"humanize" : false,
	});

	/**
	 * The callback to invoke
	 * @type {Function}
	 */
	this.callback = options.callback;

	/**
	 * The min/max range for the random time
	 * @type {Number|Number[]}
	 * @private
	 */
	this._range = options.range;

	/**
	 * The type of randomness 
	 * @type {string}
	 */
	this.type = options.type;

	/**
	 * When the note is scheduled to start.
	 * @type {Number}
	 * @private
	 */
	this._loopStart = this.toTicks(options.loopStart);

	/**
	 * When the note is scheduled to start.
	 * @type {Number}
	 * @private
	 */
	this._loopEnd = this.toTicks(options.loopEnd);

	/**
	 * If it should loop or not
	 * @type {Boolean}
	 * @private
	 */
	this._loop = true;

	/**
	 * Tracks the scheduled events
	 * @type {Tone.TimelineState}
	 * @private
	 */
	this._state = new Tone.TimelineState(Tone.State.Stopped);

	/**
	 * The playback speed of the note. A speed of 1
	 * is no change.
	 * @private
	 * @type {Positive}
	 */
	this._playbackRate = 1;

	/**
	 * A delay time from when the event is scheduled to start
	 * @type {Ticks}
	 * @private
	 */
	this._startOffset = 0;

	/**
	 * If mute is true, the callback won't be
	 * invoked.
	 * @type {Boolean}
	 */
	this.mute = options.mute;

	//set the initial values
	this.playbackRate = options.playbackRate;

	//set the iterations
	this._iterations = options.iterations;
};

Tone.extend(Tone.Random);

/**
 *  The defaults
 *  @const
 *  @type  {Object}
 */
Tone.Random.defaults = {
	"callback" : Tone.noOp,
	"range" : [1, 2],
	"type" : "uniform",
	"playbackRate" : 1,
	"iterations" : Infinity,
	"mute" : false
};

/**
 * Internal function used to call different
 * types of random number generators
 * @param {Array|Positive}
 * @return {Number}
 * @private
 */
Tone.Random.prototype._genRandom = function(min, max){
	switch (this.type){
		case "u":
		case "uniform":
			return this._genRandomNum(min, max);
		case "gauss":
		case "gaussian":
			return this._genRandomBMNum(min, max);
		case "power":
		case "powerlaw":
			// TODO
			break;
		case "default":
			// TODO error message report?
	}
};

/**
 * Internal function used to generate random numbers 
 * based on a given range
 * @param {Positives}
 * @return {Number}
 * @private
 */
Tone.Random.prototype._genRandomNum = function(min, max){
	// TODO: make use of the 'type' of randomness
	var diff = max - min;
	return Math.random() * diff + min;
};

/**
 * Internal function used to generate random numbers
 * based on a normal distribution
 * @param {Positives}
 * @return {Number}
 * @private
 */
Tone.Random.prototype._genRandomBMNum = function(min, max, skew = 1){
	// math for this comes from: 
	// https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve/36481059#36481059

	var u = 0, v = 0;
	while (u === 0){
		u = Math.random(); //Converting [0,1) to (0,1)
	}
	while (v === 0){ 
		v = Math.random();
	}
	let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

	num = num / 10.0 + 0.5; // Translate to 0 -> 1
	if (num > 1 || num < 0){
		num = this._genRandomBMNum(min, max, skew);
	} // resample between 0 and 1 if out of range
	num = Math.pow(num, skew); // Skew
	num *= max - min; // Stretch to fill range
	num += min; // offset to min
	return num;
};

/**
 *  Start the loop at the specified time along the Transport's
 *  timeline.
 *  @param  {TimelinePosition=}  time  When to start the Random.
 *  @return  {Tone.Random}  this
 */
Tone.Random.prototype.start = function(time){
	// time = this.toSeconds(time);
	// this._tick(time);
	this._loop = true;
	this._event.start(time);
	return this;
};

/**
 *  Stop the loop at the given time.
 *  @param  {TimelinePosition=}  time  When to stop the Random.
 *  @return  {Tone.Random}  this
 */
Tone.Random.prototype.stop = function(time){
	this._loop = false;
	this._event.stop(time);
	return this;
};

/**
 *  Cancel all scheduled events greater than or equal to the given time
 *  @param  {TimelinePosition}  [time=0]  The time after which events will be cancel.
 *  @return  {Tone.Random}  this
 */
// Tone.Random.prototype.cancel = function(time){
// 	this._event.cancel(time);
// 	return this;
// };

/**
 *  Internal function called when the notes should be called
 *  @param  {Number}  time  The time the event occurs
 *  @private
 */
Tone.Random.prototype._tick = function(time){
	// TODO: RECURSION USING THIS?!?!?!?!?!?!
	// REDO, maybe schedule events like up to 30 seconds ahead?
	// console.log("min max: " + this.range[0] + ", " + this.range[1]);
	// schedule next event
	// console.log("audio ctx current time: " + time);
	// console.log("ranges: " + this.range[0] + ", " + this.range[1]);
	// this.callback(time);
	// console.log("Tone.toSeconds: " + Tone.toSeconds(time));
	// time = this.toTicks(time);
	// console.log("this.toTicks: " + time);
	// console.log("Tone.Ticks: " + Tone.Ticks(time));
	// this._event.start(time);
	// Tone.Transport.schedule(this.callback, time);

	// for (var i = 0; i < this._iterations; i++){
	// 	// this.callback(time);
	// 	// console.log("i: " + i);
	// 	// Tone.Transport.schedule(this.callback, time);
	// 	this.callback(time);
	// 	time += this._random(this.range[0], this.range[1]);
	// }

	if (this._loop){
		// var t = true;
		if (this._iterations === Infinity){
			this.callback(time);
			Tone.Transport.schedule(this._tick.bind(this), "+" + this._genRandomNum(this._range[0], this._range[1]));
		} else if (this._iterations > 0){
			this._iterations--;
			this.callback(time);
			// time += this._random(this.range[0], this.range[1]);
			Tone.Transport.schedule(this._tick.bind(this), "+" + this._genRandomNum(this._range[0], this._range[1]));
			// this._tick(time);
		}
		console.log("time: " + time);
	}
};

/**
 *  The state of the Loop, either started or stopped.
 *  @memberOf Tone.Random#
 *  @type {String}
 *  @name state
 *  @readOnly
 */
// Object.defineProperty(Tone.Random.prototype, "state", {
// 	get : function(){
// 		return this._event.state;
// 	}
// });

/**
 *  The progress of the loop as a value between 0-1. 0, when
 *  the loop is stopped or done iterating. 
 *  @memberOf Tone.Random#
 *  @type {NormalRange}
 *  @name progress
 *  @readOnly
 */
// Object.defineProperty(Tone.Random.prototype, "progress", {
// 	get : function(){
// 		return this._event.progress;
// 	}
// });

/**
 *  The playback rate of the loop. The normal playback rate is 1 (no change). 
 *  A `playbackRate` of 2 would be twice as fast. 
 *  @memberOf Tone.Random#
 *  @type {Time}
 *  @name playbackRate
 */
// Object.defineProperty(Tone.Random.prototype, "playbackRate", {
// 	get : function(){
// 		return this.playbackRate;
// 	}
// 	// set : function(rate){
// 	// 	this.playbackRate = rate;
// 	// }
// });

// /**
//  *  Muting the Random means that no callbacks are invoked.
//  *  @memberOf Tone.Random#
//  *  @type {Boolean}
//  *  @name mute
//  */
// Object.defineProperty(Tone.Random.prototype, "mute", {
// 	get : function(){
// 		return this._event.mute;
// 	},
// 	set : function(mute){
// 		this._event.mute = mute;
// 	}
// });

/**
 * Setting the min/max range for random numbers. If only 
 * a single number is given the min value is 0.
 * @type {Number|Array}
 * @memberOf Tone.Random#
 * @name range
 * @example
 * loop.range = 2;
 * // or you give it an array for min/max limit
 * loop.range = [0.1, 0.3];
 */
Object.defineProperty(Tone.Random.prototype, "range", {
	get : function(){
		return this._range;
	},
	set : function(input){
		if (Tone.isArray(input)){
			this._range[0] = input[0];
			this._range[1] = input[1];
		} else if (Tone.isNumber(input)){
			this._range[0] = 0;
			this._range[1] = input;
		}
	}
});

/**
 * The number of iterations of the loop. This is a private
 * property only to prevent infinite recursion.
 * @type {Positive}
 * @memberOf Tone.Random#
 * @name iterations
 * @private
 */
Object.defineProperty(Tone.Random.prototype, "iterations", {
	get : function(){
		return this._iterations;
	},
	set : function(iters){
		this._iterations = iters;
	}
});

/**
 *  Clean up
 *  @return  {Tone.Random}  this
 */
Tone.Random.prototype.dispose = function(){
	// this._event.dispose();
	// this._event = null;
	this.callback = null;
};

export default Tone.Random;

