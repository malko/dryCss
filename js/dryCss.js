/**
DryCss parser
* @changelog
*            - 2011-05-01 - rewrite support for complex rules inside functions
*                         - now drycCss instanciation allow a dryCss instance as options
*            - 2011-03-17 - add support for negative values in Maths expression
*                         - now funcs may return full rules (functions are now the only way to include dryCss markup in rule names)
*            - 2011-03-11 - now merge ie filters in a single filter rule
*            - 2011-03-09 - remove empty rules from nocompact mode output
*            - 2011-03-02 - now @varname will default to lookup for a varname mixin if not found a var with that name.
*            - 2011-03-01 - allow "!" as parent rule reference without being followed by other stuff
*            - 2011-02-10 - allow some more complex variables by applying them callbacks if required;
*            - 2010-06-30 - now eval maths ops multiple operation in a single eval and manage recursion correctly and support many other units
*            - 2010-06-03 - real/deep file imports are not parsed anymore before inclusion
*            - 2010-05-21 - bug correction regarding chrome support of quoted vars
*            - 2010-05-05 - empty parameters must be pass as empty double quote like defining empty vars (so make it uniform)
*            - 2010-04-21 - operation now allow for some units to be passed (em/px/%)
*                         - add some simple comparisons operator to ternary operator expression
*            - 2010-04-20 - ternary operator use , instead of : for separating args as : is too common in css and may be usefull in the expression
*                         - attempt to allow nested expression to get evaled
*            - 2010-04-07 - add simple maths expression [ (int|float|#RGB|#RRGGBB) +-/* (int|float|#RGB|#RRGGBB) ]
*                         - add simple ternary conditional expression [ a ? b : c ] where b may be omitted to signifie a and c may stay blank
*                         - make mixins able to receive empty parameters with ''
*            - 2010-03-31 - make deep rule import work from includes
*            - 2010-03-30 - add getDefined method.
* @todo manage options passing for imports
* @todo manage @media to not be unested
*/
dryCss = function(str,options){
	var self = this,
	k='';
	self.dryCss=str;     // the dryCss raw str received at construction time
	self.computedCSS=''; // the computed str
	self.options={};
	self.imported=[];    // external dryCss that are imported and used to compute
	self.imports=[];     // imports rules that will appear at the begining of the computedCss
	self.rules={};
	self._rulesOrder={};
	self.funcs={};       // funcs from imported dryCss + thoose declared in this dryCss
	self.vars={};        // vars from imported dryCss + thoose declared in this dryCss

	//read options
	if( typeof(options) === 'undefined'){
		self.options = dryCss.defaults;
	}else if(options instanceof dryCss){
		self.imported = options.imported;
		self.funcs = options.funcs;
		self.vars = options.vars;
		self.options = options.options;
	}else{
		for(k in dryCss.defaults){
			self.options[k] = typeof(options[k])!=='undefined'?options[k]:dryCss.defaults[k];
		}
	}
	self.compute();
}

dryCss.prototype = {

	compute:function(){
		var self=this,
		str = self._cleanStr(self.dryCss);
		// read imports and remove them from the string
		str = self.parseImports(str);
		str = self.parseFuncs(str);
		// read vars definition and remove them from the string too
		str = self.parseVars(str);
		// parse rules in the document
		self.parseRules(str);

		//--declare replacement callbacks
		var replaceCbs = {
			//-- import @:ruleName top level rules, @!:ruleName recursively and @:ruleName[property] values
		 'import':[ // rule import @: and @!:
				//- /@!?:\s*([^;\n\{\}]+)/g,
				/@!?:\s*(([^;\n\{\}\[\]]+|\[[^\[\]]+\])+)/g,
				function(m,p){
					var r=false,match;
					p = self.trim(p);
					if( p.indexOf('[') > -1){ // replace @:rules[rule]
						match = p.match(/^(.*)?\s*\[\s*([^\]]+?)\s*\]$/);
						if(null === match){
							self.options.logError('can\'t import inexistant rule '+p);
							return m;
						}
						r = self.lookupRule(match[1]);
						if( false === r){
							self.options.logError('can\'t import inexistant rule property from inexistant rule '+match[1]);
							return m;
						}
						match = r.match(new RegExp(match[2]+'\\s*:\\s*([^\\{\\};]+?)\\s*;'));
						if( null === match){
							self.options.logError('can\'t import inexistant rule property '+p);
							return m;
						}
						return match[1]?match[1]:m;
					}
					if(m.substr(1,1)==='!'){ //- repace @:@mixin
						var id
							, pEscaped = p.replace('.','\\.')
							, pEscapedG=new RegExp(pEscaped,'g')
							, idExp = new RegExp('^'+pEscaped+'(?![a-zA-Z0-9_])(.+)$')
							;
						for( id in fullRulesOrder){
							if( id.match(idExp)){
								delay(id.replace(pEscapedG,parseKey),self.lookupRule(id));
							}
						}
					}
					r = self.lookupRule(p);
					if( r===false){
						self.options.logError('can\'t import inexistant rule '+p);
						return m;
					}
					return applyCallbacks(r);
			  }
			],
			funcs:[ //function call replacement
				/@=([a-z0-9_]+)\((([^\(\)]*|\([^\)]+\))+)\)/ig,
				function(m,func,params){
					if( typeof self.funcs[func] === 'undefined'){
						self.options.logError('Can\'t resolve call to unknown mixin '+func);
						return m;
					}
					var str = self.funcs[func].code,ruleParts;
					params = params.split(/\s*,\s*/);
					for(var i=0,l=self.funcs[func].params.length; i<l; i++){
						if( typeof params[i] === 'undefined' || params[i].match(/^\s*$/) ){
							params[i] = self.funcs[func].params[i][1];
						}else if( params[i] === '""'){
							params[i] = '';
						}
					}
					for( i=0; i<l;i++){
						str=str.replace(new RegExp('@'+self.funcs[func].params[i][0]+'(?=[^a-zA-Z0-9_])','g'),params[i]);
					}
					return applyCallbacks(str);
				}
			],
			//-- replace @varName by the latest defined @varName in the code
			'vars':[ // var replacement
				/@[a-z_][a-z0-9_]*/ig,
				function(m){
					if( typeof self.vars[m] !== 'undefined'){
						return self.vars[m].match(/@(?!media\b|page\b|font-face\b)[a-z0-9_]/i)?applyCallbacks(self.vars[m]).trim():self.vars[m];
					}else{ //- try to find a mixin with that label.
						var mixin=self.lookupRule(m,true);
						if( mixin !== false)
							return applyCallbacks(mixin).trim();
					}
					self.options.logError('undefined var '+m);
					return m;
				}
			],
			//-- replace [] evaluations
			'eval':[
				['[',']'],
				function(script){
					script = applyCallback(script.substr(1,script.length-2),'eval'); // apply eval recursively
					//-- math operations
					var operandExp = "\\s*([-+]?\\d+\\.\\d+|[-+]?\\.?\\d+|#[a-f0-9]{3}(?:[a-f0-9]{3})?)\\s*(e[xm]|p[ctx]|%|in|deg|[mc]m)?\\s*"
					, operatorExp  = "([+*\\/-])"
					, operation1Exp = new RegExp(operandExp+"([*\\/])"+operandExp,'i')
					, operation2Exp = new RegExp(operandExp+"([-+])"+operandExp,'i')
					;
					// make primary ops (*/)
					while(operation1Exp.exec(script)){
						script = script.replace(operation1Exp,function(m,a,aUnit,operator,b,bUnit){ return doOp(a,aUnit,operator,b,bUnit); });
					}
					// make secondary ops (+-)
					while(operation2Exp.exec(script)){
						script = script.replace(operation2Exp,function(m,a,aUnit,operator,b,bUnit){ return doOp(a,aUnit,operator,b,bUnit); });
					}

					//-- ternary conditional operator replacements
					script = script.replace(/^\s*([^?]*?)\s*\?\s*([^,]*?)\s*,\s*(.*?)\s*$/,function(m,a,b,c){
						if( a.match(/&&|\|\||[><=]{1,3}|!==?/) ){
							a=new Function('return "'+a.replace(/\s*(&&|\|\||[><=]{1,3}|!==?)\s*/,'"$1"')+'";')();
						}
						//-- dbg('ternary operator',parseKey,script,m,a);
						return a?(b?b:a):c;
					});
					return script;//.replace(replaceCbs.eval[0],replaceCbs.eval[1]);
				}
			],
			//-- merge rules if more than once is present (ie filters only for now)
			'merging':function(str){
				if(! str.match(/filter\s*:/i) )
					return str;
				var filters=[];
				str = str.replace(/(-ms-)?filter\s*:([^;]+);/g,function(m,ms,filter){
					filters.push(filter);
					return '';
				});
				return str+'filter:'+filters.join(', ')+';';
			},
			//-- make correct indentation
			'clean':[
				/(^|[{;])\s*/g,
				self.options.compact?'$1':'$1\n\t'
			]
		},
		delayed={},
		cb,r,i,parseKey,
		fullRulesOrder=self._getFullRulesOrder(),
		color2rgb=function(c){
			if(c.substr(0,1))
				c = c.substr(1);
			if( c.length===3 ){
				c = c.substr(0,1)+c.substr(0,1)+c.substr(1,1)+c.substr(1,1)+c.substr(2,1)+c.substr(2,1);
			}
			return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)];
		},
		rgb2color=function(rgb){
			for(var i=0;i<3;i++){
				rgb[i] = (rgb[i]<16?'0':'')+Math.round(Math.max(0,Math.min(255,rgb[i]))).toString(16);
			}
			return '#'+rgb.join('');
		},
		rgbMath=function(a,b,operator){
			var i,res=[0,0,0];
			if( ! (a instanceof Array) ){
				a = [a,a,a];
			}
			if( ! (b instanceof Array)){
				b = [b,b,b];
			}
			switch(operator){
				case '*': for(i=0;i<3;i++){res[i] = a[i]*b[i];} break;
				case '-': for(i=0;i<3;i++){res[i] = a[i]-b[i];} break;
				case '+': for(i=0;i<3;i++){res[i] = a[i]+b[i];} break;
				case '/': for(i=0;i<3;i++){res[i] = a[i]/b[i];} break;
			}
			return rgb2color(res);
		},
		doOp = function(a,aUnit,operator,b,bUnit){
			var aIsHex = a.substr(0,1)==='#'?true:false,
				bIsHex = b.substr(0,1)==='#'?true:false,
				unit='',res=0;
			a = aIsHex?color2rgb(a):parseFloat(a);
			b = bIsHex?color2rgb(b):parseFloat(b);
			if( aIsHex || bIsHex){
				return rgbMath(a,b,operator);
			}
			if(aUnit && bUnit ){
				aUnit = aUnit.toLowerCase();
				bUnit = bUnit.toLowerCase();
				if( aUnit === bUnit){
					unit = aUnit;
				}else{
					if( aUnit === '%'){
						a = a/100;
						unit = bUnit;
					}else if( bUnit === '%'){
						b = b/100;
						unit = aUnit;
					}else{
						unit=aUnit;
					}
				}
			}else if( aUnit || bUnit ){
				unit = (aUnit?aUnit:bUnit).toLowerCase();
			}
			switch(operator){
				case '*': res = Math.round(a*b*100)/100; break;
				case '-': res = a-b; break;
				case '+': res = a+b; break;
				case '/': res = Math.round(a/b*100)/100; break;
			}
			return unit==='px'?Math.round(res)+'px':res+unit;
		},
		/**
		* match outer nested constructs
		*/
		matchTokens = function(str,startToken,endToken){
			var cleanToken = /([(){}[\].*+?^$-])/g
				, exp=new RegExp(startToken.replace(cleanToken,"\\$1")+"|"+endToken.replace(cleanToken,"\\$1"),'g')
				, depth=0
				, startIndex=0
				, matches=[]
				, lastIndex = 0
				, match
				;
			var i = 0;
			while( match = exp.exec(str)){
				if(match[0] === startToken){
					if( depth===0){
						startIndex=exp.lastIndex;
					}
					depth++;
				}else{
					depth--;
					if( depth<0){
						depth=0;
						break;// one match only
					}else if(depth===0){
						matches.push(str.substr(startIndex,match.index-startIndex));
					}
				}
			}
			return matches.length?matches:null;
		},
		/**
		* match outer nested constructs and replace them
		*/
		tokenReplace = function(string,startToken,endToken,replacement){
			var matches = matchTokens(string,startToken,endToken);
			if(! matches){
				return string;
			}
			for(var i=0,l=matches.length;i<l;i++){
				string = string.replace(startToken+matches[i]+endToken,replacement)
			}
			return string;
		},
		applyCallback = function(str,cbName){
			if( replaceCbs[cbName] instanceof Function){
				return replaceCbs[cbName](str);
			}else if(replaceCbs[cbName][0] instanceof Array){ // first index is an array containing start/end tokens for replacement
				return tokenReplace(str,replaceCbs[cbName][0][0],replaceCbs[cbName][0][1],replaceCbs[cbName][1])
			}else{ // assume first index is a RegExp
				return str.replace(replaceCbs[cbName][0],replaceCbs[cbName][1]);
			}
		};
		applyCallbacks = function(str){
			if( str.indexOf('@')<0  ){
				if( str.indexOf('[')>-1 ){
					str = applyCallback(str,'eval');
				}
				//- return str.replace(replaceCbs.clean[0],replaceCbs.clean[1]);
				str = applyCallback(str,'clean');
			}
			for(var cb in replaceCbs ){
				str = applyCallback(str,cb);
			}
			return str.match(/^\s*;+\s*$/)?'':str;
		};
		delay = function(key,rule){
			delayed[key] = (delayed[key]?delayed[key]:'')+applyCallbacks(rule);
		};


		//-- no that we have correctly un-nested all that mess we can execute the rules
		str = self.imports.length?self.imports.join('\n')+'\n':'';
		for(parseKey in self._rulesOrder){
			if( parseKey.match(/^\s*@/)){
				if( ! parseKey.match(/^\s*@(?:media|page|font-face)\b/i)){
					continue;
				}
			}
			r = self.lookupRule(parseKey);
			if(false===r){
				self.options.logError('Undefined rule '+parseKey);
				continue;
			}
			r = applyCallbacks(r);
			if( r.match(/^[\s;]*$/) || r === undefined){
				continue;
			}
			if(r.match('{')){ // fully reparse nested constructs
				str +=new dryCss(parseKey+'{'+r+'}',self).toString()+'\n';
			}else if( parseKey.length ){
				str += parseKey+(self.options.compact?'{':'{\n\t')+r+(self.options.compact?'}\n':'\n}\n');
			}else{
				str += r+'\n';
			}
			// apply delayed mixins imports
			for(i in delayed){
				if( delayed[i] === '' || delayed[i] === undefined){
					continue;
				}
				// if(delayed[i].indexOf('@')>-1){dbg('@found',delayed[i])};
				str += i+(self.options.compact?'{':'{\n\t')+delayed[i]+(self.options.compact?'}\n':'\n}\n');
			}
			delayed = {};
		}
		//-- last cleanup
		self.computedCSS = str.replace(/;(\s*(;))+|\s*^\s*$/mg,'$2');//.replace(/\s*^\s*$/mg,'');
	},
	_getFullRulesOrder:function(){
		var i,id,l=this.imported.length,rulesOrder={};
		for( i=0;i<l;i++){
			for(id in this.imported[i]._rulesOrder){
				rulesOrder[id] = this.imported[i]._rulesOrder[id];
			}
		}
		for(id in this._rulesOrder){
			rulesOrder[id] = this._rulesOrder[id];
		}
		return rulesOrder;
	},
	getDefined:function(){
		var self = this;
		var defined = {vars:[],rules:[],funcs:[]},
			i,y,tmp;
		for(i in self.vars){
			defined.vars.push(i);
		}
		for( i in self.funcs){
			tmp=[];
			for(y=0,l=self.funcs[i].params.length;y<l;y++){
				tmp.push( self.funcs[i].params[y][1]===null?self.funcs[i].params[y][0]:self.funcs[i].params[y].join("="));
			}
			defined.funcs.push('@='+i+'('+tmp.join(',')+')');
		}
		tmp = {};
		for( i in self.imported){
			for( y in self.imported[i]._rulesOrder){
				if( y.indexOf('@')===0 ){
					tmp[y]=null;
				}
			}
		}
		for( y in self._rulesOrder){
			if( y.indexOf('@')===0 )
				tmp[y]=null;
		}
		for( i in tmp){
			defined.rules.push(i);
		}
		return defined;
	},
	lookupRule: function(name,quicSearchOnly){
		var self = this;
		name=name.replace(/\s+/,' ');
		//first look-up for rules in the current instance
		if( typeof self.rules[name] !== 'undefined'){
			return self.rules[name];
		}
		//then in imported rules
		for(var i=0,l=self.imported.length; i<l; i++){
			if( typeof self.imported[i].rules[name] !== 'undefined'){
				return self.imported[i].rules[name];
			}
		}
		if( quicSearchOnly )
			return false;
		//-- here we haven't found any rules with that names fall back to a more complete search
		var ruleExp = new RegExp('(^|,)\\s*'+name+'\\s*(,|$)');
		for(var rule in self.rules){
			if( rule.match(ruleExp) )
				return self.rules[rule];
		}
		for(var i=0,l=self.imported.length; i<l; i++){
			for(var rule in self.imported[i].rules){
				if( rule.match(ruleExp) )
					return self.imported[i].rules[rule];
			}
		}
		return false;
	},

	/* remove comments and extra lines/spaces */
	_cleanStr:function(str){
		return str.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*\n/mg,'') // remove comments
			//- .replace(/^\s*|\s*$/mg,'') // the extra space at start or end of the lines
			.replace(/\s*$\n\s*/mg,'\n') // the extra space at start or end of the lines
			.replace(/([\{\}])/g,'\n$1\n')
			.replace(/\n+/g,'\n');
	},
	_fullKey:function(key,stackKey){
		//-- no parents so leave this as is
		if(! stackKey.length)
			return key;

		if( key.indexOf(',')>0){ //-- key is multiple so make the job for each keys
			key = key.split(/\s*,\s*/);
			for( var i=0,l=key.length,res=[];i<l;i++){
				res.push(this._fullKey(key[i],stackKey));
			}
			return res.join(', ');
		}
		//-- create prefix ( recurse the parent key stack)
		var prefix = stackKey.length? this._fullKey(stackKey[stackKey.length-1],stackKey.slice(0,-1)) : '';
		//-- check if the key must be glued to it's parent
		key = key.replace(/^([:!])?([\s\S]*)$/,function(m,v1,v2){ if(v1){ return v1===':'?m:v2; } return (prefix.length?' ':'')+m;})
			.replace(/\s+/g,' ');
		if(! prefix.length)
			return key;
		if( prefix.indexOf(',')<0){
			return prefix+key;
		}
		return prefix.split(/\s*,\s*/).join(key+', ')+key;
	},
	trim:function(str){
		return str.replace(/^\s+|\s+$/,'');
	},
	/**
	process @imports and @!imports rules
	*/
	parseImports:function(str){
		var self = this,
		importUrl='',
		importContent='',
		importContentRaw='';
		while(str.match(/@(!?)import\s+(.*?)\s*(;|$)/m)){
			str = str.replace(/@(!?)import\s+(.*?)\s*(;|$)/mg,function(m,realImport,uri){
				importUrl = uri.match(/^http:\/\//)?uri:self.options.baseImportUrl+uri;
				importContent = self.options.syncXHR(importUrl);
				if(realImport ==="!" ){
					return self._cleanStr(importContent);
				}else{
					self.imported.push(new dryCss(importContent));//,self.options);
					//self.imports.push(m);
					self.imports.push('@import url("'+uri+'");');
					return '';
				}/*
				importContentDry = new dryCss(importContent);//,self.options);
				self.imported.push(importContentDry);
				//-- import the str and make it a new
				if(realImport ==="!" || uri.match(/\.dc?ss$/i)){
					return importContentDry.toString();
				}else{
					self.imports.push(m);
					return '';
				}*/
			});
		}
		self.imported.reverse();
		return str;
	},

	/**
	process vars definition
	*/
	parseVars:function(str){
		var self = this,varKey;
		// import vars from imported
		for( var i=0,l=self.imported.length; i<l; i++){
			for( varKey in self.imported[i].vars){
				self.vars[varKey] = self.imported[i].vars[varKey];
			}
		}
		// then read doc vars
		str = str.replace(/\s*(@[a-z_][a-z0-9_]*)\s*:\s*(?:([^;"']*)|("([^"]+|\\")*"|'([^']+|\\')'));(\s*;)?/ig,function(m,k,v1,v2){
			if( k.match(/@(media|page|font-face)/i) ){
				return m;
			}
		if( v1 !== '' && v1 !== undefined){
				self.vars[k]=v1;
			}else if( v2 !== '' && v2 !== undefined){
				new Function('dry','k','dry.vars[k]='+v2+';')(self,k);
			}
			return '';
		});
		return str;
	},
	/**
	process functions defs
	*/
	parseFuncs:function(str){
		var self = this,funcName;
		// import funcs from imported
		for( var i=0,l=self.imported.length; i<l; i++){
			for( funcName in self.imported[i].funcs){
				self.funcs[funcName] = self.imported[i].funcs[funcName];
			}
		}
		// then read doc funcs
		str = str.replace(/\s*@=([a-z0-9_]+)\s*\(([^\)]*)\)\s*\{((\{[^\}]+\}|[^\}])+)\}\s*/ig,function(m,f,p,code){
			//dbg(code);
			p = p.replace(/^\s+|\s+$/g).split(/\s*,\s*/);
			var i=0,l=p.length;
			for( i=0,l=p.length; i<l ; i++){
				if( p[i].indexOf('=') < 1 ){
					p[i] = [p[i],null];
					continue;
				}
				p[i] = p[i].split('=');
				p[i] = [p[i][0],p[i].slice(1).join('=')];
			}
			self.funcs[f] = {params:p,code:code};
			return '';
		});
		return str;
	},

	/**
	process rules identifiers
	*/
	parseRules:function(str){
		//- work line by line
		var self = this,
			lines = str.split('\n'),
			l=lines.length,
			parseStr = '',
			parseKey = '',
			stackStr = [],
			stackKey=[];   // pseudo private property to keep trace of the current _stacKey while unnesting the dryCss;

		for(i=0;i<l;i++){
			parseStr += lines[i]+'\n';
			if( parseStr.indexOf('{') > -1){ // look up for an identifier
				match = parseStr.match(/^(\s*|[\s\S]+?[;\}]\s*)([^;\{\}]+)\s*\{([\s\S]*)$/);
				try{
					parseKey = self.trim(match[2]);
				}catch(e){
					self.options.logError('syntax error: <code>'+parseStr+'</code>');
				}
				parseStr = self.trim(match[3]);
				if( parseKey==="!")
					parseKey = "";
				fullKey = self._fullKey(parseKey,stackKey);
				self._rulesOrder[fullKey]=true;
				stackKey.push(parseKey);
				stackStr.push(self.trim(match[1]));
			}
			endPos = parseStr.indexOf('}');
			if(endPos > -1){ // close current value
				parseKey = stackKey.pop();
				fullKey = self._fullKey(parseKey,stackKey);
				self.rules[fullKey] = (typeof(self.rules[fullKey])!=="undefined"? self.rules[fullKey]+'\n' : '' ) + self.trim(parseStr.substr(0,endPos));
				parseStr = (stackStr.length?stackStr.pop():'')+parseStr.substr(endPos+1);
				continue;
			}
		}
	},
	toString:function(){
		return this.computedCSS;
	}
}
dryCss.defaults={
	baseImportUrl:'./',
	compact:false,
	logError:function(error){
		if(  $ && $.fn.notify ){
			return $('<div class="tk-state-error">'+error+'</div>').notify();
		}else if(typeof console !== 'undefined' && typeof console.debug !== 'undefined' ){
			console.debug('error',error);
		}
	},
	syncXHR:function(url){
		var res ="";
		jQuery.ajax({
			async:false,
			cache: false,
			global:false,
			dataType:'text',
			url:url,
			error:function(XHR,status){
				if( typeof(jQuery.tk) !== "undefined" && typeof(jQuery.tk.notify) !== 'undefined' ){
					jQuery('<div class="tk-state-error">'+status+': <br />can\'t import '+url+'</div>').notify();
				}else{
					alert('error while importing '+url+'\n'+status);
				}
			},
			success:function(data){
				res=data;
			}
		});
		return res;
	}
}
