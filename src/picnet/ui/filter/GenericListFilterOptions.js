
goog.require('picnet.ui.filter.FilterState');

goog.provide('picnet.ui.filter.GenericListFilterOptions');

/**
 * @export
 * @constructor
 */
picnet.ui.filter.GenericListFilterOptions = function () {};
/**
 * @export
 * @type {!Array.<!Element>}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['additionalFilterTriggers'] = [];
/**
 * @export
 * @type {!Array.<!Element>}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['clearFiltersControls'] = [];
/**
 * @export
 * @type {number}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['filterDelay'] = 250;
/**
 * @export
 * @type {string}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['filterToolTipMessage'] = 'Quotes (\") match phrases. (not) excludes a match from the results. (or) can be used to do Or searches. I.e. [red or blue] will match either red or blue. Numeric values support >=, >, <=, <, = and != operators.';
/**
 * @export
 * @type {boolean}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['enableCookies'] = true;
/**
 * @export
 * @type {function(picnet.ui.filter.FilterState, !Element, Array.<string>)?}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['matchingElement'] = null;
/**
 * @export
 * @type {function(!Array.<!picnet.ui.filter.FilterState>)?}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['filteringElements'] = null;
/**
 * @export
 * @type {function(!Array.<!picnet.ui.filter.FilterState>)?}
 */
picnet.ui.filter.GenericListFilterOptions.prototype['filteredElements'] = null;

