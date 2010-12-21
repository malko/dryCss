<?php
/**
declaration variable: Ok
	@var: val|"val"|'val' ;
remplacement var: Ok
nested: Ok
externalImport: Ok
import: Ok
	@:[.#]ruleName
	@!:[.#]ruleName
	@:[.#]ruleName[property]
when nested:
	:pseudoClass
	!extend parent selector
*/

$codeMirrorPath = '../CodeMirror-0.91';

	#- set editor id (will be also used as part as the storage key)
	if( ! empty($_GET['editorId']) ){
		$editorId =$_GET['editorId'];
	}elseif(!empty($_SERVER['HTTP_REFERER'])){
		$editorId = md5(strpos($_SERVER['HTTP_REFERER'],'/',10)?dirname($_SERVER['HTTP_REFERER']):$_SERVER['HTTP_REFERER']);
	}else{
		$editorId = 'cssEditor';
	}

	//-- saving rawContent
	if( !empty($_POST['rawContent']) ){
		echo file_put_contents($_POST['path'].$_POST['id'].'.dcss',$_POST['rawContent'])?'rawContent saved':'failed';
		exit;
	}
	//-- saving computedContent
	if( !empty($_POST['compContent']) ){
		echo file_put_contents($_POST['path'].$_POST['id'].'.css',$_POST['compContent'])?'computedContent saved':'failed';
		exit;
	}
	//-- loading saved rawContent
	if( !empty($_POST['getRawContent']) ){
		$rawFile = $_POST['path'].$_POST['id'].'.dcss';
		if( !file_exists($rawFile)){
			echo "/*no saved content found*/";exit;
		}else{
			echo file_get_contents($rawFile);
			exit;
		}
	}
?>
<html>
<head>
	<!--link rel="stylesheet" href="../BespinEmbedded-0.5.2/BespinEmbedded.css" type="text/css" />
	<script src="../BespinEmbedded-0.5.2/BespinEmbedded.js" type="text/javascript"></script-->
	<script src="../jquery.js" type="text/javascript"></script>
	<script src="../jquery.toolkit/src/jquery.toolkit.js" type="text/javascript"></script>
	<script src="../jquery.toolkit/src/jquery.toolkit.storage.js" type="text/javascript"></script>
	<script src="../jquery.toolkit/src/plugins/notify/jquery.tk.notify.js" type="text/javascript"></script>
	<script src="../jquery.toolkit/src/plugins/position/jquery.tk.position.js" type="text/javascript"></script>
	<script src="../jquery.toolkit/src/plugins/tooltip/jquery.tk.tooltip.js" type="text/javascript"></script>
	<script src="<?php echo $codeMirrorPath; ?>/js/codemirror.js" type="text/javascript"></script>
	<script src="js/dryCss.js" type="text/javascript"></script>
	<title>cssEditor</title>
	<link rel="icon" type="image/x-icon" href="favicon.ico" />
	<link rel="stylesheet" type="text/css" href="../jquery.toolkit/src/jquery.toolkit.css"/>
	<link rel="stylesheet" type="text/css" href="../jquery.toolkit/src/plugins/notify/jquery.tk.notify.css"/>
	<link rel="stylesheet" type="text/css" href="../jquery.toolkit/src/plugins/tooltip/jquery.tk.tooltip.css"/>
	<link rel="stylesheet" type="text/css" href="<?php echo $codeMirrorPath; ?>/css/docs.css"/>
	<style>
		body,div{
			margin:0;padding:0;
			font-size:10pt;
		}
		.CodeMirror-line-numbers{
			background:#eee;
			margin:0;
			padding:.4em;
			font-family: monospace;
			font-size: 10pt;
			color: black;
		}
		.CodeMirror-wrapping iframe{
			background:#f9f9f9 !important;
			margin:0;padding:0;
			width:100%!important;
		}
		.tk-cssEditor{
			background:#eee;
			border:solid black 1px;
			padding:0 1.7em 0 0;
			width:98%;
			height:98%
		}
	</style>
</head>
<body>
<div id="<?php echo $editorId?>" class="tk-cssEditor"></div>
<script>
(function($){
	if(! String.prototype.trim){
		String.prototype.trim = function(){
			return this.replace(/^\s*|\s*$/,'');
		}
	}

	var completionList = [
		/** props name */
		'accelerator','azimuth','background','background-attachment','background-color','background-image','background-position','background-position-x',
		'background-position-y','background-repeat','behavior','border','border-bottom','border-bottom-color','border-bottom-style','border-bottom-width',
		'border-collapse','border-color','border-left',	'border-left-color','border-left-style','border-left-width','border-right','border-right-color',
		'border-right-style','border-right-width','border-spacing','border-style','border-top','border-top-color','border-top-style','border-top-width',
		'border-width','bottom','caption-side','clear','clip','color','content','counter-increment','counter-reset','cue','cue-after','cue-before','cursor',
		'direction','display','elevation','empty-cells','filter','float','font','font-family','font-size','font-size-adjust','font-stretch','font-style',
		'font-variant','font-weight','height','ime-mode','include-source','layer-background-color','layer-background-image','layout-flow','layout-grid',
		'layout-grid-char','layout-grid-char-spacing','layout-grid-line','layout-grid-mode','layout-grid-type','left','letter-spacing','line-break',
		'line-height','list-style','list-style-image','list-style-position','list-style-type','margin','margin-bottom','margin-left','margin-right',
		'margin-top','marker-offset','marks','max-height','max-width','min-height','min-width','-moz-binding','-moz-border-radius',
		'-moz-border-radius-topleft','-moz-border-radius-topright','-moz-border-radius-bottomright','-moz-border-radius-bottomleft','-moz-border-top-colors',
		'-moz-border-right-colors','-moz-border-bottom-colors','-moz-border-left-colors','-moz-opacity','-moz-outline','-moz-outline-color','-moz-outline-style',
		'-moz-outline-width','-moz-user-focus','-moz-user-input','-moz-user-modify','-moz-user-select','orphans','outline','outline-color','outline-style',
		'outline-width','overflow','overflow-X','overflow-Y','padding','padding-bottom','padding-left','padding-right','padding-top','page','page-break-after',
		'page-break-before','page-break-inside','pause','pause-after','pause-before','pitch','pitch-range','play-during','position','quotes','-replace','richness',
		'right','ruby-align','ruby-overhang','ruby-position','-set-link-source','size','speak','speak-header','speak-numeral','speak-punctuation',
		'speech-rate','stress','scrollbar-arrow-color','scrollbar-base-color','scrollbar-dark-shadow-color','scrollbar-face-color','scrollbar-highlight-color',
		'scrollbar-shadow-color','scrollbar-3d-light-color','scrollbar-track-color','table-layout','text-align','text-align-last','text-decoration',
		'text-indent','text-justify','text-overflow','text-shadow','text-transform','text-autospace','text-kashida-space','text-underline-position','top',
		'unicode-bidi','-use-link-source','vertical-align','visibility','voice-family','volume','white-space','widows','width','word-break','word-spacing',
		'word-wrap','writing-mode','z-index','zoom',
		/** values */
		'normal','italic','small-caps','bold','xx-large','x-large','large','medium','small','x-small','xx-small','larger','smaller','transparent','none',
		'repeat','repeat-x','repeat-y','no-repeat','scroll','fixed','center'/*'top','bottom','left','right'*/,'underline','overline','line-through','sub','super',
		'capitalize','uppercase','lowercase','justify','auto','thin','medium','thick','solid','double','groove','ridge','inset','outset','both','block','inline',
		'list-item','disk','circle','square','decimal','lower-roman','upper-roman','lower-alpha','upper-alpha','inside','outside','visible','hidden','absolute',
		'relative','static','fixed','crosshair','default','hand','move','e-resize','ne-resize','nw-resize','n-resize','se-resize','sw-resize','s-resize','w-resize',
		'text','wait','help','important'
	];

	var completionManager =  {
		minLength:2,
		maxItem:10,
		visible:false,
		lastWord:'',
		selectedClass:'tk-state-warning tk-state-border',
		expressionChars:'[a-zA-Z0-9_@=-]',
		completionList:[],
		_editorRestoreGrabKey: null,
		setCompItems:function(list){
			this.completionList = list;
		},
		addCompItem:function(item){
			for( var i=0,l=this.completionList.length;i<l;i++){
				if( this.completionList[i] === item)
					return false;
			}
			this.completionList.push(item);
			return true;
		},
		_getList:function(word,context,previous){
			if( word.length < this.minLength)
				return [];
			var autoComp=[],wl=word.length,self=this;
			for( var i=0,l=self.completionList.length;i<l && autoComp.length<this.maxItem;i++){
				if( word === self.completionList[i].substr(0,wl) && wl < self.completionList[i].length ){
					autoComp.push(self.completionList[i]);
				}
			}
			return autoComp;
		},
		_displayList:function(editor,compList){
			if( compList.length < 1 ){
				this._hideList(editor);
			}
			var self = this
				, listElmt = $('#completionManagerList')
				, coords = editor.cursorCoords()
				, selectedItem = listElmt.find('li.selected').text()
				/*, selectedText = selectedItem.length?selectedItem.text():''
				, selectedClass = listElmt.find('li.selected').attr('class');*/
			;
			if(! listElmt.length){
				listElmt = $('<ul id="completionManagerList" class="tk-border" style="list-style-type:none;display:block;position:absolute;background:#fff;color:#000;margin:0;padding:.4em;"></ul>').appendTo('body').hide();
				listElmt.click(function(e){ self.itemSelected(e,editor);});
			}
			listElmt.css({top:coords.y,left:coords.x});
			listElmt.find('li').remove();
			for(var i=0,l=compList.length,item;i<l;i++){
				item = $('<li'+(compList[i] === selectedItem?' class="selected '+self.selectedClass+'"':"")+'>'+compList[i]+'</li>').appendTo(listElmt);
				/*if( compList[i] === selectedText)
					item.attr('class',selectedClass);*/
			}
			if(! self.visible){
				listElmt.show();
				self.visible = true;
				if( editor.frozen ){
					self._editorRestoreGrabKey = {frozen:editor.frozen ,keyFilter:editor.keyFilter};
				}
				editor.grabKeys(function(){return false;},function(k){
					switch(k){
						case 27:
						case 9:
						case 38:
						case 40:
						case 13:
							return true;
					}
					return false;
				});
				$(editor.frame.contentDocument?editor.frame.contentDocument:editor.contentWindow.document).bind('keydown.completionmngr',function(e){ self.keydown(e,editor);});
			}
		},
		_hideList:function(editor){
			this.visible = false;
			$('#completionManagerList').hide();
			$(editor.frame.contentDocument?editor.frame.contentDocument:editor.contentWindow.document).unbind('.completionmngr');
			if( this._editorRestoreGrabKey  !== null){
				editor.grabKeys(this._editorRestoreGrabKey.frozen,this._editorRestoreGrabKey.keyFilter)
			}else{
				editor.ungrabKeys();
			}
		},
		itemSelected:function(e,editor){
			this._hideList(editor);
			var cursorPos = editor.cursorPosition()
			, lineText = editor.lineContent(cursorPos.line)
			, textBefore = lineText.substr(0,cursorPos.character).replace(new RegExp('^.*?('+this.expressionChars+'*)$'),'$1')
			, selected = $('#completionManagerList li.selected').text()
			;
			if( e.type==='click'){
				selected = $(e.target).text();
			}else if( selected==='' ){
				selected = $('#completionManagerList li:first').text();
			}
			// editor.insertIntoLine(cursorPos.line,cursorPos.character,selected.substr(textBefore.length));
			editor.replaceSelection(selected.substr(textBefore.length));
		},
		keydown:function(e,editor){
			//dbg('keydown',e.which)
			var self = this;
			switch(e.which){
				case 27: // escape
					setTimeout(function(){self._hideList(editor);},50);
					break;
				case 9: // tab
				case 13: //return
					e.preventDefault();
					e.stopImmediatePropagation();
					this.itemSelected(e,editor);
					return false;
					break;
				case 38: // up
					e.preventDefault();
					var item = $('#completionManagerList li.selected');
					if(! item.length){
						item = $('#completionManagerList li:last');
						item.addClass('selected '+self.selectedClass);
					}else{
						item.removeClass('selected '+self.selectedClass);
						if( item.prev('li').length ){
							item.prev('li').addClass('selected '+self.selectedClass);
						}else{
							$('#completionManagerList li:last').addClass('selected '+self.selectedClass);
						}
					}
					break;
				case 40: // down
					e.preventDefault();
					var item = $('#completionManagerList li.selected');
					if(! item.length){
						item = $('#completionManagerList li');
						item = item.filter(':eq('+(item.length>1?1:0)+')');
						item.addClass('selected tk-state-warning');
					}else{
						item.removeClass('selected tk-state-warning');
						if( item.next('li').length ){
							item.next('li').addClass('selected tk-state-warning');
						}else{
							$('#completionManagerList li:first').addClass('selected tk-state-warning');
						}
					}
					break;
				/*case 38: // left
				case 39: // right*/
			}
		},
		check:function(editor,elmt){
			var self = completionManager
				, cursorPos = editor.cursorPosition()
				, lineText = editor.lineContent(cursorPos.line)
				, textBefore = lineText.substr(0,cursorPos.character).replace(new RegExp('^.*?('+self.expressionChars+'*)$'),'$1')
				, nextChar = lineText.substr(cursorPos.character,1)
				;
			if( self.lastWord === textBefore ){
				return;
			}else{
				self.lastWord = textBefore;
			}
			if( nextChar.match(new RegExp(self.expressionChars)) ){
				return self._hideList(editor);
			}
			var compList = self._getList(textBefore,$(elmt).attr('class'),lineText.substr(0,cursorPos.character-textBefore.length));
			if( compList.length < 1)
				return self._hideList(editor);
			return self._displayList(editor,compList);
		}
	};



	$.toolkit('tk.cssEditor',{
		_storableOptions:{
			urlElementLevel:'content|compactOutput'
		},

		_init:function(){
			// create elements
			var self = this,
				id = this.elmt.attr('id'),
				areaTag = $.tk.cssEditor.editorApis[this.options.editorApi].areaTag;
			// first add the editor area
			self._area = $('<'+areaTag+' id="cssEditorArea_'+id+'"></'+areaTag+'>')
				.append(self.elmt.contents())
				.appendTo(self.elmt);
			if( ! self.options.content ){
				self.options.content = self._area.text();
			}
			self._applyOpts('editorCss');
			//-- making toolbar
			self._toolbar = $('<div id="cssEditorBar_'+id+'" class="tk-cssEditor-toolbar"></div>').prependTo(self.elmt);

			var bts = [
				['load saved raw',function(){self.loadRawContent();}],
				['save raw',function(){self.saveRawContent();}],
				['save computed',function(){self.saveComputedContent();}],
				['export',function(){self.computeStyle('export');}],
				['save as',function(){self.computeStyle('saveas');}],
				['render',function(){self.computeStyle('inject');}],
				['defined',function(){self.toggleDefinedList();}]
			],l=bts.length,i,bt;
			for( i=0;i<l;i++){
				$('<button type="button">'+(bts[i][0])+'</button>').click(bts[i][1]).appendTo(self._toolbar);
			}
			$('<label><input type="checkbox" value="1"'+(self.options.compactOutput?' checked="checked"':'')+' style="vertical-align:middle;"/>Compact</label>').appendTo(self._toolbar)
			.find('input').change(function(){self.set('compactOutput',$(this).is(':checked')?true:false);});

			// self.editor = $.tk.cssEditor.editorApis[self.options.editorApi].init.call(self,self._area);
			$.tk.cssEditor.editorApis[self.options.editorApi].init.call(self,self._area);
			// if notify plugin is present then initialise it
			if( $.tk.notifybox ){
				self.notify = $.tk.notifybox.initDefault({vPos:'top',hPos:'right'});
				$('<div class="tk-state-success">editor initialized.</div>').notify();
			}
			// define posts callBacks
			self._loadRawContentResponse= function(data,status){
				if(status==='success' && data.length){
					self.set('content',data);
					if( self.notify){
						$('<div class="tk-state-info">raw content loaded</div>').notify();
					}
				}else{
					if( self.notify){
						$('<div class="tk-state-error">Can\'t load row content</div>').notify();
					}
				}
			};
			self._saveRawContentResponse= function(data,status){
				if( self.notify){
					self.notify.notifybox('msg',data);
				}
			};
			self._saveComputedContentResponse= function(data,status){
				window.opener.location.reload();
				if( self.notify){
					self.notify.notifybox('msg',data);
				}
			};
			self.toggleDefinedList = function(){
				if( typeof self._definedList === 'undefined'){
					self._definedList = $('<ul class="tk-border tk-state-warning" id="definedList"></ul>').appendTo(self.elmt);
					self._definedList.css({
						overflow:'auto',
						position:'absolute',
						top:self._toolbar.innerHeight(),
						left:0,
						display:'none',
						zIndex:1,
						margin:0,
						padding:0
					});
				}
				if( self._definedList.is(':visible')){
					return self._definedList.hide();
				}
				self._definedList.empty().height(self.elmt.height()-self._toolbar.height()).width(self.elmt.width());
				//recup des defined
				var defined = new dryCss(this._get_content(),{baseImportUrl:self.options.rawFilePath}).getDefined(),
				i,y,l,tmp;
				for(i in defined){
					tmp = $('<ul><li class="group">'+i+'<ul></ul></li></ul>').appendTo(self._definedList).find('li ul');
					for(y=0,l=defined[i].length;y<l;y++){
						$('<li>'+(i=="rules"?'@:':'')+defined[i][y]+'</li>').appendTo(tmp)
					}
				}
				self._definedList.find('li li').css({cursor:'pointer'}).click(function(){
					self._definedList.hide();
					self.editor.focus();
					var p = self.editor.cursorPosition();
					self.editor.insertIntoLine(p.line,p.character,$(this).text());
				});
				self._definedList.show();
			}
			if( $.isFunction(self.options.initCallback)){
				self.options.initCallback.call(self);
			}
		},

		_get_content:function(c){
			return $.tk.cssEditor.editorApis[this.options.editorApi].getContent.call(this.editor);
		},
		_set_content:function(c){
			return $.tk.cssEditor.editorApis[this.options.editorApi].setContent.call(this.editor,c);
		},
		_set_editorCss:function (css){
			this._area.css(css);
		},
		_saveContent:function(){
			var c = this.get('content');
			if((! this.options.disableStorage) && $.toolkit.storage && $.toolkit.storage.enable() ){
				$.toolkit.storage.set(this._tk.pluginName+'_content_'+this.elmt.attr('id')+'_'+escape(window.location.href),c);
			}
			return c;
		},
		computeStyle: function(action){
			if( typeof(action)!=='string')
				action = 'inject';
			var self = this
				, c = this._saveContent()
				, i
			;
			out = new dryCss(c,{compact:self.options.compactOutput,baseImportUrl:self.options.rawFilePath});
			// populate completion
			completionManager.setCompItems(completionList);
			defined = out.getDefined();
			for(i=0,l=defined.vars.length;i<l;i++){
				completionManager.addCompItem(defined.vars[i]);
			}
			for(i=0,l=defined.rules.length;i<l;i++){
				completionManager.addCompItem(defined.rules[i]);
			}
			for(i=0,l=defined.funcs.length;i<l;i++){
				completionManager.addCompItem(defined.funcs[i].replace(/\(.*/,''));
			}
			out = out.toString();
			//self._parseRawString(c,self.options.compactOutput,self.options.rawFilePath);
			switch(action){
				case 'export':
					var w = window.open('','cssEditorComputedStyleExport','toolbar=no,statusbar=no,scrollbars=yes');
					$('body',w.document).find('pre').remove().end().html('<pre>'+out+'</pre>');
					break;
				case 'saveas':
					window.open('data:text/dss,'+escape(out),'cssEditorComputedStyleExport','toolbar=no,statusbar=no,scrollbars=yes');
					window.save();
					break;
				case 'inject':
					// check for a computed style element in parent if none create it
					if( window.opener){
						var parentHead = $('head',window.opener.document),
							s = $('style[id=cssEditorComputedStyle]',parentHead), // must use [id=] expression to work under my chrome version
							l = $('link[href$='+self.elmt.attr('id')+'.css]',parentHead);
						cssPath = window.location.href.replace(/[^\/]*$/,'')+self.options.compFilePath;
						out = out.replace(/url\((\.\/|)?(?!http:\/\/)/g,'url('+cssPath+(cssPath.substr(-1)==='/'?'':'/'));
						if( l.length)
							l.remove();
						if( s.length)
							s.remove();
						if($.support.style){
							s = $('<style id="cssEditorComputedStyle" type="text/css"></style>').text(out);
						}else{ // ie version
							s = window.opener.document.createElement('STYLE');
							s.setAttribute('type','text/css');
							s.id = "cssEditorComputedStyle";
							s.styleSheet.cssText = out;
							s =$(s);
						}
						s.appendTo(parentHead);
					}
					break;
				case 'return':
					this.editor.focus();
					return out;
					break;
			}
			this.editor.focus();
		},
		loadRawContent: function(){
			var self = this,
				datas = {
					id:        self.elmt.attr('id'),
					path:      self.get('rawFilePath'),
					getRawContent:true
				};
			jQuery.post(document.location.href,datas,self._loadRawContentResponse,'text');
		},
		saveRawContent: function(){
			this._saveContent();
			var self = this,
				datas = {
					id:        self.elmt.attr('id'),
					path:      self.get('rawFilePath'),
					rawContent:self.get('content')
				};
			jQuery.post(document.location.href,datas,self._saveRawContentResponse,'text');
		},
		saveComputedContent: function(){
			this._saveContent();
			var self = this,
				datas = {
					id:        self.elmt.attr('id'),
					path:      self.get('compFilePath'),
					compContent:self.computeStyle('return')
				};
			if( false!==datas.compContent){
				jQuery.post(document.location.href,datas,self._saveComputedContentResponse,'text');
			}
		},
		//-- manage some shortcut keys
		shortCutKey:function(e){
			//dbg([e.which,e.ctrlKey,e.shiftKey,e])
			if(! e.ctrlKey)
				return true;
			var ed = this.editor,
				letsgo = true;

			switch(e.which){
				case 100://ctrl+d  duplicate line or selection
				case 68:
				case 4: // <- this is for chrome
					var s = ed.selection();
					if( s.length ){
						if(! s.match(/[\r\n]/)){ //-- single line selection
							ed.replaceSelection(s+''+s);
						}else{ //-- multiline selection
							ed.selectLines(ed.cursorPosition().line,0,ed.cursorPosition(false).line,ed.lineContent(ed.cursorPosition(false).line).length);
							s = ed.selection();
							ed.replaceSelection(s+'\n'+s);
						}
					}else{
						var l = ed.nthLine(ed.currentLine());
						s = ed.lineContent(l);
						ed.setLineContent(l,s+'\n'+s);
					}
					letsgo = false;
					break;
				case 101: //e
				case 69:
				case 5: // <- this is for chrome
					this.computeStyle('export');
					letsgo = false;
					break;
				case 12: // l+ctrl under chrome
				case 103:// g
				case 71:
					var l = prompt('Go to line:');
					if( l ){
						letsgo=false;
						ed.selectLines(ed.nthLine(l),0);
					}
					break;
				case 115: //s
				case 83:
				case 19: // <- this is for chrome if codemirror let it go there
					if( e.shiftKey){
						this.saveRawContent();
						this.saveComputedContent();
						letsgo = false;
					}
					break;
			}
			if( letsgo){
				return true;
			}
			e.preventDefault();
			ed.focus();
			return false;
		}
	});
	$.tk.cssEditor.defaults={
		editorApi: 'codeMirror',
		editorCss:{
			width:'100%',
			minHeight:'350px',
			height:'95%'
		},
		content:null,
		compactOutput:false,
		rawFilePath:'../../',
		compFilePath:'../../',
		initCallback:function(){
			var cssEditor = this
				, editor = cssEditor.editor
				, contentDoc
				;
			$(editor.frame).load(function(){
				/* / get ContentDocument
				contentDoc = this.contentDocument;
				if(! contentDoc)
					contentDoc = this.iframe.contentWindow.document;
				$('body',contentDoc).append('<div id="colorPreview" class="tk-positionRelative-in-top-right-0 tk-border" style="z-index:10,position:absolute;width:20px;height:20px;display:none;"></div>');
				$.toolkit.mouseRelative.init();
				var cPrev = $('#colorPreview',contentDoc).positionRelative({related:$('body',contentDoc)})
				$('body',contentDoc).click(function(e){
					var elmt = $(e.target);
					if( elmt.length && elmt.hasClass('drycss-colorcode')){
						// $('#colorPreview','body').html('<b style="font-size:25px;">sdfsdfsd</b>').positionable('set',{x:200,y:200});
						cPrev.css({'background':elmt.text()}).positionRelative('set',{related:elmt}).show();
					}else{
						cPrev.hide();
					}
				})
				//$('body',contentDoc).tooltip('set',{msg:'qsdqd'}).positionRelative('set',{related:$('body')});
				//*/
			})
			//dbg(editor,editor.frame,editor.editor);*/
		}
	}
	$.tk.cssEditor.editorApis = {
		bespin: {
			areaTag:'div',
			init: function(elmt){
				var tkWidget = this;
				var embed = tiki.require("bespin:embed");
				tkWidget.editor = embed.useBespin(elmt.attr('id'),{
					stealFocus: true,
					settings: {
						tabsize:2,
						//syntax:'css',
						fontsize:'12',
						//autoindent:'on',
						highlightline:'on',
						strictlines:'on',
						tabmode:'tabs'
					}
				});
				tkWidget._applyOpts('content');
			},
			getContent: function(){
				return this.getContent();
			},
			setContent: function(c){
				return this.setContent(c);
			}
		},
		codeMirror:{
			areaTag:'textarea',
			init: function(elmt){
				var tkWidget = this;
				tkWidget.editor = CodeMirror.fromTextArea(elmt.get(0), {
					parserfile: "../../dryCss/js/parsedrycss.js",
					stylesheet: "css/drycsscolors.css",
					path: "<?php echo $codeMirrorPath; ?>/js/",
					lineNumbers:true,
					tabMode:'shift',
					textWrapping:false,
					saveFunction:function(){
						tkWidget.computeStyle('inject');
						return false;
					},
					initCallback:function(){
						tkWidget._applyOpts('content');
						$(tkWidget.editor.win.document).keydown(function(e){tkWidget.shortCutKey(e)});
						tkWidget.editor.focus();
					},
					cursorActivity:function(elmt){
						completionManager.check(tkWidget.editor,elmt);
					}
				});
				completionManager.setCompItems(completionList);
			},
			getContent: function(){
				return this.getCode();
			},
			setContent: function(c){
				return this.setCode(c);
			}
		}
	};

})(jQuery);


jQuery(function(){
	$.toolkit.storage.enable([
		'localStorage',
		'globalStorage',
		'userData',
		'gears',
		//'cookies',
		'sessionStorage',
		'windowName' // be aware that window.name api is not secure at ALL (may be read by any domain whatever the origin is)
	]);
	$.toolkit.initPlugins('cssEditor');
	$(window).resize(function(){
		$('.tk-cssEditor').width($(window).width()-$('.CodeMirror-line-numbers').outerWidth()-2);
	});
	setTimeout(function(){$(window).resize();},250);
	var loadingMsg=$('<div class="tk-state-info tk-corner"><div class="tk-corner" style="background:url(loading.gif);width:100%;height:16px;border:solid black 1px;text-align:center;"> Loading... </div></div>');
	$('.tk-notifybox').ajaxStart(function(){
		loadingMsg.notify('set',{ttl:0,closeButton:false,state:"info",destroy:false} ).notify('show');
	})
	$('.tk-notifybox').ajaxComplete(function(event,XHR){
		loadingMsg.notify('hide');
		if( XHR.status != 200 )
			$(this).notifybox('msg','<div>'+XHR.status+' '+XHR.statusText+'</div>',{ttl:2500,state:XHR.status==200?'success':'error'});
	});

});
</script>
</body>
</html>