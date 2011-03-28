$(document).ready(function() {
	var se = picnet.tablefilter.SearchEngine;	
	module("picnet.tablefilter.SearchEngineTests");	
	
	test("testArgumentParsing", function() { 				
		var tokens1 = se.parseSearchTokens('text1 and text2');
		var tokens2 = se.parseSearchTokens('text1 text2');
		arrayEqual(tokens1, tokens2);

		tokens1 = se.parseSearchTokens('not text2');
		tokens2 = se.parseSearchTokens('-text2');
		arrayEqual(tokens1, tokens2);			
	});	

	test("testGetTokensFromExpression", function() {		
		arrayEqual(['text1', 'and', 'text2'], se.getTokensFromExpression('text1 and text2'));		
		arrayEqual(['text1', 'and', '(text2', 'or', 'text3)'], se.getTokensFromExpression('text1 and (text2 or text3)'));				
		arrayEqual(['phrase 1'], se.getTokensFromExpression('"phrase 1"'));		
		arrayEqual(['text1', 'and', 'phrase 2'], se.getTokensFromExpression('text1 and "phrase 2"'));		
		arrayEqual(['t1', 'and', 't2' , 'and', 'p 1', 'and', 'p 2', 'or' , '(t3', 'and', 't4', 'and' , 'p 3', 'and', 'p 4', ')'], se.getTokensFromExpression('t1 and t2 and "p 1" and "p 2" or (t3 and t4 and "p 3" and "p 4")'));		
	});

	test("testParseSearchTokensFromNumericExpression", function() {		
		arrayEqual(['>10'], se.parseSearchTokens('>10'));		
		arrayEqual(['>10'], se.parseSearchTokens('> 10'));		
		arrayEqual(['<=10'], se.parseSearchTokens('<=10'));		
		arrayEqual(['<=10'], se.parseSearchTokens('<= 10'));		
	});
	
	test("testSimpleANDMatches", function() {
		var tokens1 = se.parseSearchTokens('text1 and text2');

		ok(!se.doesTextMatchTokens("text1", tokens1, false));
		ok(!se.doesTextMatchTokens("text1 text3", tokens1, false));
		ok(se.doesTextMatchTokens("text1 text2", tokens1, false));
		ok(se.doesTextMatchTokens("text2 text1", tokens1, false));
		ok(se.doesTextMatchTokens("text2 text 3text1", tokens1, false));
	});

	test("testSimpleORMatches", function() {
		var tokens1 = se.parseSearchTokens('text1 or text2');

		ok(se.doesTextMatchTokens("text1", tokens1, false));
		ok(se.doesTextMatchTokens("text1 text3", tokens1, false));
		ok(se.doesTextMatchTokens("text1 text2", tokens1, false));
		ok(se.doesTextMatchTokens("text2 text1", tokens1, false));
		ok(se.doesTextMatchTokens("text2 text 3text1", tokens1, false));
		ok(!se.doesTextMatchTokens("text3 text4", tokens1, false));
	});

	test("testSimpleNOTMatches", function() {
		var tokens1 = se.parseSearchTokens('not text2');
		ok(se.doesTextMatchTokens("text1", tokens1, false));
		ok(!se.doesTextMatchTokens("text1 text2", tokens1, false));
	});

	test("testSimpleGroupMatches", function() {
		var tokens1 = se.parseSearchTokens('(text1 and text2) or text3');
		ok(!se.doesTextMatchTokens("text1", tokens1, false));
		ok(se.doesTextMatchTokens("text1 text2", tokens1, false));
		ok(se.doesTextMatchTokens("text3", tokens1, false));
		ok(se.doesTextMatchTokens("text33", tokens1, false));
	});

	test("testSimpleQuoteMatches", function() {
		var tokens1 = se.parseSearchTokens('"text1 is not text2" t3e3x3t3');

		ok(!se.doesTextMatchTokens("text1 not is text2 t3e3x3t3", tokens1, false));
		ok(!se.doesTextMatchTokens("text1 is not t3e3x3t3 text3", tokens1, false));
		ok(se.doesTextMatchTokens("this will match text1 is not text2 yet3e3x3t3ssss ", tokens1, false));
	});	
	
	test("testComplexSearch_1", function() {
		var tokens1 = se.parseSearchTokens('apples and not("red apples" or "green apples")');

		ok(se.doesTextMatchTokens("applesinacan", tokens1, false));		
		ok(!se.doesTextMatchTokens("applesinacan", tokens1, true));		
		ok(se.doesTextMatchTokens("apples", tokens1, true));		
		ok(se.doesTextMatchTokens("yellow apples", tokens1, false));		
		ok(!se.doesTextMatchTokens("red apples", tokens1, false));		
		ok(!se.doesTextMatchTokens("green apples", tokens1, false));		
		ok(!se.doesTextMatchTokens("green apples and yellow apples", tokens1, false));// Contains green apples so do not match
	});	

	test("testEquals", function() {
		var tokens1 = se.parseSearchTokens('= 10');

		ok(!se.doesTextMatchTokens("7", tokens1, false));		
		ok(se.doesTextMatchTokens("10sadf", tokens1, false));		
		ok(!se.doesTextMatchTokens("11", tokens1, false));		
		ok(!se.doesTextMatchTokens("11asdasd", tokens1, false));		
	});	

	test("testNotEquals", function() {
		var tokens1 = se.parseSearchTokens('!= 10');

		ok(se.doesTextMatchTokens("7", tokens1, false));		
		ok(!se.doesTextMatchTokens("10sadf", tokens1, false));		
		ok(se.doesTextMatchTokens("11", tokens1, false));		
		ok(se.doesTextMatchTokens("11asdasd", tokens1, false));		
	});

	test("testGreaterThan", function() {
		var tokens1 = se.parseSearchTokens('> 10');

		ok(!se.doesTextMatchTokens("7", tokens1, false));		
		ok(!se.doesTextMatchTokens("10", tokens1, false));		
		ok(se.doesTextMatchTokens("11", tokens1, false));		
		ok(se.doesTextMatchTokens("11asdasd", tokens1, false));		
	});	

	test("testGreaterThanOrEquals", function() {
		var tokens1 = se.parseSearchTokens('>= 10');

		ok(!se.doesTextMatchTokens("7", tokens1, false));		
		ok(se.doesTextMatchTokens("10", tokens1, false));		
		ok(se.doesTextMatchTokens("11", tokens1, false));		
		ok(se.doesTextMatchTokens("11asdasd", tokens1, false));		
	});	

	test("testLessThan", function() {
		var tokens1 = se.parseSearchTokens('< 10');

		ok(se.doesTextMatchTokens("7", tokens1, false));		
		ok(!se.doesTextMatchTokens("10", tokens1, false));		
		ok(!se.doesTextMatchTokens("11", tokens1, false));		
		ok(!se.doesTextMatchTokens("11asdasd", tokens1, false));		
	});	

	test("testLessThanOrEquals", function() {
		var tokens1 = se.parseSearchTokens('<=10');

		ok(se.doesTextMatchTokens("7", tokens1, false));		
		ok(se.doesTextMatchTokens("10", tokens1, false));		
		ok(!se.doesTextMatchTokens("11", tokens1, false));		
		ok(!se.doesTextMatchTokens("11asdasd", tokens1, false));		
	});	
});