
goog.provide('pn.ui.filter.SearchEngine');

/**
 * @constructor
 */
pn.ui.filter.SearchEngine = function() {

  /**
   * @private
   * @enum {number}
   */
  this.precedences_ = {
    'or' :1,
    'and':2,
    'not':3
  };
};

/**	 
 * @param {string} text The text to match against the given expression
 * @param {string} expression	The expression to use when evaluating the given
 *    text
 * @return {boolean} Wether the given expression matches the given text.
 */
pn.ui.filter.SearchEngine.prototype.matches = function(text, expression) {
  if (!expression) return true;
  if (!text) return false;

  var tokens = this.parseSearchTokens(expression);
  return this.doesTextMatchTokens(text, tokens, false);
};

/**	 
 * @param {string} textToMatch
 * @param {Array.<string>} postFixTokens	 
 * @param {boolean} exactMatch
 * @return {boolean}
 */
pn.ui.filter.SearchEngine.prototype.doesTextMatchTokens = 
    function (textToMatch, postFixTokens, exactMatch) {
	if (!postFixTokens) return true;
	textToMatch = exactMatch ? textToMatch : textToMatch.toLowerCase();
	var stackResult = [];
	var stackResult1;
	var stackResult2;

	for (var i = 0; i < postFixTokens.length; i++) {
		var token = postFixTokens[i];
		if (token !== 'and' && token !== 'or' && token !== 'not') {
			if (token.indexOf('>') === 0 || token.indexOf('<') === 0 || 
          token.indexOf('=') === 0 || token.indexOf('!=') === 0) {
				stackResult.push(this.doesNumberMatchToken_(token, textToMatch));
			} else {
				stackResult.push(exactMatch ? 
            textToMatch === token : 
            textToMatch.indexOf(token) >= 0);
			}
		}
		else {

			if (token === 'and') {
				stackResult1 = stackResult.pop();
				stackResult2 = stackResult.pop();
				stackResult.push(stackResult1 && stackResult2);
			}
			else if (token === 'or') {
				stackResult1 = stackResult.pop();
				stackResult2 = stackResult.pop();

				stackResult.push(stackResult1 || stackResult2);
			}
			else if (token === 'not') {
				stackResult1 = stackResult.pop();
				stackResult.push(!stackResult1);
			}				
		}
	}
	return stackResult.length === 1 && stackResult.pop();
};

/**	 
 * @param {string} text The filter text to use when testing entry for match
 * @return {Array.<string>} The normalized postfix tokens representation of
 *    this text.
 */
pn.ui.filter.SearchEngine.prototype.parseSearchTokens = function(text) {
	if (!text) { return null; }		
	text = text.toLowerCase();
	var normalisedTokens = this.normaliseExpression_(text);
	normalisedTokens = this.allowFriendlySearchTerms_(normalisedTokens);
	var asPostFix = this.convertExpressionToPostFix_(normalisedTokens);
	var postFixTokens = asPostFix.split('|');
	return postFixTokens;
};
	
/**
 * @private
 * @param {string} token
 * @param {string} text
 * @return {boolean}
 */
pn.ui.filter.SearchEngine.prototype.doesNumberMatchToken_ = 
    function(token, text) {
	var op,exp,actual = this.getNumberFrom_(text);	
	if (token.indexOf('=') === 0) {
		op = '=';
		exp = parseFloat(token.substring(1));
	} else if (token.indexOf('!=') === 0) {
		op = '!=';
		exp = parseFloat(token.substring(2));
	} else if (token.indexOf('>=') === 0) {
		op = '>=';
		exp = parseFloat(token.substring(2));
	} else if (token.indexOf('>') === 0) {
		op = '>';
		exp = parseFloat(token.substring(1));
	} else if (token.indexOf('<=') === 0) {
		op = '<=';
		exp = parseFloat(token.substring(2));
	} else if (token.indexOf('<') === 0) {
		op = '<';
		exp = parseFloat(token.substring(1));
	} else {
		return true;
	}

	switch (op) {
		case '!=': return actual !== exp;
		case '=': return actual === exp;
		case '>=': return actual >= exp;
		case '>': return actual > exp;
		case '<=': return actual <= exp;
		case '<': return actual < exp;
	}
    throw new Error('Could not find a number operation: ' + op);
};

/** 
 * @private
 * @param {string} txt
 * @return {number}
 */
pn.ui.filter.SearchEngine.prototype.getNumberFrom_ = function(txt) {
	if (txt.charAt(0) === '$') {
		txt = txt.substring(1);
	}
	return parseFloat(txt);
};
		
/**	 
 * @private
 * @param {string} text
 * @return {!Array.<string>}
 */
pn.ui.filter.SearchEngine.prototype.normaliseExpression_ = function(text) {
	var textTokens = this.getTokensFromExpression_(text);
	var normalisedTokens = [];

	for (var i = 0; i < textTokens.length; i++) {
		var token = textTokens[i];
		token = this.normaliseTerm_(normalisedTokens, token, '(');
		token = this.normaliseTerm_(normalisedTokens, token, ')');

		if (token.length > 0) { normalisedTokens.push(token); }
	}
	return normalisedTokens;
};

/**
 * @private
 * @param {!Array.<string>} tokens
 * @param {string} token
 * @param {string} term
 */
pn.ui.filter.SearchEngine.prototype.normaliseTerm_ = 
    function(tokens, token, term) {
	var idx = token.indexOf(term);
	while (idx !== -1) {
		if (idx > 0) { tokens.push(token.substring(0, idx)); }

		tokens.push(term);
		token = token.substring(idx + 1);
		idx = token.indexOf(term);
	}
	return token;
};

/**
 * @private
 * @param {string} exp
 * @return {!Array.<string>}
 */
pn.ui.filter.SearchEngine.prototype.getTokensFromExpression_ = function(exp) {		
	exp = exp.replace('>= ', '>=').replace('> ', '>').replace('<= ', '<=').
      replace('< ', '<').replace('!= ', '!=').replace('= ', '=');
	var regex = /([^"^\s]+)\s*|"([^"]+)"\s*/g;		
	var matches = [];
	var match = null;
	while (match = regex.exec(exp)) { matches.push(match[1] || match[2]); }
	return matches;
};

/**	 
 * @private
 * @param {!Array.<string>} tokens
 * @return {!Array.<string>}
 */
pn.ui.filter.SearchEngine.prototype.allowFriendlySearchTerms_ = 
    function(tokens) {
	var newTokens = [];
	var lastToken;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		if (!token || token.length === 0) { continue; }
		if (token.indexOf('-') === 0) {
			token = 'not';
			tokens[i] = tokens[i].substring(1);
			i--;
		}
		if (!lastToken) {
			newTokens.push(token);
		} else {
			if (lastToken !== '(' && lastToken !== 'not' && lastToken !== 'and' && 
          lastToken !== 'or' && token !== 'and' && token !== 'or' && 
          token !== ')') {
				newTokens.push('and');
			}
			newTokens.push(token);
		}
		lastToken = token;
	}
	return newTokens;
};

/**	 
 * @private
 * @param {!Array.<string>} normalisedTokens
 * @return {string}
 */
pn.ui.filter.SearchEngine.prototype.convertExpressionToPostFix_ = 
    function(normalisedTokens) {
	var postFix = '';
	var stackOps = [];
	var stackOperator;
	for (var i = 0; i < normalisedTokens.length; i++) {
		var token = normalisedTokens[i];
		if (token.length === 0) continue;
		if (token !== 'and' && token !== 'or' && token !== 'not' && 
        token !== '(' && token !== ')') {
			postFix = postFix + '|' + token;
		}
		else {
			if (stackOps.length === 0 || token === '(') {
				stackOps.push(token);
			}
			else {
				if (token === ')') {
					stackOperator = stackOps.pop();
					while (stackOperator !== '(' && stackOps.length > 0) {
						postFix = postFix + '|' + stackOperator;
						stackOperator = stackOps.pop();
					}
				}
				else if (stackOps[stackOps.length - 1] === '(') {
					stackOps.push(token);
				} else {
					while (stackOps.length !== 0) {
						if (stackOps[stackOps.length - 1] === '(') { break; }
						if (this.precedences_[stackOps[stackOps.length - 1]] > 
                this.precedences_[token]) {
							stackOperator = stackOps.pop();
							postFix = postFix + '|' + stackOperator;
						}
						else { break; }
					}
					stackOps.push(token);
				}
			}
		}
	}
	while (stackOps.length > 0) { postFix = postFix + '|' + stackOps.pop(); }
	return postFix.substring(1);
};
