
goog.require('pn.ui.filter.FilterState');

goog.provide('pn.ui.filter.GenericListFilterOptions');

/**
 * @export
 * @constructor
 */
pn.ui.filter.GenericListFilterOptions = function () {};

/** @type {string} The default tooltip for the filter controls */
pn.ui.filter.GenericListFilterOptions.DEFAULT_TOOLTIP = 
    'Quotes (\") match phrases. (not) excludes a match from the results. (or)' +
    ' can be used to do Or searches. I.e. [red or blue] will match either red' +
    ' or blue. Numeric values support >=, >, <=, <, = and != operators.';

/**
 * @export
 * @type {!Array.<!Element>}
 */
pn.ui.filter.GenericListFilterOptions.prototype['additionalFilterTriggers'] = [];
/**
 * @export
 * @type {!Array.<!Element>}
 */
pn.ui.filter.GenericListFilterOptions.prototype['clearFiltersControls'] = [];
/**
 * @export
 * @type {number}
 */
pn.ui.filter.GenericListFilterOptions.prototype['filterDelay'] = 250;
/**
 * @export
 * @type {string}
 */
pn.ui.filter.GenericListFilterOptions.prototype['filterToolTipMessage'] = 
    pn.ui.filter.GenericListFilterOptions.DEFAULT_TOOLTIP;

/**
 * @export
 * @type {boolean}
 */
pn.ui.filter.GenericListFilterOptions.prototype['enableCookies'] = true;
/**
 * @export
 * @type {function(pn.ui.filter.FilterState, !Element, Array.<string>)?}
 */
pn.ui.filter.GenericListFilterOptions.prototype['matchingElement'] = null;
/**
 * @export
 * @type {function(!Array.<!pn.ui.filter.FilterState>)?}
 */
pn.ui.filter.GenericListFilterOptions.prototype['filteringElements'] = null;
/**
 * @export
 * @type {string}
 */
pn.ui.filter.GenericListFilterOptions.prototype['sharedCookieId'] = null;

