function changePostFormTab(type, bVisibleTabs) {
	if (bVisibleTabs && !!window["WriteMicroblog"])
		window["WriteMicroblog"](true);
	if (!window.changePostFormTabObj)
	{
		window.changePostFormTabObj = new SBPETabs();
		if (BX('blogPostForm')){
			if (!BX('blogPostForm').changePostFormTab)
			{
				BX('blogPostForm').appendChild( BX.create('INPUT', {
					props : {
						'type': 'hidden',
						'name': 'changePostFormTab',
						'value': ''
					}
				}));
			}
			BX.addCustomEvent(window, "changePostFormTab", function(type){if (type!="more"){ BX('blogPostForm').changePostFormTab.value = (type!="file" ? type : "message");}});
			if (BX('blogPostForm').UF_BLOG_POST_IMPRTNT)
				BX.addCustomEvent(window, "changePostFormTab", function(type){if (type!="more" && type!="important"){BX('blogPostForm').UF_BLOG_POST_IMPRTNT.value = 0;}});
		}
	}
	return window.changePostFormTabObj.setActive(type);
}

window.SBPETabs = function(type)
{
	this.type = type;
	this.tabs = {};
	this.bodies = {};
	this.active = null;

	if (this.inited !== true)
		this.init();
}
window.SBPETabs.prototype = {
	init : function()
	{
		this.tabContainer = BX('feed-add-post-form-tab');
		var arTabs = BX.findChildren(this.tabContainer, {'tag':'span', 'className': 'feed-add-post-form-link'}, true);
		this.arrow = BX('feed-add-post-form-tab-arrow');
		this.tabs = {}; this.bodies = {};

		for (var i = 0; i < arTabs.length; i++)
		{
			var id = arTabs[i].getAttribute("id").replace("feed-add-post-form-tab-", "");
			this.tabs[id] = arTabs[i];
			if (this.tabs[id].style.display == "none")
				this.tabs[id] = this.tabs[id].parentNode;
			this.bodies[id] = BX('feed-add-post-content-' + id);
		}
		if (!!this.tabs['vote'])
			this.bodies['vote'] = [this.bodies['message'], this.bodies['vote']];
		if (!!this.tabs['more'])
			this.bodies['more'] = null;
		if (!!this.tabs['important'])
			this.bodies['important'] = [this.bodies['message'], this.bodies['important']];
		if (!!this.tabs['grat'])
			this.bodies['grat'] = [this.bodies['message'], this.bodies['grat']];

		for (var ii in this.bodies)
		{
			if (BX.type.isDomNode(this.bodies[ii]))
				this.bodies[ii] = [this.bodies[ii]];
		}
		this.inited = true;
		BX.onCustomEvent(this.tabContainer, "onObjectInit", [this]);
	},
	setActive : function(type)
	{
		if (type == null || this.active == type)
			return this.active;
		else if (!this.tabs[type])
			return false;

		for (var ii in this.tabs)
		{
			if (ii != type)
			{
				BX.removeClass(this.tabs[ii], 'feed-add-post-form-link-active');
				if (this.bodies[ii] == null || this.bodies[type] == null)
					continue;
				for (var jj = 0; jj < this.bodies[ii].length; jj++)
				{
					if (this.bodies[type][jj] != this.bodies[ii][jj])
						BX.adjust(this.bodies[ii][jj], {style : {display : "none"}});
				}
			}
		}

		if (!!this.tabs[type])
		{
			this.active = type;
			BX.addClass(this.tabs[type], 'feed-add-post-form-link-active');
			var tabPosTab = BX.pos(this.tabs[type], true),
				tabPos = BX.pos(this.tabs[type].firstChild.nextSibling, true);
			this.arrow.style.left = (tabPosTab.left + 25) + 'px';
			if (!!this.bodies[type])
			{
				for (var jj = 0; jj < this.bodies[type].length; jj++)
				{
					BX.adjust(this.bodies[type][jj], {style : {display : "block"}});
				}
			}
		}
		BX.onCustomEvent(window, "changePostFormTab", [type]);
		return this.active;
	}
}

function gratitude(btn, params) {
	var
		item = BX.findChild(btn, {className:'feed-add-post-form-link-text'}, true),
		res = changePostFormTab(null, false);
	res = (res == null ? changePostFormTab('message', false) : res);
	btn.setAttribute('activePoint', res);
	var arrow = BX.findChild(btn, {"className" : "feed-add-post-more-icon"});

	changePostFormTab('more', false);

	BX.PopupMenu.show('feed-add-post-form-popup', arrow,
		[
			{ text : BX.message('BLOG_TAB_GRAT'),
				className : "feed-add-post-form-grat",
				href : "#",
				onclick : function(event){
					BX.PreventDefault(event);
					btn.setAttribute('activePoint', 'grat');

					// изменение надписи на кнопке
					item = BX.findChild(btn, {className:'feed-add-post-form-link-text'}, true);
					item.innerHTML = BX.message('BLOG_TAB_GRAT');

					BX.addClass(btn, "feed-add-post-form-link-active feed-add-post-form-grat-link")
					BX.removeClass(btn, 'feed-add-post-form-important-link');
					this.popupWindow.close();
				}
			},
			{ text : BX.message('SBPE_IMPORTANT_MESSAGE'),
				className : "feed-add-post-form-important", href : "#",
				onclick : function(event){

					BX.PreventDefault(event);
					btn.setAttribute('activePoint', 'important');
					// изменение надписи на кнопке
					BX.adjust(BX.findChild(btn, {className:'feed-add-post-form-link-text'}, true),
						{html : BX.message('SBPE_IMPORTANT_MESSAGE'), attrs : {activePoint : 'more'}});
					important();
					BX.removeClass(btn, "feed-add-post-form-link-active feed-add-post-form-grat-link");
					BX.addClass(btn, "feed-add-post-form-link-active feed-add-post-form-important-link");
					this.popupWindow.close();
				}
			}
		],
		{
			closeByEsc : true,
			offsetTop: 5,
			offsetLeft: 3,
			angle:{
				position:'top'
			},
			events : {
				onPopupClose : function() {
					if (changePostFormTab(null, false) == "more")
					{
						changePostFormTab(
							btn.getAttribute('activePoint'),
							((btn.getAttribute('activePoint') == "grat" || btn.getAttribute('activePoint') == "important") ? params : false));
					}
				}
			}
		}
	)
}
function important()
{
	if (BX('blogPostForm') && BX('blogPostForm').UF_BLOG_POST_IMPRTNT) {
		BX('blogPostForm').UF_BLOG_POST_IMPRTNT.value = 1;
	}
}

window.BXfpGratSelectCallback = function(item, type_user, name)
{
	BXfpGratMedalSelectCallback(item, 'grat');
}

window.BXfpMedalSelectCallback = function(item, type_user, name)
{
	BXfpGratMedalSelectCallback(item, 'medal');
}

window.BXfpGratMedalSelectCallback = function(item, type)
{
	if (type != 'grat')
		type = 'medal';

	var prefix = 'U';

	BX('feed-add-post-'+type+'-item').appendChild(
		BX.create("span", { 
			attrs : { 'data-id' : item.id }, 
			props : { className : "feed-add-post-"+type+" feed-add-post-destination-users" }, 
			children: [
				BX.create("input", { 
					attrs : { 'type' : 'hidden', 'name' : (type == 'grat' ? 'GRAT' : 'MEDAL')+'['+prefix+'][]', 'value' : item.id }
				}),
				BX.create("span", { 
					props : { 'className' : "feed-add-post-"+type+"-text" }, 
					html : item.name
				}),
				BX.create("span", { 
					props : { 'className' : "feed-add-post-del-but"}, 
					events : {
						'click' : function(e){
							BX.SocNetLogDestination.deleteItem(item.id, 'users', BXSocNetLogGratFormName);
							BX.PreventDefault(e)
						}, 
						'mouseover' : function(){
							BX.addClass(this.parentNode, 'feed-add-post-'+type+'-hover')
						}, 
						'mouseout' : function(){
							BX.removeClass(this.parentNode, 'feed-add-post-'+type+'-hover')
						}
					}
				})
			]
		})
	);

	BX('feed-add-post-'+type+'-input').value = '';
	BXfpGratMedalLinkName(type == 'grat' ? BXSocNetLogGratFormName : BXSocNetLogMedalFormName, type);
}

window.BXfpGratUnSelectCallback = function(item, type, search)
{
	BXfpGratMedalUnSelectCallback(item, 'grat');
}

window.BXfpMedalUnSelectCallback = function(item, type, search)
{
	BXfpGratMedalUnSelectCallback(item, 'medal');
}

window.BXfpGratMedalUnSelectCallback = function(item, type)
{
	var elements = BX.findChildren(BX('feed-add-post-'+type+'-item'), {attribute: {'data-id': ''+item.id+''}}, true);
	if (elements != null)
	{
		for (var j = 0; j < elements.length; j++)
			BX.remove(elements[j]);
	}
	BX('feed-add-post-'+type+'-input').value = '';
	BXfpGratMedalLinkName((type == 'grat' ? BXSocNetLogGratFormName : BXSocNetLogMedalFormName), type);
}

window.BXfpGratMedalLinkName = function(name, type)
{
	if (type != 'grat')
		type = 'medal';

	if (BX.SocNetLogDestination.getSelectedCount(name) <= 0)
		BX('bx-'+type+'-tag').innerHTML = BX.message("BX_FPGRATMEDAL_LINK_1");
	else
		BX('bx-'+type+'-tag').innerHTML = BX.message("BX_FPGRATMEDAL_LINK_2");
}

window.BXfpGratOpenDialogCallback = function()
{
	BX.style(BX('feed-add-post-grat-input-box'), 'display', 'inline-block');
	BX.style(BX('bx-grat-tag'), 'display', 'none');
	BX.focus(BX('feed-add-post-grat-input'));
}

window.BXfpGratCloseDialogCallback = function()
{
	if (!BX.SocNetLogDestination.isOpenSearch() && BX('feed-add-post-grat-input').value.length <= 0)
	{
		BX.style(BX('feed-add-post-grat-input-box'), 'display', 'none');
		BX.style(BX('bx-grat-tag'), 'display', 'inline-block');
		BXfpdDisableBackspace();
	}
}

window.BXfpGratCloseSearchCallback = function()
{
	if (!BX.SocNetLogDestination.isOpenSearch() && BX('feed-add-post-grat-input').value.length > 0)
	{
		BX.style(BX('feed-add-post-grat-input-box'), 'display', 'none');
		BX.style(BX('bx-grat-tag'), 'display', 'inline-block');
		BX('feed-add-post-grat-input').value = '';
		BXfpdDisableBackspace();
	}

}

window.BXfpGratSearchBefore = function(event)
{
	if (event.keyCode == 8 && BX('feed-add-post-grat-input').value.length <= 0)
	{
		BX.SocNetLogDestination.sendEvent = false;
		BX.SocNetLogDestination.deleteLastItem(BXSocNetLogGratFormName);
	}

	return true;
}
window.BXfpGratSearch = function(event)
{
	if(event.keyCode == 16 || event.keyCode == 17 || event.keyCode == 18)
		return false;

	if (event.keyCode == 13)
	{
		BX.SocNetLogDestination.selectFirstSearchItem(BXSocNetLogGratFormName);
		return true;
	}
	if (event.keyCode == 27)
	{
		BX('feed-add-post-grat-input').value = '';
		BX.style(BX('bx-grat-tag'), 'display', 'inline');
	}
	else
	{
		BX.SocNetLogDestination.search(BX('feed-add-post-grat-input').value, true, BXSocNetLogGratFormName);
	}

	if (!BX.SocNetLogDestination.isOpenDialog() && BX('feed-add-post-grat-input').value.length <= 0)
	{
		BX.SocNetLogDestination.openDialog(BXSocNetLogGratFormName);
	}
	else
	{
		if (BX.SocNetLogDestination.sendEvent && BX.SocNetLogDestination.isOpenDialog())
			BX.SocNetLogDestination.closeDialog();
	}
	if (event.keyCode == 8)
	{
		BX.SocNetLogDestination.sendEvent = true;
	}
	return true;
}

;(function(){

if (!!BX.SocNetGratSelector)
	return;

BX.SocNetGratSelector = 
{
	popupWindow: null,
	obWindowCloseIcon: {},
	sendEvent: true,
	obCallback: {},
	gratsContentElement: null,
	itemSelectedImageItem: {},
	itemSelectedInput: {},

	searchTimeout: null,
	obDepartmentEnable: {},
	obSonetgroupsEnable: {},
	obLastEnable: {},
	obWindowClass: {},
	obPathToAjax: {},
	obDepartmentLoad: {},
	obDepartmentSelectDisable: {},
	obItems: {},
	obItemsLast: {},
	obItemsSelected: {},

	obElementSearchInput: {},
	obElementBindMainPopup: {},
	obElementBindSearchPopup: {}
}

BX.SocNetGratSelector.init = function(arParams)
{
	if(!arParams.name)
		arParams.name = 'lm';

	BX.SocNetGratSelector.obCallback[arParams.name] = arParams.callback;
	BX.SocNetGratSelector.obWindowCloseIcon[arParams.name] = typeof (arParams.obWindowCloseIcon) == 'undefined' ? true : arParams.obWindowCloseIcon;
	BX.SocNetGratSelector.itemSelectedImageItem[arParams.name] = arParams.itemSelectedImageItem;
	BX.SocNetGratSelector.itemSelectedInput[arParams.name] = arParams.itemSelectedInput;	
}

BX.SocNetGratSelector.openDialog = function(name)
{
	if(!name)
		name = 'lm';

	if (BX.SocNetGratSelector.popupWindow != null)
	{
		BX.SocNetGratSelector.popupWindow.close();
		return false;
	}

	var arGratsItems = [];
	for (var i = 0; i < arGrats.length; i++)
	{
		arGratsItems[arGratsItems.length] = BX.create("span", {
			props: {
				className: 'feed-add-grat-box ' + arGrats[i].style
			},
			attrs: {
				'title': arGrats[i].title
			},
			events: {
				'click' : BX.delegate(function(e){
					BX.SocNetGratSelector.selectItem(name, this.code, this.style, this.title);
					BX.PreventDefault(e)
				}, arGrats[i])
			}
		});
	}
	var arGratsRows = [];
	var rownum = 1;
	for (var i = 0; i < arGratsItems.length; i++)
	{
		if (i >= arGratsItems.length/2)
			rownum = 2;

		if (arGratsRows[rownum] == null || arGratsRows[rownum] == 'undefined')
			arGratsRows[rownum] = BX.create("div", {
				props: {
					className: 'feed-add-grat-list-row'
				}
			});
		arGratsRows[rownum].appendChild(arGratsItems[i]);
	}

	BX.SocNetGratSelector.gratsContentElement = BX.create("div", {
		children: [
			BX.create("div", {
				props: {
					className: 'feed-add-grat-list-title'
				},
				html: BX.message('BLOG_GRAT_POPUP_TITLE')
			}),
			BX.create("div", {
				props: {
					className: 'feed-add-grat-list'
				},
				children: arGratsRows
			})
		]
	});

	BX.SocNetGratSelector.popupWindow = new BX.PopupWindow('BXSocNetGratSelector', BX('feed-add-post-grat-type-selected'), {
		autoHide: true,
		offsetLeft: 25,
		bindOptions: { forceBindPosition: true },
		closeByEsc: true,
		closeIcon : BX.SocNetGratSelector.obWindowCloseIcon[name] ? { 'top': '5px', 'right': '10px' } : false,
		events : {
			onPopupShow : function() {
				if(BX.SocNetGratSelector.sendEvent && BX.SocNetGratSelector.obCallback[name] && BX.SocNetGratSelector.obCallback[name].openDialog)
					BX.SocNetGratSelector.obCallback[name].openDialog();
			},
			onPopupClose : function() { 
				this.destroy();
			},
			onPopupDestroy : BX.proxy(function() { 
				BX.SocNetGratSelector.popupWindow = null; 
				if(BX.SocNetGratSelector.sendEvent && BX.SocNetGratSelector.obCallback[name] && BX.SocNetGratSelector.obCallback[name].closeDialog)
					BX.SocNetGratSelector.obCallback[name].closeDialog();
			}, this)
		},
		content: BX.SocNetGratSelector.gratsContentElement,
		angle : {
			position: "bottom",
			offset : 20
		}
	});
	BX.SocNetGratSelector.popupWindow.setAngle({});
	BX.SocNetGratSelector.popupWindow.show();
}

BX.SocNetGratSelector.selectItem = function(name, code, style, title)
{
	BX.SocNetGratSelector.itemSelectedImageItem[name].className = 'feed-add-grat-medal ' + style;
	BX.SocNetGratSelector.itemSelectedImageItem[name].title = title;
	BX.SocNetGratSelector.itemSelectedInput[name].value = code;
	BX.SocNetGratSelector.popupWindow.close();
}

})(); // one-time-use

WDFileDialogBranch = function(node)
{
	this.fileInput = node;
	this.controller = BX.findChild(node.form, {'className': 'wduf-selectdialog'}, true, false);
	BX.addCustomEvent('WDSelectFileDialogLoaded', BX.proxy(this.onWDSelectFileDialogLoaded, this));
	BX.bind(BX("feed-add-post-form-tab-file"), 'click', BX.proxy(this.onTabClick, this));
	BX.bind(this.fileInput, 'change', BX.proxy(this.onFileChange, this));
	BX.addCustomEvent(this.controller.parentNode, 'OnFileFromDialogSelected', BX.proxy(this.onDone, this));
	if (BX.browser.IsIE())
	{
		var res = BX.findChild(node.form, {'className': 'feed-add-file-form-light-descript'}, true);
		if (!!res)
			BX.hide(res);
		var res = BX.findChild(node.form, {'className': 'feed-add-file-form-light-descript-ie'}, true);
		if (!!res)
			BX.show(res);
	}
}
WDFileDialogBranch.prototype = {
	onTabClick : function(e)
	{
		this.display = this.controller.style.display;
		BX.addCustomEvent('WDSelectFileDialogLoaded', BX.proxy(this.onWDSelectFileDialogLoadedRestore, this));
		BX.onCustomEvent(this.controller.parentNode, "WDLoadFormController");
		BX.unbind(BX("feed-add-post-form-tab-file"), 'click', BX.proxy(this.onTabClick, this));
	},
	onWDSelectFileDialogLoadedRestore : function(wdFD)
	{
		if (this.display == 'block')
			BX.fx.show(this.controller, 'fade', {time:0.2});
		else
			BX.fx.hide(this.controller, 'fade', {time:0.2});
		BX.addCustomEvent('WDSelectFileDialogLoaded', BX.proxy(this.onWDSelectFileDialogLoadedRestore, this));
	},
	onWDSelectFileDialogLoaded : function(wdFD)
	{
		BX.unbind(BX("feed-add-post-form-tab-file"), 'click', BX.proxy(this.onTabClick, this));
		this.wdFD = wdFD;
		if (!this.wdFD.hShowSelectDialog)
			this.wdFD.hShowSelectDialog = BX.proxy(this.wdFD.ShowSelectDialog, this.wdFD);
		this.onWDAgentLoaded();
		BX.bind(BX('D' + this.fileInput.id), 'click', this.wdFD.hShowSelectDialog);
	},
	onWDAgentLoaded : function()
	{
		if (!this.wdFD.agent){
			setTimeout(BX.delegate(this.onWDAgentLoaded, this), 100);
			return;
		}

		if (!this.loaded)
		{
			this.loaded = true;
			BX.loadScript('/bitrix/js/main/core/core_dd.js', BX.delegate(function() {
				var controller = BX.findChild(this.fileInput.form, { 'className': 'feed-add-file-form-light'}, true);
				if (!controller)
					return false;
				var dropbox = new BX.DD.dropFiles(controller);
				if (dropbox && dropbox.supported() && BX.ajax.FormData.isSupported()) {
					this.wdFD.agent.Init();
					BX.addCustomEvent(dropbox, 'dragEnter', BX.delegate(function() {BX.addClass(controller, 'feed-add-file-form-light-hover');}, this));
					BX.addCustomEvent(dropbox, 'dragLeave', BX.delegate(function() {BX.removeClass(controller, 'feed-add-file-form-light-hover');}, this));
					BX.addCustomEvent(dropbox, 'dropFiles', BX.delegate(this.onFileDrop, this));
				}
			}, this));
		}
	},
	onFileDrop : function(files)
	{
		if (!!this.wdFD)
		{
			this.wdFD.urlUpload = this.wdFD.urlUpload.replace('&random_folder=Y', '&dropped=Y');
			this.wdFD.agent.UploadDroppedFiles(files);
			this.onDone();
		}
	},
	onFileChange : function(e)
	{
		if (!!this.wdFD && !!this.wdFD.agent)
		{
			this.wdFD.urlUpload = this.wdFD.urlUpload.replace('&random_folder=Y', '&dropped=Y');
			this.wdFD.agent.fileInput = this.fileInput;
			if (!!this.wdFD.uploadDialog && !!this.wdFD.uploadDialog.__form)
			{
				this.wdFD.uploadDialog.__form.setAttribute(
					"action",
					this.wdFD.uploadDialog.__form.getAttribute("action").replace('random_folder=Y', 'dropped=Y'));
				if (!!this.wdFD.uploadDialog.__form["random_folder"])
					BX.remove(this.wdFD.uploadDialog.__form["random_folder"]);
				if (!!this.wdFD.uploadDialog.__form["SECTION_ID"])
					this.wdFD.uploadDialog.__form["SECTION_ID"].value = 0;
			}
			this.wdFD.agent.Init();
			this.wdFD.agent.hUploaderChange(e);
			this.onDone();
		}
	},

	onDone: function()
	{
		changePostFormTab('message', true);
		if (!this.controller.loaded || this.controller.style.display !== "block")
			BX.onCustomEvent(this.controller.parentNode, "WDLoadFormController", ['show']);
	}
}
/*
BlogPostAutoSaveIcon = function () {
	var formId = 'blogPostForm';
	var form = BX(formId);
	if (!form) return;
	
	auto_lnk = BX('post-form-autosave-icon');
	formHeaders = BX.findChild(form, {'className': /lhe-stat-toolbar-cont/ }, true, true);
	if (formHeaders.length < 1)
		return false;
	formHeader = formHeaders[formHeaders.length-1];
	formHeader.insertBefore(auto_lnk, formHeader.children[0]);
}
*/
BlogPostAutoSave = function (pEditorAutoSave) {

	if(pEditorAutoSave && pEditorAutoSave['id'] != 'idPostFormLHE_blogPostForm')
		return;

	var formId = 'blogPostForm';
	var form = BX(formId);
	if (!form) return;

	var controlID = "idPostFormLHE_blogPostForm";
	var titleID = 'POST_TITLE';
	title = BX(titleID);
	tags = BX(formId).TAGS;
	
	var	iconClass = "blogPostAutoSave";
	var	actionClass = "blogPostAutoRestore";
	var	actionText = BX.message('AUTOSAVE_R');
	var recoverMessage = BX.message('BLOG_POST_AUTOSAVE');
	var recoverNotify = null;
	
	var pAutoSaveEditor = window['oPostFormLHE_blogPostForm'];

	if(!pAutoSaveEditor)
	{
		setTimeout("BlogPostAutoSave()", 10);
		return;
	}

	var bindLHEEvents = function(_ob)
	{
		if (pAutoSaveEditor)
		{
			pAutoSaveEditor.fAutosave = _ob;
			BX.bind(pAutoSaveEditor.pEditorDocument, 'keydown', BX.proxy(_ob.Init, _ob));
			BX.bind(pAutoSaveEditor.pTextarea, 'keydown', BX.proxy(_ob.Init, _ob));
			BX.bind(title, 'keydown', BX.proxy(_ob.Init, _ob));
			BX.bind(tags, 'keydown', BX.proxy(_ob.Init, _ob));
		}
	}
	
	var asId = window['autosave_'+form['autosave_id'].value];

	BX.addCustomEvent(form, 'onAutoSavePrepare', function (ob, h) {
		ob.DISABLE_STANDARD_NOTIFY = true;
		_ob=ob;
		setTimeout(function() { bindLHEEvents(_ob) }, 100);
	});

	asId.Prepare();

	BX.addCustomEvent(form, 'onAutoSave', function(ob, form_data) {
		if (!pAutoSaveEditor) return;

		form_data[controlID+'_type'] = pAutoSaveEditor.sEditorMode;
		var text = "";
		if (pAutoSaveEditor.sEditorMode == 'code')
			text = pAutoSaveEditor.GetCodeEditorContent();
		else
			text = pAutoSaveEditor.GetEditorContent();
		form_data[controlID] = text;
		form_data['TAGS'] = BX(formId).TAGS.value;
	});

	BX.addCustomEvent(form, 'onAutoSaveRestoreFound', function(ob, data) {
		if (BX.util.trim(data[controlID]).length < 1 && BX.util.trim(data[titleID]).length < 1) return;
		ob.Restore();
		});			

	BX.addCustomEvent(form, 'onAutoSaveRestore', function(ob, data) {
		if (!pAutoSaveEditor || !data[controlID]) return;

		pAutoSaveEditor.SetView(data[controlID+'_type']);

		if (!!pAutoSaveEditor.sourseBut)
			pAutoSaveEditor.sourseBut.Check((data[controlID+'_type'] == 'code'));
		if (data[controlID+'_type'] == 'code')
			pAutoSaveEditor.SetContent(data[controlID]);
		else
			pAutoSaveEditor.SetEditorContent(data[controlID]);
		BX(titleID).value = data[titleID];
		if(data[titleID].length > 0 && data[titleID] != BX(titleID).getAttribute("placeholder"))
		{
			if(BX('divoPostFormLHE_blogPostForm').style.display != "none")
				showPanelTitle_blogPostForm(true);
			else
				window["bShowTitle"] = true;
			if (!!BX(titleID).__onchange)
				BX(titleID).__onchange();
		}
		if(data['TAGS'].length > 0)
		{
			var bTagShow = false;
			var tags = data['TAGS'].split(",");
			for (var i = 0; i < tags.length; i++ )
			{
				var tag = BX.util.trim(tags[i]);
				if(tag.length > 0)
				{
					var allTags = BX('tags-hidden').value.split(",");
					if(!BX.util.in_array(tag, allTags))
					{
						var el = BX.create('SPAN', {'html': BX.util.htmlspecialchars(tag) + '<span class="feed-add-post-del-but" onclick="deleteTag(\'' + BX.util.htmlspecialchars(tag) + '\', this.parentNode)"></span>', 'attrs' : {'class': 'feed-add-post-tags'}});
						BX('post-tags-container').insertBefore(el, BX('bx-post-tag'));
						BX('tags-hidden').value += tag + ',';
						bTagShow = true;
					}
				}
			}
			if(bTagShow)
			{
				var el = BX.findChild(form, {'className': /feed-add-post-tags-block/ }, true, false);
				BX.show(el);
			}
		}

		if(BX.SocNetLogDestination)
		{
			if(data['SPERM[DR][]'])
			{
				for (var i = 0; i < data['SPERM[DR][]'].length; i++ )
				{
					BX.SocNetLogDestination.selectItem(BXSocNetLogDestinationFormName, '', 3, data['SPERM[DR][]'][i], 'department', false);
				}
			}
			if(data['SPERM[SG][]'])
			{
				for (var i = 0; i < data['SPERM[SG][]'].length; i++ )
				{
					BX.SocNetLogDestination.selectItem(BXSocNetLogDestinationFormName, '', 3, data['SPERM[SG][]'][i], 'sonetgroups', false);
				}
			}
			if(data['SPERM[U][]'])
			{
				for (var i = 0; i < data['SPERM[U][]'].length; i++ )
				{
					BX.SocNetLogDestination.selectItem(BXSocNetLogDestinationFormName, '', 3, data['SPERM[U][]'][i], 'users', false);
				}
			}
			if(!data['SPERM[UA][]'])
			{
				BX.SocNetLogDestination.deleteItem('UA', 'groups', BXSocNetLogDestinationFormName);
			}
		}
				
		bindLHEEvents(ob);
	});

	BX.addCustomEvent(form, 'onAutoSaveRestoreFinished', function(ob, data) {
		if (!! recoverNotify)
			BX.remove(recoverNotify);
	});
}