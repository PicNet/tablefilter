
goog.require('goog.array');

goog.require('picnet.ui.filter.TableFilterOptions');
goog.require('picnet.ui.filter.TableFilter');

goog.provide('picnet.ui.filter.jQueryPlugin');

// This is the only public method.  Initialised like:
// $(#tableid).tableFilter(options)
var jq = window['jQuery'];
if (jq) {
    (function (jq) {
        jq.tableFilter = function (element, opts) {
            var tf;
            var plugin = this;
            plugin.init = function () {
                var options = jq['extend']({}, new picnet.ui.filter.TableFilterOptions(), opts);
                tf = new picnet.ui.filter.TableFilter(element, options);
            };

            plugin.refresh = function () {
                picnet.ui.filter.TableFilter.superClass_.refresh.call(tf);
            };

            plugin.init();

        };

        jq['fn']['tableFilter'] = function (options) {
            var tmp = goog.array.forEach(this, function (t) {
                if (undefined === jq(t).data('tableFilter') ||
	                jq(t).data('tableFilter') === null) {
                    var plugin = new jq.tableFilter(t, options);
                    jq(t).data('tableFilter', plugin);
                }
            });
            return tmp;
        };

        jq['fn']['tableFilterRefresh'] = function (options) {
            var tmp = goog.array.forEach(this, function (t) {
                if (undefined !== jq(t).data('tableFilter') &&
	                 jq(t).data('tableFilter') !== null) {
                    var plugin = jq(t).data('tableFilter');
                    plugin.refresh();
                }
            });
            return tmp;
        };

    })(jq);
};