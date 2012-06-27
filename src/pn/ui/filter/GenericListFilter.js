;
goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.net.cookies');
goog.require('goog.style');
goog.require('pn.ui.filter.FilterState');
goog.require('pn.ui.filter.GenericListFilterOptions');
goog.require('pn.ui.filter.SearchEngine');

goog.provide('pn.ui.filter.GenericListFilter');



/**
 * @constructor
 * @extends {goog.Disposable}
 *
 * @param {Element} input The DOM input control that will trigger the filter.
 * @param {!Element} list The DOM list element to filter.
 * @param {!pn.ui.filter.GenericListFilterOptions} options The options to
 *    apply to this filtering.
 */
pn.ui.filter.GenericListFilter = function(input, list, options) {
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
  this.registerDisposable(this.options);

  /**
   * @private
   * @type {Element} input
   */
  this.input_ = input;

  /**
   * @protected
   * @type {!Array.<!Element>}
   */
  this.listItems = [];

  /**
   * @protected
   * @type {!Array.<!Element>}
   */
  this.filters = [this.input_];

  /**
   * @private
   * @type {goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh_);

  /**
   * @private
   * @type {number}
   */
  this.lastkeytime_ = 0;

  /**
   * @private
   * @type {number}
   */
  this.lastTimerID_ = 0;

  /**
   * @private
   * @type {boolean}
   */
  this.cancelQuickFind_ = false;

  /**
   * @private
   * @type {string}
   */
  this.filterKey_ = '';

  /**
   * @private
   * @type {!pn.ui.filter.SearchEngine}
   */
  this.search_ = new pn.ui.filter.SearchEngine();

  this.initialiseFilters(); // Initialise
};
goog.inherits(pn.ui.filter.GenericListFilter, goog.Disposable);


/**
 * @private
 * @type {number}
 */
pn.ui.filter.GenericListFilter.filteridx_ = 0;


/** @param {!Element} list The list to reset. */
pn.ui.filter.GenericListFilter.prototype.resetList = function(list) {
  goog.dispose(this.list);
  goog.array.forEach(this.listItems, goog.dispose);

  this.list = list;
  this.initialiseControlCaches();
  this.registerListenersOnFilters_();
  this.loadFiltersFromCookie_();
};


/**
 * @protected
 * @return {string} The id of the given list.
 */
pn.ui.filter.GenericListFilter.prototype.getListId = function() {
  return this.list.getAttribute('id') || this.list.getAttribute('name') || '';
};


/** @protected */
pn.ui.filter.GenericListFilter.prototype.initialiseFilters = function() {
  var listid = this.getListId();
  this.filterKey_ = listid + '_' +
      (++pn.ui.filter.GenericListFilter.filteridx_) + '_filters';
  this.initialiseControlCaches();
  this.registerListenersOnFilters_();
  this.loadFiltersFromCookie_();
};


/** @private */
pn.ui.filter.GenericListFilter.prototype.registerListenersOnFilters_ =
    function() {
  goog.array.forEach(this.filters, function(filter) {
    this.eh_.listen(filter, filter.getAttribute('type') === 'text' ?
        goog.events.EventType.KEYUP :
        goog.events.EventType.CHANGE,
        this.onFilterChanged_, false, this);
  }, this);

  if (this.options['clearFiltersControls']) {
    for (var i = 0; i < this.options['clearFiltersControls'].length; i++) {
      if (this.options['clearFiltersControls'][i].length) {
        this.options['clearFiltersControls'][i] =
            this.options['clearFiltersControls'][i][0];
      }
      this.eh_.listen(this.options['clearFiltersControls'][i],
          goog.events.EventType.CLICK, this.clearAllFilters, false, this);
    }
  }

  if (!this.options['additionalFilterTriggers']) return;

  for (i = 0; i < this.options['additionalFilterTriggers'].length; i++) {
    /** @type {!Element} */
    var trigger = this.options['additionalFilterTriggers'][i];
    if (trigger.length) { // Remove jQueryObject
      trigger = this.options['additionalFilterTriggers'][i] = trigger[0];
    }

    var type = trigger.options ? 'select-one' : trigger.getAttribute('type');
    var et = goog.events.EventType;
    switch (type) {
      case 'select-one':
        this.eh_.listen(trigger, et.CHANGE, this.onFilterChanged_, false, this);
        break;
      case 'text':
        trigger.setAttribute('title', this.options['filterToolTipMessage']);
        this.eh_.listen(trigger, et.KEYUP, this.onFilterChanged_, false, this);
        break;
      case 'checkbox':
        this.eh_.listen(trigger, et.CLICK, this.onFilterChanged_, false, this);
        break;
      default:
        throw 'Filter type ' + type + ' is not supported';
    }
  }
};


/** Clears all filter values */
pn.ui.filter.GenericListFilter.prototype.clearAllFilters = function() {
  goog.array.forEach(this.filters, this.clearFilterValue, this);
  if (this.options['additionalFilterTriggers']) {
    goog.array.forEach(this.options['additionalFilterTriggers'],
        this.clearFilterValue, this);
  }
  this.refresh();
};


/** @param {!Element} f The filter DOM element to clear. */
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


/** @protected */
pn.ui.filter.GenericListFilter.prototype.initialiseControlCaches = function() {
  this.listItems = /** @type {!Array.<!Element>} */ (this.list.childNodes);
};


/** @private */
pn.ui.filter.GenericListFilter.prototype.loadFiltersFromCookie_ = function() {
  var filterState = this.options['enableCookies'] &&
      goog.net.cookies.get(this.filterKey_);
  var states = /** @type {!Array.<pn.ui.filter.FilterState>} */ ([]);
  if (filterState) {
    filterState = filterState.split('|');
    for (var i = 0; i < filterState.length; i++) {
      var s = filterState[i].split(',');
      var idx = parseInt(s[1], 10);
      var fs = new pn.ui.filter.FilterState(s[0], s[3], idx, s[2]);
      states.push(fs);
    }
  }
  var sharedCookieId = this.options['sharedCookieId'];
  if (sharedCookieId) {
    var additionalFilterStates = this.options['enableCookies'] &&
        goog.net.cookies.get(sharedCookieId);
    if (!additionalFilterStates) { return; }
    additionalFilterStates = additionalFilterStates.split('|');
    var additionalStates = [];
    for (var i = 0; i < additionalFilterStates.length; i++) {
      var state = additionalFilterStates[i].split(',');
      var stateHeaderTextOrAdditionalFilterId = state[0];

      if (stateHeaderTextOrAdditionalFilterId.charAt(0) == '#') {
        var fs = new pn.ui.filter.FilterState(
            stateHeaderTextOrAdditionalFilterId.substr(1),
            state[3],
            -1,
            state[2]
            );
        additionalStates.push(fs);
        continue;
      }

      for (var hidx = 0; hidx < this.headers_.length; hidx++) {
        var header = this.headers_[hidx];
        var visible = goog.style.isElementShown(header);
        var headerText = header.getAttribute('filter') === 'false' || !visible ?
            null : goog.dom.getTextContent(header);

        if (headerText && headerText == stateHeaderTextOrAdditionalFilterId) {
          var filter = this.filters[this.filterColumnIndexes_.indexOf(hidx)];
          var fid = filter.getAttribute('id');
          var fs = new pn.ui.filter.FilterState(fid, state[3], hidx, state[2]);
          additionalStates.push(fs);
          continue;
        }
      }
    }


    for (var k = 0; k < additionalStates.length; k++) {
      var found = false;
      for (var j = 0; j < states.length; j++) {
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
  this.applyFilterStates_(states, true);
};


/** @private */
pn.ui.filter.GenericListFilter.prototype.onFilterChanged_ = function() {
  this.lastkeytime_ = new Date().getTime();
  this.quickFindTimer_();
};


/** @private */
pn.ui.filter.GenericListFilter.prototype.quickFindTimer_ = function() {
  if (this.lastTimerID_) {
    clearTimeout(this.lastTimerID_);
    this.lastTimerID_ = 0;
  }
  this.cancelQuickFind_ = true;

  var curtime = new Date().getTime();
  var delay = this.options['filterDelay'];
  if (curtime - this.lastkeytime_ >= delay) {
    this.refresh();
  } else {
    this.lastTimerID_ = goog.Timer.callOnce(function() {
      this.quickFindTimer_.call(this);
    }, delay / 3, this);
  }
};


/** Refreshes the filtering states, usefull in ajax contexts */
pn.ui.filter.GenericListFilter.prototype.refresh = function() {
  this.cancelQuickFind_ = false;
  clearTimeout(this.lastTimerID_);
  var filterStates = this.getFilterStates();
  this.applyFilterStates_(filterStates, false);
  this.saveFiltersToCookie_(filterStates);
};


/**
 * @protected
 * @return {!Array.<pn.ui.filter.FilterState>} The current filter states.
 */
pn.ui.filter.GenericListFilter.prototype.getFilterStates = function() {
  var state = this.getFilterStateForFilter(this.input_);
  return state ? [state] : [];
};


/**
 * @protected
 * @param {Element} filter The filter whose state we require.
 * @return {pn.ui.filter.FilterState} The filter state for the specified filter.
 */
pn.ui.filter.GenericListFilter.prototype.getFilterStateForFilter =
    function(filter) {
  var type = filter.options ? 'select-one' : filter.getAttribute('type');
  var value;
  switch (type) {
    case 'text':
      value = filter.value === null ? null : filter.value.toLowerCase();
      break;
    case 'select-one':
      value = filter.selectedIndex === 0 ?
          null : filter.options[filter.selectedIndex].value;
      break;
    case 'checkbox':
      value = filter.checked;
      break;
    default:
      throw 'Filter type ' + type + ' is not supported';
  }
  if (value === null || value.length <= 0) { return null; }
  var id = filter.getAttribute('id');
  return new pn.ui.filter.FilterState(id, value, 0, type);
};


/**
 * @private
 * @param {!Array.<pn.ui.filter.FilterState>} sts The states to save.
 */
pn.ui.filter.GenericListFilter.prototype.saveFiltersToCookie_ = function(sts) {
  if (!this.options['enableCookies']) { return; }
  var filterStatesById = /** @type  {!Array.<!string>} */ [];
  var filterStatesByHeaderText = /** @type  {!Array.<!string>} */ [];
  var sharedCookieId = null;
  for (var i = 0; i < sts.length; i++) {
    var state = sts[i];
    this.addFilterStateToStringArray_(filterStatesById, state);

    sharedCookieId = this.options['sharedCookieId'];
    if (sharedCookieId) {
      var headerText;
      if (state.idx >= 0) {
        var header = this.headers_[state.idx];
        var visible = goog.style.isElementShown(header);
        headerText = header.getAttribute('filter') === 'false' || !visible ?
            null : goog.dom.getTextContent(header);
      } else {
        headerText = '#' + state.id;
      }
      if (headerText) {
        var fs = new pn.ui.filter.FilterState(
            headerText, state.value, state.idx, state.type);
        filterStatesByHeaderText = /** @type  {!Array.<!string>} */ (
            this.addFilterStateToStringArray_(filterStatesByHeaderText, fs));
      }
    }
  }
  goog.net.cookies.set(this.filterKey_, filterStatesById.join(''), 999999);
  if (sharedCookieId) {
    goog.net.cookies.set(sharedCookieId,
        filterStatesByHeaderText.join(''), 999999);
  }
};


/**
 * @private
 * @param {!Array.<string>} arr The array to add the filter state
 *    to (as a string).
 * @param {pn.ui.filter.FilterState} state The filter state to convert to a
 *    string and add to the array.
 */
pn.ui.filter.GenericListFilter.prototype.addFilterStateToStringArray_ =
    function(arr, state) {
  if (arr.length > 0) arr.push('|');
  arr.push(state.id);
  arr.push(',');
  arr.push(state.idx);
  arr.push(',');
  arr.push(state.type);
  arr.push(',');
  arr.push(state.value);
};


/**
 * @private
 * @param {!Array.<pn.ui.filter.FilterState>} filterStates The filterStates
 *    to apply.
 * @param {boolean} setValueOnFilter Wether we need to set the filter value
 *    on the DOM control.  This is usefull when loading from cookies.
 */
pn.ui.filter.GenericListFilter.prototype.applyFilterStates_ =
    function(filterStates, setValueOnFilter) {
  if (this.options['filteringElements'])
    this.options['filteringElements'](filterStates);

  this.applyFilterStatesImpl_(filterStates, setValueOnFilter);

  if (this.options['filteredElements'])
    this.options['filteredElements'](filterStates);
};


/**
 * @private
 * @param {!Array.<pn.ui.filter.FilterState>} filterStates The filterStates
 *    to apply.
 * @param {boolean} setValueOnFilter Wether we need to set the filter value
 *    on the DOM control.  This is usefull when loading from cookies.
 */
pn.ui.filter.GenericListFilter.prototype.applyFilterStatesImpl_ =
    function(filterStates, setValueOnFilter) {
  this.clearElementFilteredStates_();
  if ((!filterStates || filterStates.length) === 0 &&
      this.options['matchingElement']) {
    this.hideElementsThatDoNotMatchAnyFiltres_();
    return;
  }
  if (filterStates === null || filterStates.length === 0) {
    this.applyStateToElements_(null);
  } else {
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
      this.applyStateToElements_(state);
    }
  }

  this.hideElementsThatDoNotMatchAnyFiltres_();
};


/** @private */
pn.ui.filter.GenericListFilter.prototype.clearElementFilteredStates_ =
    function() {
  goog.array.forEach(this.listItems, function(r) {
    r.removeAttribute('filtermatch');
  });
};


/**
 * @private
 * @param {pn.ui.filter.FilterState} filterState The filter state to apply.
 */
pn.ui.filter.GenericListFilter.prototype.applyStateToElements_ =
    function(filterState) {
  var normalisedTokens = this.getNormalisedSearchTokensForState_(filterState);

  for (var i = 0; i < this.listItems.length; i++) {
    if (this.cancelQuickFind_) return;
    var item = this.listItems[i];
    if (item.getAttribute('filtermatch')) { continue; }
    if (!this.doesElementContainText(filterState, item, normalisedTokens)) {
      item.setAttribute('filtermatch', 'false');
    }
  }
};


/**
 * @private
 * @param {pn.ui.filter.FilterState} state The filter to normalise.
 * @return {Array.<string>} The normalised tokens for the filter state.
 */
pn.ui.filter.GenericListFilter.prototype.getNormalisedSearchTokensForState_ =
    function(state) {
  if (state === null) { return null; }
  switch (state.type) {
    case 'select-one':
      return [goog.string.unescapeEntities(state.value)];
    case 'text':
      return this.search_.parseSearchTokens(state.value);
    case 'checkbox':
      return null;
    default:
      throw 'State type ' + state.type + ' is not supported';
  }
};


/** @private */
pn.ui.filter.GenericListFilter.prototype.hideElementsThatDoNotMatchAnyFiltres_ =
    function() {
  for (var i = 0; i < this.listItems.length; i++) {
    if (this.cancelQuickFind_) return;
    var item = this.listItems[i];
    var show = item.getAttribute('filtermatch') !== 'false';
    goog.style.showElement(item, show);
  }
};


/**
 * @protected
 * @param {pn.ui.filter.FilterState} state The filter state to check for
 *    a match.
 * @param {!Element} item The DOM element for the filter.
 * @param {Array.<string>} textTokens The filter text tokens.
 * @param {string=} opt_txt The text to match against.
 * @return {boolean} Wether the filter matches the specified text.
 */
pn.ui.filter.GenericListFilter.prototype.doesElementContainText =
    function(state, item, textTokens, opt_txt) {
  var exact = goog.isDefAndNotNull(state) && state.type === 'select-one';
  var matches = opt_txt ?
      this.doesTextContainTextImpl(opt_txt, textTokens, exact) :
      this.doesTextContainText(item, textTokens, exact);
  return matches && this.checkMatchingElementCallback_(state, item, textTokens);
};


/**
 * @private
 * @param {pn.ui.filter.FilterState} state The filter state to check for
 *    a match.
 * @param {!Element} item The DOM element for the filter.
 * @param {Array.<string>} textTokens The filter text tokens.
 * @return {boolean} Wether the filter matches the specified text.
 */
pn.ui.filter.GenericListFilter.prototype.checkMatchingElementCallback_ =
    function(state, item, textTokens) {
  if (!this.options['matchingElement']) return true;
  var object = item;
  if (window['jQuery']) object = window['jQuery'](item);
  return this.options['matchingElement'](state, object, textTokens);
};


/**
 * @protected
 * @param {!Element} item The DOM element for the filter.
 * @param {Array.<string>} textTokens The filter text tokens.
 * @param {boolean} exact Wether an exact match is required.
 * @return {boolean} Wether the filter matches the specified text.
 */
pn.ui.filter.GenericListFilter.prototype.doesTextContainText =
    function(item, textTokens, exact) {
  var trimmed = goog.string.trim(goog.dom.getTextContent(item));
  return this.doesTextContainTextImpl(trimmed, textTokens, exact);
};


/**
 * @protected
 * @param {string} text The filter expression text.
 * @param {Array.<string>} textTokens The filter text tokens.
 * @param {boolean} exact Wether an exact match is required.
 * @return {boolean} Wether the filter matches the specified text.
 */
pn.ui.filter.GenericListFilter.prototype.doesTextContainTextImpl =
    function(text, textTokens, exact) {
  return this.search_.doesTextMatchTokens(text, textTokens, exact);
};
