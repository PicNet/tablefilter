﻿
goog.require('goog.net.cookies');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.style');
goog.require('goog.Disposable');
goog.require('goog.Timer');

goog.require('pn.ui.filter.FilterState');
goog.require('pn.ui.filter.GenericListFilterOptions');
goog.require('pn.ui.filter.SearchEngine');

goog.provide('pn.ui.filter.GenericListFilter');

/** 
 * @constructor
 * @extends {goog.Disposable}
 * @export
 *
 * @param {Element} filterInput
 * @param {!Element} list
 * @param {!pn.ui.filter.GenericListFilterOptions} options
 */
pn.ui.filter.GenericListFilter = function(filterInput, list, options) {    
    goog.Disposable.call(this);

    /**
	 * @protected
	 * @type {!Element}
	 */
	this.list = list;	
    /**
	 * @protected
	 * @type {!pn.ui.filter.GenericListFilterOptions}
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
     * @type {!pn.ui.filter.SearchEngine}            
     */
     this.search = new pn.ui.filter.SearchEngine();

	this.initialiseFilters(); // Initialise
};
goog.inherits(pn.ui.filter.GenericListFilter, goog.Disposable);


/** 
* @private
* @type {number}
*/
pn.ui.filter.GenericListFilter.filteridx = 0;

/**
 * @param {!Element} list
 */
pn.ui.filter.GenericListFilter.prototype.resetList = function(list) {	
	this.list = list;
	this.initialiseControlCaches();
};

/**
 * @protected	 
 */
pn.ui.filter.GenericListFilter.prototype.getListId = function() {
  return this.list.getAttribute('id') || this.list.getAttribute('name') || '';
};

/**
 * @protected	 
 */
pn.ui.filter.GenericListFilter.prototype.initialiseFilters = function() {
  var listid = this.getListId();
  this.filterKey = listid + '_' + (++pn.ui.filter.GenericListFilter.filteridx) + '_filters';
  this.initialiseControlCaches();
  this.registerListenersOnFilters();
  this.loadFiltersFromCookie();
};

/**
 * @private	 
 */
pn.ui.filter.GenericListFilter.prototype.registerListenersOnFilters = function () {
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
pn.ui.filter.GenericListFilter.prototype.clearAllFilters = function() {	
    goog.array.forEach(this.filters, this.clearFilterValue, this);
    if (this.options['additionalFilterTriggers']) {
		goog.array.forEach(this.options['additionalFilterTriggers'], this.clearFilterValue, this);            
    }
    this.refresh();
};
	
pn.ui.filter.GenericListFilter.prototype.clearFilterValue = function(f) {		
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
pn.ui.filter.GenericListFilter.prototype.initialiseControlCaches = function() {					
    this.listItems = /** @type {!Array.<!Element>} */ (this.list.childNodes);
};

/**
 * @private
 */
pn.ui.filter.GenericListFilter.prototype.loadFiltersFromCookie = function() {									
  var filterState = this.options['enableCookies'] && goog.net.cookies.get(this.filterKey);
  var states = /** @type{!Array.<pn.ui.filter.FilterState>} */ ([]);
  if (filterState) {
    filterState = filterState.split('|');
    for (var i = 0; i < filterState.length; i++) {
      var state = filterState[i].split(',');
      states.push(new pn.ui.filter.FilterState(state[0], state[3], parseInt(state[1], 10), state[2]));
    }
  }
  var sharedCookieId = this.options['sharedCookieId'];
  if (sharedCookieId) {
    var additionalFilterStates = this.options['enableCookies'] && goog.net.cookies.get(sharedCookieId);
    if (!additionalFilterStates) {
      return;
    }
    additionalFilterStates = additionalFilterStates.split('|');
    var additionalStates = /** @type{!Array.<pn.ui.filter.FilterState>} */ ([]);
    for (var i = 0; i < additionalFilterStates.length; i++) {
      var additionalState = additionalFilterStates[i].split(',');
      var stateHeaderTextOrAdditionalFilterId = additionalState[0];
          
      if (stateHeaderTextOrAdditionalFilterId.charAt(0) == '#') {
        additionalStates.push(new pn.ui.filter.FilterState(stateHeaderTextOrAdditionalFilterId.substr(1), additionalState[3], -1, additionalState[2]));
        continue;
      }
      
      for (var headerIndex = 0; headerIndex < this.headers.length; headerIndex++) {
        var header = this.headers[headerIndex];
        var visible = goog.style.isElementShown(header);
        var headerText = header.getAttribute('filter') === 'false' || !visible ? null : goog.dom.getTextContent(header);

        if (headerText && headerText == stateHeaderTextOrAdditionalFilterId) {
          var filter = this.filters[this.filterColumnIndexes.indexOf(headerIndex)];
          var filterId = filter.getAttribute('id');
          additionalStates.push(new pn.ui.filter.FilterState(filterId, additionalState[3], headerIndex, additionalState[2]));
          continue;
        }
      }
    }

    
    for(var k = 0; k < additionalStates.length; k++) {
      var found = false;  
      for(var j = 0; j < states.length; j++) {
        if (additionalStates[k].id == states[j].id) {
          states[j].value = additionalStates[k].value;
          found = true;
        }
      }
      if (!found) {
        states.push(additionalStates[k]);
      }
    }
  }
  this.applyFilterStates(states, true);
};

/**	 
 * @private
 * @param {!Event} e
 */
pn.ui.filter.GenericListFilter.prototype.onFilterChanged = function (e) {    
    this.lastkeytime = new Date().getTime();
    this.quickFindTimer();
};

/**	 
 * @private	 
 */	
pn.ui.filter.GenericListFilter.prototype.quickFindTimer = function() {
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
pn.ui.filter.GenericListFilter.prototype.refresh = function() {
    this.cancelQuickFind = false;
    clearTimeout(this.lastTimerID);
    var filterStates = this.getFilterStates();			
    this.applyFilterStates(filterStates, false);			
    this.saveFiltersToCookie(filterStates);				
};

/**	 
 * @protected
 * @return {!Array.<pn.ui.filter.FilterState>}
 */	
pn.ui.filter.GenericListFilter.prototype.getFilterStates = function() {
    var state = this.getFilterStateForFilter(this.filterInput);
    return state ? [state] : [];
};

/**
 * @protected
 * @param {Element} filter
 * @return {pn.ui.filter.FilterState}
 */
pn.ui.filter.GenericListFilter.prototype.getFilterStateForFilter = function(filter) {			
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
	return new pn.ui.filter.FilterState(filter.getAttribute('id'), value, 0, type);
};

/**
 * @private
 * @param {!Array.<pn.ui.filter.FilterState>} filterStates
 */
pn.ui.filter.GenericListFilter.prototype.saveFiltersToCookie = function(filterStates) {			
  if (!this.options['enableCookies']) { return; }
  var filterStatesById = [];
  var filterStatesByHeaderText = [];
  var sharedCookieId = null;
  for (var i = 0; i < filterStates.length; i++) {
    var state = filterStates[i];
    filterStatesById = this.addFilterStateToStringArray(filterStatesById, state);

    sharedCookieId = this.options['sharedCookieId'];
    if (sharedCookieId) {
      var headerText;
      if (state.idx >= 0) {
        var header = this.headers[state.idx];
        var visible = goog.style.isElementShown(header);
        headerText = header.getAttribute('filter') === 'false' || !visible ? null : goog.dom.getTextContent(header);
      } else {
        headerText = '#' + state.id;
      }
      if (headerText) {
        var stateByHeaderText = new pn.ui.filter.FilterState(headerText, state.value, state.idx, state.type);
        filterStatesByHeaderText = this.addFilterStateToStringArray(filterStatesByHeaderText, stateByHeaderText);
      }
    } 
  }        
  goog.net.cookies.set(this.filterKey, filterStatesById.join(''), 999999);
  if (sharedCookieId) {
    goog.net.cookies.set(sharedCookieId, filterStatesByHeaderText.join(''), 999999);
  }
};

/**
 * @private
 * @param {!Array.<string>} cookieStringArray
 * @param {pn.ui.filter.FilterState} filterState
 * @return {!Array.<string>}
 */
pn.ui.filter.GenericListFilter.prototype.addFilterStateToStringArray = function(cookieStringArray, filterState) {					
  if (cookieStringArray.length > 0) cookieStringArray.push('|');
  cookieStringArray.push(filterState.id);
  cookieStringArray.push(',');
  cookieStringArray.push(filterState.idx);
  cookieStringArray.push(',');
  cookieStringArray.push(filterState.type);
  cookieStringArray.push(',');
  cookieStringArray.push(filterState.value);
  return cookieStringArray;
};

/**
 * @private
 * @param {!Array.<pn.ui.filter.FilterState>} filterStates
 * @param {boolean} setValueOnFilter
 */
pn.ui.filter.GenericListFilter.prototype.applyFilterStates = function(filterStates, setValueOnFilter) {					
	if (this.options['filteringElements']) this.options['filteringElements'](filterStates);
	this.applyFilterStatesImpl(filterStates, setValueOnFilter);
	if (this.options['filteredElements']) this.options['filteredElements'](filterStates);
};
/**
 * @private
 * @param {!Array.<pn.ui.filter.FilterState>} filterStates
 * @param {boolean} setValueOnFilter
 */	
pn.ui.filter.GenericListFilter.prototype.applyFilterStatesImpl = function(filterStates, setValueOnFilter) {							
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
          if (!filter || filter.length === 0) {
            continue;
          }

          switch (state.type) {
          case 'select-one':
            goog.array.forEach(filter.options, function(o, idx) {
              if (o.value === state.value) {
                o.setAttribute('selected', 'selected');
                filter.selectedIndex = idx;
              } else o.removeAttribute('selected');
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
pn.ui.filter.GenericListFilter.prototype.clearElementFilteredStates = function() {
    goog.array.forEach(this.listItems, function(r) { r.removeAttribute('filtermatch'); } );
};

/**
 * @private
 * @param {pn.ui.filter.FilterState} filterState	 
 */
pn.ui.filter.GenericListFilter.prototype.applyStateToElements = function (filterState) {  
  var normalisedTokens = this.getNormalisedSearchTokensForState(filterState);
  // if (!normalisedTokens) { return; } // TODO: Validate this
  
  for (var i = 0; i < this.listItems.length; i++) {
    if (this.cancelQuickFind) return;
    var item = this.listItems[i];
    if (item.getAttribute('filtermatch')) { continue; }
    if (!this.doesElementContainText(filterState, item, normalisedTokens)) { item.setAttribute('filtermatch', 'false'); }
  }
};

/**
 * @private
 * @param {pn.ui.filter.FilterState} state
 * @return {Array.<string>}
 */
pn.ui.filter.GenericListFilter.prototype.getNormalisedSearchTokensForState = function(state) {
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
pn.ui.filter.GenericListFilter.prototype.hideElementsThatDoNotMatchAnyFiltres =function() {
    for (var i = 0; i < this.listItems.length; i++) {
        if (this.cancelQuickFind) return;
        var item = this.listItems[i];
		var show = item.getAttribute('filtermatch') !== 'false';			
		goog.style.showElement(item, show);            
    }
};

/**
 * @protected
 * @param {pn.ui.filter.FilterState} state
 * @param {!Element} item
 * @param {Array.<string>} textTokens
 * @param {string=} optText
 * @return {boolean}
 */
pn.ui.filter.GenericListFilter.prototype.doesElementContainText = function (state, item, textTokens, optText) {  
  var exact = goog.isDefAndNotNull(state) && state.type === 'select-one';
  var matches = optText ?
    this.doesTextContainTextImpl(optText, textTokens, exact) :
    this.doesTextContainText(item, textTokens, exact);  
  return matches && this.checkMatchingElementCallback(state, item, textTokens);
};
				
	
/**
 * @private	 
 * @param {pn.ui.filter.FilterState} state
 * @param {!Element} item
 * @param {Array.<string>} textTokens	 
 * @return {boolean}
 */
pn.ui.filter.GenericListFilter.prototype.checkMatchingElementCallback = function(state, item, textTokens) {
    if (!this.options['matchingElement']) return true;				
	var object = item;
	if (window['jQuery']) object = window['jQuery'](item);
    return this.options['matchingElement'](state, object, textTokens);
};

/**
 * @protected	  
 * @param {!Element} item
 * @param {Array.<string>} textTokens	 
 * @param {boolean} exact
 * @return {boolean}
 */
pn.ui.filter.GenericListFilter.prototype.doesTextContainText = function(item, textTokens, exact) {
  return this.doesTextContainTextImpl(goog.string.trim(goog.dom.getTextContent(item)), textTokens, exact); 
};

/**
 * @protected	 
 * @param {string} text
 * @param {Array.<string>} textTokens	 
 * @param {boolean} exact
 * @return {boolean}
 */
pn.ui.filter.GenericListFilter.prototype.doesTextContainTextImpl = function (text, textTokens, exact) {
  return this.search.doesTextMatchTokens(text, textTokens, exact); 
};

/** @inheritDoc */
pn.ui.filter.GenericListFilter.prototype.disposeInternal = function() {
    pn.ui.filter.GenericListFilter.superClass_.disposeInternal.call(this);

	goog.dispose(this.options);
	goog.dispose(this.eventHandler);
	goog.dispose(this.search);

	delete this.list;	
	delete this.filterInput;
	delete this.listItems;
	delete this.filters;	
};