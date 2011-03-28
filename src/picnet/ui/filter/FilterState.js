
goog.provide('picnet.ui.filter.FilterState');

/**
 * @constructor
 * @param {string} id
 * @param {string} value
 * @param {number} idx
 * @param {string} type
 */
picnet.ui.filter.FilterState = function(id, value, idx, type) {
	/** 
	 * @type {string}
	 */
	this.id = id;
	/** 
	 * @type {string}
	 */
	this.value = value;
	/** 
	 * @type {number}
	 */
	this.idx = idx;
	/** 
	 * @type {string}
	 */
    this.type = type;	
};

/** 
 * @override
 * @return {string}
 */
picnet.ui.filter.FilterState.prototype.toString = function() { return 'id[' + this.id + '] value[' + this.value + '] idx[' + this.idx + '] type[' + this.type + ']'; };
