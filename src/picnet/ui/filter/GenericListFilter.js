
goog.require('goog.net.cookies');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.style');
goog.require('goog.Disposable');
goog.require('goog.Timer');

goog.require('picnet.ui.filter.FilterState');
goog.require('picnet.ui.filter.GenericListFilterOptions');
goog.require('picnet.ui.filter.SearchEngine');

goog.provide('picnet.ui.filter.GenericListFilter');

/** 
 * @private
 * @type {number}
 */
picnet.ui.filter.GenericListFilter.filteridx = 0;

/** 
 * @constructor
 * @extends {goog.Disposable}
 * @export
 *
 * @param {Element} filterInput
 * @param {!Element} list
 * @param {!picnet.ui.filter.GenericListFilterOptions} options
 */
picnet.ui.filter.GenericListFilter = function(filterInput, list, options) {    
    goog.Disposable.call(this);

    /**
	 * @protected
	 * @type {!Element}
	 */
	this.list = list;	
    /**
	 * @protected
	 * @type {!picnet.ui.filter.GenericListFilterOptions}
	 */
	this.options = options;	

    /**
     * @private
     * @type {Element} filterInput
     */
     this.filterInput = filterInput;    
     /** 
      * @protected
	  * @type {!Array.<!Element>}
	  */
    this.listItems;	    
    /** 
      * @protected
	  * @type {!Array.<!Element>}
	  */
    this.filters = [this.filterInput];
	/**
	 * @private
	 * @type {goog.events.EventHandler}
	 */
	this.eventHandler = new goog.events.EventHandler(this);	
	/** 
     * @private
	 * @type {number}
	 */
	this.lastkeytime;
	/** 
     * @private
	 * @type {number}
	 */
    this.lastTimerID;    
	/** 
     * @private
	 * @type {boolean}
	 */
    this.cancelQuickFind;
	/**
     * @private 
	 * @type {string}
	 */
    this.filterKey;        
	
    /**
     * @private
     * @type {!picnet.ui.filter.SearchEngine}            
     */
     this.search = new picnet.ui.filter.SearchEngine();

	this.initialiseFilters(); // Initialise
};
goog.inherits(picnet.ui.filter.GenericListFilter, goog.Disposable);

/**
 * @param {!Element} list
 */
picnet.ui.filter.GenericListFilter.prototype.resetList = function(list) {	
	this.list = list;
	this.initialiseControlCaches();
};

/**
 * @protected	 
 */
picnet.ui.filter.GenericListFilter.prototype.initialiseFilters = function() {		    
	var listid = this.list.getAttribute('id') || this.list.getAttribute('name') || '';
    this.filterKey = listid + '_' + (++picnet.ui.filter.GenericListFilter.filteridx) + '_filters';
    this.initialiseControlCaches();            
    this.registerListenersOnFilters();            
    this.loadFiltersFromCookie();
};

/**
 * @private	 
 */
picnet.ui.filter.GenericListFilter.prototype.registerListenersOnFilters = function () {
    goog.array.forEach(this.filters, function (filter) {
        this.eventHandler.listen(filter, filter.getAttribute('type') === 'text' ? goog.events.EventType.KEYUP : goog.events.EventType.CHANGE, this.onFilterChanged, false, this);
    }, this);

    if (this.options['clearFiltersControls']) {
        for (var i = 0; i < this.options['clearFiltersControls'].length; i++) {
            if (this.options['clearFiltersControls'][i].length) this.options['clearFiltersControls'][i] = this.options['clearFiltersControls'][i][0];
            this.eventHandler.listen(this.options['clearFiltersControls'][i], goog.events.EventType.CLICK, this.clearAllFilters, false, this);
        }
    }

    if (!this.options['additionalFilterTriggers']) return;

    for (i = 0; i < this.options['additionalFilterTriggers'].length; i++) {
        /** @type {!Element} */
        var trigger = this.options['additionalFilterTriggers'][i];
        if (trigger.length) trigger = this.options['additionalFilterTriggers'][i] = trigger[0]; // Remove jQueryObject

        var type = trigger.options ? 'select-one' : trigger.getAttribute('type');
        switch (type) {
            case 'select-one':
                this.eventHandler.listen(trigger, goog.events.EventType.CHANGE, this.onFilterChanged, false, this);
                break;
            case 'text':
                trigger.setAttribute('title', this.options['filterToolTipMessage']);
                this.eventHandler.listen(trigger, goog.events.EventType.KEYUP, this.onFilterChanged, false, this);
                break;
            case 'checkbox':
                this.eventHandler.listen(trigger, goog.events.EventType.CLICK, this.onFilterChanged, false, this);
                break;
            default:
                throw 'Filter type ' + type + ' is not supported';
        }
    }
};

/** 
 */
picnet.ui.filter.GenericListFilter.prototype.clearAllFilters = function() {	
    goog.array.forEach(this.filters, this.clearFilterValue, this);
    if (this.options['additionalFilterTriggers']) {
		goog.array.forEach(this.options['additionalFilterTriggers'], this.clearFilterValue, this);            
    }
    this.refresh();
};
	
picnet.ui.filter.GenericListFilter.prototype.clearFilterValue = function(f) {		
	var type = f.options ? 'select-one' : f.getAttribute('type');
	switch (type) {
		case 'select-one':
			f.selectedIndex = 0;
			break;
		case 'text':
			f.value = '';
			break;
		case 'checkbox':
			f.checked = false;
			break;
		default:
			throw 'Filter type ' + type + ' is not supported';
	}
};

/**
 * @protected
 */
picnet.ui.filter.GenericListFilter.prototype.initialiseControlCaches = function() {					
    this.listItems = /** @type {!Array.<!Element>} */ (this.list.childNodes);
};

/**
 * @private
 */
picnet.ui.filter.GenericListFilter.prototype.loadFiltersFromCookie = function() {									
    var filterState = this.options['enableCookies'] && goog.net.cookies.get(this.filterKey);
    if (!filterState) { return; }
    filterState = filterState.split('|');
    var states = /** @type{!Array.<picnet.ui.filter.FilterState>} */ ([]);
    for (var i = 0; i < filterState.length; i++) {
        var state = filterState[i].split(',');
        states.push(new picnet.ui.filter.FilterState(state[0], state[3], parseInt(state[1], 10), state[2]));
    }			
    this.applyFilterStates(states, true);
};	

/**	 
 * @private
 * @param {!Event} e
 */
picnet.ui.filter.GenericListFilter.prototype.onFilterChanged = function (e) {
    this.lastkeytime = new Date().getTime();
    this.quickFindTimer();
};

/**	 
 * @private	 
 */	
picnet.ui.filter.GenericListFilter.prototype.quickFindTimer = function() {
    if (this.lastTimerID) { clearTimeout(this.lastTimerID); this.lastTimerID = 0; }
    this.cancelQuickFind = true;

    var curtime = new Date().getTime();
    var delay = this.options['filterDelay'];        
    if (curtime - this.lastkeytime >= delay) {
        this.refresh();
    } else {        
        this.lastTimerID = goog.Timer.callOnce(function() { this.quickFindTimer.call(this); }, delay / 3, this);
    }
};

/**	 
 */	
picnet.ui.filter.GenericListFilter.prototype.refresh = function() {
    this.cancelQuickFind = false;
    clearTimeout(this.lastTimerID);
    var filterStates = this.getFilterStates();			
    this.applyFilterStates(filterStates, false);			
    this.saveFiltersToCookie(filterStates);				
};

/**	 
 * @protected
 * @return {!Array.<picnet.ui.filter.FilterState>}
 */	
picnet.ui.filter.GenericListFilter.prototype.getFilterStates = function() {
    var state = this.getFilterStateForFilter(this.filterInput);
    return state ? [state] : [];
};

/**
 * @protected
 * @param {Element} filter
 * @return {picnet.ui.filter.FilterState}
 */
picnet.ui.filter.GenericListFilter.prototype.getFilterStateForFilter = function(filter) {			
    var type = filter.options ? 'select-one' : filter.getAttribute('type');		
    var value;		
    switch (type) {
        case 'text':
            value = filter.value === null ? null : filter.value.toLowerCase();
            break;
        case 'select-one':
            value = filter.selectedIndex === 0 ? null : filter.options[filter.selectedIndex].value;
            break;
        case 'checkbox':
			value = filter.checked;
            break;
        default:
            throw 'Filter type ' + type + ' is not supported';
    }
    if (value === null || value.length <= 0) { return null; }    		
	return new picnet.ui.filter.FilterState(filter.getAttribute('id'), value, 0, type);
};

/**
 * @private
 * @param {!Array.<picnet.ui.filter.FilterState>} filterStates
 */
picnet.ui.filter.GenericListFilter.prototype.saveFiltersToCookie = function(filterStates) {			
	if (!this.options['enableCookies']) { return; }
    var val = [];
    for (var i = 0; i < filterStates.length; i++) {
        if (val.length > 0) val.push('|');
        var state = filterStates[i];        
        val.push(state.id);
        val.push(',');
        val.push(state.idx);
        val.push(',');
        val.push(state.type);
        val.push(',');
        val.push(state.value);
    }        
	goog.net.cookies.set(this.filterKey, val.join(''), 999999);
};

/**
 * @private
 * @param {!Array.<picnet.ui.filter.FilterState>} filterStates
 * @param {boolean} setValueOnFilter
 */
picnet.ui.filter.GenericListFilter  .prototype.applyFilterStates = function(filterStates, setValueOnFilter) {					
	if (this.options['filteringElements']) this.options['filteringElements'](filterStates);
	this.applyFilterStatesImpl(filterStates, setValueOnFilter);
	if (this.options['filteredElements']) this.options['filteredElements'](filterStates);
};
/**
 * @private
 * @param {!Array.<picnet.ui.filter.FilterState>} filterStates
 * @param {boolean} setValueOnFilter
 */	
picnet.ui.filter.GenericListFilter.prototype.applyFilterStatesImpl = function(filterStates, setValueOnFilter) {							
    this.clearElementFilteredStates();
    if ((!filterStates || filterStates.length) === 0 && this.options['matchingElement']) {
        this.hideElementsThatDoNotMatchAnyFiltres();
        return;
    }								
    if (filterStates === null || filterStates.length === 0) { this.applyStateToElements(null); }
    else {			
        for (var i = 0; i < filterStates.length; i++) {
            var state = filterStates[i];
            if (setValueOnFilter && state.type && state.id) {					
				var filter = goog.dom.getElement(state.id);
				if (filter.length === 0) { throw 'Could not find the speficied filter: ' + state.id; }
						
                switch (state.type) {
                    case 'select-one':
						goog.array.forEach(filter.options, function(o) {
							if (o.value === state.value) o.setAttribute('selected', 'selected');
							else o.removeAttribute('selected');
						});
						break;
                    case 'text':							
                        filter.value = state.value;
                        break;
                    case 'checkbox':
						filter.checked = state.value === 'true';							
                        break;
                    default:
                        throw 'Filter type ' + state.type + ' is not supported';
                }
            }					
            this.applyStateToElements(state);
        }
    }

    this.hideElementsThatDoNotMatchAnyFiltres();			
};

/**
 * @private	 
 */
picnet.ui.filter.GenericListFilter.prototype.clearElementFilteredStates = function() {
    goog.array.forEach(this.listItems, function(r) { r.removeAttribute('filtermatch'); } );
};

/**
 * @private
 * @param {picnet.ui.filter.FilterState} filterState	 
 */
picnet.ui.filter.GenericListFilter.prototype.applyStateToElements = function(filterState) {
    var normalisedTokens = this.getNormalisedSearchTokensForState(filterState);    
    for (var i = 0; i < this.listItems.length; i++) {
        if (this.cancelQuickFind) return;
        var item = this.listItems[i];       
        if (item.getAttribute('filtermatch')) { continue; }                    			
		if (!this.doesElementContainText(filterState, item, normalisedTokens)) { item.setAttribute('filtermatch', 'false'); }
    }
};

/**
 * @private
 * @param {picnet.ui.filter.FilterState} state
 * @return {Array.<string>}
 */
picnet.ui.filter.GenericListFilter.prototype.getNormalisedSearchTokensForState = function(state) {
    if (state === null) { return null; }
    switch (state.type) {
        case 'select-one':
            return [state.value];
        case 'text':
            return this.search.parseSearchTokens(state.value);
        case 'checkbox':
            return null;
        default:
            throw 'State type ' + state.type + ' is not supported';
    }
};

/**
 * @private	 
 */
picnet.ui.filter.GenericListFilter.prototype.hideElementsThatDoNotMatchAnyFiltres =function() {
    for (var i = 0; i < this.listItems.length; i++) {
        if (this.cancelQuickFind) return;
        var item = this.listItems[i];
		var show = item.getAttribute('filtermatch') !== 'false';			
		goog.style.showElement(item, show);            
    }
};

/**
 * @protected
 * @param {picnet.ui.filter.FilterState} state
 * @param {!Element} item
 * @param {Array.<string>} textTokens
 * @return {boolean}
 */
picnet.ui.filter.GenericListFilter.prototype.doesElementContainText = function(state, item, textTokens) {		        
    return this.doesTextContainText(state, item, textTokens) && this.checkMatchingElementCallback(state, item, textTokens);			
};
				
	
/**
 * @private	 
 * @param {picnet.ui.filter.FilterState} state
 * @param {!Element} item
 * @param {Array.<string>} textTokens	 
 * @return {boolean}
 */
picnet.ui.filter.GenericListFilter.prototype.checkMatchingElementCallback = function(state, item, textTokens) {
    if (!this.options['matchingElement']) return true;				
	var object = item;
	if (window['jQuery']) object = window['jQuery'](item);
    return this.options['matchingElement'](state, object, textTokens);
};

/**
 * @protected	 
 * @param {picnet.ui.filter.FilterState} state
 * @param {!Element} item
 * @param {Array.<string>} textTokens	 
 * @return {boolean}
 */
picnet.ui.filter.GenericListFilter.prototype.doesTextContainText = function(state, item, textTokens) {            		
    var text = goog.dom.getTextContent(item);
    if (!this.search.doesTextMatchTokens(text, textTokens, goog.isDefAndNotNull(state) && state.type === 'select-one')) { 						
		return false; 
	}			
	return !this.options['matchingElement'] || this.options['matchingElement'](state, item, textTokens);				
};

/** @inheritDoc */
picnet.ui.filter.GenericListFilter.prototype.disposeInternal = function() {
    picnet.ui.filter.GenericListFilter.superClass_.disposeInternal.call(this);

	goog.dispose(this.options);
	goog.dispose(this.eventHandler);
	goog.dispose(this.search);

	delete this.list;	
	delete this.filterInput;
	delete this.listItems;
	delete this.filters;	
};