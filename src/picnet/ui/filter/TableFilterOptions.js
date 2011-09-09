
goog.require('picnet.ui.filter.FilterState');
goog.require('picnet.ui.filter.GenericListFilterOptions');

goog.provide('picnet.ui.filter.TableFilterOptions');

/**
 * @export
 * @extends {picnet.ui.filter.GenericListFilterOptions}
 * @constructor
 */
picnet.ui.filter.TableFilterOptions = function () {
    picnet.ui.filter.GenericListFilterOptions.call(this);
};
goog.inherits(picnet.ui.filter.TableFilterOptions, picnet.ui.filter.GenericListFilterOptions);


/**
 * @export
 * @type {string}
 */
picnet.ui.filter.TableFilterOptions.prototype.selectOptionLabel = 'Select...';
/**
 * @export
 * @type {Element}
 */
picnet.ui.filter.TableFilterOptions.prototype.frozenHeaderTable = null;