  
goog.require('goog.array');
goog.require('goog.dom.classes');
goog.require('goog.dom');
goog.require('goog.style');

goog.require('picnet.ui.filter.TableFilterOptions');
goog.require('picnet.ui.filter.GenericListFilter');

goog.provide('picnet.ui.filter.TableFilter');

/** 
 * @constructor
 * @extends {picnet.ui.filter.GenericListFilter}
 * @export
 * 
 * @param {!Element} grid
 * @param {!picnet.ui.filter.TableFilterOptions} options
 */
picnet.ui.filter.TableFilter = function(grid, options) {    
	// Backwards compatibility
	if (options['matchingRow']) options['matchingElement'] = options['matchingRow'];
	if (options['filteringRows']) options['filteringElements'] = options['filteringRows'];
	if (options['filteredRows']) options['filteredElements'] = options['filteredRows'];
    picnet.ui.filter.GenericListFilter.call(this, null, grid, options);

	/** 
     * @private
	 * @type {!Array.<number>}
	 */
	this.filterColumnIndexes;
	/** 
     * @private
	 * @type {!Array.<!Element>}
	 */
    this.headers;
	/** 
     * @private
	 * @type {!Element}
	 */
    this.thead;
	/** 
     * @private
	 * @type {!Element}
	 */
    this.tbody;		    	
};
goog.inherits(picnet.ui.filter.TableFilter, picnet.ui.filter.GenericListFilter);


/** 
* @private
* @type {number}
*/
picnet.ui.filter.TableFilter.grididx = 0;


/**
 * @inheritDoc
 */
picnet.ui.filter.TableFilter.prototype.initialiseFilters = function() {		    
	this.thead = goog.dom.getElementsByTagNameAndClass('thead', null, this.options['frozenHeaderTable'] || this.list)[0];
	this.tbody = goog.dom.getElementsByTagNameAndClass('tbody', null, this.list)[0];

    picnet.ui.filter.TableFilter.superClass_.initialiseFilters.call(this);    
};

/**
 * @inheritDoc
 */
picnet.ui.filter.TableFilter.prototype.initialiseControlCaches = function () {
    this.headers = /** @type {!Array.<!Element>} */(goog.dom.getElementsByTagNameAndClass('th', null, this.thead));
    this.listItems = /** @type {!Array.<!Element>} */(goog.dom.getElementsByTagNameAndClass('tr', null, this.tbody));
    this.buildFiltersRow();
    var tHeadFilters = goog.dom.getElementsByTagNameAndClass('tr', 'filters', this.thead)[0];
    this.filters = /** @type {!Array.<!Element>} */(goog.array.concat(
		goog.array.map(goog.dom.getElementsByTagNameAndClass('input', null, tHeadFilters), function (ctl) { return ctl; }),
		goog.array.map(goog.dom.getElementsByTagNameAndClass('select', null, tHeadFilters), function (ctl) { return ctl; })
	));
  this.filterColumnIndexes = goog.array.map(this.filters, this.getColumnIndexOfFilter, this);
};
	
	
/**	 
 * @private
 * @param {!Element} f
 * @return {number}
 */	
picnet.ui.filter.TableFilter.prototype.getColumnIndexOfFilter = function(f) {
	var td = goog.dom.getAncestorByTagNameAndClass(f, goog.dom.TagName.TD);
	var tr = goog.dom.getAncestorByTagNameAndClass(td, goog.dom.TagName.TR);
	var cells = /** @type {!Array.<!Element>} */ (tr.getElementsByTagName('td'));		
	return goog.array.indexOf(cells, td);
};
	
/**
 * @private
 * @return {!Element}
 */
picnet.ui.filter.TableFilter.prototype.getFilterTable = function() { return (this.options['frozenHeaderTable'] || this.list); };

/**
 * @private
 */
picnet.ui.filter.TableFilter.prototype.buildFiltersRow = function() {
    var tr = goog.dom.createDom('tr', {'class':'filters'});
    for (var i = 0; i < this.headers.length; i++) {
        var header = this.headers[i];				
		var visible = goog.style.isElementShown(header);		
		if (!visible) { continue; }
			
        var headerText = header.getAttribute('filter') === 'false' || !visible ? '' : goog.dom.getTextContent(header);				
		var filterClass = header.getAttribute('filter-class');
		/** @type Element */ 
		var td;
		if (headerText && headerText.length > 1) {
			var filter = this.getFilterDom(i, header);
			goog.style.setStyle(filter, 'width', '95%');
			td = goog.dom.createDom('td', null, filter);												
		} else { td = goog.dom.createDom('td', {}, ''); }						
			
		if (filterClass) { goog.dom.classes.add(td, filterClass); }
		goog.dom.appendChild(tr, td);					            
    }	
	goog.dom.appendChild(this.thead, tr);        
};

/**
 * @private
 * @param {number} colIdx
 * @param {!Element} header
 * @return {!Element}
 */
picnet.ui.filter.TableFilter.prototype.getFilterDom = function(colIdx, header) {
    var filterType = header.getAttribute('filter-type') || 'text';
    switch (filterType) {
        case 'text': return goog.dom.createDom('input', {'type':'text','id':'filter_' + colIdx,'class':'filter','title':this.options['filterToolTipMessage']});
        case 'ddl': return this.getSelectFilter(colIdx, header);
        default: throw 'filter-type: ' + filterType + ' is not supported';
    }
};

/**
 * @private
 * @param {number} colIdx
 * @param {!Element} header
 * @return {!Element}
 */
picnet.ui.filter.TableFilter.prototype.getSelectFilter = function(colIdx, header) {
    var select = goog.dom.createDom('select', {'id':'filter_' + colIdx,'class':'filter'}, goog.dom.createDom('option', {}, this.options['selectOptionLabel']));
    var cells = goog.array.map(this.listItems, function(r) {
		return r.cells[colIdx];
	});		
    var values = [];
	goog.array.forEach(cells, function(td) {			
		var txt = goog.dom.getTextContent(td);						
        if (!txt || txt === '&nbsp;' || goog.array.indexOf(values, txt) >= 0) { return; }						
        values.push(txt);
	});
    values.sort();
			
	goog.array.forEach(values, function(txt) {
		goog.dom.appendChild(select, goog.dom.createDom('option', {'value':txt.replace('"','&#034;')}, txt));            
	});
		
    return select;
};

/**	 
 * @inheritDoc
 */	
picnet.ui.filter.TableFilter.prototype.getFilterStates = function() {
    var filterStates = [];

    for (var i = 0; i < this.filters.length; i++) {
        var state = this.getFilterStateForFilter(this.filters[i]);
        if (state) { filterStates.push(state); }
    }

    if (!this.options['additionalFilterTriggers']) return filterStates;

    for (i = 0; i < this.options['additionalFilterTriggers'].length; i++) {
        state = this.getFilterStateForFilter(this.options['additionalFilterTriggers'][i]);			
        if (state) filterStates.push(state);
    }
    return filterStates;
};

/**
 * @inheritDoc
 */
picnet.ui.filter.TableFilter.prototype.getFilterStateForFilter = function(filter) {		
    var state = picnet.ui.filter.TableFilter.superClass_.getFilterStateForFilter.call(this, filter);    
    if (state) {
        state.idx = this.getColumnIndexOfCurrentFilter(filter);
    }    	
	return state;
};


/**
 * @private	 
 * @param {Element} filter
 * @return {number}
 */
picnet.ui.filter.TableFilter.prototype.getColumnIndexOfCurrentFilter = function(filter) {        
	var filterCell = goog.dom.getAncestorByTagNameAndClass(filter, goog.dom.TagName.TD);
    if (!filterCell || filterCell.length <= 0) { return -1; }        
	var filterRow = goog.dom.getAncestorByTagNameAndClass(filterCell, goog.dom.TagName.TR);
    return goog.array.indexOf(filterRow.cells, filterCell);
};

/**
 * @inheritDoc
 */
picnet.ui.filter.TableFilter.prototype.doesElementContainText = function (state, tr, textTokens) {
  var cells = tr.getElementsByTagName('td');
  var columnIdx = state === null ? -1 : state.idx;
  if (columnIdx < 0) {
    var txt = [];
    for (var i = 0; i < cells.length; i++) {
      var header = this.headers[i];
      var visible = goog.style.isElementShown(header);
      if (!visible || header.getAttribute('filter') === 'false') { continue; }
      txt.push(goog.dom.getTextContent(cells[i]));
    }
    return picnet.ui.filter.TableFilter.superClass_.doesElementContainText.call(this, state, tr, textTokens, txt.join('\t'));
  }
  else {
    return picnet.ui.filter.TableFilter.superClass_.doesElementContainText.call(this, state, cells[columnIdx], textTokens);
  }

};

/** @inheritDoc */
picnet.ui.filter.TableFilter.prototype.disposeInternal = function() {
    picnet.ui.filter.TableFilter.superClass_.disposeInternal.call(this);

	delete this.filterColumnIndexes;	
    delete this.headers;	
    delete this.thead;
	delete this.tbody
};