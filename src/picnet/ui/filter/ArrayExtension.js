
goog.provide('picnet.ui.filter.ArrayExtension');

if (!Array.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
    for (var i = (start || 0); i < this.length; i++) {
      if (this[i] == obj) {
        return i;
      }
    }
    return -1;
  };
}