/* Simple parser for CSS */
var dryCssParser = Editor.Parser = (function(){
  var tokenizeDryCss = (function(){
    function normal(source, setState) {
      var ch = source.next(),
        eq = source.peek();
      // comments first
      if(ch === "/" && ( eq==="*"|| eq==="/") ){
        setState(eq==="*"?inMultiLineComment:inSingleLineComment);
        return null;
      }
      // then dryCss defined
      else if(ch === "@"){
        // mixins
        if( eq==="=" ){
          setState(inMixin);
          return null;
        }
        // external imports
        else if( source.lookAhead((eq==="!"?"!":"")+'import',false,false,true) || source.lookAhead(eq==="!"?"!:":":",false,false,false) ){
          //- source.nextWhileMatches(/[!\w]/);
          source.nextWhileMatches(/[^;\r\n{}]/);
          return "drycss-"+(eq==='!'?'deepI':"i")+"mport";
        }
        else{
          source.nextWhileMatches(/[^;\s\r\n{}:]/);
          return "drycss-defined";
        }
      }
      else if(ch == "="){
        return "drycss-compare";
      }
      else if (source.equals("=") && (ch == "~" || ch == "|")) {
        source.next();
        return "drycss-compare";
      }
      else if (ch == "\"" || ch == "'") {
        setState(inString(ch));
        return null;
      }
      else if (ch == "#") {
        source.nextWhileMatches(/\w/);
        return "drycss-hash";
      }
      else if (ch == "!") {
        source.nextWhileMatches(/[ \t]/);
        source.nextWhileMatches(/\w/);
        return "drycss-important";
      }
      else if (/\d/.test(ch)) {
        source.nextWhileMatches(/[\w.%]/);
        return "drycss-unit";
      }
      else if (/[,.+>*\/]/.test(ch)) {
        return "drycss-select-op";
      }
      else if (/[;{}:\[\]]/.test(ch)) {
        return "drycss-punctuation";
      }
      else {
        source.nextWhileMatches(/[\w\\\-_]/);
        return "drycss-identifier";
      }
    }

    function inMultiLineComment(source, setState){
      var maybeEnd = false;
      while (!source.endOfLine()) {
        var ch = source.next();
        if (maybeEnd && ch == "/") {
          setState(normal);
          break;
        }
        maybeEnd = (ch == "*");
      }
      return "drycss-comment";
    }
    function inSingleLineComment(source,setState){
      source.nextWhileMatches(/[^\r\n]/);
      setState(normal);
      return "drycss-comment";
    }
    function inMixin(source,setState){
      source.nextWhileMatches(/[^\(\);\r\n\{\}]/);
      setState(inParentheses);
      return "drycss-mixin";
    }
    function inParentheses(source,setState){
      source.nextWhileMatches(/[^\r\n\{\}]/);
      setState(normal);
      return "drycss-parameters";
    }
    function inString(quote) {
      return function(source, setState) {
        var escaped = false;
        while (!source.endOfLine()) {
          var ch = source.next();
          if (ch == quote && !escaped)
            break;
          escaped = !escaped && ch == "\\";
        }
        if (!escaped)
          setState(normal);
        return "drycss-string";
      };
    }

    return function(source, startState) {
      return tokenizer(source, startState || normal);
    };
  })();


  function indentDryCss(inBraces, inRule, base) {
    return function(nextChars) {
      if (!inBraces ) return base;
      //else if (inRule) return base + indentUnit*inBraces;
      else return base + indentUnit*(inBraces-(/^\}/.test(nextChars)?1:0));
    };
  }

  // This is a very simplistic parser -- since CSS does not really
  // nest, it works acceptably well, but some nicer colouroing could
  // be provided with a more complicated parser.
  function parseDryCss(source, basecolumn) {
    basecolumn = basecolumn || 0;
    var tokens = tokenizeDryCss(source);
    var inBraces = 0, inRule = false;

    var iter = {
      next: function() {
        var token = tokens.next(), style = token.style, content = token.content;

        if ( (style === "drycss-identifier" || style==="drycss-comment") && inRule){
          token.style = "drycss-value";
        }
        if (style === "drycss-hash"){
          token.style =  inRule ? "drycss-colorcode" : "drycss-identifier";
        }
        if (content === "\n"){
          token.indentation = indentDryCss(inBraces, inRule, basecolumn);
        }

        if (content === "{"){
          inBraces += 1;
        }
        else if (content === "}"){
          inBraces -= 1; inRule = false;
        }
        else if ( content === ";"){
          inRule =false;
        }
        else if (content===':' && style !== "drycss-comment" && style !== "whitespace"){
          inRule = true;
        }

        return token;
      },

      copy: function() {
        var _inBraces = inBraces, _inRule = inRule, _tokenState = tokens.state;
        return function(source) {
          tokens = tokenizeDryCss(source, _tokenState);
          inBraces = _inBraces;
          inRule = _inRule;
          return iter;
        };
      }
    };
    return iter;
  }

  //- return {make: parseCSS, electricChars: "}"}; @suppress line indent
  return {make: parseDryCss,electricChars: "{}"};

})();
/*
var CSSParser  = (function() {
  var tokenizeCSS = (function() {
    function normal(source, setState) {
      var ch = source.next();
      if (ch == "@") {
        source.nextWhileMatches(/\w/);
        return "drycss-at";
      }
      else if (ch == "/" && source.equals("*")) {
        setState(inCComment);
        return null;
      }
      else if (ch == "<" && source.equals("!")) {
        setState(inSGMLComment);
        return null;
      }
      else if (ch == "=") {
        return "drycss-compare";
      }
      else if (source.equals("=") && (ch == "~" || ch == "|")) {
        source.next();
        return "drycss-compare";
      }
      else if (ch == "\"" || ch == "'") {
        setState(inString(ch));
        return null;
      }
      else if (ch == "#") {
        source.nextWhileMatches(/\w/);
        return "drycss-hash";
      }
      else if (ch == "!") {
        source.nextWhileMatches(/[ \t]/);
        source.nextWhileMatches(/\w/);
        return "drycss-important";
      }
      else if (/\d/.test(ch)) {
        source.nextWhileMatches(/[\w.%]/);
        return "drycss-unit";
      }
      else if (/[,.+>*\/]/.test(ch)) {
        return "drycss-select-op";
      }
      else if (/[;{}:\[\]]/.test(ch)) {
        return "drycss-punctuation";
      }
      else {
        source.nextWhileMatches(/[\w\\\-_]/);
        return "drycss-identifier";
      }
    }

    function inCComment(source, setState) {
      var maybeEnd = false;
      while (!source.endOfLine()) {
        var ch = source.next();
        if (maybeEnd && ch == "/") {
          setState(normal);
          break;
        }
        maybeEnd = (ch == "*");
      }
      return "drycss-comment";
    }

    function inSGMLComment(source, setState) {
      var dashes = 0;
      while (!source.endOfLine()) {
        var ch = source.next();
        if (dashes >= 2 && ch == ">") {
          setState(normal);
          break;
        }
        dashes = (ch == "-") ? dashes + 1 : 0;
      }
      return "drycss-comment";
    }

    function inString(quote) {
      return function(source, setState) {
        var escaped = false;
        while (!source.endOfLine()) {
          var ch = source.next();
          if (ch == quote && !escaped)
            break;
          escaped = !escaped && ch == "\\";
        }
        if (!escaped)
          setState(normal);
        return "drycss-string";
      };
    }

    return function(source, startState) {
      return tokenizer(source, startState || normal);
    };
  })();

  function indentCSS(inBraces, inRule, base) {
    return function(nextChars) {
      if (!inBraces || /^\}/.test(nextChars)) return base;
      else if (inRule) return base + indentUnit * 2;
      else return base + indentUnit;
    };
  }

  // This is a very simplistic parser -- since CSS does not really
  // nest, it works acceptably well, but some nicer colouroing could
  // be provided with a more complicated parser.
  function parseCSS(source, basecolumn) {
    basecolumn = basecolumn || 0;
    var tokens = tokenizeCSS(source);
    var inBraces = false, inRule = false;

    var iter = {
      next: function() {
        var token = tokens.next(), style = token.style, content = token.content;

        if (style == "drycss-identifier" && inRule)
          token.style = "drycss-value";
        if (style == "drycss-hash")
          token.style =  inRule ? "drycss-colorcode" : "drycss-identifier";

        if (content == "\n")
          token.indentation = indentCSS(inBraces, inRule, basecolumn);

        if (content == "{")
          inBraces = true;
        else if (content == "}")
          inBraces = inRule = false;
        else if (inBraces && content == ";")
          inRule = false;
        else if (inBraces && style != "drycss-comment" && style != "whitespace")
          inRule = true;

        return token;
      },

      copy: function() {
        var _inBraces = inBraces, _inRule = inRule, _tokenState = tokens.state;
        return function(source) {
          tokens = tokenizeCSS(source, _tokenState);
          inBraces = _inBraces;
          inRule = _inRule;
          return iter;
        };
      }
    };
    return iter;
  }

  //- return {make: parseCSS, electricChars: "}"}; @suppress line indent
  return {make: parseCSS};
})();*/
