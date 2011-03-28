
goog.require('goog.array');

goog.require('picnet.ui.filter.TableFilterOptions');
goog.require('picnet.ui.filter.TableFilter');

goog.provide('picnet.ui.filter.jQueryPlugin');

// This is the only public method.  Initialised like:
// $(#tableid).tableFilter(options)
var jq = window['jQuery'];
if (jq) {
	(function(jq) { 	
		jq['fn']['tableFilter'] = function(opts) {		        
			goog.array.forEach(this, function(t) {				
				var options = jq['extend']({}, new picnet.ui.filter.TableFilterOptions(), opts);			
				new picnet.ui.filter.TableFilter(t, options);							
			});			
		}
	})(jq);
};