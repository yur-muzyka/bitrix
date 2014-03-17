/* IM manager class */

(function() {

if (BX.IM)
	return;

BX.IM = function(domNode, params)
{
	BX.browser.addGlobalClass();
	if(typeof(BX.message("USER_TZ_AUTO")) == 'undefined' || BX.message("USER_TZ_AUTO") == 'Y')
		BX.message({"USER_TZ_OFFSET": -(new Date).getTimezoneOffset()*60-parseInt(BX.message("SERVER_TZ_OFFSET"))});

	this.revision = 7; // api revision - check include.php
	this.errorMessage = '';
	this.animationSupport = true;
	this.audioSupport = true;
	this.bitrix24Status = params.bitrix24Status;
	this.bitrixIntranet = params.bitrixIntranet;
	this.ppStatus = params.ppStatus;
	this.ppServerStatus = this.ppStatus? params.ppServerStatus: false;
	this.desktopStatus = params.desktopStatus;
	this.xmppStatus = params.xmppStatus;
	this.userStatus = params.userStatus;
	this.lastRecordId = 0;
	this.userId = params.userId;
	this.userParams = params.users && params.users[this.userId]? params.users[this.userId]: {};
	this.enableSound = params.enableSound;
	this.path = params.path;
	this.language = params.language || 'en';
	this.init = typeof(params.init) != 'undefined'? params.init: true;
	this.windowFocus = true;
	this.windowFocusTimeout = null;
	this.extraBind = null;
	this.extraOpen = false;
	this.dialogOpen = false;
	this.notifyOpen = false;
	this.adjustSizeTimeout = null;
	this.tryConnect = true;

	this.audio = {};
	this.audio.reminder = null;
	this.audio.newMessage1 = null;
	this.audio.newMessage2 = null;
	this.audio.send = null;
	this.audio.dialtone = null;
	this.audio.ringtone = null;
	this.audio.start = null;
	this.audio.stop = null;
	this.audio.current = null;
	this.audio.timeout = {};

	this.mailCount = params.mailCount;
	this.notifyCount = params.notifyCount || 0;
	this.messageCount = params.messageCount || 0;

	this.quirksMode = (BX.browser.IsIE() && !BX.browser.IsDoctype() && (/MSIE 8/.test(navigator.userAgent) || /MSIE 9/.test(navigator.userAgent)));

	if (BX.browser.IsIE() && !BX.browser.IsIE9() && (/MSIE 7/i.test(navigator.userAgent)))
		this.errorMessage = BX.message('IM_MESSENGER_OLD_BROWSER');

	this.desktop = new BX.IM.Desktop(this, {
		'desktop': params.desktop,
		'desktopLinkOpen': params.desktopLinkOpen
	});

	this.webrtc = new BX.IM.WebRTC(this, {
		'desktopClass': this.desktop,
		'turnServer': params.webrtc && params.webrtc.turnServer || '',
		'turnServerFirefox': params.webrtc && params.webrtc.turnServerFirefox || '',
		'turnServerLogin': params.webrtc && params.webrtc.turnServerLogin || '',
		'turnServerPassword': params.webrtc && params.webrtc.turnServerPassword || '',
		'panel': domNode != null? domNode: BX.create('div')
	});

	this.windowTitle = this.desktop.ready()? '': document.title;

	for (var i in params.notify)
	{
		params.notify[i].date = parseInt(params.notify[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
		if (parseInt(i) > this.lastRecordId)
			this.lastRecordId = parseInt(i);
	}
	for (var i in params.message)
	{
		params.message[i].date = parseInt(params.message[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
		if (parseInt(i) > this.lastRecordId)
			this.lastRecordId = parseInt(i);
	}
	for (var i in params.recent)
	{
		params.recent[i].date = parseInt(params.recent[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
	}

	if (BX.browser.SupportLocalStorage())
	{
		//BX.addCustomEvent(window, "onLocalStorageSet", BX.proxy(this.storageSet, this));

		var lri = BX.localStorage.get('lri');
		if (parseInt(lri) > this.lastRecordId)
			this.lastRecordId = parseInt(lri);

		BX.garbage(function(){
			BX.localStorage.set('lri', this.lastRecordId, 60);
		}, this);
	}

	this.notifyManager = new BX.IM.NotifyManager(this, {});

	this.notify = new BX.Notify(this, {
		'desktopClass': this.desktop,
		'webrtcClass': this.webrtc,
		'domNode': domNode != null? domNode: BX.create('div'),
		'panelPosition': params.panelPosition || {},
		'counters': params.counters || {},
		'mailCount': params.mailCount || 0,
		'notify': params.notify || {},
		'unreadNotify' : params.unreadNotify || {},
		'flashNotify' : params.flashNotify || {},
		'countNotify' : params.countNotify || 0,
		'loadNotify' : params.loadNotify
	});
	this.webrtc.notify = this.notify;
	this.desktop.notify = this.notify;

	if (this.init)
	{
		BX.addCustomEvent(window, "onImUpdateCounterNotify", BX.proxy(this.updateCounter, this));
		BX.addCustomEvent(window, "onImUpdateCounterMessage", BX.proxy(this.updateCounter, this));
		BX.addCustomEvent(window, "onImUpdateCounterMail", BX.proxy(this.updateCounter, this));
		BX.addCustomEvent(window, "onImUpdateCounter", BX.proxy(this.updateCounter, this));
	}

	this.messenger = new BX.Messenger(this, {
		'notifyClass': this.notify,
		'webrtcClass': this.webrtc,
		'desktopClass': this.desktop,
		'viewOffline': typeof(params.viewOffline) != 'undefined'? params.viewOffline: false,
		'viewGroup': typeof(params.viewGroup) != 'undefined'? params.viewGroup: true,
		'sendByEnter': typeof(params.sendByEnter) != 'undefined'? params.sendByEnter: false,
		'recent': params.recent,
		'users': params.users || {},
		'groups': params.groups || {},
		'userInGroup': params.userInGroup || {},
		'woGroups': params.woGroups || {},
		'woUserInGroup': params.woUserInGroup || {},
		'currentTab' : params.currentTab || null,
		'chat' : params.chat || {},
		'userInChat' : params.userInChat || {},
		'message' : params.message || {},
		'showMessage' : params.showMessage || {},
		'unreadMessage' : params.unreadMessage || {},
		'flashMessage' : params.flashMessage || {},
		'countMessage' : params.countMessage || 0,
		'smile' : params.smile || false,
		'smileSet' : params.smileSet || false,
		'history' : params.history || {},
		'openMessenger' : typeof(params.openMessenger) != 'undefined'? params.openMessenger: false,
		'openHistory' : typeof(params.openHistory) != 'undefined'? params.openHistory: false
	});
	this.webrtc.messenger = this.messenger;
	this.notify.messenger = this.messenger;
	this.desktop.messenger = this.messenger;

	if (this.init)
	{
		BX.bind(window, "blur", BX.delegate(function(){ this.changeFocus(false);}, this));
		BX.bind(window, "focus", BX.delegate(function(){
			this.changeFocus(true);
			if (this.isFocus() && this.messenger.unreadMessage[this.messenger.currentTab] && this.messenger.unreadMessage[this.messenger.currentTab].length>0)
				this.messenger.readMessage(this.messenger.currentTab);

			if (this.isFocus('notify'))
			{
				if (this.notify.unreadNotifyLoad)
					this.notify.loadNotify();
				else if (this.notify.notifyUpdateCount > 0)
					this.notify.viewNotifyAll();
			}
		}, this));
	}

	if (this.init)
		this.updateCounter();

	if (this.init)
		BX.onCustomEvent(window, 'onImInit', [this]);
};

BX.IM.prototype.isFocus = function(context)
{
	context = typeof(context) == 'undefined'? 'dialog': context;

	if (this.messenger == null || this.messenger.popupMessenger == null || this.webrtc.callOverlay !=null && this.webrtc.callOverlayMinimize == false)
		return false;

	if (context == 'dialog')
	{
		if (!this.isScrollMax(this.messenger.popupMessengerBody, 200))
			return false;
		if (this.dialogOpen == false)
			return false;
	}
	else if (context == 'notify')
	{
		if (this.notifyOpen == false)
			return false;
	}

	if (this.quirksMode || (BX.browser.IsIE() && !BX.browser.IsIE9()))
		return true;

	return this.windowFocus;
};

BX.IM.prototype.changeFocus = function (focus)
{
	this.windowFocus = typeof(focus) == "boolean"? focus: false;
	return this.windowFocus;
};

BX.IM.prototype.isScrollMax = function(element, infelicity)
{
	if (!element) return true;
	infelicity = typeof(infelicity) == 'number'? infelicity: 0;
	return (element.scrollHeight - element.offsetHeight - infelicity <= element.scrollTop);
}

BX.IM.prototype.isScrollMin = function(element)
{
	if (!element) return false;
	return (0 == element.scrollTop);
}

BX.IM.prototype.toScrollMax = function(element)
{
	if (!element) return 0;
	return (element.scrollHeight - element.offsetHeight);
}

BX.IM.prototype.playSound = function(sound)
{
	var whiteList = {'dialtone': true};
	if (!this.enableSound && !whiteList[sound])
		return false;

	if (this.desktop.supportSound())
	{
		BXDesktopSystem.PlaySound(sound);
	}
	else
	{
		try{
			this.stopSound();
			this.audio.current = this.audio[sound];
			this.audio[sound].play();
		}
		catch(e)
		{
			this.audio.current = null
		}
	}
}

BX.IM.prototype.repeatSound = function(sound, time)
{
	clearTimeout(this.audio.timeout[sound]);
	this.playSound(sound);
	this.audio.timeout[sound] = setTimeout(BX.delegate(function(){
		this.playSound(sound);
		this.repeatSound(sound, time);
	}, this), time);
}

BX.IM.prototype.stopRepeatSound = function(sound)
{
	if (this.audio.timeout && this.audio.timeout[sound])
		clearTimeout(this.audio.timeout[sound]);

	if (!this.audio[sound])
		return false;

	this.audio[sound].pause();
	this.audio[sound].currentTime = 0;
}

BX.IM.prototype.stopSound = function(sound)
{
	if (this.audio.current)
	{
		this.audio.current.pause();
		this.audio.current.currentTime = 0;
	}
}

BX.IM.prototype.autoHide = function(e)
{
	e = e||window.event;
	if (e.which == 1)
	{
		if (!this.webrtc.callInit && this.messenger.popupMessenger != null)
			this.messenger.popupMessenger.destroy();
	}
};

BX.IM.prototype.updateCounter = function(count, type)
{
	if (type == 'MESSAGE')
		this.messageCount = count;
	else if (type == 'NOTIFY')
		this.notifyCount = count;
	else if (type == 'MAIL')
		this.mailCount = count;

	var sumCount = 0;
	if (this.notifyCount > 0)
		sumCount += parseInt(this.notifyCount);
	if (this.messageCount > 0)
		sumCount += parseInt(this.messageCount);

	if (this.desktop.ready())
	{
		var sumLabel = '';
		if (sumCount > 99)
			sumLabel = '99+';
		else if (sumCount > 0)
			sumLabel = sumCount;
		//if (sumCount > 0)
		//	this.desktop.flashIcon(false);

		var iconTitle = BX.message('IM_DESKTOP_UNREAD_EMPTY');
		if (this.notifyCount > 0 && this.messageCount > 0)
			iconTitle = BX.message('IM_DESKTOP_UNREAD_MESSAGES_NOTIFY');
		else if (this.notifyCount > 0)
			iconTitle = BX.message('IM_DESKTOP_UNREAD_NOTIFY');
		else if (this.messageCount > 0)
			iconTitle = BX.message('IM_DESKTOP_UNREAD_MESSAGES');
		else if (this.notify != null && this.notify.getCounter('**') > 0)
			iconTitle = BX.message('IM_DESKTOP_UNREAD_LF');

		this.desktop.setIconTooltip(iconTitle);
		this.desktop.setIconBadge(sumLabel, (this.messageCount > 0? true: false));
	}
	if (this.desktop.run() && this.notify != null)
	{
		var lfCounter = this.notify.getCounter('**');
		if (lfCounter > 0)
			this.desktop.linkLFCounter.innerHTML = '<span class="bx-desktop-link-count">'+(lfCounter < 100? lfCounter: '99+')+'</span>';
		else
			this.desktop.linkLFCounter.innerHTML = '';
	}
	BX.onCustomEvent(window, 'onImUpdateSumCounters', [sumCount, 'SUM']);

	if (this.userStatus != 'dnd' && !this.desktopStatus && sumCount > 0)
	{
		if (!this.desktop.ready())
			document.title = '('+sumCount+') '+this.windowTitle;

		if (this.messageCount > 0)
			BX.addClass(this.notify.panelButtonMessage, 'bx-notifier-message-new');
		else
			BX.removeClass(this.notify.panelButtonMessage, 'bx-notifier-message-new');
	}
	else
	{
		if (!this.desktop.ready())
			document.title = this.windowTitle;

		if (this.messageCount <= 0 || this.userStatus == 'dnd' || this.desktopStatus)
			BX.removeClass(this.notify.panelButtonMessage, 'bx-notifier-message-new');
	}
};

BX.IM.prototype.openNotify = function(params)
{
	setTimeout(BX.proxy(function(){
		if (this.desktop.openInDesktop())
		{
			params.onPopupClose();
			BX.onCustomEvent(window, 'onImNotifyWindowClose', []);
			location.href = "bitrix:openNotify";
		}
		else
			this.notify.openNotify();
	}, this), 200);
};

BX.IM.prototype.closeNotify = function()
{
	BX.onCustomEvent(window, 'onImNotifyWindowClose', []);
	if (this.messenger.popupMessenger != null)
		this.messenger.popupMessenger.destroy();
};

BX.IM.prototype.toggleNotify = function()
{
	if (this.isOpenNotify())
		this.closeNotify();
	else
		this.openNotify();
};

BX.IM.prototype.isOpenNotify = function()
{
	return this.notifyOpen? true: false;
};

BX.IM.prototype.openMessenger = function(userId)
{
	setTimeout(BX.proxy(function(){
		if (this.desktop.openInDesktop())
			location.href = "bitrix:openMessenger-"+userId;
		else
			this.messenger.openMessenger(userId);
	}, this), 200);
};

BX.IM.prototype.closeMessenger = function()
{
	if (this.messenger.popupMessenger != null)
		this.messenger.popupMessenger.destroy();
};

BX.IM.prototype.isOpenMessenger = function()
{
	return this.dialogOpen? true: false;
};

BX.IM.prototype.toggleMessenger = function()
{
	if (this.isOpenMessenger())
		this.closeMessenger();
	else if (this.extraOpen && !this.isOpenNotify())
		this.closeMessenger();
	else
		this.openMessenger(this.messenger.currentTab);
};

BX.IM.prototype.openHistory = function(userId)
{
	setTimeout(BX.proxy(function(){
		if (this.desktop.openInDesktop())
			location.href = "bitrix:openHistory-"+userId;
		else
			this.messenger.openHistory(userId);
	},this), 200);
};

BX.IM.prototype.openContactList = function()
{
	return false;
};

BX.IM.prototype.closeContactList = function()
{
	return false;
};

BX.IM.prototype.isOpenContactList = function()
{
	return false;
};

BX.IM.prototype.checkRevision = function(revision)
{
	revision = parseInt(revision);
	if (typeof(revision) == "number" && this.revision < revision)
	{
		if (this.desktop.run())
		{
			console.log('NOTICE: Window reload, becouse REVISION UP ('+this.revision+' -> '+revision+')');
			location.reload();
		}
		else
		{
			if (this.isOpenMessenger())
			{
				this.closeMessenger();
				this.openMessenger();
			}
			this.errorMessage = BX.message('IM_MESSENGER_OLD_REVISION');
		}
		return false;
	}
	return true;
};

BX.IM.preventDefault = function(event)
{
	event = event||window.event;

	if (event.stopPropagation)
		event.stopPropagation();
	else
		event.cancelBubble = true;

	BXIM.messenger.closeMenuPopup();
};

BX.IM.formatDate = function(timestamp)
{
	var format = [
		["tommorow", "tommorow, "+BX.message("IM_MESSAGE_FORMAT_TIME")],
		["today", "today, "+BX.message("IM_MESSAGE_FORMAT_TIME")],
		["yesterday", "yesterday, "+BX.message("IM_MESSAGE_FORMAT_TIME")],
		["", BX.date.convertBitrixFormat(BX.message("FORMAT_DATETIME"))]
	];

	return BX.date.format(format, parseInt(timestamp)+parseInt(BX.message("SERVER_TZ_OFFSET")), BX.IM.getNowDate(), true);
}

BX.IM.getNowDate = function(today)
{
	var currentDate = (new Date);
	if (today == true)
		currentDate = (new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0));

	return Math.round((+currentDate/1000))+parseInt(BX.message("SERVER_TZ_OFFSET"))+parseInt(BX.message("USER_TZ_OFFSET"));
};

BX.IM.prepareText = function(text, prepare, quote)
{
	var textElement = text;
	prepare = prepare == true? true: false;
	quote = quote == true? true: false;

	textElement = BX.util.trim(textElement);
	if (prepare)
		textElement = BX.util.htmlspecialchars(textElement);
	if (quote)
	{
		textElement = textElement.replace(/------------------------------------------------------<br \/>(.*?)\[(.*?)\]<br \/>(.*?)------------------------------------------------------(<br \/>)?/g, "<div class=\"bx-messenger-content-quote\"><span class=\"bx-messenger-content-quote-icon\"></span><div class=\"bx-messenger-content-quote-wrap\"><div class=\"bx-messenger-content-quote-name\">$1 <span class=\"bx-messenger-content-quote-time\">$2</span></div>$3</div></div>");
		textElement = textElement.replace(/------------------------------------------------------<br \/>(.*?)<br \/>------------------------------------------------------(<br \/>)?/g, "<div class=\"bx-messenger-content-quote\"><span class=\"bx-messenger-content-quote-icon\"></span><div class=\"bx-messenger-content-quote-wrap\">$1</div></div>");
	}
	if (prepare)
		textElement = textElement.replace(/\n/gi, '<br />');
	textElement = textElement.replace(/\t/gi, '&nbsp;&nbsp;&nbsp;&nbsp;');

	return textElement;
};

BX.IM.prepareTextBack = function(text)
{
	var textElement = text;

	textElement = BX.util.htmlspecialcharsback(textElement);
	textElement = textElement.replace(/<img.*?data-code="([^"]*)".*?>/ig, '$1');
	textElement = textElement.replace(/<a.*?href="([^"]*)".*?>.*?<\/a>/ig, '$1');
	textElement = textElement.replace(/------------------------------------------------------(.*?)------------------------------------------------------/gmi, "["+BX.message("IM_MESSENGER_QUOTE_BLOCK")+"]");
	textElement = textElement.split('&nbsp;&nbsp;&nbsp;&nbsp;').join("\t");
	textElement = textElement.split('<br />').join("\n");//.replace(/<\/?[^>]+>/gi, '');

	return textElement;
};

BX.IM.prototype.getLocalConfig = function(name, def)
{
	def = typeof(def) == 'undefined'? null: def;
	var result = '';

	if (this.desktop.ready())
	{
		if (this.desktop.enableInVersion(9))
			result = BXDesktopSystem.QuerySettings(name, def+'');
		else
			return def;
	}
	else if (!BX.browser.SupportLocalStorage())
	{
		return def;
	}
	else
	{
		result = BX.localStorage.get(name);
		if (result == null)
			return def;
	}

	if (typeof(result) == 'string' && result.length > 0)
	{
		try {
			result = JSON.parse(result);
		}
		catch(e) { result = def; }
	}

	return result;
};

BX.IM.prototype.setLocalConfig = function(name, value)
{
	if (typeof(value) == 'object')
		value = JSON.stringify(value);
	else if (typeof(value) == 'boolean')
		value = value? 'true': 'false';
	else if (typeof(value) == 'undefined')
		value = '';
	else if (typeof(value) != 'string')
		value = value+'';

	if (this.desktop.ready())
	{
		if (this.desktop.enableInVersion(9))
			BXDesktopSystem.StoreSettings(name, value);
		else
			return false;
	}
	else if (!BX.browser.SupportLocalStorage())
		return false;
	else
		BX.localStorage.set(name, value, 86400);

	return true;
};

BX.IM.prototype.removeLocalConfig = function(name)
{
	if (this.desktop.ready())
	{
		if (this.desktop.enableInVersion(9))
			BXDesktopSystem.StoreSettings(name, null);
		else
			return false;
	}
	else if (!BX.browser.SupportLocalStorage())
		return false;
	else
		BX.localStorage.remove(name);

	return true;
};

BX.IM.prototype.storageSet = function(params)
{
};
})();


/* IM notify class */

(function() {

if (BX.Notify)
	return;

BX.Notify = function(BXIM, params)
{
	this.BXIM = BXIM;
	this.settings = {};
	this.params = params || {};
	this.windowInnerSize = {};
	this.windowScrollPos = {};
	this.sendAjaxTry = 0;

	this.webrtc = params.webrtcClass;
	this.desktop = params.desktopClass;

	this.panel = params.domNode;
	if (this.desktop.run())
		BX.hide(this.panel);

	BX.bind(this.panel, "click", BX.IM.preventDefault);

	this.settings.panelPosition = {};
	this.settings.panelPosition.horizontal = this.params.panelPosition.horizontal || 'right';
	this.settings.panelPosition.vertical = this.params.panelPosition.vertical || 'bottom';

	this.notifyCount = params.countNotify;
	this.notifyUpdateCount = params.countNotify;
	this.counters = params.counters;
	this.mailCount = params.mailCount;

	this.notifyHistoryPage = 1;
	this.notifyHistoryLoad = false;

	this.notify = params.notify;
	this.unreadNotify = params.unreadNotify;
	this.unreadNotifyLoad = params.loadNotify;
	this.flashNotify = params.flashNotify;
	this.initNotifyCount = params.countNotify;
	this.confirmDisabledButtons = false;

	if (this.unreadNotifyLoad)
	{
		for (var i in this.notify)
			this.initNotifyCount--;
	}

	if (BX.browser.IsDoctype())
		BX.addClass(this.panel, 'bx-notifier-panel-doc');

	this.panelButtonNotify = BX.findChild(this.panel, {className : "bx-notifier-notify"}, true);
	this.panelButtonNotifyCount = BX.findChild(this.panelButtonNotify, {className : "bx-notifier-indicator-count"}, true);
	if (this.panelButtonNotifyCount != null)
		this.panelButtonNotifyCount.innerHTML = '';

	this.panelButtonMessage = BX.findChild(this.panel, {className : "bx-notifier-message"}, true);
	this.panelButtonMessageCount = BX.findChild(this.panelButtonMessage, {className : "bx-notifier-indicator-count"}, true);
	if (this.panelButtonMessageCount != null)
		this.panelButtonMessageCount.innerHTML = '';

	this.panelButtonMail = BX.findChild(this.panel, {className : "bx-notifier-mail"}, true);
	if (this.panelButtonMail != null)
	{
		this.panelButtonMailCount = BX.findChild(this.panelButtonMail, {className : "bx-notifier-indicator-count"}, true);
		this.panelButtonMail.href = this.BXIM.path.mail;
		this.panelButtonMailCount.innerHTML = '';
	}

	this.panelDragLabel = BX.findChild(this.panel, {className : "bx-notifier-drag"}, true);

	this.messenger = null;
	this.messengerNotifyButton = null;
	this.messengerNotifyButtonCount = null;

	/* full window notify */
	this.popupNotifyItem = null;
	this.popupNotifySize = 383;

	this.popupNotifyButtonFilter = null;
	this.popupNotifyButtonFilterBox = null;
	this.popupHistoryFilterVisible = false;
	/* more users from notify */
	this.popupNotifyMore = null;
	this.popupConfirm = null;

	this.dragged = false;
	this.dragPageX = 0;
	this.dragPageY = 0;

	if (this.BXIM.init)
	{
		// audio
		if (this.desktop.supportSound())
		{
			BXDesktopSystem.BindSound("reminder", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/reminder.ogg");
		}
		else
		{
			this.panel.appendChild(this.BXIM.audio.reminder = BX.create("audio", { props : { className : "bx-notify-audio" }, children : [
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/reminder.ogg", type : "audio/ogg; codecs=vorbis" }}),
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/reminder.mp3", type : "audio/mpeg" }})
			]}));
			if (typeof(this.BXIM.audio.reminder.play) == 'undefined')
			{
				this.BXIM.enableSound = false;
				this.BXIM.audioSupport = false;
			}
		}
		if (BX.browser.SupportLocalStorage())
		{
			BX.addCustomEvent(window, "onLocalStorageSet", BX.proxy(this.storageSet, this));
			var panelPosition = BX.localStorage.get('npp');
			this.settings.panelPosition.horizontal = !!panelPosition? panelPosition.h: this.settings.panelPosition.horizontal;
			this.settings.panelPosition.vertical = !!panelPosition? panelPosition.v: this.settings.panelPosition.vertical;

			var mfn = BX.localStorage.get('mfn');
			if (mfn)
			{
				for (var i in this.flashNotify)
					if (this.flashNotify[i] != mfn[i] && mfn[i] == false)
						this.flashNotify[i] = false;
			}

			BX.garbage(function(){
				BX.localStorage.set('mfn', this.flashNotify, 15);
			}, this);
		}

		BX.bind(this.panelButtonNotify, "click", BX.proxy(function(){
			this.toggleNotify()
		}, this.BXIM));
		BX.bind(this.panelDragLabel, "mousedown", BX.proxy(this._startDrag, this));

		this.updateNotifyMailCount();

		if (!this.desktop.run())
		{
			this.adjustPosition({resize: true});
			BX.bind(window, "resize", BX.proxy(function(){
				this.closePopup();
				this.adjustPosition({resize: true});
			}, this));
			if (!BX.browser.IsDoctype())
				BX.bind(window, "scroll", BX.proxy(function(){ this.adjustPosition({scroll: true});}, this));
		}
		setTimeout(BX.delegate(function(){
			this.newNotify();
			this.updateNotifyCounters();
			this.updateNotifyCount();
		}, this), 500);

		this.setStatus(this.BXIM.userStatus, false);
	}

	BX.addCustomEvent(window, "onSonetLogCounterClear", BX.proxy(function(counter){
		var sendObject = {};
		sendObject[counter] = 0;
		this.updateNotifyCounters(sendObject);
	}, this));
};

BX.Notify.prototype.openConfirm = function(text, buttons, modal)
{
	if (this.popupConfirm != null)
		this.popupConfirm.destroy();

	modal = modal === true? true: false;
	buttons = typeof(buttons) == "object"? buttons : false;
	this.popupConfirm = new BX.PopupWindow('bx-notifier-popup-menu', null, {
		zIndex: 200,
		autoHide: buttons === false? true: false,
		buttons : buttons,
		closeByEsc: buttons === false? true: false,
		overlay : modal,
		events : { onPopupClose : function() { this.destroy() }},
		content : BX.create("div", { props : { className : "bx-notifier-confirm" }, html: text})
	});
	this.popupConfirm.show();
	BX.bind(this.popupConfirm.popupContainer, "click", BX.IM.preventDefault);

};

BX.Notify.prototype.getCounter = function(type)
{
	if (typeof(type) != 'string')
		return false;

	type = type.toString();

	if (type == 'im_notify')
		return this.notifyCount;
	if (type == 'im_message')
		return this.BXIM.messageCount;

	return this.counters[type]? this.counters[type]: 0;
}

BX.Notify.prototype.updateNotifyCounters = function(arCounter, send)
{
	send = send == false? false: true;
	if (typeof(arCounter) == "object")
	{
		for (var i in arCounter)
			this.counters[i] = arCounter[i];
	}
	BX.onCustomEvent(window, 'onImUpdateCounter', [this.counters]);
	if (send)
		BX.localStorage.set('nuc', this.counters, 5);
}

BX.Notify.prototype.updateNotifyMailCount = function(count, send)
{
	send = send == false? false: true;

	if (typeof(count) != "undefined" || parseInt(count)>0)
		this.mailCount = parseInt(count);

	if (this.mailCount > 0)
		BX.removeClass(this.panelButtonMail, 'bx-notifier-hide');
	else
		BX.addClass(this.panelButtonMail, 'bx-notifier-hide');

	var mailCountLabel = '';
	if (this.mailCount > 99)
		mailCountLabel = '99+';
	else if (this.mailCount > 0)
		mailCountLabel = this.mailCount;

	if (this.panelButtonMailCount != null)
	{
		this.panelButtonMailCount.innerHTML = mailCountLabel;
		this.adjustPosition({"resize": true, "timeout": 500});
	}

	BX.onCustomEvent(window, 'onImUpdateCounterMail', [this.mailCount, 'MAIL']);

	if (send)
		BX.localStorage.set('numc', this.mailCount, 5);
}

BX.Notify.prototype.updateNotifyCount = function(send)
{
	send = send == false? false: true;

	var count = 0;
	var updateCount = 0;
	var arGroupNotify = {};

	if (this.unreadNotifyLoad)
		count = this.initNotifyCount;

	for (var i in this.unreadNotify)
	{
		if (this.unreadNotify[i] == null)
			continue;

		var notify = this.notify[this.unreadNotify[i]];
		if (!notify)
			continue;

		if (notify.type != 1)
			updateCount++;

		if (notify.tag != '')
		{
			if (!arGroupNotify[notify.tag])
			{
				arGroupNotify[notify.tag] = [notify.id];
				count++;
			}
		}
		else
			count++;
	}

	var notifyCountLabel = '';
	if (count > 99)
		notifyCountLabel = '99+';
	else if (count > 0)
		notifyCountLabel = count;

	if (this.panelButtonNotifyCount != null)
	{
		this.panelButtonNotifyCount.innerHTML = notifyCountLabel;
		this.adjustPosition({"resize": true, "timeout": 500});
	}
	if (this.messengerNotifyButtonCount != null)
		this.messengerNotifyButtonCount.innerHTML = parseInt(notifyCountLabel)>0? '<span class="bx-messenger-cl-count-digit">'+notifyCountLabel+'</span>':'';

	this.notifyCount = parseInt(count);
	this.notifyUpdateCount = parseInt(updateCount);

	BX.onCustomEvent(window, 'onImUpdateCounterNotify', [this.notifyCount, 'NOTIFY']);

	if (send)
		BX.localStorage.set('nunc', {'unread': this.unreadNotify, 'flash': this.flashNotify}, 5);
}

BX.Notify.prototype.changeUnreadNotify = function(unreadNotify, send)
{
	send = send == false? false: true;
	var redraw = false;
	for (var i in unreadNotify)
	{
		if (this.BXIM.userStatus != 'dnd' && !this.unreadNotify[unreadNotify[i]] && typeof(this.flashNotify[unreadNotify[i]]) == 'undefined')
			this.flashNotify[unreadNotify[i]] = true;

		this.unreadNotify[unreadNotify[i]] = unreadNotify[i];
		redraw = true;
	}

	if (this.BXIM.userStatus != 'dnd')
		this.newNotify(send);

	if (redraw && this.BXIM.notifyOpen)
		this.openNotify(true);

	this.updateNotifyCount(send);
}

BX.Notify.prototype.viewNotify = function(id)
{
	if (parseInt(id) <= 0)
		return false;

	var notify = this.notify[id];
	if (notify && notify.type != 1)
		delete this.unreadNotify[id];

	delete this.flashNotify[id];

	BX.localStorage.set('mfn', this.flashNotify, 80);

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 60,
		data: {'IM_NOTIFY_VIEW' : 'Y', 'ID' : parseInt(id), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
	});

	if (this.BXIM.notifyOpen)
	{
		var elements = BX.findChildren(this.popupNotifyItem, {className : "bx-notifier-item-new"}, false);
		if (elements != null)
			for (var i = 0; i < elements.length; i++)
				BX.removeClass(elements[i], 'bx-notifier-item-new');
	}

	this.updateNotifyCount(false);

	return true;
}


BX.Notify.prototype.viewNotifyAll = function()
{
	var id = 0;
	for (var i in this.unreadNotify)
	{
		var notify = this.notify[i];
		if (notify && notify.type != 1)
			delete this.unreadNotify[i];

		delete this.flashNotify[i];
		id = id < i? i: id;
	}

	if (parseInt(id) <= 0)
		return false;

	BX.localStorage.set('mfn', this.flashNotify, 80);

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 60,
		data: {'IM_NOTIFY_VIEWED' : 'Y', 'MAX_ID' : parseInt(id), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
	});

	if (this.BXIM.notifyOpen)
	{
		var elements = BX.findChildren(this.popupNotifyItem, {className : "bx-notifier-item-new"}, false);
		if (elements != null)
			for (var i = 0; i < elements.length; i++)
				if (elements[i].getAttribute('data-notifyType') != 1)
					BX.removeClass(elements[i], 'bx-notifier-item-new');
	}

	this.updateNotifyCount(false);

	return true;
}

BX.Notify.prototype.newNotify = function(send)
{
	send = send == false? false: true;

	var arNotify = [];
	var arNotifySort = [];
	for (var i in this.flashNotify)
	{
		if (this.flashNotify[i] === true)
		{
			arNotifySort.push(parseInt(i));
			this.flashNotify[i] = false;
		}
	}
	arNotifySort.sort(BX.delegate(function(i, ii) {if (!this.notify[i] || !this.notify[ii]){return 0;} ii = parseInt(this.notify[ii].date); i = parseInt(this.notify[i].date); if (i > ii) { return -1; } else if (i < ii) { return 1;}else{ return 0;}}, this));
	for (var i = 0; i < arNotifySort.length; i++)
	{
		var notify = this.createNotify(this.notify[arNotifySort[i]], true);
		if (notify !== false)
			arNotify.push(notify);
	}
	if (arNotify.length == 0)
		return false;

	this.desktop.flashIcon(false);

	this.closePopup();

	if (!(!this.desktop.ready() && this.desktop.run()) && (this.BXIM.userStatus == 'dnd' || !this.desktop.ready() && this.BXIM.desktopStatus))
		return false;

	if (send && !this.BXIM.xmppStatus)
		this.BXIM.playSound("reminder");

	if (send && this.desktop.ready())
	{
		for (var i = 0; i < arNotify.length; i++)
		{
			var dataNotifyId = arNotify[i].getAttribute("data-notifyId");
			var messsageJs =
				'var notify = BX.findChild(document.body, {className : "bx-notifier-item"}, true);'+
				'BX.bind(BX.findChild(notify, {className : "bx-notifier-item-delete"}, true), "click", function(event){ if (this.getAttribute("data-notifyType") != 1) { BXIM.desktop.onCustomEvent("bxImClickCloseNotify", [this.getAttribute("data-notifyId")]); } BXIM.desktop.windowCommand("hide"); BX.IM.preventDefault(event); });'+
				'BX.bindDelegate(notify, "click", {className: "bx-notifier-item-button"}, BX.delegate(function(){ '+
					'BXIM.desktop.windowCommand("freeze");'+
					'notifyId = BX.proxy_context.getAttribute("data-id");'+
					'BXIM.notify.confirmRequest({'+
						'"notifyId": notifyId,'+
						'"notifyValue": BX.proxy_context.getAttribute("data-value"),'+
						'"notifyURL": BX.proxy_context.getAttribute("data-url"),'+
						'"notifyTag": BXIM.notify.notify[notifyId] && BXIM.notify.notify[notifyId].tag? BXIM.notify.notify[notifyId].tag: null,'+
						'"groupDelete": BX.proxy_context.getAttribute("data-group") == null? false: true,'+
					'}, true);'+
					'BXIM.desktop.onCustomEvent("bxImClickConfirmNotify", [notifyId]); '+
				'}, BXIM.notify));'+
				'BX.bind(notify, "contextmenu", function(){ BXIM.desktop.windowCommand("hide")});';
			this.desktop.openNewNotify(dataNotifyId, arNotify[i], messsageJs);
		}
	}
	else
	{
		for (var i = 0; i < arNotify.length; i++)
		{
			this.BXIM.notifyManager.add({
				'html': arNotify[i],
				'tag': 'im-notify-'+this.notify[arNotify[i].getAttribute("data-notifyId")].tag,
				'notifyId': arNotify[i].getAttribute("data-notifyId"),
				'notifyType': arNotify[i].getAttribute("data-notifyType"),
				'close': BX.delegate(function(popup) {
					if (popup.notifyParams.notifyType != 1)
						this.viewNotify(popup.notifyParams.notifyId);
				}, this)
			});
		}
	}
	return true;
};

BX.Notify.prototype.confirmRequest = function(params, popup)
{
	if (this.confirmDisabledButtons)
		return false;

	popup = popup == true? true: false;

	params.notifyOriginTag = this.notify[params.notifyId]? this.notify[params.notifyId].original_tag: '';

	if (params.groupDelete && params.notifyTag != null)
	{
		for (var i in this.notify)
		{
			if (this.notify[i].tag == params.notifyTag)
				delete this.notify[i];
		}
	}
	else
		delete this.notify[params.notifyId]

	this.updateNotifyCount();

	if (popup)
		BXIM.desktop.windowCommand("freeze");
	else
		BX.hide(BX.proxy_context.parentNode.parentNode.parentNode);

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 30,
		data: {'IM_NOTIFY_CONFIRM' : 'Y', 'NOTIFY_ID' : params.notifyId, 'NOTIFY_VALUE' : params.notifyValue, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function() {
			if (params.notifyURL != null)
			{
				if (popup && this.desktop.ready())
					this.desktop.browse(params.notifyURL);
				else
					location.href = params.notifyURL;

				this.confirmDisabledButtons = true;
			}
			if (popup)
				this.desktop.windowCommand("hide");

			BX.onCustomEvent(window, 'onImConfirmNotify', [{'NOTIFY_ID' : params.notifyId, 'NOTIFY_TAG' : params.notifyOriginTag, 'NOTIFY_VALUE' : params.notifyValue}]);
		}, this),
		onfailure: BX.delegate(function() {this.desktop.windowCommand("hide");}, this)
	});

	if (params.groupDelete)
		BX.localStorage.set('nrgn', params.notifyTag, 5);
	else
		BX.localStorage.set('nrn', params.notifyId, 5);

	return false;
}

BX.Notify.prototype.prepareNotify = function(arItemsNotify)
{

	var loadMore = typeof(arItemsNotify) == 'object'? true: false;
	var itemsNotify = typeof(arItemsNotify) == 'object'? arItemsNotify: BX.clone(this.notify);

	var arGroupNotify = {};
	var arGroupNotifyUser = {};
	var sortByType = false;
	for (var i in itemsNotify)
	{
		if (itemsNotify[i].type == 1)
			sortByType = true;
		if (itemsNotify[i].tag != '')
		{
			if (!arGroupNotifyUser[itemsNotify[i].tag] || !arGroupNotifyUser[itemsNotify[i].tag][itemsNotify[i].userId])
			{
				if (!arGroupNotifyUser[itemsNotify[i].tag])
					arGroupNotifyUser[itemsNotify[i].tag] = {};

				if (!arGroupNotifyUser[itemsNotify[i].tag][itemsNotify[i].userId])
					arGroupNotifyUser[itemsNotify[i].tag][itemsNotify[i].userId] = true;

				if (arGroupNotify[itemsNotify[i].tag])
					arGroupNotify[itemsNotify[i].tag].push(itemsNotify[i].id);
				else
					arGroupNotify[itemsNotify[i].tag] = [itemsNotify[i].id];
			}
			else
			{
				if (itemsNotify[arGroupNotify[itemsNotify[i].tag]] && itemsNotify[arGroupNotify[itemsNotify[i].tag]].date < itemsNotify[i].date)
					itemsNotify[arGroupNotify[itemsNotify[i].tag]].date = itemsNotify[i].date;
				delete itemsNotify[i];
			}
		}
	}

	var arNotify = [];
	var arNotifySort = [];
	for (var i in itemsNotify)
		arNotifySort.push(parseInt(i));

	arNotifySort.sort(BX.delegate(function(i, ii) {if (!itemsNotify[i] || !itemsNotify[ii]){return 0;} ii = parseInt(itemsNotify[ii].date); i = parseInt(itemsNotify[i].date); if (i > ii) { return -1; } else if (i < ii) { return 1;}else{ return 0;}}, this));
	for (var i = 0; i < arNotifySort.length; i++)
	{
		var notify = itemsNotify[arNotifySort[i]];
		if (notify.type != 1)
			continue;
		if (arGroupNotify[notify.tag] === false)
			continue;

		if (arGroupNotify[notify.tag] && arGroupNotify[notify.tag].length>1)
		{
			notify.grouped = true;
			arGroupNotify[notify.tag] = false;
		}
		notify = this.createNotify(notify);
		if (notify !== false)
			arNotify.push(notify);
	}
	for (var i = 0; i < arNotifySort.length; i++)
	{
		var notify = itemsNotify[arNotifySort[i]];
		if (notify.type == 1)
			continue;
		if (arGroupNotify[notify.tag] === false)
			continue;

		if (arGroupNotify[notify.tag] && arGroupNotify[notify.tag].length>1)
		{
			if (notify.type == 2)
				notify.type = 3;

			notify.grouped = true;
			notify.otherCount = 0;

			if (this.notify[notify.id])
			{
				this.notify[notify.id].otherItems = [];
				for (var j = 0; j < arGroupNotify[notify.tag].length; j++)
				{
					if (notify.id !== arGroupNotify[notify.tag][j])
						this.notify[notify.id].otherItems.push(itemsNotify[arGroupNotify[notify.tag][j]].id);
				}
				notify.otherCount = this.notify[notify.id].otherItems.length;
			}
			arGroupNotify[notify.tag] = false;
		}
		notify = this.createNotify(notify);
		if (notify !== false)
			arNotify.push(notify);
	}
	if (!loadMore && arNotify.length == 0)
	{
		if (this.unreadNotifyLoad)
		{
			element = BX.create("div", {props : { className: "bx-notifier-content-load", id : "bx-notifier-content-load"}, children : [
				BX.create("div", {props : { className: "bx-notifier-content-load-block bx-notifier-item"}, children : [
					BX.create('span', { props : { className : "bx-notifier-content-load-block-img" }}),
					BX.create('span', {props : { className : "bx-notifier-content-load-block-text"}, html: BX.message('IM_NOTIFY_LOAD_NOTIFY')})
				]})
			]});
		}
		else
		{
			element = BX.create("div", { attrs : { style : "padding-top: 248px; margin-bottom: 31px;"}, props : { className : "bx-messenger-box-empty bx-notifier-content-empty", id : "bx-notifier-content-empty"}, html: BX.message('IM_NOTIFY_EMPTY_2')})
		}
		arNotify.push(element);
	}
	else if (loadMore && arNotify.length == 0)
	{
		return arNotify;
	}

	if (!this.unreadNotifyLoad)
	{
		arNotify.push(
			BX.create('a', { attrs : { href : "#notifyHistory", id : "bx-notifier-content-link-history"}, props : { className : "bx-notifier-content-link-history bx-notifier-content-link-history-empty" }, children: [
				BX.create('span', {props : { className : "bx-notifier-item-button bx-notifier-item-button-white" }, html: '<i class="bx-notifier-item-button-fc"></i><span>'+BX.message('IM_NOTIFY_HISTORY')+'</span><i></i>'})
			]})
		);
	}

	return arNotify;
}

BX.Notify.prototype.openNotify = function(reOpen, force)
{
	reOpen = reOpen == true? true: false;
	force = force == true? true: false;

	if (this.messenger.popupMessenger == null)
		this.messenger.openMessenger(false);

	if (this.BXIM.notifyOpen && !force)
	{
		if (!reOpen)
		{
			this.messenger.extraClose(true);
			return false;
		}
	}
	else
	{
		this.BXIM.dialogOpen = false;
		this.BXIM.notifyOpen = true;
		this.messengerNotifyButton.className = "bx-messenger-cl-notify-button bx-messenger-cl-notify-button-active";
	}

	this.webrtc.callOverlayToggleSize(true);

	var arNotify = this.prepareNotify();
	var notifyDom = BX.create("div", { props : { className : "bx-notifier-wrap" }, children : [
		BX.create("div", { props : { className : "bx-messenger-panel" }, children : [
			BX.create('a', { attrs : { href : this.BXIM.userParams.profile}, props : { className : "bx-messenger-panel-avatar bx-messenger-avatar-notify"}}),
			//this.popupNotifyButtonFilter = BX.create("a", { props : { className : "bx-messenger-panel-filter bx-messenger-panel-filter-middle"}, html: (this.popupNotifyFilterVisible? BX.message("IM_PANEL_FILTER_OFF"):BX.message("IM_PANEL_FILTER_ON"))}),
			BX.create("span", { props : { className : "bx-messenger-panel-title bx-messenger-panel-title-middle"}, html: BX.message('IM_NOTIFY_WINDOW_TITLE')})
		]}),
		this.popupNotifyButtonFilterBox = BX.create("div", { props : { className : "bx-messenger-panel-filter-box" }, style : {display: this.popupNotifyFilterVisible? 'block': 'none'}, children : [
			BX.create('div', {props : { className : "bx-messenger-filter-name" }, html: BX.message('IM_PANEL_FILTER_NAME')}),
			BX.create('div', {props : { className : "bx-messenger-filter-date bx-messenger-input-wrap" }, html: '<input type="text" class="bx-messenger-input" value="" placeholder="'+BX.message('IM_PANEL_FILTER_DATE')+'" />'}),
			BX.create('div', {props : { className : "bx-messenger-filter-text bx-messenger-input-wrap" }, html: '<input type="text" class="bx-messenger-input" value="" />'})
		]}),
		this.popupNotifyItem = BX.create("div", { props : { className : "bx-notifier-item-wrap" }, style : {height: this.popupNotifySize+'px'}, children : arNotify})
	]});
	this.messenger.extraOpen(notifyDom);

	if (!reOpen && this.BXIM.isFocus('notify'))
	{
		if (this.unreadNotifyLoad)
			this.loadNotify();
		else if (this.notifyUpdateCount > 0)
			this.viewNotifyAll();
	}

	BX.bind(this.popupNotifyButtonFilter, "click",  BX.delegate(function(){
		if (this.popupNotifyFilterVisible)
		{
			this.popupNotifyButtonFilter.innerHTML = BX.message("IM_PANEL_FILTER_ON");
			this.popupNotifySize = this.popupNotifySize+this.popupNotifyButtonFilterBox.offsetHeight;
			this.popupNotifyItem.style.height = this.popupNotifySize+'px';
			BX.style(this.popupNotifyButtonFilterBox, 'display', 'none');
			this.popupNotifyFilterVisible = false;
		}
		else
		{
			this.popupNotifyButtonFilter.innerHTML = BX.message("IM_PANEL_FILTER_OFF");
			BX.style(this.popupNotifyButtonFilterBox, 'display', 'block');
			this.popupNotifySize = this.popupNotifySize-this.popupNotifyButtonFilterBox.offsetHeight;
			this.popupNotifyItem.style.height = this.popupNotifySize+'px';
			this.popupNotifyFilterVisible = true;
		}
	}, this));

	BX.bind(BX('bx-notifier-content-link-history'), "click", BX.delegate(this.notifyHistory, this));

	BX.bind(this.popupNotifyItem, "click", BX.delegate(this.closePopup, this));

	BX.bindDelegate(this.popupNotifyItem, 'click', {className: 'bx-notifier-item-help'}, BX.proxy(function(e) {
		if (this.popupNotifyMore != null)
			this.popupNotifyMore.destroy();
		else
		{
			var notifyHelp = this.notify[BX.proxy_context.getAttribute('data-help')];
			if (!notifyHelp.otherItems)
				return false;

			var htmlElement = '<span class="bx-notifier-item-help-popup">';
				for (var i = 0; i < notifyHelp.otherItems.length; i++)
					htmlElement += '<a class="bx-notifier-item-help-popup-img" href="'+this.notify[notifyHelp.otherItems[i]].userLink+'" target="_blank"><span class="bx-notifier-popup-avatar"><img class="bx-notifier-popup-avatar-img" src="'+this.notify[notifyHelp.otherItems[i]].userAvatar+'"></span><span class="bx-notifier-item-help-popup-name">'+BX.IM.prepareText(this.notify[notifyHelp.otherItems[i]].userName)+'</span></a>';
			htmlElement += '</span>';

			this.popupNotifyMore = new BX.PopupWindow('bx-notifier-other-window', BX.proxy_context, {
				zIndex: 200,
				lightShadow : true,
				offsetTop: -2,
				offsetLeft: 3,
				autoHide: true,
				closeByEsc: true,
				bindOptions: {position: "top"},
				events : {
					onPopupClose : function() { this.destroy() },
					onPopupDestroy : BX.proxy(function() { this.popupNotifyMore = null; }, this)
				},
				content : BX.create("div", { props : { className : "bx-notifier-popup-menu" }, children: [
					BX.create("div", { props : { className : " " }, html: htmlElement})
				]})
			});
			this.popupNotifyMore.setAngle({});
			this.popupNotifyMore.show();
			BX.bind(this.popupNotifyMore.popupContainer, "click", BX.IM.preventDefault);
		}

		return BX.PreventDefault(e);
	}, this));

	// click to delete circle
	BX.bindDelegate(this.popupNotifyItem, 'click', {className: 'bx-notifier-item-delete'}, BX.proxy(function(e) {
		if (!BX.proxy_context) return;
		var notifyId = BX.proxy_context.getAttribute('data-notifyId');
		var sendRequest = false;
		if (this.notify[notifyId])
		{
			sendRequest = true;
			var notifyTag = null;
			if (this.notify[notifyId].tag)
				notifyTag = this.notify[notifyId].tag;

			var groupDelete = BX.proxy_context.getAttribute('data-group') == null || notifyTag == null? false: true;
			if (groupDelete)
			{
				for (var i in this.notify)
				{
					if (this.notify[i].tag == notifyTag)
						delete this.notify[i];
				}
			}
			else
				delete this.notify[notifyId];
		}
		this.updateNotifyCount();

		if (sendRequest)
		{
			var DATA = {};
			if (groupDelete)
				DATA = {'IM_NOTIFY_GROUP_REMOVE' : 'Y', 'NOTIFY_ID' : notifyId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()};
			else
				DATA = {'IM_NOTIFY_REMOVE' : 'Y', 'NOTIFY_ID' : notifyId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()};

			BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				timeout: 30,
				data: DATA
			});

			if (groupDelete)
				BX.localStorage.set('nrgn', notifyTag, 5);
			else
				BX.localStorage.set('nrn', notifyId, 5);
		}

		if (BX.proxy_context.parentNode.parentNode.previousSibling == null && BX.proxy_context.parentNode.parentNode.nextSibling == null)
			this.openNotify(true);
		else if (BX.proxy_context.parentNode.parentNode.previousSibling == null && BX.proxy_context.parentNode.parentNode.nextSibling.tagName.toUpperCase() == 'A')
			this.openNotify(true);
		else
			BX.remove(BX.proxy_context.parentNode.parentNode);

		return BX.PreventDefault(e);
	}, this));

	// click to button from notify item
	BX.bindDelegate(this.popupNotifyItem, 'click', {className: 'bx-notifier-item-button'}, BX.proxy(function(e) {
		var notifyId = BX.proxy_context.getAttribute('data-id');
		this.confirmRequest({
			'notifyId': notifyId,
			'notifyValue': BX.proxy_context.getAttribute('data-value'),
			'notifyURL': BX.proxy_context.getAttribute('data-url'),
			'notifyTag': this.notify[notifyId] && this.notify[notifyId].tag? this.notify[notifyId].tag: null,
			'groupDelete': BX.proxy_context.getAttribute('data-group') == null? false: true
		});
		if (BX.proxy_context.parentNode.parentNode.parentNode.previousSibling == null && BX.proxy_context.parentNode.parentNode.parentNode.nextSibling == null)
			this.openNotify(true);
		else if (BX.proxy_context.parentNode.parentNode.parentNode.previousSibling == null && BX.proxy_context.parentNode.parentNode.parentNode.nextSibling.tagName.toUpperCase() == 'A')
			this.openNotify(true);
		else
			BX.remove(BX.proxy_context.parentNode.parentNode.parentNode);

		return BX.PreventDefault(e);
	}, this));

	return false;
};

BX.Notify.prototype.closeNotify = function()
{
	this.messengerNotifyButton.className = "bx-messenger-cl-notify-button";
	this.BXIM.notifyOpen = false;
	this.popupNotifyItem = null;
	BX.unbindAll(this.popupNotifyButtonFilter);
	BX.unbindAll(this.popupNotifyItem);
}

BX.Notify.prototype.loadNotify = function(send)
{
	send = send == false? false: true;

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		lsId: 'IM_NOTIFY_LOAD',
		lsTimeout: 5,
		timeout: 30,
		data: {'IM_NOTIFY_LOAD' : 'Y', 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data) {
			this.unreadNotifyLoad = false;
			var arNotify = {};
			if (typeof(data.NOTIFY) == 'object')
			{
				for (var i in data.NOTIFY)
				{
					data.NOTIFY[i].date = parseInt(data.NOTIFY[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
					arNotify[i] = this.notify[i] = data.NOTIFY[i];
					this.BXIM.lastRecordId = parseInt(i) > this.BXIM.lastRecordId? parseInt(i): this.BXIM.lastRecordId;
					if (data.NOTIFY[i].type != 1)
						delete this.unreadNotify[i];
					else
						this.unreadNotify[i] = i;
				}
			}
			if (send)
			{
				this.openNotify(true);
				BX.localStorage.set('nln', true, 5);
			}

			this.updateNotifyCount();

		}, this),
		onfailure: function(data){}
	});

}

BX.Notify.prototype.notifyHistory = function(event)
{
	event = event || window.event;

	if (this.notifyHistoryLoad)
		return false;

	var linkHistoryText = BX.findChild(BX('bx-notifier-content-link-history').firstChild, {tagName : "span"}, true);
	linkHistoryText.innerHTML = BX.message('IM_NOTIFY_LOAD_NOTIFY')+'...';

	this.notifyHistoryLoad = true;
	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 30,
		data: {'IM_NOTIFY_HISTORY_LOAD_MORE' : 'Y', 'PAGE' : this.notifyHistoryPage, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data)
		{
			if (data.ERROR == '')
			{
				this.sendAjaxTry = 0;
				var arNotify = {};
				var count = 0;
				if (typeof(data.NOTIFY) == 'object')
				{
					for (var i in data.NOTIFY)
					{
						data.NOTIFY[i].date = parseInt(data.NOTIFY[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
						if (!this.notify[i])
							arNotify[i] = data.NOTIFY[i];

						if (!this.notify[i])
						{
							this.notify[i] = BX.clone(data.NOTIFY[i]);
						}
						count++;
					}
				}
				if (BX('bx-notifier-content-link-history'))
					BX.remove(BX('bx-notifier-content-link-history'));

				if (count > 0)
				{
					if (BX('bx-notifier-content-empty'))
						BX.remove(BX('bx-notifier-content-empty'));

					var arNotify = this.prepareNotify(arNotify);
					for (var i = 0; i < arNotify.length; i++) {
						this.popupNotifyItem.appendChild(arNotify[i]);
					}
					if (count < 20)
					{
						BX.remove(BX('bx-notifier-content-link-history'));
					}
					else
					{
						BX('bx-notifier-content-link-history').className = "bx-notifier-content-link-history";
						var linkHistoryText = BX.findChild(BX('bx-notifier-content-link-history').firstChild, {tagName : "span"}, true);
						linkHistoryText.innerHTML = BX.message('IM_NOTIFY_HISTORY_MORE');
						BX.bind(BX('bx-notifier-content-link-history'), "click", BX.delegate(this.notifyHistory, this));
					}
				}
				this.notifyHistoryLoad = false;
				this.notifyHistoryPage++;
			}
			else
			{
				if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					BX.message({'bitrix_sessid': data.BITRIX_SESSID});
					setTimeout(BX.delegate(function(){
						this.notifyHistoryLoad = false;
						this.notifyHistory();
					}, this), 1000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
				}
				else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					setTimeout(BX.delegate(function(){
						this.notifyHistoryLoad = false;
						this.notifyHistory();
					}, this), 2000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR]);
				}
			}
		}, this),
		onfailure: BX.delegate(function(){
			this.notifyHistoryLoad = false;
			this.sendAjaxTry = 0;
		}, this)
	});

	return BX.PreventDefault(event);
}

BX.Notify.prototype.setStatus = function(status, send)
{
	send = send == false? false: true;
	if (this.BXIM.userStatus != status)
	{
		this.BXIM.userStatus = status;

		this.updateCounter();

		if (send)
		{
			BX.userOptions.save('IM', 'settings', 'status', status);
			BX.onCustomEvent(this, 'onNotifyStatusChange', [status]);
			BX.localStorage.set('nms', status, 5);
		}
	}
	if (this.desktop.ready())
		this.desktop.setIconStatus(status);
};

BX.Notify.prototype.adjustPosition = function(params)
{
	if (this.desktop.run())
		return false;

	params = params || {};
	params.timeout = typeof(params.timeout) == "number"? parseInt(params.timeout): 0;

	clearTimeout(this.adjustPositionTimeout);
	this.adjustPositionTimeout = setTimeout(BX.delegate(function(){
		params.scroll = params.scroll || !BX.browser.IsDoctype();
		params.resize = params.resize || false;

		if (!this.windowScrollPos.scrollLeft)
			this.windowScrollPos = {scrollLeft : 0, scrollTop : 0};
		if (params.scroll)
			this.windowScrollPos = BX.GetWindowScrollPos();

		if (params.resize || !this.windowInnerSize.innerWidth)
		{
			// bug panel under scroll
			this.windowInnerSize = BX.GetWindowInnerSize();

			if (this.settings.panelPosition.vertical == 'bottom' && typeof(window.scroll) == 'function' && !(BX.browser.IsAndroid() || BX.browser.IsIOS()))
			{
				if (typeof(window.scrollX) != 'undefined' && typeof(window.scrollY) != 'undefined')
				{
					var originalScrollLeft = window.scrollX;
					window.scroll(1, window.scrollY);
					this.windowInnerSize.innerHeight += window.scrollX == 1? -16: 0;
					window.scroll(originalScrollLeft, window.scrollY);
				}
				else
				{
					var scrollX = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft;
					var scrollY = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop;
					var originalScrollLeft = scrollX;
					window.scroll(1, scrollY);
					scrollX = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft;
					this.windowInnerSize.innerHeight += scrollX == 1? -16: 0;
					window.scroll(originalScrollLeft, scrollY);
				}
			}
		}

		if (params.scroll || params.resize)
		{
			if (this.settings.panelPosition.horizontal == 'left')
				this.panel.style.left = (this.windowScrollPos.scrollLeft+25)+'px';
			else if (this.settings.panelPosition.horizontal == 'center')
				this.panel.style.left = (this.windowScrollPos.scrollLeft+this.windowInnerSize.innerWidth-this.panel.offsetWidth)/2+'px';
			else if (this.settings.panelPosition.horizontal == 'right')
				this.panel.style.left = (this.windowScrollPos.scrollLeft+this.windowInnerSize.innerWidth-this.panel.offsetWidth-35)+'px';

			if (this.settings.panelPosition.vertical == 'top')
			{
				this.panel.style.top = (this.windowScrollPos.scrollTop)+'px';
				if (BX.hasClass(this.panel, 'bx-notifier-panel-doc'))
					this.panel.className = 'bx-notifier-panel bx-notifier-panel-top bx-notifier-panel-doc';
				else
					this.panel.className = 'bx-notifier-panel bx-notifier-panel-top';
			}
			else if (this.settings.panelPosition.vertical == 'bottom')
			{
				if (BX.hasClass(this.panel, 'bx-notifier-panel-doc'))
					this.panel.className = 'bx-notifier-panel bx-notifier-panel-bottom bx-notifier-panel-doc';
				else
					this.panel.className = 'bx-notifier-panel bx-notifier-panel-bottom';

				this.panel.style.top = (this.windowScrollPos.scrollTop+this.windowInnerSize.innerHeight-this.panel.offsetHeight)+'px';
			}
		}
	},this), params.timeout);
};
BX.Notify.prototype.move = function(offsetX, offsetY)
{
	var left = parseInt(this.panel.style.left) + offsetX;
	var top = parseInt(this.panel.style.top) + offsetY;

	if (left < 0)
		left = 0;

	var scrollSize = BX.GetWindowScrollSize();
	var floatWidth = this.panel.offsetWidth;
	var floatHeight = this.panel.offsetHeight;

	if (left > (scrollSize.scrollWidth - floatWidth))
		left = scrollSize.scrollWidth - floatWidth;

	if (top > (scrollSize.scrollHeight - floatHeight))
		top = scrollSize.scrollHeight - floatHeight;

	if (top < 0)
		top = 0;

	this.panel.style.left = left + "px";
	this.panel.style.top = top + "px";
};
BX.Notify.prototype._startDrag = function(event)
{
	event = event || window.event;
	BX.fixEventPageXY(event);

	this.dragPageX = event.pageX;
	this.dragPageY = event.pageY;
	this.dragged = false;

	this.closePopup();

	BX.bind(document, "mousemove", BX.proxy(this._moveDrag, this));
	BX.bind(document, "mouseup", BX.proxy(this._stopDrag, this));

	if (document.body.setCapture)
		document.body.setCapture();

	document.body.ondrag = BX.False;
	document.body.onselectstart = BX.False;
	document.body.style.cursor = "move";
	document.body.style.MozUserSelect = "none";
	this.panel.style.MozUserSelect = "none";
	BX.addClass(this.panel, "bx-notifier-panel-drag-"+(this.settings.panelPosition.vertical == 'top'? 'top': 'bottom'));

	return BX.PreventDefault(event);
};

BX.Notify.prototype._moveDrag = function(event)
{
	event = event || window.event;
	BX.fixEventPageXY(event);

	if(this.dragPageX == event.pageX && this.dragPageY == event.pageY)
		return;

	this.move((event.pageX - this.dragPageX), (event.pageY - this.dragPageY));
	this.dragPageX = event.pageX;
	this.dragPageY = event.pageY;

	if (!this.dragged)
	{
		BX.onCustomEvent(this, "onPopupDragStart");
		this.dragged = true;
	}

	BX.onCustomEvent(this, "onPopupDrag");
};

BX.Notify.prototype._stopDrag = function(event)
{
	if(document.body.releaseCapture)
		document.body.releaseCapture();

	BX.unbind(document, "mousemove", BX.proxy(this._moveDrag, this));
	BX.unbind(document, "mouseup", BX.proxy(this._stopDrag, this));

	document.body.ondrag = null;
	document.body.onselectstart = null;
	document.body.style.cursor = "";
	document.body.style.MozUserSelect = "";
	this.panel.style.MozUserSelect = "";
	BX.removeClass(this.panel, "bx-notifier-panel-drag-"+(this.settings.panelPosition.vertical == 'top'? 'top': 'bottom'));
	BX.onCustomEvent(this, "onPopupDragEnd");

	var windowScrollPos = BX.GetWindowScrollPos();
	this.settings.panelPosition.vertical = (this.windowInnerSize.innerHeight/2 > (event.pageY - windowScrollPos.scrollTop||event.y))? 'top' : 'bottom';
	if (this.windowInnerSize.innerWidth/3 > (event.pageX- windowScrollPos.scrollLeft||event.x))
		this.settings.panelPosition.horizontal = 'left';
	else if (this.windowInnerSize.innerWidth/3*2 < (event.pageX - windowScrollPos.scrollLeft||event.x))
		this.settings.panelPosition.horizontal = 'right';
	else
		this.settings.panelPosition.horizontal = 'center';

	BX.userOptions.save('IM', 'settings', 'panelPositionVertical', this.settings.panelPosition.vertical);
	BX.userOptions.save('IM', 'settings', 'panelPositionHorizontal', this.settings.panelPosition.horizontal);

	BX.localStorage.set('npp', {v: this.settings.panelPosition.vertical, h: this.settings.panelPosition.horizontal});

	this.adjustPosition({resize: true});

	this.dragged = false;

	return BX.PreventDefault(event);
};

BX.Notify.prototype.closePopup = function()
{
	if (this.popupNotifyMore != null)
		this.popupNotifyMore.destroy();
	if (this.messenger != null && this.messenger.popupPopupMenu != null)
		this.messenger.popupPopupMenu.destroy();
};

BX.Notify.prototype.createNotify = function(notify, popup)
{
	var element = false;
	if (!notify)
		return false;

	popup = popup == true? true: false;

	var itemNew = (this.unreadNotify[notify.id] && !popup? " bx-notifier-item-new": "")
	if (notify.type == 1 && typeof(notify.buttons) != "undefined" && notify.buttons.length > 0)
	{
		var arButtons = [];
		for (var i = 0; i < notify.buttons.length; i++)
		{
			var type = notify.buttons[i].TYPE == 'accept'? 'accept': 'cancel';
			var arAttr = { 'data-id' : notify.id, 'data-value' : notify.buttons[i].VALUE};
			if (notify.grouped)
				arAttr['data-group'] = 'Y';

			if (notify.buttons[i].URL)
				arAttr['data-url'] = notify.buttons[i].URL;

			arButtons.push(BX.create('span', {props : { className : "bx-notifier-item-button bx-notifier-item-button-"+type }, attrs : arAttr, html: '<i class="bx-notifier-item-button-fc"></i><span>'+notify.buttons[i].TITLE+'</span><i></i>'}));
		}
		element = BX.create("div", {attrs : {'data-notifyId' : notify.id, 'data-notifyType' : notify.type}, props : { className: "bx-notifier-item"+itemNew}, children : [
			BX.create('span', {props : { className : "bx-notifier-item-content" }, children : [
				notify.userAvatar ? BX.create('span', {props : { className : "bx-notifier-item-avatar" }, children : [
					BX.create('img', {props : { className : "bx-notifier-item-avatar-img" }, attrs : {src : notify.userAvatar}})
				]}): BX.create('span', {props : { className : "bx-notifier-item-avatar bx-messenger-avatar-notify" }}),
				BX.create("span", {props : { className: "bx-notifier-item-delete bx-notifier-item-delete-fake"}}),
				BX.create('span', {props : { className : "bx-notifier-item-date" }, html: BX.IM.formatDate(notify.date)}),
				notify.userName? BX.create('span', {props : { className : "bx-notifier-item-name" }, html: '<a href="'+notify.userLink+'">'+BX.IM.prepareText(notify.userName)+'</a>'}): null,
				BX.create('span', {props : { className : "bx-notifier-item-text" }, html: notify.text}),
				BX.create('span', {props : { className : "bx-notifier-item-button-wrap" }, children : arButtons})
			]})
		]});
	}
	else if (notify.type == 2 || (notify.type == 1 && typeof(notify.buttons) != "undefined" && notify.buttons.length <= 0))
	{
		element = BX.create("div", {attrs : {'data-notifyId' : notify.id, 'data-notifyType' : notify.type}, props : { className: "bx-notifier-item"+itemNew}, children : [
			BX.create('span', {props : { className : "bx-notifier-item-content" }, children : [
				BX.create('span', {props : { className : "bx-notifier-item-avatar" }, children : [
					BX.create('img', {props : { className : "bx-notifier-item-avatar-img" },attrs : {src : notify.userAvatar}})
				]}),
				BX.create("a", {attrs : {href : '#', 'data-notifyId' : notify.id, 'data-notifyType' : notify.type}, props : { className: "bx-notifier-item-delete"}}),
				BX.create('span', {props : { className : "bx-notifier-item-date" }, html: BX.IM.formatDate(notify.date)}),
				BX.create('span', {props : { className : "bx-notifier-item-name" }, html: '<a href="'+notify.userLink+'">'+BX.IM.prepareText(notify.userName)+'</a>'}),
				BX.create('span', {props : { className : "bx-notifier-item-text" }, html: notify.text})
			]})
		]});
	}
	else if (notify.type == 3)
	{
		element = BX.create("div", {attrs : {'data-notifyId' : notify.id, 'data-notifyType' : notify.type}, props : { className: "bx-notifier-item"+itemNew}, children : [
			BX.create('span', {props : { className : "bx-notifier-item-content" }, children : [
				BX.create('span', {props : { className : "bx-notifier-item-avatar bx-notifier-item-avatar-group" }, children : [
					BX.create('span', {props : { className : "bx-notifier-item-avatar" }, children : [
						BX.create('img', {props : { className : "bx-notifier-item-avatar-img" },attrs : {src : notify.userAvatar}})
					]})
				]}),
				BX.create("a", {attrs : {href : '#', 'data-notifyId' : notify.id, 'data-group' : 'Y', 'data-notifyType' : notify.type}, props : { className: "bx-notifier-item-delete"}}),
				BX.create('span', {props : { className : "bx-notifier-item-date" }, html: BX.IM.formatDate(notify.date)}),
				BX.create('span', {props : { className : "bx-notifier-item-name" }, html: BX.message('IM_NOTIFY_GROUP_NOTIFY').replace('#USER_NAME#', '<a href="'+notify.userLink+'">'+BX.IM.prepareText(notify.userName)+'</a>').replace('#U_START#', '<span class="bx-notifier-item-help" data-help="'+notify.id+'">').replace('#U_END#', '</span>').replace('#COUNT#', notify.otherCount)}),
				BX.create('span', {props : { className : "bx-notifier-item-text" }, html: notify.text})
			]})
		]});
	}
	else
	{
		element = BX.create("div", {attrs : {'data-notifyId' : notify.id}, props : { className: "bx-notifier-item"+itemNew}, children : [
			BX.create('span', {props : { className : "bx-notifier-item-content" }, children : [
				BX.create('span', {props : { className : "bx-notifier-item-avatar bx-messenger-avatar-notify" }}),
				BX.create("a", {attrs : {href : '#', 'data-notifyId' : notify.id, 'data-notifyType' : notify.type}, props : { className: "bx-notifier-item-delete"}}),
				BX.create('span', {props : { className : "bx-notifier-item-date" }, html: BX.IM.formatDate(notify.date)}),
				notify.title && notify.title.length>0? BX.create('span', {props : { className : "bx-notifier-item-name" }, html: BX.IM.prepareText(notify.title)}): null,
				BX.create('span', {props : { className : "bx-notifier-item-text" }, html: notify.text})
			]})
		]});
	}
	return element;
}

BX.Notify.prototype.storageSet = function(params)
{
	if (params.key == 'npp')
	{
		var panelPosition = BX.localStorage.get(params.key);
		this.settings.panelPosition.horizontal = !!panelPosition? panelPosition.h: this.settings.panelPosition.horizontal;
		this.settings.panelPosition.vertical = !!panelPosition? panelPosition.v: this.settings.panelPosition.vertical;
		this.adjustPosition({resize: true});
	}
	else if (params.key == 'nms')
	{
		this.setStatus(params.value, false);
	}
	else if (params.key == 'nun')
	{
		this.notify = params.value;
	}
	else if (params.key == 'nrn')
	{
		delete this.notify[params.value];
		this.updateNotifyCount(false);
	}
	else if (params.key == 'nrgn')
	{
		for (var i in this.notify)
		{
			if (this.notify[i].tag == params.value)
				delete this.notify[i];
		}
		this.updateNotifyCount();
	}
	else if (params.key == 'numc')
	{
		this.updateNotifyMailCount(params.value, false);
	}
	else if (params.key == 'nuc')
	{
		this.updateNotifyCounters(params.value, false);
	}
	else if (params.key == 'nunc')
	{
		setTimeout(BX.delegate(function(){
			this.unreadNotify = params.value.unread;
			this.flashNotify = params.value.flash;

			this.updateNotifyCount(false);
		},this), 500);
	}
	else if (params.key == 'nln')
	{
		this.loadNotify(false);
	}
};

})();


/* IM messenger class */
(function() {

if (BX.Messenger)
	return;

BX.Messenger = function(BXIM, params)
{
	this.BXIM = BXIM;
	this.settings = {};
	this.params = params || {};

	this.sendAjaxTry = 0;
	this.updateStateVeryFastCount = 0;
	this.updateStateFastCount = 0;
	this.updateStateStepDefault = this.BXIM.ppStatus? 80: 60;
	this.updateStateStep = this.updateStateStepDefault;
	this.updateStateTimeout = null;
	this.updateLastActivity = BX.IM.getNowDate();
	this.readMessageTimeout = null;
	this.readMessageTimeoutSend = null;

	this.webrtc = params.webrtcClass;
	this.notify = params.notifyClass;
	this.desktop = params.desktopClass;

	this.smile = params.smile;
	this.smileSet = params.smileSet;

	this.settings.viewOffline = params.viewOffline;
	this.settings.viewGroup = params.viewGroup;
	this.settings.sendByEnter = typeof(params.sendByEnter) != 'undefined'? params.sendByEnter: false;

	if (params.recent)
	{
		this.recent = params.recent;
		this.recentListLoad = true;
	}
	else
	{
		this.recent = [];
		this.recentListLoad = false;
	}

	this.users = params.users;
	this.hrphoto = {};
	this.groups = params.groups;
	this.userInGroup = params.userInGroup;
	this.woGroups = params.woGroups;
	this.woUserInGroup = params.woUserInGroup;
	this.currentTab = params.currentTab;
	this.redrawTab = {};
	this.showMessage = params.showMessage;
	this.unreadMessage = params.unreadMessage;
	this.flashMessage = params.flashMessage;

	this.chat = params.chat;
	this.userInChat = params.userInChat;

	this.message = params.message;
	this.messageTmpIndex = 0;
	this.history = params.history;
	this.textareaHistory = {};
	this.textareaHistoryTimeout = null;
	this.messageCount = params.countMessage;
	this.sendMessageFlag = 0;
	this.sendMessageTmp = {};

	this.popupSettings = null;

	this.popupChatDialog = null;
	this.popupChatDialogContactListElements = null;
	this.popupChatDialogContactListSearch = null;
	this.popupChatDialogDestElements = null;
	this.popupChatDialogUsers = {};
	this.popupChatDialogSendBlock = false;
	this.renameChatDialogFlag = false;
	this.renameChatDialogInput = null;

	this.popupHistory = null;
	this.popupHistoryElements = null;
	this.popupHistoryItems = null;
	this.popupHistoryItemsSize = 475;
	this.popupHistorySearchWrap = null;
	this.popupHistoryButtonDeleteAll = null;
	this.popupHistoryButtonFilter = null;
	this.popupHistoryButtonFilterBox = null;
	this.popupHistoryFilterVisible = false;
	this.popupHistoryBodyWrap = null;
	this.popupHistorySearchInput = null;
	this.historyUserId = 0;
	this.historySearch = '';
	this.historySearchBegin = false;
	this.historySearchTimeout = null;
	this.historyWindowBlock = false;
	this.historyOpenPage = {};
	this.historyMessageSplit = '------------------------------------------------------';

	this.popupMessenger = null;
	this.popupMessengerWindow = {};
	this.popupMessengerExtra = null;
	this.popupMessengerFullWidth = 864;
	this.popupMessengerMinWidth = 864;
	this.popupMessengerFullHeight = 454;
	this.popupMessengerMinHeight = 454;
	this.popupMessengerDialog = null;
	this.popupMessengerBody = null;
	this.popupMessengerBodyAnimation = null;
	this.popupMessengerBodySize = 295;
	this.popupMessengerBodyWrap = null;

	this.popupMessengerPanel = null;
	this.popupMessengerPanelAvatar = null;
	this.popupMessengerPanelCall = null;
	this.popupMessengerPanelTitle = null;
	this.popupMessengerPanelStatus = null;

	this.popupMessengerPanel2 = null;
	this.popupMessengerPanelChatTitle = null;
	this.popupMessengerPanelUsers = null;

	this.popupMessengerTextareaPlace = null;
	this.popupMessengerTextarea = null;
	this.popupMessengerTextareaSendType = null;
	this.popupMessengerTextareaResize = {};
	this.popupMessengerTextareaSize = 43;
	this.popupMessengerLastMessage = "";
	this.readedList = {};
	this.writingList = {};
	this.writingListTimeout = {};
	this.writingSendList = {};
	this.writingSendListTimeout = {};

	this.contactListPanelStatus = null;
	this.contactListSearchText = '';

	this.popupPopupMenu = null;

	this.popupSmileMenu = null;
	this.popupSmileMenuGallery = null;
	this.popupSmileMenuSet = null;

	this.recentList = true;
	this.recentListReturn = false;
	this.recentListTab = null;
	this.recentListTabCounter = null;

	this.contactList = false;
	this.contactListTab = null;

	this.openMessengerFlag = false;
	this.openChatFlag = false;

	this.contactListLoad = false;
	this.popupContactListSize = 254;
	this.popupContactListResize = null;
	this.popupContactListSearchInput = null;
	this.popupContactListSearchClose = null;
	this.popupContactListWrap = null;
	this.popupContactListElements = null;
	this.popupContactListElementsSize = 363;
	this.popupContactListElementsWrap = null;
	this.contactListPanelSettings = null;

	this.enableGroupChat = true;
	if (!this.BXIM.bitrixIntranet || !this.BXIM.ppStatus)
		this.enableGroupChat = false;

	if (this.BXIM.init)
	{
		// audio
		if (this.desktop.supportSound())
		{
			BXDesktopSystem.BindSound("newMessage1", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/new-message-1.ogg");
			BXDesktopSystem.BindSound("newMessage2", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/new-message-2.ogg");
			BXDesktopSystem.BindSound("send", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/send.ogg");
		}
		else
		{
			this.notify.panel.appendChild(this.BXIM.audio.newMessage1 = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/new-message-1.ogg", type : "audio/ogg; codecs=vorbis" }}),
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/new-message-1.mp3", type : "audio/mpeg" }})
			]}));
			this.notify.panel.appendChild(this.BXIM.audio.newMessage2 = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/new-message-2.ogg", type : "audio/ogg; codecs=vorbis" }}),
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/new-message-2.mp3", type : "audio/mpeg" }})
			]}));
			this.notify.panel.appendChild(this.BXIM.audio.send = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/send.ogg", type : "audio/ogg; codecs=vorbis" }}),
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/send.mp3", type : "audio/mpeg" }})
			]}));
			if (typeof(this.BXIM.audio.send.play) == 'undefined')
			{
				this.BXIM.enableSound = false;
				this.BXIM.audioSupport = false;
			}
		}
		for (var i in this.unreadMessage)
		{
			if (typeof (this.flashMessage[i]) == 'undefined')
				this.flashMessage[i] = {};
			for (var k = this.unreadMessage[i].length - 1; k >= 0; k--)
			{
				BX.localStorage.set('mum', {'userId': i, 'message': this.message[this.unreadMessage[i][k]]}, 5);
			}
		}
		BX.localStorage.set('muum', this.unreadMessage, 5);

		BX.bind(this.notify.panelButtonMessage, "click", BX.proxy(function(){
			if (this.messageCount <= 0)
				this.toggleMessenger()
			else
				this.openMessenger();
		}, this.BXIM));

		var mtabs = this.BXIM.getLocalConfig('msz', false);
		if (mtabs)
		{
			if (this.desktop.run())
				this.desktop.width = mtabs.wz? parseInt(mtabs.wz): this.desktop.width;
			else
				this.popupMessengerFullWidth = mtabs.wz? parseInt(mtabs.wz): this.popupMessengerMinWidth;

			//this.popupContactListSize = parseInt(mtabs.cl);
			this.popupMessengerTextareaSize = parseInt(mtabs.ta);
			this.popupMessengerBodySize = parseInt(mtabs.b) > 0? parseInt(mtabs.b): this.popupMessengerBodySize;
			this.popupHistoryItemsSize = parseInt(mtabs.hi);
			this.popupMessengerFullHeight = parseInt(mtabs.fz);
			this.popupContactListElementsSize = parseInt(mtabs.ez);
			this.notify.popupNotifySize = parseInt(mtabs.nz);
			this.popupHistoryFilterVisible = mtabs.hf? true: false;
		}

		if (BX.browser.SupportLocalStorage())
		{
			var mcr = BX.localStorage.get('mcr');
			if (mcr)
			{
				for (var i in mcr.users)
					this.users[i] = mcr.users[i];

				for (var i in mcr.hrphoto)
					this.hrphoto[i] = mcr.hrphoto[i];

				this.callInit = true;
				setTimeout(BX.delegate(function(){
					this.webrtc.callNotifyWait(mcr.callUserId, mcr.callVideo);
				}, this), 500);
			}
			BX.addCustomEvent(window, "onLocalStorageSet", BX.delegate(this.storageSet, this));
			BX.addCustomEvent(this.notify, "onNotifyStatusChange", BX.delegate(this.setStatus, this));
			this.textareaHistory = BX.localStorage.get('mtah') || {};
			this.currentTab = BX.localStorage.get('mct') || this.currentTab;
			this.contactListSearchText = BX.localStorage.get('mcls') != null?  BX.localStorage.get('mcls')+'': '';
			this.messageTmpIndex = BX.localStorage.get('mti') || 0;
			var mfm = BX.localStorage.get('mfm');
			if (mfm)
			{
				for (var i in this.flashMessage)
					for (var j in this.flashMessage[i])
						if (mfm[i] && this.flashMessage[i][j] != mfm[i][j] && mfm[i][j] == false)
							this.flashMessage[i][j] = false;
			}

			BX.garbage(function(){
				BX.localStorage.set('mti', this.messageTmpIndex, 15);
				BX.localStorage.set('mtah', this.textareaHistory, 15);
				BX.localStorage.set('mct', this.currentTab, 15);
				BX.localStorage.set('mfm', this.flashMessage, 15);
				BX.localStorage.set('mcls', this.contactListSearchText+'', 15);

				this.BXIM.setLocalConfig('mtah2', this.textareaHistory);
				this.BXIM.setLocalConfig('msz', {
					'wz': this.desktop.run() ? this.desktop.width: this.desktop.ready()? document.body.offsetWidth: this.popupMessengerFullWidth,
					'ta': this.popupMessengerTextareaSize,
					'b': this.popupMessengerBodySize,
					'cl': this.popupContactListSize,
					'hi': this.popupHistoryItemsSize,
					'fz': this.popupMessengerFullHeight,
					'ez': this.popupContactListElementsSize,
					'nz': this.notify.popupNotifySize,
					'hf': this.popupHistoryFilterVisible,
					'place': 'garbage'
				});

			}, this);
		}
		else
		{
			var mtah = this.BXIM.getLocalConfig('mtah', false);
			if (mtah)
			{
				this.textareaHistory = mtah;
				this.BXIM.removeLocalConfig('mtah');
			}
			var mct = this.BXIM.getLocalConfig('mct', false);
			if (mct)
			{
				this.currentTab = mct;
				this.BXIM.removeLocalConfig('mct');
			}

			BX.garbage(function(){
				this.BXIM.setLocalConfig('mct', this.currentTab);
				this.BXIM.setLocalConfig('mtah', this.textareaHistory);
				this.BXIM.setLocalConfig('msz', {
					'wz': this.desktop.run() ? this.desktop.width: this.desktop.ready()? document.body.offsetWidth: this.popupMessengerFullWidth,
					'ta': this.popupMessengerTextareaSize,
					'b': this.popupMessengerBodySize,
					'cl': this.popupContactListSize,
					'hi': this.popupHistoryItemsSize,
					'fz': this.popupMessengerFullHeight,
					'ez': this.popupContactListElementsSize,
					'nz': this.notify.popupNotifySize,
					'hf': this.popupHistoryFilterVisible,
					'place': 'garbage'
				});
			}, this);
		}

		BX.addCustomEvent("onPullEvent", BX.delegate(function(module_id,command,params) {
			if (module_id == "im")
			{
				if (command == 'readMessage')
				{
					this.readMessage(params.userId, false, false);
				}
				else if (command == 'readMessageChat')
				{
					this.readMessage('chat'+params.chatId, false, false);
				}
				else if (command == 'readMessageApponent')
				{
					params.date = parseInt(params.date)+parseInt(BX.message('USER_TZ_OFFSET'));
					this.drawReadMessage(params.userId, params.lastId, params.date);
				}
				else if (command == 'startWriting')
				{
					this.startWriting(params.senderId, params.recipientId);
				}
				else if (command == 'readNotify')
				{
					this.notify.initNotifyCount = 0;
					params.lastId = parseInt(params.lastId);
					for (var i in this.notify.unreadNotify)
					{
						var notify = this.notify.notify[this.notify.unreadNotify[i]];
						if (notify && notify.type != 1 && notify.id <= params.lastId)
						{
							delete this.notify.unreadNotify[i];
						}
					}
					this.notify.updateNotifyCount(false);
				}
				else if (command == 'confirmNotify')
				{
					var notifyId = parseInt(params.id);
					delete this.notify.notify[notifyId];
					delete this.notify.unreadNotify[notifyId];
					delete this.notify.flashNotify[notifyId];
					this.notify.updateNotifyCount(false);
					if (this.BXIM.messenger.popupMessenger != null && this.BXIM.notifyOpen)
						this.notify.openNotify(true);
				}
				else if (command == 'readNotifyOne')
				{
					var notify = this.notify.notify[params.id];
					if (notify && notify.type != 1)
						delete this.notify.unreadNotify[params.id];

					this.notify.updateNotifyCount(false);
					if (this.BXIM.messenger.popupMessenger != null && this.BXIM.notifyOpen)
						this.notify.openNotify(true);

				}
				else if (command == 'message' || command == 'messageChat')
				{
					if (this.BXIM.lastRecordId >= params.MESSAGE.id)
						return false;

					var data = {};
					data.MESSAGE = {};
					data.USERS_MESSAGE = {};
					params.MESSAGE.date = parseInt(params.MESSAGE.date)+parseInt(BX.message('USER_TZ_OFFSET'));
					for (var i in params.CHAT)
					{
						if (this.chat[i] && this.chat[i].fake)
							params.CHAT[i].fake = true;
						else if (!this.chat[i])
							params.CHAT[i].fake = true;

						this.chat[i] = params.CHAT[i];
					}
					for (var i in params.USER_IN_CHAT)
					{
						this.userInChat[i] = params.USER_IN_CHAT[i];
					}
					var userChangeStatus = {};
					for (var i in params.USERS)
					{
						if (this.users[i] && this.users[i].status != params.USERS[i].status && params.MESSAGE.date+120 > BX.IM.getNowDate())
						{
							userChangeStatus[i] = this.users[i].status;
							this.users[i].status = params.USERS[i].status;
						}
					}
					for (var i in userChangeStatus)
					{
						if (!this.users[i])
							continue;

						var elements = BX.findChildren(this.popupContactListElementsWrap, {attribute: {'data-userId': ''+i+''}}, true);
						if (elements != null)
						{
							for (var j = 0; j < elements.length; j++)
							{
								BX.removeClass(elements[j], 'bx-messenger-cl-status-'+userChangeStatus[i]);
								BX.addClass(elements[j], 'bx-messenger-cl-status-'+this.users[i].status);
								elements[j].setAttribute('data-status', this.users[i].status);
							}
						}
					}
					elements = null;

					data.USERS = params.USERS;

					data.MESSAGE[params.MESSAGE.id] = params.MESSAGE;
					this.BXIM.lastRecordId = params.MESSAGE.id;

					if (params.MESSAGE.senderId == this.BXIM.userId)
					{
						if (this.sendMessageFlag > 0 || this.message[params.MESSAGE.id])
							return;

						this.readMessage(params.MESSAGE.recipientId, false, false);

						data.USERS_MESSAGE[params.MESSAGE.recipientId] = [params.MESSAGE.id];
						this.updateStateVar(data);

						this.recentListAdd({
							'userId': params.MESSAGE.recipientId,
							'id': params.MESSAGE.id,
							'date': params.MESSAGE.date,
							'recipientId': params.MESSAGE.recipientId,
							'senderId': params.MESSAGE.senderId,
							'text': params.MESSAGE.text
						}, true);
					}
					else if (command == 'messageChat')
					{
						data.UNREAD_MESSAGE = {};
						data.UNREAD_MESSAGE[params.MESSAGE.recipientId] = [params.MESSAGE.id];
						data.USERS_MESSAGE[params.MESSAGE.recipientId] = [params.MESSAGE.id];
						this.updateStateVar(data);
					}
					else
					{
						this.recentListAdd({
							'userId': params.MESSAGE.senderId,
							'id': params.MESSAGE.id,
							'date': params.MESSAGE.date,
							'recipientId': params.MESSAGE.senderId,
							'senderId': params.MESSAGE.recipientId,
							'text': params.MESSAGE.text
						}, true);

						data.UNREAD_MESSAGE = {};
						if (!params.MESSAGE.readed || params.MESSAGE.readed == 'N')
							data.UNREAD_MESSAGE[params.MESSAGE.senderId] = [params.MESSAGE.id];

						data.USERS_MESSAGE[params.MESSAGE.senderId] = [params.MESSAGE.id];
						this.updateStateVar(data);
						this.endWriting(params.MESSAGE.senderId);
					}
					BX.localStorage.set('mfm', this.flashMessage, 80);
				}
				else if (command == 'chatRename')
				{
					if (this.chat[params.chatId])
					{
						this.chat[params.chatId].name = params.chatTitle;
						this.redrawChatHeader();
					}
				}
				else if (command == 'chatUserAdd')
				{
					for (var i in params.users)
						this.users[i] = params.users[i];

					if (!this.chat[params.chatId])
					{
						this.chat[params.chatId] = {'id': params.chatId, 'name': params.chatId, 'owner': params.chatOwner, 'fake': true};
					}
					else
					{
						if (this.userInChat[params.chatId])
						{
							for (i = 0; i < params.newUsers.length; i++)
								this.userInChat[params.chatId].push(params.newUsers[i]);
						}
						else
							this.userInChat[params.chatId] = params.newUsers;

						this.redrawChatHeader();
					}
				}
				else if (command == 'chatUserLeave')
				{
					if (params.userId == this.BXIM.userId)
					{
						this.readMessage('chat'+params.chatId, true, false);
						this.leaveFromChat(params.chatId, false);
						if (params.message.length > 0)
						{
							this.notify.openConfirm('<div class="bx-notifier-confirm-title">'+BX.util.htmlspecialchars(params.chatTitle)+'</div>'+params.message, [
								new BX.PopupWindowButton({
									text : BX.message('IM_NOTIFY_CONFIRM_CLOSE'),
									className : "popup-window-button-decline",
									events : { click : function() { this.popupWindow.close(); } }
								})
							], true);
						}
					}
					else
					{
						if (!this.chat[params.chatId] || !this.userInChat[params.chatId])
							return false;

						var newStack = [];
						for (var i = 0; i < this.userInChat[params.chatId].length; i++)
							if (this.userInChat[params.chatId][i] != params.userId)
								newStack.push(this.userInChat[params.chatId][i]);

						this.userInChat[params.chatId] = newStack;
						this.redrawChatHeader();
					}
				}
				else if (command == 'notify')
				{
					if (this.BXIM.lastRecordId >= params.id)
						return false;

					params.date = parseInt(params.date)+parseInt(BX.message('USER_TZ_OFFSET'));
					var data = {};
					data.UNREAD_NOTIFY = {};
					data.UNREAD_NOTIFY[params.id] = [params.id];
					this.notify.notify[params.id] = params;
					this.notify.flashNotify[params.id] = true;
					this.notify.changeUnreadNotify(data.UNREAD_NOTIFY);
					BX.localStorage.set('mfn', this.notify.flashNotify, 80);
					this.BXIM.lastRecordId = params.id;
				}
			}
		}, this));

		for(var userId in this.users)
		{
			if (this.users[userId].birthday && userId != this.BXIM.userId)
			{
				this.message[userId+'birthday'] = {'id' : userId+'birthday', 'senderId' : 0, 'recipientId' : userId, 'date' : BX.IM.getNowDate(true)-parseInt(BX.message("SERVER_TZ_OFFSET")), 'text' : BX.message('IM_MESSENGER_BIRTHDAY_MESSAGE').replace('#USER_NAME#', '<img src="/bitrix/js/im/images/blank.gif" class="bx-messenger-birthday-icon"><strong>'+this.users[userId].name+'</strong>') };
				if (!this.showMessage[userId])
					this.showMessage[userId] = [];
				this.showMessage[userId].push(userId+'birthday');
				this.showMessage[userId].sort(BX.delegate(function(i, ii) {if (!this.message[i] || !this.message[ii]){return 0;} var i1 = parseInt(this.message[i].date); var i2 = parseInt(this.message[ii].date); if (i1 < i2) { return -1; } else if (i1 > i2) { return 1;} else{ if (i < ii) { return -1; } else if (i > ii) { return 1;}else{ return 0;}}}, this));

				var messageLastId = this.showMessage[userId][this.showMessage[userId].length-1];
				this.recentListAdd({
					'userId': userId,
					'id': this.message[messageLastId].id,
					'date': this.message[messageLastId].date,
					'recipientId': this.message[messageLastId].recipientId,
					'senderId': this.message[messageLastId].senderId,
					'text': messageLastId == userId+'birthday'? BX.message('IM_MESSENGER_BIRTHDAY_MESSAGE_SHORT').replace('#USER_NAME#', this.users[userId].name): this.message[messageLastId].text
				}, true);
				this.recent.sort(BX.delegate(function(i, ii) {if (!this.message[i.id] || !this.message[ii.id]){return 0;} var i1 = parseInt(this.message[i.id].date); var i2 = parseInt(this.message[ii.id].date); if (i1 > i2) { return -1; } else if (i1 < i2) { return 1;} else{ if (i > ii) { return -1; } else if (i < ii) { return 1;}else{ return 0;}}}, this));

				if (this.BXIM.getLocalConfig('birthdayPopup'+userId+((new Date).getFullYear()), true))
				{
					this.message[userId+'birthdayPopup'] = {'id' : userId+'birthdayPopup', 'senderId' : 0, 'recipientId' : userId, 'date' : BX.IM.getNowDate(true)-parseInt(BX.message("SERVER_TZ_OFFSET"))-parseInt(BX.message("USER_TZ_OFFSET")), 'text' : BX.message('IM_MESSENGER_BIRTHDAY_MESSAGE_SHORT').replace('#USER_NAME#', this.users[userId].name) };
					if (this.desktop.ready())
					{
						if (!this.unreadMessage[userId])
							this.unreadMessage[userId] = [];
						this.unreadMessage[userId].push(userId+'birthdayPopup');

						if (!this.flashMessage[userId])
							this.flashMessage[userId] = {};
						this.flashMessage[userId][userId+'birthdayPopup'] = true;
					}
					this.BXIM.setLocalConfig('birthdayPopup'+userId+((new Date).getFullYear()), false);
				}
			}
		}

		this.updateState();
		if (params.openMessenger !== false)
			this.openMessenger(params.openMessenger);
		else if (this.openMessengerFlag)
			this.openMessenger(this.currentTab);
		else if (this.desktop.run())
			this.openMessenger(this.currentTab);
		if (params.openHistory !== false)
			this.openHistory(params.openHistory);

		this.newMessage();
		this.updateMessageCount();
	}
	else
	{
		this.updateStateLight();
		if (params.openMessenger !== false)
			this.BXIM.openMessenger(params.openMessenger);
		if (params.openHistory !== false)
			this.BXIM.openHistory(params.openHistory);
	}
};

BX.Messenger.prototype.openMessenger = function(userId)
{
	if (this.BXIM.errorMessage != '')
	{
		this.notify.openConfirm(this.BXIM.errorMessage, [
			new BX.PopupWindowButton({
				text : BX.message('IM_NOTIFY_CONFIRM_CLOSE'),
				className : "popup-window-button-decline",
				events : { click : function() { this.popupWindow.close(); } }
			})
		], true);
		return false;
	}
	if (this.popupMessenger != null && this.dialogOpen && this.currentTab == userId && userId != 0)
		return false;

	if (userId == this.BXIM.userId)
	{
		this.currentTab = 0;
		userId = 0;
	}

	BX.localStorage.set('mcam', true, 5);
	if (typeof(userId) == "undefined" || userId == null)
		userId = 0;

	if (this.currentTab == null)
		this.currentTab = 0;

	this.openChatFlag = false;
	var setSearchFocus = false;
	if (typeof(userId) == "boolean")
	{
		userId = 0;
	}
	else if (userId == 0)
	{
		setSearchFocus = true;
		for (var i in this.unreadMessage)
		{
			userId = i;
			setSearchFocus = false;
			break;
		}
		if (userId == 0 && this.currentTab != null)
		{
			if (this.users[this.currentTab] && this.users[this.currentTab].id)
				userId = this.currentTab;
			else if (this.chat[this.currentTab.toString().substr(4)] && this.chat[this.currentTab.toString().substr(4)].id)
				userId = this.currentTab;
		}
		if (userId.toString().substr(0,4) == 'chat')
		{
			if (!(this.chat[userId.toString().substr(4)] && this.chat[userId.substr(4)].id))
				this.chat[userId.toString().substr(4)] = {'id': userId.toString().substr(4), 'name': BX.message('IM_MESSENGER_LOAD_USER'), 'owner': 0, 'fake': true};

			this.openChatFlag = true;
		}
		else
		{
			userId = parseInt(userId);
		}
	}
	else if (userId.toString().substr(0,4) == 'chat')
	{
		if (!(this.chat[userId.toString().substr(4)] && this.chat[userId.toString().substr(4)].id))
			this.chat[userId.toString().substr(4)] = {'id': userId.substr(4), 'name': BX.message('IM_MESSENGER_LOAD_USER'), 'owner': 0, 'fake': true};

		this.openChatFlag = true;
	}
	else if (this.users[userId] && this.users[userId].id)
	{
		userId = parseInt(userId);
	}
	else
	{
		userId = parseInt(userId);
		if (isNaN(userId))
			userId = 0;
		else
			this.users[userId] = {'id': userId, 'avatar': '/bitrix/js/im/images/blank.gif', 'name': BX.message('IM_MESSENGER_LOAD_USER'), 'profile': this.BXIM.path.profileTemplate.replace('#user_id#', userId), 'status': 'na', 'fake': true};
	}

	if (!this.openChatFlag && typeof(userId) != 'number')
		userId = 0;

	if (this.openChatFlag || userId > 0)
	{
		this.currentTab = userId;
		this.BXIM.notifyManager.closeByTag('im-message-'+userId);
		BX.localStorage.set('mct', this.currentTab, 15);
	}

	if (this.popupMessenger != null)
	{
		this.openDialog(userId, this.BXIM.dialogOpen? false: true);

		if (!(BX.browser.IsAndroid() || BX.browser.IsIOS()))
		{
			if (setSearchFocus && this.popupContactListSearchInput != null)
				this.popupContactListSearchInput.focus();
			else
				this.popupMessengerTextarea.focus();
		}
		return false;
	}

	var styleOfContent = {width: this.popupMessengerFullWidth+'px'};
	if (this.desktop.run())
		styleOfContent = {};

	this.popupMessengerContent = BX.create("div", { props : { className : "bx-messenger-box"+(this.webrtc.callInit? ' bx-messenger-call': '') }, style: styleOfContent, children : [
		/* CL */
		this.popupContactListWrap = BX.create("div", { props : { className : "bx-messenger-box-contact" }, style : {width: this.popupContactListSize+'px'},  children : [
			BX.create('div', {props : { className : "bx-messenger-cl-switcher" }, children: [BX.create('div', {props : { className : "bx-messenger-cl-switcher-wrap" }, children: [
				this.contactListTab = BX.create('span', {props : { className : "bx-messenger-cl-switcher-tab bx-messenger-cl-switcher-tab-cl"}, children: [BX.create('div', {props : { className : "bx-messenger-cl-switcher-tab-wrap"}, html: BX.message('IM_CL_TAB_LIST')})]}),
				this.recentListTab = BX.create('span', {props : { className : "bx-messenger-cl-switcher-tab bx-messenger-cl-switcher-tab-recent"}, children: [
					BX.create('div', {props : { className : "bx-messenger-cl-switcher-tab-wrap"}, children: [
						this.recentListTabCounter = BX.create('span', {props : { className : "bx-messenger-cl-count bx-messenger-cl-switcher-tab-count"}, html: this.messageCount>0? '<span class="bx-messenger-cl-count-digit">'+(this.messageCount<100? this.messageCount: '99+')+'</span>': ''}),
						BX.create('div', {props : { className : "bx-messenger-cl-switcher-tab-text"}, html: BX.message('IM_CL_TAB_RECENT')})
					]})
				]})
			]})]}),
			BX.create("div", { props : { className : "bx-messenger-input-wrap bx-messenger-cl-search-wrap" }, children : [
				this.popupContactListSearchClose = BX.create("a", {attrs: {href: "#close"}, props : { className : "bx-messenger-input-close" }}),
				this.popupContactListSearchInput = BX.create("input", {attrs: {type: "text", placeholder: BX.message('IM_MESSENGER_SEARCH_PLACEHOLDER'), value: this.contactListSearchText}, props : { className : "bx-messenger-input" }})
			]}),
			this.popupContactListElements = BX.create("div", { props : { className : "bx-messenger-cl" }, style : {height: this.popupContactListElementsSize+'px'}, children : [
				this.popupContactListElementsWrap = BX.create("div", { props : { className : "bx-messenger-cl-wrap" }})
			]}),
			BX.create('div', {props : { className : "bx-messenger-cl-notify-wrap" }, children : [
				this.notify.messengerNotifyButton = BX.create("div", { props : { className : "bx-messenger-cl-notify-button"}, events : { click : BX.delegate(this.notify.openNotify, this.notify)}, children : [
					BX.create('span', {props : { className : "bx-messenger-cl-notify-text"}, html: BX.message('IM_NOTIFY_BUTTON_TITLE')}),
					this.notify.messengerNotifyButtonCount = BX.create('span', { props : { className : "bx-messenger-cl-count" }, html: parseInt(this.notify.notifyCount)>0? '<span class="bx-messenger-cl-count-digit">'+this.notify.notifyCount+'</span>':''})
				]})
			]}),
			BX.create('div', {props : { className : "bx-messenger-cl-panel" }, children : [ BX.create('div', {props : { className : "bx-messenger-cl-panel-wrap" }, children : [
				this.contactListPanelStatus = BX.create("span", { props : { className : "bx-messenger-cl-panel-status-wrap bx-messenger-cl-panel-status-"+this.BXIM.userStatus }, html: '<span class="bx-messenger-cl-panel-status"></span><span class="bx-messenger-cl-panel-status-text">'+BX.message("IM_STATUS_"+this.BXIM.userStatus.toUpperCase())+'</span><span class="bx-messenger-cl-panel-status-arrow"></span>'}),
				BX.create('span', {props : { className : "bx-messenger-cl-panel-right-wrap" }, children : [
					this.contactListPanelSettings = BX.create("span", { props : { title : BX.message("IM_MESSENGER_SETTINGS"), className : "bx-messenger-cl-panel-settings-wrap"}})
				]})
			]}) ]})
		]}),
		//this.popupContactListResize = BX.create("div", { props : { className : "bx-messenger-box-contact-resize" }, style : {marginLeft: this.popupContactListSize+'px'},  events : { mousedown : BX.delegate(this.resizeCLStart, this)}}),
		/* DIALOG */
		this.popupMessengerDialog = BX.create("div", { props : { className : "bx-messenger-box-dialog" }, style : {marginLeft: this.popupContactListSize+'px'},  children : [
			this.popupMessengerPanel = BX.create("div", { props : { className : "bx-messenger-panel"+(this.openChatFlag? ' bx-messenger-hide': '') }, children : [
				BX.create('a', { attrs : { href : this.users[this.currentTab]? this.users[this.currentTab].profile: this.BXIM.userParams.profile}, props : { className : "bx-messenger-panel-avatar bx-messenger-panel-avatar-status-"+(this.users[this.currentTab]? this.users[this.currentTab].status: this.BXIM.userStatus) }, children: [
					this.popupMessengerPanelAvatar = BX.create('img', { attrs : { src : this.users[this.currentTab]? this.users[this.currentTab].avatar: '/bitrix/js/im/images/blank.gif'}, props : { className : "bx-messenger-panel-avatar-img" }}),
					BX.create('span', { props : { className : "bx-messenger-panel-avatar-status" }})
				]}),
				BX.create("a", {attrs: {href: "#history", title: BX.message("IM_MESSENGER_OPEN_HISTORY_2")}, props : { className : "bx-messenger-panel-history"}, events : { click: BX.delegate(function(e){ this.openHistory(this.currentTab); BX.PreventDefault(e)}, this)}}),
				this.popupMessengerPanelCall = this.callButton(this.currentTab),
				this.enableGroupChat? BX.create("a", {attrs: {href: "#chat", title: BX.message("IM_MESSENGER_CHAT_TITLE")}, props : { className : "bx-messenger-panel-chat"}, events : { click: BX.delegate(function(e){ this.openChatDialog({'type': 'ADD', 'bind': BX.proxy_context}); BX.PreventDefault(e)}, this)}}): null,
				this.popupMessengerPanelTitle = BX.create("span", { props : { className : "bx-messenger-panel-title"}, html: this.users[this.currentTab]? this.users[this.currentTab].name: ''}),
				this.popupMessengerPanelStatus = BX.create("span", { props : { className : "bx-messenger-panel-desc"}, html: BX.message("IM_STATUS_"+(this.users[this.currentTab]? this.users[this.currentTab].status: this.BXIM.userStatus).toUpperCase())})
			]}),
			this.popupMessengerPanel2 = BX.create("div", { props : { className : "bx-messenger-panel"+(this.openChatFlag? '': ' bx-messenger-hide') }, children : [
				BX.create('span', { props : { className : "bx-messenger-panel-avatar bx-messenger-panel-avatar-chat" }}),
				this.enableGroupChat? BX.create("a", {attrs: {href: "#chat", title: BX.message("IM_MESSENGER_CHAT_TITLE")}, props : { className : "bx-messenger-panel-chat"}, events : { click: BX.delegate(function(e){ this.openChatDialog({'type': 'EXTEND', 'bind': BX.proxy_context}); BX.PreventDefault(e)}, this)}}): null,
				BX.create("a", {attrs: {href: "#history", title: BX.message("IM_MESSENGER_OPEN_HISTORY_2")}, props : { className : "bx-messenger-panel-history"}, events : { click: BX.delegate(function(e){ this.openHistory(this.currentTab); BX.PreventDefault(e)}, this)}}),
				this.popupMessengerPanelChatTitle = BX.create("span", { props : { className : "bx-messenger-panel-title bx-messenger-panel-title-chat"}, html: this.chat[this.currentTab.toString().substr(4)]? this.chat[this.currentTab.toString().substr(4)].name: BX.message('IM_CL_LOAD')}),
				BX.create("span", { props : { className : "bx-messenger-panel-desc"}, children : [
					this.popupMessengerPanelUsers = BX.create('div', { props : { className : "bx-messenger-panel-chat-users"}, html: BX.message('IM_CL_LOAD')})
				]})
			]}),
			this.popupMessengerBody = BX.create("div", { props : { className : "bx-messenger-body" }, style : {height: this.popupMessengerBodySize+'px'}, children: [
				this.popupMessengerBodyWrap = BX.create("div", { props : { className : "bx-messenger-body-wrap" }})
			]}),
			this.popupMessengerTextareaPlace = BX.create("div", { props : { className : "bx-messenger-textarea-place"+(this.smile == false? " bx-messenger-textarea-smile-disabled": "") }, children : [
				BX.create("div", { props : { className : "bx-messenger-textarea-resize" }, events : { mousedown : BX.delegate(this.resizeTextareaStart, this)}}),
				BX.create("div", { props : { className : "bx-messenger-textarea-send" }, children : [
					BX.create("div", { props : { className : "bx-messenger-textarea-smile" }, events : { click : BX.delegate(function(e){this.openSmileMenu(); return BX.PreventDefault(e);}, this)}}),
					BX.create("a", {attrs: {href: "#send"}, props : { className : "bx-messenger-textarea-send-button" }, events : { click : BX.delegate(this.sendMessage, this)}}),
					this.popupMessengerTextareaSendType = BX.create("span", { attrs : {title : BX.message('IM_MESSENGER_SEND_TYPE_TITLE')},  props : { className : "bx-messenger-textarea-cntr-enter"}, html: this.settings.sendByEnter? 'Enter': (BX.browser.IsMac()? "&#8984;+Enter": "Ctrl+Enter") })
				]}),
				BX.create("div", { props : { className : "bx-messenger-textarea" }, children : [
					this.popupMessengerTextarea = BX.create("textarea", { props : { value: (this.textareaHistory[userId]? this.textareaHistory[userId]: ''), className : "bx-messenger-textarea-input" }, style : {height: this.popupMessengerTextareaSize+'px'}})
				]}),
				BX.create("div", { props : { className : "bx-messenger-textarea-clear" }}),
				this.BXIM.desktop.run()? null: BX.create("span", { props : { className : "bx-messenger-resize" }, events : { mousedown : BX.delegate(this.resizeWindowStart, this)}})
			]})
		]}),
		/* EXTRA PANEL */
		this.popupMessengerExtra = BX.create("div", { props : { className : "bx-messenger-box-extra"}, style : {marginLeft: this.popupContactListSize+'px', height: this.popupMessengerFullHeight+'px'}})
	]});

	this.BXIM.dialogOpen = true;
	if (this.desktop.run())
	{
		var windowTitle = this.BXIM.bitrix24Status? (!BX.browser.IsMac()? BX.message('IM_DESKTOP_B24_TITLE'): BX.message('IM_DESKTOP_B24_OSX_TITLE')): this.BXIM.bitrixIntranet? BX.message('IM_DESKTOP_TITLE'): BX.message('IM_DESKTOP_BSM_TITLE');
		this.desktop.setWindowTitle(windowTitle);
		this.popupMessenger = new BX.PopupWindowDesktop(this.BXIM);
		this.desktop.drawOnPlaceholder(this.popupMessengerContent);
	}
	else
	{
		this.popupMessenger = new BX.PopupWindow('bx-messenger-popup-messenger', null, {
			lightShadow : true,
			autoHide: false,
			closeByEsc: true,
			overlay: {opacity: 50, backgroundColor: "#000000"},
			draggable: {restrict: true},
			events : {
				onPopupClose : function() { this.destroy(); },
				onPopupDestroy : BX.delegate(function() {
					if (this.webrtc.callInit)
					{
						this.webrtc.callCommand(this.webrtc.callUserId, 'decline', {'CONNECTED': this.pc? 'Y': 'N', 'ACTIVE': this.callActive? 'Y': 'N', 'INITIATOR': this.initiator? 'Y': 'N'});
						this.webrtc.callAbort();
					}
					this.closeMenuPopup();
					this.popupMessenger = null;
					this.popupMessengerContent = null;
					this.BXIM.extraOpen = false;
					this.BXIM.dialogOpen = false;
					this.BXIM.notifyOpen = false;
					this.setUpdateStateStep();
					BX.unbind(document, "click", BX.proxy(this.BXIM.autoHide, this.BXIM));
					this.webrtc.callOverlayClose();
				}, this)
			},
			titleBar: {content: BX.create('span', {props : { className : "bx-messenger-title" }, html: BX.message('IM_MESSENGER_TITLE')})},
			closeIcon : {'top': '10px', 'right': '13px'},
			content : this.popupMessengerContent
		});
		this.popupMessenger.show();
		BX.bind(this.popupMessenger.popupContainer, "click", BX.IM.preventDefault);
		if (this.webrtc.enabled)
		{
			BX.addCustomEvent(this.popupMessenger, "onPopupDragStart", BX.delegate(function(){
				if (this.webrtc.callDialogAllow != null)
					this.webrtc.callDialogAllow.destroy();
			}, this));
		}
		BX.bind(document, "click", BX.proxy(this.BXIM.autoHide, this.BXIM));
	}

	if (this.webrtc.callNotify != null)
	{
		if (this.webrtc.enabled)
		{
			this.popupMessenger.setClosingByEsc(false);
			BX.removeClass(this.webrtc.callNotify.contentContainer.children[0], 'bx-messenger-call-overlay-float');
			this.popupMessengerContent.insertBefore(this.webrtc.callNotify.contentContainer.children[0], this.popupMessengerContent.firstChild);
			this.webrtc.callNotify.close();
		}
		else
		{
			this.webrtc.callOverlayClose(false);
		}
	}

	this.userListRedraw();
	if (this.BXIM.quirksMode)
	{
		this.popupContactListWrap.style.position = "absolute";
		this.popupContactListWrap.style.display = "block";
	}
	this.setUpdateStateStep();
	if (!(BX.browser.IsAndroid() || BX.browser.IsIOS()) && this.popupMessenger != null)
	{
		if (setSearchFocus && this.popupContactListSearchInput != null)
		{
			setTimeout(BX.delegate(function(){
				this.popupContactListSearchInput.focus();
			}, this), 50);
		}
		else
		{
			setTimeout(BX.delegate(function(){
				this.popupMessengerTextarea.focus();
			}, this), 50);
		}
	}

	/* RL */
	BX.bind(this.recentListTab, "click",  BX.delegate(this.recentListRedraw, this));

	/* CL */
	BX.bind(this.contactListTab, "click",  BX.delegate(this.contactListRedraw, this));

	BX.bind(this.popupContactListSearchClose, "click",  BX.delegate(function(e){
		this.popupContactListSearchInput.value = '';
		this.contactListSearchText = BX.util.trim(this.popupContactListSearchInput.value);
		BX.localStorage.set('mns', this.contactListSearchText, 5);
		if (this.recentListReturn)
		{
			this.recentList = true;
			this.contactList = false;
		}
		this.userListRedraw();
		return BX.PreventDefault(e);
	}, this));
	BX.bind(this.popupContactListSearchInput, "focus", BX.delegate(function() {
		if (this.popupMessenger != null)
			this.popupMessenger.setClosingByEsc(false);
	}, this));
	BX.bind(this.popupContactListSearchInput, "blur", BX.delegate(function() {
		if (this.popupMessenger != null && !this.webrtc.callInit)
			this.popupMessenger.setClosingByEsc(true);
	}, this));
	BX.bind(this.popupContactListSearchInput, "keyup", BX.delegate(this.contactListSearch, this));

	BX.bind(this.popupMessengerPanelChatTitle, "click",  BX.delegate(this.renameChatDialog, this));

	BX.bindDelegate(this.popupMessengerPanelUsers, "click", {className: 'bx-messenger-panel-chat-user'}, BX.delegate(function(e){this.openPopupMenu(BX.proxy_context, 'chatUser'); return BX.PreventDefault(e);}, this));

	BX.bindDelegate(this.popupMessengerPanelUsers, "click", {className: 'bx-notifier-popup-user-more'}, BX.delegate(function(e) {
		if (this.popupChatUsers != null)
		{
			this.popupChatUsers.destroy();
			return false;
		}

		var currentTab = this.currentTab.toString().substr(4);
		var htmlElement = '<span class="bx-notifier-item-help-popup">';
			for (var i = parseInt(BX.proxy_context.getAttribute('data-last-item')); i < this.userInChat[currentTab].length; i++)
				htmlElement += '<span class="bx-notifier-item-help-popup-img bx-messenger-panel-chat-user" data-userId="'+this.userInChat[currentTab][i]+'"><span class="bx-notifier-popup-avatar"><img class="bx-notifier-popup-avatar-img" src="'+this.users[this.userInChat[currentTab][i]].avatar+'"></span><span class="bx-notifier-item-help-popup-name">'+this.users[this.userInChat[currentTab][i]].name+'</span></span>';
		htmlElement += '</span>';

		this.popupChatUsers = new BX.PopupWindow('bx-notifier-other-window', BX.proxy_context, {
			zIndex: 200,
			lightShadow : true,
			offsetTop: -2,
			offsetLeft: 3,
			autoHide: true,
			closeByEsc: true,
			events : {
				onPopupClose : function() { this.destroy() },
				onPopupDestroy : BX.proxy(function() { this.popupChatUsers = null; }, this)
			},
			content : BX.create("div", { props : { className : "bx-notifier-popup-menu" }, children: [
				BX.create("div", { props : { className : " " }, html: htmlElement})
			]})
		});
		this.popupChatUsers.setAngle({offset: BX.proxy_context.offsetWidth});
		this.popupChatUsers.show();

		BX.bindDelegate(this.popupChatUsers.popupContainer, "click", {className: 'bx-messenger-panel-chat-user'}, BX.delegate(function(e){this.openPopupMenu(BX.proxy_context, 'chatUser'); return BX.PreventDefault(e);}, this));

		return BX.PreventDefault(e);
	}, this));
	BX.bindDelegate(this.popupContactListElements, "contextmenu", {className: 'bx-messenger-cl-item'}, BX.delegate(function(e) {
		this.openPopupMenu(BX.proxy_context, 'contactList');
		return BX.PreventDefault(e);
	}, this));
	BX.bindDelegate(this.popupContactListElements, "click", {className: 'bx-messenger-cl-item'}, BX.delegate(function(e) {
		this.closeMenuPopup();
		if (this.popupContactListSearchInput.value != '')
		{
			this.popupContactListSearchInput.value = '';
			this.contactListSearchText = '';
			BX.localStorage.set('mns', this.contactListSearchText, 5);
			if (this.recentListReturn)
			{
				this.recentList = true;
				this.contactList = false;
			}
			this.userListRedraw();
		}
		this.openMessenger(BX.proxy_context.getAttribute('data-userId'));
		return BX.PreventDefault(e);
	}, this));
	BX.bindDelegate(this.popupContactListElements, 'click', {className: 'bx-messenger-cl-group-title'}, BX.delegate(function() {
		var status = '';
		var wrapper = BX.findNextSibling(BX.proxy_context, {className: 'bx-messenger-cl-group-wrapper'});
		if (wrapper.childNodes.length > 0)
		{
			var avatarNodes = BX.findChildren(wrapper, {className : "bx-messenger-cl-avatar-img"}, true);
			if (BX.hasClass(BX.proxy_context.parentNode, 'bx-messenger-cl-group-open'))
			{
				status = 'close';
				BX.removeClass(BX.proxy_context.parentNode, 'bx-messenger-cl-group-open');
				if (avatarNodes)
				{
					for (var i = 0; i < avatarNodes.length; i++)
					{
						avatarNodes[i].setAttribute('_src', avatarNodes[i].src);
						avatarNodes[i].src = "/bitrix/js/im/images/blank.gif";
					}
				}
			}
			else
			{
				status = 'open';
				BX.addClass(BX.proxy_context.parentNode, 'bx-messenger-cl-group-open');
				if (avatarNodes)
				{
					for (var i = 0; i < avatarNodes.length; i++)
					{
						avatarNodes[i].src = avatarNodes[i].getAttribute('_src');
						avatarNodes[i].setAttribute('_src', "/bitrix/js/im/images/blank.gif");
					}
				}
			}
		}
		else
		{
			if (BX.hasClass(BX.proxy_context.parentNode, 'bx-messenger-cl-group-open'))
			{
				status = 'close';
				BX.removeClass(BX.proxy_context.parentNode, 'bx-messenger-cl-group-open');
			}
			else
			{
				status = 'open';
				BX.addClass(BX.proxy_context.parentNode, 'bx-messenger-cl-group-open');
			}
		}

		var id = BX.proxy_context.getAttribute('data-groupId');
		var viewGroup = this.contactListSearchText != null && this.contactListSearchText.length > 0? false: this.settings.viewGroup;
		if (viewGroup)
			this.groups[id].status = status;
		else
			this.woGroups[id].status = status;

		BX.userOptions.save('IM', 'groupStatus', id, status);
		BX.localStorage.set('mgp', {'id': id, 'status': status}, 5);
	}, this));

	BX.bind(this.contactListPanelStatus, "click", BX.delegate(function(e){this.openPopupMenu(this.contactListPanelStatus, 'status');  return BX.PreventDefault(e);}, this));
	BX.bind(this.contactListPanelSettings, "click", BX.delegate(function(e){this.openPopupMenu(this.contactListPanelSettings, 'settings');  return BX.PreventDefault(e);}, this));
	//BX.bind(this.contactListPanelSettings, "click", BX.delegate(this.openSettings, this));

	/* DIALOG */
	BX.bind(this.popupMessengerBody, "scroll", BX.delegate(function() {
		if (this.unreadMessage[this.currentTab] && this.unreadMessage[this.currentTab].length > 0 && this.BXIM.isScrollMax(this.popupMessengerBody, 200) && this.BXIM.isFocus())
		{
			clearTimeout(this.readMessageTimeout);
			this.readMessageTimeout = setTimeout(BX.delegate(function(){
				this.readMessage(this.currentTab);
			}, this), 100);
		}
	}, this));
	BX.bind(this.popupMessengerTextarea, "focus", BX.delegate(function() {
		if (this.popupMessenger != null)
			this.popupMessenger.setClosingByEsc(false);
	}, this));
	BX.bind(this.popupMessengerTextarea, "blur", BX.delegate(function() {
		if (this.popupMessenger != null && !this.webrtc.callInit)
			this.popupMessenger.setClosingByEsc(true);
	}, this));
	BX.bind(this.popupMessengerTextarea, "keydown", BX.delegate(function(e) {
		if (e.keyCode == 9)
		{
			this.insertTextareaText("\t");
			return BX.PreventDefault(e);
		}
		if (e.keyCode == 27)
		{
			if (BX.util.trim(this.popupMessengerTextarea.value).length <= 0)
				this.popupMessenger.destroy();
			else
				this.popupMessengerTextarea.value = "";
		}
		else if (e.keyCode == 38 && BX.util.trim(this.popupMessengerTextarea.value).length <= 0)
			this.popupMessengerTextarea.value = this.popupMessengerLastMessage;
		else if (this.settings.sendByEnter == true && (e.ctrlKey == true || e.altKey == true) && e.keyCode == 13)
			this.insertTextareaText("\n");
		else if (this.settings.sendByEnter == true && e.shiftKey == false && e.keyCode == 13)
			this.sendMessage();
		else if (this.settings.sendByEnter == false && e.ctrlKey == true && e.keyCode == 13)
			this.sendMessage();
		else if (this.settings.sendByEnter == false && (e.metaKey == true || e.altKey == true) && e.keyCode == 13 && BX.browser.IsMac())
			this.sendMessage();

		clearTimeout(this.textareaHistoryTimeout);
		this.textareaHistoryTimeout = setTimeout(BX.delegate(function(){
			this.textareaHistory[this.currentTab] = this.popupMessengerTextarea.value;
		}, this), 200);

		if (BX.util.trim(this.popupMessengerTextarea.value).length > 2)
			this.sendWriting(this.currentTab);
	}, this));
	BX.bind(this.popupMessengerTextareaSendType, "click", BX.delegate(function() {
		this.settings.sendByEnter = this.settings.sendByEnter? false: true;
		BX.userOptions.save('IM', 'settings', 'sendByEnter', this.settings.sendByEnter? 'Y': 'N');
		BX.proxy_context.innerHTML = this.settings.sendByEnter? 'Enter': (BX.browser.IsMac()? "&#8984;+Enter": "Ctrl+Enter");
	}, this));

	BX.bindDelegate(this.popupMessengerBodyWrap, 'click', {className: 'bx-messenger-content-item-quote'}, BX.delegate(function() {
		var stackMessages = BX.findChildren(BX.proxy_context.parentNode.nextSibling.firstChild, {tagName : "span"}, false);
		var arQuote = [];
		var firstMessage = true;
		arQuote.push((this.popupMessengerTextarea.value.length>0?"\n":'')+this.historyMessageSplit);
		for (var i = 0; i < stackMessages.length; i++) {
			var messageId = stackMessages[i].getAttribute('data-textMessageId');
			if (this.message[messageId])
			{
				if (firstMessage)
				{
					if (this.users[this.message[messageId].senderId])
					{
						arQuote.push(BX.util.htmlspecialcharsback(this.users[this.message[messageId].senderId].name)+' ['+BX.IM.formatDate(this.message[messageId].date)+']');
					}
					firstMessage = false;
				}
				arQuote.push(BX.IM.prepareTextBack(this.message[messageId].text));
			}
		}
		arQuote.push(this.historyMessageSplit+"\n");
		this.insertTextareaText(arQuote.join("\n"), false);
		setTimeout(BX.delegate(function(){
			this.popupMessengerTextarea.scrollTop = this.popupMessengerTextarea.scrollHeight;
			this.popupMessengerTextarea.focus();
		}, this), 100);
	}, this));

	BX.bindDelegate(this.popupMessengerBodyWrap, 'click', {className: 'bx-messenger-content-item-error'}, BX.delegate(this.sendMessageRetry, this));


	if (userId == 0)
	{
		this.extraOpen(
			BX.create("div", { attrs : { style : "padding-top: 300px"}, props : { className : "bx-messenger-box-empty" }, html: BX.message('IM_MESSENGER_EMPTY')})
		);
	}
	else
		this.openDialog(userId);
};


BX.Messenger.prototype.openDialog = function(userId, extraClose, callToggle)
{
	var user = this.openChatFlag? this.chat[userId.toString().substr(4)]: this.users[userId];
	if (user == undefined || user.id == undefined)
		return false;

	this.dialogStatusRedraw();

	this.popupMessengerPanel.className  = this.openChatFlag? 'bx-messenger-panel bx-messenger-hide': 'bx-messenger-panel';
	this.popupMessengerPanel2.className = this.openChatFlag? 'bx-messenger-panel': 'bx-messenger-panel bx-messenger-hide';

	extraClose = extraClose == true? true: false;
	callToggle = callToggle == false? false: true;

	var arMessage = [];
	if (this.showMessage[userId] != undefined && this.showMessage[userId].length > 0)
	{
		if (!user.fake && this.showMessage[userId].length >= 15)
		{
			this.redrawTab[userId] = false;
		}
		else
		{
			this.drawTab(userId, true);
			this.redrawTab[userId] = true;
		}
	}
	else if (this.showMessage[userId] == undefined)
	{
		arMessage = [BX.create("div", { props : { className : "bx-messenger-content-load"}, children : [
			BX.create('span', { props : { className : "bx-messenger-content-load-img" }}),
			BX.create("span", { props : { className : "bx-messenger-content-load-text"}, html: BX.message('IM_MESSENGER_LOAD_MESSAGE')})
		]})];
		this.redrawTab[userId] = true;
	}
	else if (this.redrawTab[user.id] && this.showMessage[userId].length == 0)
	{
		arMessage = [BX.create("div", { props : { className : "bx-messenger-content-load"}, children : [
			BX.create('span', { props : { className : "bx-messenger-content-load-img" }}),
			BX.create("span", { props : { className : "bx-messenger-content-load-text"}, html: BX.message("IM_MESSENGER_LOAD_MESSAGE")})
		]})];
		this.showMessage[userId] = [];
	}
	else
	{
		arMessage = [BX.create("div", { props : { className : "bx-messenger-content-empty"}, children : [
			BX.create("span", { props : { className : "bx-messenger-content-load-text"}, html: BX.message("IM_MESSENGER_NO_MESSAGE")})
		]})];
	}
	if (arMessage.length > 0)
	{
		this.popupMessengerBodyWrap.innerHTML = '';
		BX.adjust(this.popupMessengerBodyWrap, {children: arMessage});
	}

	if (extraClose)
		this.extraClose();

	this.desktop.autoResize();

	this.popupMessengerTextarea.value = this.textareaHistory[userId]? this.textareaHistory[userId]: "";

	this.currentTab = userId;
	BX.localStorage.set('mct', this.currentTab, 15);

	if (this.redrawTab[userId])
		this.loadLastMessage(userId, this.openChatFlag);
	else
		this.drawTab(userId, true);

	if (this.BXIM.isFocus() && !this.redrawTab[userId])
		this.readMessage(userId);

	this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollHeight;

	this.resizeMainWindow();

	if (this.writingList[userId])
	{
		this.drawWriting(userId);
	}
	else if (this.readedList[userId])
	{
		this.drawReadMessage(userId, this.readedList[userId].messageId, this.readedList[userId].date, false);
	}

	if (callToggle)
		this.webrtc.callOverlayToggleSize(true);

	BX.onCustomEvent(window, 'onImDrawDialog', [userId]);
}

BX.Messenger.prototype.drawTab = function(userId, scroll)
{
	if (this.popupMessenger == null || userId != this.currentTab)
		return false;

	this.dialogStatusRedraw();

	this.popupMessengerBodyWrap.innerHTML = '';
	if (!this.showMessage[userId] || this.showMessage[userId].length <= 0)
	{
		this.popupMessengerBodyWrap.appendChild(BX.create("div", { props : { className : "bx-messenger-content-empty"}, children : [
			BX.create("span", { props : { className : "bx-messenger-content-load-text"}, html: BX.message("IM_MESSENGER_NO_MESSAGE")})
		]}));
	}

	if (this.showMessage[userId])
		this.showMessage[userId].sort(BX.delegate(function(i, ii) {if (!this.message[i] || !this.message[ii]){return 0;} var i1 = parseInt(this.message[i].date); var i2 = parseInt(this.message[ii].date); if (i1 < i2) { return -1; } else if (i1 > i2) { return 1;} else{ if (i < ii) { return -1; } else if (i > ii) { return 1;}else{ return 0;}}}, this));
	else
		this.showMessage[userId] = [];

	for (var i = 0; i < this.showMessage[userId].length; i++)
		this.drawMessage(userId, this.message[this.showMessage[userId][i]], false);

	scroll = scroll == false? false: true;
	if (scroll)
		this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollHeight;

	delete this.redrawTab[userId];
}

BX.Messenger.prototype.drawMessage = function(userId, message, scroll)
{
	if (this.popupMessenger == null || userId != this.currentTab || typeof(message) != 'object' || userId == 0)
		return false;

	var temp = message.id.indexOf('temp') == 0? true: false;
	system = message.senderId == 0 ? true: false;
	if (message.system && message.system == 'Y')
	{
		system = true;
		message.senderId = 0;
	}

	if (!this.history[userId])
		this.history[userId] = [];

	if (parseInt(message.id) > 0)
		this.history[userId].push(message.id);

	var messageId = 0;
	var skipAddMessage = false;
	var messageUser = this.users[message.senderId];
	if (!system && typeof(messageUser) == 'undefined')
		return false;

	var markNewMessage = false;
	if (this.unreadMessage[userId] && BX.util.in_array(message.id, this.unreadMessage[userId]))
		markNewMessage = true;

	scroll = scroll == false? false: true;
	if (scroll && this.BXIM.isScrollMax(this.popupMessengerBody, 200))
		scroll = true;
	else
		scroll = false;

	var insertBefore = false;

	var lastMessage = this.popupMessengerBodyWrap.lastChild;
	if (lastMessage && BX.hasClass(lastMessage, "bx-messenger-content-empty"))
	{
		BX.remove(lastMessage);
	}
	else if (lastMessage && BX.hasClass(lastMessage, "bx-messenger-content-item-notify"))
	{
		if (message.senderId == this.currentTab || !this.writingList[this.currentTab])
		{
			BX.remove(lastMessage);
			insertBefore = false;
			lastMessage = this.popupMessengerBodyWrap.lastChild;
		}
		else
		{
			insertBefore = true;
			lastMessage = this.popupMessengerBodyWrap.lastChild.previousSibling;
		}
	}

	if (!system && lastMessage)
	{
		if (message.senderId == lastMessage.getAttribute('data-senderId') && parseInt(message.date)-300 < parseInt(lastMessage.getAttribute('data-messageDate')))
		{
			var lastMessageElement = BX.findChild(lastMessage, {className : "bx-messenger-content-item-text-message"}, true);
			lastMessageElement.innerHTML = lastMessageElement.innerHTML+'<div class="bx-messenger-hr"></div>'+'<span data-textMessageId="'+message.id+'">'+BX.IM.prepareText(message.text, false, true)+'</span>';
			lastMessageElement.nextSibling.innerHTML = (temp? BX.message('IM_MESSENGER_DELIVERED'): ' &nbsp; '+messageUser.name+' &nbsp; '+BX.IM.formatDate(message.date));
			if (markNewMessage)
				BX.addClass(lastMessage, 'bx-messenger-content-item-new');

			if (temp)
			{
				var lastMessageElementStatus = BX.findChild(lastMessage, {className : "bx-messenger-content-item-status"}, true);
				if (lastMessageElementStatus)
				{
					lastMessageElementStatus.innerHTML = '';
					BX.adjust(lastMessageElementStatus, {children: [
						BX.create("span", { props : { className : "bx-messenger-content-item-progress"}})
					]});
				}
			}

			lastMessage.setAttribute('data-messageDate', message.date);
			lastMessage.setAttribute('data-messageId', message.id);
			lastMessage.setAttribute('data-senderId', message.senderId);

			messageId = message.id;
			skipAddMessage = true;
		}
	}
	if (!skipAddMessage)
	{
		if (lastMessage)
			messageId = lastMessage.getAttribute('data-messageId');

		if (system)
		{
			var lastSystemElement = BX.findChild(this.popupMessengerBodyWrap, {attribute: {'data-messageId': ''+message.id+''}}, false);
			if (!lastSystemElement)
			{
				var arMessage = BX.create("div", { attrs : { 'data-type': 'system', 'data-senderId' : message.senderId, 'data-messageId' : message.id }, props: { className : "bx-messenger-content-item bx-messenger-content-item-2 bx-messenger-content-item-system"}, children: [
					BX.create("span", { props : { className : "bx-messenger-content-item-content"}, children : [
						typeof(messageUser) == 'undefined'? []:
						BX.create("span", { props : { className : "bx-messenger-content-item-avatar"}, children : [
							BX.create("span", { props : { className : "bx-messenger-content-item-arrow"}}),
							BX.create('img', { props : { className : "bx-messenger-content-item-avatar-img" }, attrs : {src : messageUser.avatar}})
						]}),
						BX.create("span", { props : { className : "bx-messenger-content-item-text-center"}, children: [
							BX.create("span", {  props : { className : "bx-messenger-content-item-text-message"}, html: '<span data-textMessageId="'+message.id+'">'+BX.IM.prepareText(message.text, false, true)+'</span>'}),
							BX.create("span", { props : { className : "bx-messenger-content-item-date"}, html: ' &nbsp; '+(messageUser? messageUser.name: BX.message('IM_MESSENGER_SYSTEM_USER'))+' &nbsp; '+BX.IM.formatDate(message.date)}),
							BX.create("span", { props : { className : "bx-messenger-clear"}})
						]})
					]})
				]});

				if (message.system && message.system == 'Y' && markNewMessage)
					BX.addClass(arMessage, 'bx-messenger-content-item-new');
			}
		}
		else if (message.senderId == this.BXIM.userId)
		{
			var arMessage = BX.create("div", { attrs : { 'data-type': 'self', 'data-senderId' : message.senderId, 'data-messageDate' : message.date, 'data-messageId' : message.id }, props: { className : "bx-messenger-content-item"}, children: [
				BX.create("span", { props : { className : "bx-messenger-content-item-content"}, children : [
					BX.create("span", { props : { className : "bx-messenger-content-item-avatar"}, children : [
						BX.create("span", { props : { className : "bx-messenger-content-item-arrow"}}),
						BX.create('img', { props : { className : "bx-messenger-content-item-avatar-img" }, attrs : {src : messageUser.avatar}})
					]}),
					BX.create("span", { props : { className : "bx-messenger-content-item-status"}, children:[
						temp? BX.create("span", { props : { className : "bx-messenger-content-item-progress"}})
						: BX.create("span", { attrs: {title : BX.message('IM_MESSENGER_QUOTE_TITLE')}, props : { className : "bx-messenger-content-item-quote"}})
					]}),
					BX.create("span", { props : { className : "bx-messenger-content-item-text-center"}, children: [
						BX.create("span", {  props : { className : "bx-messenger-content-item-text-message"}, html: '<span data-textMessageId="'+message.id+'">'+BX.IM.prepareText(message.text, false, true)+'</span>'}),
						BX.create("span", { props : { className : "bx-messenger-content-item-date"}, html: (temp? BX.message('IM_MESSENGER_DELIVERED'): ' &nbsp; '+messageUser.name+' &nbsp; '+BX.IM.formatDate(message.date))}),
						BX.create("span", { props : { className : "bx-messenger-clear"}})
					]})
				]})
			]});
		}
		else
		{
			var arMessage = BX.create("div", { attrs : { 'data-type': 'other', 'data-senderId' : message.senderId, 'data-messageDate' : message.date, 'data-messageId' : message.id }, props: { className : "bx-messenger-content-item bx-messenger-content-item-2"+(markNewMessage? ' bx-messenger-content-item-new': '')}, children: [
				BX.create("span", { props : { className : "bx-messenger-content-item-content"}, children : [
					BX.create("span", { props : { className : "bx-messenger-content-item-avatar"}, children : [
						BX.create("span", { props : { className : "bx-messenger-content-item-arrow"}}),
						BX.create('img', { props : { className : "bx-messenger-content-item-avatar-img" }, attrs : {src : messageUser.avatar}})
					]}),
					BX.create("span", { props : { className : "bx-messenger-content-item-status"}, children:[
						BX.create("span", { attrs: {title : BX.message('IM_MESSENGER_QUOTE_TITLE')}, props : { className : "bx-messenger-content-item-quote"}})
					]}),
					BX.create("span", { props : { className : "bx-messenger-content-item-text-center"}, children: [
						BX.create("span", {  props : { className : "bx-messenger-content-item-text-message"}, html: '<span data-textMessageId="'+message.id+'">'+BX.IM.prepareText(message.text, false, true)+'</span>'}),
						BX.create("span", { props : { className : "bx-messenger-content-item-date"}, html: (temp? BX.message('IM_MESSENGER_DELIVERED'): ' &nbsp; '+messageUser.name+' &nbsp; '+BX.IM.formatDate(message.date))}),
						BX.create("span", { props : { className : "bx-messenger-clear"}})
					]})
				]})
			]});
		}
		if (insertBefore && lastMessage.nextElementSibling)
			this.popupMessengerBodyWrap.insertBefore(arMessage, lastMessage.nextElementSibling);
		else
			this.popupMessengerBodyWrap.appendChild(arMessage);
	}

	if (scroll)
	{
		if (this.BXIM.animationSupport)
		{
			if (this.popupMessengerBodyAnimation != null)
				this.popupMessengerBodyAnimation.stop();
			(this.popupMessengerBodyAnimation = new BX.easing({
				duration : 800,
				start : { scroll : this.popupMessengerBody.scrollTop},
				finish : { scroll : this.popupMessengerBody.scrollHeight - this.popupMessengerBody.offsetHeight},
				transition : BX.easing.makeEaseInOut(BX.easing.transitions.quart),
				step : BX.delegate(function(state){
					this.popupMessengerBody.scrollTop = state.scroll;
				}, this)
			})).animate();
		}
		else
		{
			this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollHeight - this.popupMessengerBody.offsetHeight;
		}
	}

	return messageId;
}

BX.Messenger.prototype.drawNotifyMessage = function(userId, icon, message, animation)
{
	if (this.popupMessenger == null || userId != this.currentTab || typeof(message) == 'undefined' || typeof(icon) == 'undefined' || userId == 0)
		return false;

	var lastChild = this.popupMessengerBodyWrap.lastChild;
	if (BX.hasClass(lastChild, "bx-messenger-content-empty"))
		return false;

	var arMessage = BX.create("div", { attrs : { 'data-type': 'notify'}, props: { className : "bx-messenger-content-item bx-messenger-content-item-notify"}, children: [
		BX.create("span", { props : { className : "bx-messenger-content-item-content"}, children : [
			BX.create("span", { props : { className : "bx-messenger-content-item-text-center"}, children: [
				BX.create("span", {  props : { className : "bx-messenger-content-item-text-message"}, html: '<span class="bx-messenger-content-item-notify-icon-'+icon+'"></span>'+BX.IM.prepareText(message, false, true)})
			]})
		]})
	]});

	if (BX.hasClass(lastChild, "bx-messenger-content-item-notify"))
		BX.remove(lastChild)

	this.popupMessengerBodyWrap.appendChild(arMessage);

	animation = animation == false? false: true;
	if (this.BXIM.animationSupport && animation)
	{
		if (this.popupMessengerBodyAnimation != null)
			this.popupMessengerBodyAnimation.stop();
		(this.popupMessengerBodyAnimation = new BX.easing({
			duration : 800,
			start : { scroll : this.popupMessengerBody.scrollTop},
			finish : { scroll : this.popupMessengerBody.scrollHeight - this.popupMessengerBody.offsetHeight},
			transition : BX.easing.makeEaseInOut(BX.easing.transitions.quart),
			step : BX.delegate(function(state){
				this.popupMessengerBody.scrollTop = state.scroll;
			}, this)
		})).animate();
	}
	else
	{
		this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollHeight - this.popupMessengerBody.offsetHeight;
	}

}

BX.Messenger.prototype.dialogStatusRedraw = function()
{
	if (this.popupMessenger == null)
		return false;

	if (this.openChatFlag)
	{
		this.redrawChatHeader();
	}
	else if (this.users[this.currentTab])
	{
		this.popupMessengerPanelCall.className = this.callButtonStatus(this.currentTab);
		this.popupMessengerPanelAvatar.parentNode.href = this.users[this.currentTab].profile;
		this.popupMessengerPanelAvatar.parentNode.className = 'bx-messenger-panel-avatar bx-messenger-panel-avatar-status-'+(this.users[this.currentTab].birthday? 'birthday': this.users[this.currentTab].status);
		this.popupMessengerPanelAvatar.src = this.users[this.currentTab].avatar;
		this.popupMessengerPanelTitle.innerHTML = this.users[this.currentTab].name;
		this.popupMessengerPanelStatus.innerHTML = BX.message("IM_STATUS_"+this.users[this.currentTab].status.toUpperCase());
	}

	return true;
}

BX.Messenger.prototype.callButton = function(userId)
{
	return BX.create("a", {
		attrs: {
			href: "#call",
			title: this.webrtc.videoMuted? BX.message("IM_MESSENGER_CALL_VOICE"): BX.message("IM_MESSENGER_CALL_VIDEO")
		},
		props : {
			className : this.callButtonStatus(userId)
		},
		events : {
			click: BX.delegate(function(e){
				this.webrtc.callInvite(this.currentTab, !this.webrtc.videoMuted);
				BX.PreventDefault(e);
			}, this),
			contextmenu: BX.delegate(function(e){
				this.openPopupMenu(BX.proxy_context, 'callMenu');
				BX.PreventDefault(e);
			}, this)
		}
	});
};

BX.Messenger.prototype.callButtonStatus = function(userId)
{
	var elementClassName = '';
	if (!this.enableGroupChat || !this.webrtc.callSupport(userId, this) || this.webrtc.callInit)
		elementClassName = 'bx-messenger-panel-call-disabled';
	else
		elementClassName = this.webrtc.videoMuted? "bx-messenger-panel-call-voice": "bx-messenger-panel-call-video";

	return elementClassName;
}
/* CHAT */
BX.Messenger.prototype.leaveFromChat = function(chatId, sendAjax)
{
	if (!this.chat[chatId])
		return false;

	sendAjax = sendAjax == false? false: true;

	if (!sendAjax)
	{
		delete this.chat[chatId];
		delete this.userInChat[chatId];
		if (this.popupMessenger != null)
		{
			if (this.currentTab == 'chat'+chatId)
			{
				this.currentTab = 0;
				this.extraClose();
			}
			if (this.recentList)
				this.recentListRedraw();
		}
	}
	else
	{
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 60,
			data: {'IM_CHAT_LEAVE' : 'Y', 'CHAT_ID' : chatId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
			onsuccess: BX.delegate(function(data){
				if (data.ERROR == '')
				{
					delete this.chat[data.CHAT_ID];
					delete this.userInChat[data.CHAT_ID];
					this.readMessage('chat'+data.CHAT_ID, true, false);
					if (this.popupMessenger != null)
					{
						if (this.currentTab == 'chat'+data.CHAT_ID)
						{
							this.currentTab = 0;
							BX.localStorage.set('mct', this.currentTab, 15);
							this.extraClose();
						}
						if (this.recentList)
							this.recentListRedraw();
					}
					BX.localStorage.set('mcl', data.CHAT_ID, 5);
				}
			}, this)
		});
	}
}
BX.Messenger.prototype.kickFromChat = function(chatId, userId)
{
	if (!this.chat[chatId] && this.chat[chatId].owner != this.BXIM.userId && !this.userId[userId])
		return false;

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 60,
		data: {'IM_CHAT_LEAVE' : 'Y', 'CHAT_ID' : chatId, 'USER_ID' : userId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data){
			if (data.ERROR == '')
			{
				for (var i = 0; i < this.userInChat[data.CHAT_ID].length; i++)
					if (this.userInChat[data.CHAT_ID][i] == userId)
						delete this.userInChat[data.CHAT_ID][i];

				if (this.popupMessenger != null && this.recentList)
					this.recentListRedraw();

				if (!this.BXIM.ppServerStatus)
					BX.PULL.updateState(true);

				BX.localStorage.set('mclk', {'chatId': data.CHAT_ID, 'userId': data.USER_ID}, 5);
			}
		}, this)
	});
}
BX.Messenger.prototype.redrawChatHeader = function()
{
	if (!this.openChatFlag)
		return false;

	var chatId = this.currentTab.toString().substr(4);
	if (!this.chat[chatId] || !this.userInChat[chatId])
		return false;

	if (!this.renameChatDialogFlag)
		this.popupMessengerPanelChatTitle.innerHTML = this.chat[chatId].name;

	var showUser = false;
	this.popupMessengerPanelUsers.innerHTML = '';
	var maxCount = Math.floor((this.popupMessengerPanelUsers.offsetWidth)/150);
	if (maxCount >= this.userInChat[chatId].length)
	{
		for (var i = 0; i < this.userInChat[chatId].length && i < maxCount; i++)
		{
			var user = this.users[this.userInChat[chatId][i]];
			if (user)
			{
				this.popupMessengerPanelUsers.innerHTML += '<span class="bx-messenger-panel-chat-user" data-userId="'+user.id+'"><span class="bx-notifier-popup-avatar'+(this.chat[chatId].owner == user.id? ' bx-messenger-panel-chat-user-owner': '')+'"><img class="bx-notifier-popup-avatar-img" src="'+user.avatar+'"></span><span class="bx-notifier-popup-user-name">'+user.name+'</span></span>';
				showUser = true;
			}
		}
	}
	else
	{
		maxCount = Math.floor((this.popupMessengerPanelUsers.offsetWidth-50)/28);
		for (var i = 0; i < this.userInChat[chatId].length && i < maxCount; i++)
		{
			var user = this.users[this.userInChat[chatId][i]];
			if (user)
			{
				this.popupMessengerPanelUsers.innerHTML += '<span class="bx-messenger-panel-chat-user" data-userId="'+user.id+'"><span class="bx-notifier-popup-avatar'+(this.chat[chatId].owner == user.id? ' bx-messenger-panel-chat-user-owner': '')+'"><img class="bx-notifier-popup-avatar-img" src="'+user.avatar+'" title="'+user.name+'"></span></span>';
				showUser = true;
			}
		}
		if (showUser && this.userInChat[chatId].length > maxCount)
			this.popupMessengerPanelUsers.innerHTML += '<span class="bx-notifier-popup-user-more" data-last-item="'+i+'">'+BX.message('IM_MESSENGER_CHAT_MORE_USER').replace('#USER_COUNT#', (this.userInChat[chatId].length-maxCount))+'</span>';
	}
	if (!showUser)
		this.popupMessengerPanelUsers.innerHTML = BX.message('IM_CL_LOAD');
}

BX.Messenger.prototype.renameChatDialog = function()
{
	if (this.renameChatDialogFlag)
		return false;

	this.renameChatDialogFlag = true;

	var chatId = this.currentTab.toString().substr(4);
	this.popupMessengerPanelChatTitle.innerHTML = '';

	BX.adjust(this.popupMessengerPanelChatTitle, {children: [
		BX.create("div", { props : { className : "bx-messenger-input-wrap bx-messenger-panel-title-chat-input" }, children : [
			this.renameChatDialogInput = BX.create("input", {props : { className : "bx-messenger-input" }, attrs: {type: "text", value: BX.util.htmlspecialcharsback(this.chat[chatId].name)}})
		]})
	]});
	this.renameChatDialogInput.focus();
	BX.bind(this.renameChatDialogInput, "blur", BX.delegate(function(){
		this.renameChatDialogInput.value = BX.util.trim(this.renameChatDialogInput.value);
		if (this.renameChatDialogInput.value.length > 0 && this.chat[chatId].name != BX.util.htmlspecialchars(this.renameChatDialogInput.value))
		{
			this.chat[chatId].name = BX.util.htmlspecialchars(this.renameChatDialogInput.value);
			this.popupMessengerPanelChatTitle.innerHTML = this.chat[chatId].name;
			BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				timeout: 60,
				data: {'IM_CHAT_RENAME' : 'Y', 'CHAT_ID' : chatId, 'CHAT_TITLE': this.renameChatDialogInput.value, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
				onsuccess: BX.delegate(function(){
					if (!this.BXIM.ppServerStatus)
						BX.PULL.updateState(true);
				}, this)
			});
		}
		this.popupMessengerPanelChatTitle.innerHTML = this.chat[chatId].name;
		this.renameChatDialogFlag = false;
	}, this));
	BX.bind(this.renameChatDialogInput, "keydown", BX.delegate(function(e) {
		if (e.keyCode == 27)
		{
			this.renameChatDialogInput.value = this.chat[chatId].name;
			this.popupMessengerTextarea.focus();
			return BX.PreventDefault(e);
		}
		else if (e.keyCode == 9 || e.keyCode == 13)
		{
			this.popupMessengerTextarea.focus();
			return BX.PreventDefault(e);
		}
	}, this));
}

BX.Messenger.prototype.openChatDialog = function(params)
{
	if (!this.enableGroupChat)
		return false;

	if (this.popupChatDialog != null)
	{
		this.popupChatDialog.close();
		return false;
	}
	var type = params.type == 'ADD'? 'ADD': 'EXTEND';
	var bindElement = params.bind? params.bind: null;

	this.popupChatDialog = new BX.PopupWindow('bx-messenger-popup-newchat', bindElement, {
		lightShadow : true,
		offsetTop: 5,
		offsetLeft: this.desktop.run()? 0: -170,
		autoHide: true,
		buttons: [
			new BX.PopupWindowButton({
				text : BX.message('IM_MESSENGER_CHAT_BTN_JOIN'),
				className : "popup-window-button-accept",
				events : { click : BX.delegate(function() {
					if (type == 'ADD')
					{
						var arUsers = [this.currentTab];
						for (var i in this.popupChatDialogUsers)
							arUsers.push(this.popupChatDialogUsers[i]);

						this.sendRequestChatDialog(type, arUsers);
					}
					else
					{
						var arUsers = [];
						for (var i in this.popupChatDialogUsers)
							arUsers.push(this.popupChatDialogUsers[i]);

						this.sendRequestChatDialog(type, arUsers, this.currentTab.substr(4));
					}

				}, this) }
			}),
			new BX.PopupWindowButton({
				text : BX.message('IM_MESSENGER_CHAT_BTN_CANCEL'),
				events : { click : BX.delegate(function() { this.popupChatDialog.close(); }, this) }
			})
		],
		closeByEsc: true,
		zIndex: 200,
		events : {
			onPopupClose : function() { this.destroy() },
			onPopupDestroy : BX.delegate(function() { this.popupChatDialogUsers = {}; this.popupChatDialog = null; this.popupChatDialogContactListElements = null; }, this)
		},
		content : BX.create("div", { props : { className : "bx-messenger-popup-newchat-wrap" }, children: [
			BX.create("div", { props : { className : "bx-messenger-popup-newchat-caption" }, html: BX.message('IM_MESSENGER_CHAT_TITLE')}),
			BX.create("div", { props : { className : "bx-messenger-popup-newchat-box bx-messenger-popup-newchat-dest bx-messenger-popup-newchat-dest-even" }, children: [
				this.popupChatDialogDestElements = BX.create("span", { props : { className : "bx-messenger-dest-items" }}),
				this.popupChatDialogContactListSearch = BX.create("input", {props : { className : "bx-messenger-input" }, attrs: {type: "text", placeholder: BX.message('IM_MESSENGER_SEARCH_PLACEHOLDER'), value: ''}})
			]}),
			this.popupChatDialogContactListElements = BX.create("div", { props : { className : "bx-messenger-popup-newchat-box bx-messenger-popup-newchat-cl" }, children: this.contactListPrepare({'groupOpen': true, 'viewGroup': true, 'viewOffline': true, 'extra': false, 'searchText': ''})})
		]})
	});
	this.popupChatDialog.setAngle({offset: this.desktop.run()? 20: 188});
	this.popupChatDialog.show();
	this.popupChatDialogContactListSearch.focus();

	BX.bind(this.popupChatDialog.popupContainer, "click", BX.PreventDefault);

	BX.bind(this.popupChatDialogContactListSearch, "keyup", BX.delegate(function(event){
		if (event.keyCode == 16 || event.keyCode == 17 || event.keyCode == 18 || event.keyCode == 20 || event.keyCode == 244 || event.keyCode == 224 || event.keyCode == 91)
			return false;

		if (event.keyCode == 27 && this.popupChatDialogContactListSearch.value != '')
			BX.IM.preventDefault(event);

		if (event.keyCode == 27)
			this.popupChatDialogContactListSearch.value = '';

		if (event.keyCode == 13)
		{
			this.popupContactListSearchInput.value = '';
			var item = BX.findChild(this.popupChatDialogContactListElements, {className : "bx-messenger-cl-item"}, true);
			if (item)
			{
				if (this.popupChatDialogContactListSearch.value != '')
				{
					this.popupChatDialogContactListSearch.value = '';
					BX.adjust(this.popupChatDialogContactListElements, {children: this.contactListPrepare({'groupOpen': true, 'viewOffline': true, 'viewGroup': true, 'extra': false, 'searchText': ''})});
				}
				if (this.popupChatDialogUsers[item.getAttribute('data-userId')])
					delete this.popupChatDialogUsers[item.getAttribute('data-userId')];
				else
					this.popupChatDialogUsers[item.getAttribute('data-userId')] = item.getAttribute('data-userId');

				this.redrawChatDialogDest();
			}
		}

		this.popupChatDialogContactListElements.innerHTML = '';
		BX.adjust(this.popupChatDialogContactListElements, {children: this.contactListPrepare({'groupOpen': true, 'viewOffline': true, 'viewGroup': false, 'extra': false, 'searchText': this.popupChatDialogContactListSearch.value})});
	}, this));
	BX.bindDelegate(this.popupChatDialogDestElements, "click", {className: 'bx-messenger-dest-del'}, BX.delegate(function() {
		delete this.popupChatDialogUsers[BX.proxy_context.getAttribute('data-userId')];
		this.redrawChatDialogDest();
	}, this));
	BX.bindDelegate(this.popupChatDialogContactListElements, "click", {className: 'bx-messenger-cl-item'}, BX.delegate(function(e) {
		if (this.popupChatDialogContactListSearch.value != '')
		{
			this.popupChatDialogContactListSearch.value = '';
			BX.adjust(this.popupChatDialogContactListElements, {children: this.contactListPrepare({'groupOpen': true, 'viewOffline': true, 'viewGroup': true, 'extra': false, 'searchText': ''})});
		}
		if (this.popupChatDialogUsers[BX.proxy_context.getAttribute('data-userId')])
			delete this.popupChatDialogUsers[BX.proxy_context.getAttribute('data-userId')];
		else
			this.popupChatDialogUsers[BX.proxy_context.getAttribute('data-userId')] = BX.proxy_context.getAttribute('data-userId');

		this.redrawChatDialogDest();

		return BX.PreventDefault(e);
	}, this));
}
BX.Messenger.prototype.redrawChatDialogDest = function()
{
	var content = '';
	var count = 0;
	for (var i in this.popupChatDialogUsers)
	{
		count++;
		content += '<span class="bx-messenger-dest-block">'+
						'<span class="bx-messenger-dest-text">'+(this.users[i].name)+'</span>'+
					'<span class="bx-messenger-dest-del" data-userId="'+i+'"></span></span>';
	}

	this.popupChatDialogDestElements.innerHTML = content;
	this.popupChatDialogDestElements.parentNode.scrollTop = this.popupChatDialogDestElements.parentNode.offsetHeight;

	if (BX.util.even(count))
		BX.addClass(this.popupChatDialogDestElements.parentNode, 'bx-messenger-popup-newchat-dest-even');
	else
		BX.removeClass(this.popupChatDialogDestElements.parentNode, 'bx-messenger-popup-newchat-dest-even');

	this.popupChatDialogContactListSearch.focus();
}
BX.Messenger.prototype.sendRequestChatDialog = function(type, users, chatId)
{
	if (this.popupChatDialogSendBlock)
		return false;

	var error = '';
	if (type == 'ADD' && users.length <= 1)
	{
		error = BX.message('IM_MESSENGER_CHAT_ERROR_1');
	}
	if (type == 'EXTEND' && users.length == 0)
	{
		if (this.popupChatDialog != null)
			this.popupChatDialog.close();
		return false;
	}

	if (error != "")
	{
		this.notify.openConfirm(error, [
			new BX.PopupWindowButton({
				text : BX.message('IM_NOTIFY_CONFIRM_CLOSE'),
				className : "popup-window-button-decline",
				events : { click : function(e) { this.popupWindow.close(); BX.PreventDefault(e); } }
			})
		], true);
		return false;
	}

	this.popupChatDialogSendBlock = true;
	if (this.popupChatDialog != null)
		this.popupChatDialog.buttons[0].setClassName('popup-window-button-disable');

	var data = {};
	if (type == 'ADD')
		data = {'IM_CHAT_ADD' : 'Y', 'USERS' : JSON.stringify(users), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
	else
		data = {'IM_CHAT_EXTEND' : 'Y', 'CHAT_ID' : chatId, 'USERS' : JSON.stringify(users), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 60,
		data: data,
		onsuccess: BX.delegate(function(data){
			this.popupChatDialogSendBlock = false;
			if (this.popupChatDialog != null)
				this.popupChatDialog.buttons[0].setClassName('popup-window-button-accept');
			if (data.ERROR == '')
			{
				if (!this.BXIM.ppServerStatus)
					BX.PULL.updateState(true);

				if (data.CHAT_ID)
				{
					if (this.BXIM.ppServerStatus && this.currentTab != 'chat'+data.CHAT_ID)
					{
						this.openMessenger('chat'+data.CHAT_ID);
					}
					else if (!this.BXIM.ppServerStatus && this.currentTab != 'chat'+data.CHAT_ID)
					{
						setTimeout( BX.delegate(function(){
							this.openMessenger('chat'+data.CHAT_ID);
						}, this), 500);
					}
				}
				this.popupChatDialogSendBlock = false;
				if (this.popupChatDialog != null)
					this.popupChatDialog.close();
			}
			else
			{
				this.notify.openConfirm(data.ERROR, [
					new BX.PopupWindowButton({
						text : BX.message('IM_NOTIFY_CONFIRM_CLOSE'),
						className : "popup-window-button-decline",
						events : { click : function(e) { this.popupWindow.close(); BX.PreventDefault(e); } }
					})
				], true);
			}
		}, this)
	});
}

/* RL & CL */
BX.Messenger.prototype.userListRedraw = function(params)
{
	if (this.recentList && this.contactListSearchText != null && this.contactListSearchText.length == 0)
		this.recentListRedraw(params);
	else
		this.contactListRedraw(params);
}
/* RL */
BX.Messenger.prototype.recentListRedraw = function()
{
	if (this.popupMessenger == null)
		return false;

	this.recentList = true;
	BX.addClass(this.recentListTab, 'bx-messenger-cl-switcher-tab-active');
	this.contactList = false;
	BX.removeClass(this.contactListTab, 'bx-messenger-cl-switcher-tab-active');

	if (this.contactListSearchText != null && this.contactListSearchText.length == 0)
		this.recentListReturn = true;
	else
	{
		this.contactListSearchText = '';
		this.popupContactListSearchInput.value = '';
	}

	this.closeMenuPopup();

	BX.addClass(this.popupContactListElementsWrap, 'bx-messenger-recent-wrap');
	this.popupContactListElementsWrap.innerHTML = '';
	BX.adjust(this.popupContactListElementsWrap, {children: this.recentListPrepare()});
}


BX.Messenger.prototype.recentListPrepare = function()
{
	var items = [];
	var groups = {};

	if (!this.recentListLoad)
	{
		items.push(BX.create("div", {
			props : { className: "bx-messenger-cl-item-load"},
			html : BX.message('IM_CL_LOAD')
		}));

		this.recentListGetFromServer();
		return items;
	}
	this.recent.sort(function(i, ii) {var i1 = parseInt(i.date); var i2 = parseInt(ii.date); if (i1 > i2) { return -1; } else if (i1 < i2) { return 1;} else{ if (i > ii) { return -1; } else if (i < ii) { return 1;}else{ return 0;}}});
	for (var i = 0; i < this.recent.length; i++)
	{
		if (typeof(this.recent[i].userIsChat) == 'undefined')
			this.recent[i].userIsChat = this.recent[i].recipientId.toString().substr(0,4) == 'chat'? true: false;

		var item = BX.clone(this.recent[i]);
		if (item.userIsChat)
		{
			user = this.chat[item.userId.toString().substr(4)];
			if (user == undefined || user.name == undefined)
				continue;
			var userId = 'chat'+user.id;
		}
		else
		{
			var user = this.users[item.userId];
			if (user == undefined || this.BXIM.userId == user.id || user.name == undefined)
				continue;

			var userId = user.id;
		}


		if (item.date > 0)
		{
			var format = [
				["tommorow", "tommorow"],
				["today", "today"],
				["yesterday", "yesterday"],
				["", BX.date.convertBitrixFormat(BX.message("IM_RESENT_FORMAT_DATE"))]
			];
			item.date = BX.date.format(format, parseInt(item.date)+parseInt(BX.message("SERVER_TZ_OFFSET")), BX.IM.getNowDate(), true);
			if (!groups[item.date])
			{
				groups[item.date] = true;
				items.push(BX.create("div", {props : { className: "bx-messenger-recent-group"}, children : [
					BX.create("span", {props : { className: "bx-messenger-recent-group-title"}, html : item.date})
				]}));
			}
		}
		else
		{
			if (!groups['never'])
			{
				groups['never'] = true;
				items.push(BX.create("div", {props : { className: "bx-messenger-recent-group"}, children : [
					BX.create("span", {props : { className: "bx-messenger-recent-group-title"}, html : BX.message('IM_RESENT_NEVER')})
				]}));
			}
		}

		var newMessage = '';
		var newMessageCount = '';
		if (this.unreadMessage[userId] && this.unreadMessage[userId].length>0)
		{
			newMessage = 'bx-messenger-cl-status-new-message';
			newMessageCount = '<span class="bx-messenger-cl-count-digit">'+(this.unreadMessage[userId].length<100? this.unreadMessage[userId].length: '99+')+'</span>';
		}

		var writingMessage = '';
		var directionIcon = '';
		if (!item.userIsChat)
		{
			if (this.writingList[userId])
				writingMessage = 'bx-messenger-cl-status-writing';

			if (item.senderId != userId)
				directionIcon = '<span class="bx-messenger-cl-user-reply"></span>';
		}

		items.push(BX.create("a", {
			props : { className: item.userIsChat? "bx-messenger-cl-item bx-messenger-cl-item-chat " +newMessage: "bx-messenger-cl-item bx-messenger-cl-status-" +(user.birthday? 'birthday': user.status)+ " " +newMessage+" "+writingMessage },
			attrs : { href: item.userIsChat? '#chat'+user.id: '#user'+user.id, 'data-userId' : userId, 'data-name' : user.name, 'data-status' : user.status? user.status: 'online', 'data-avatar' : user.avatar? user.avatar: '', 'data-userIsChat' : item.userIsChat },
			html :  '<span class="bx-messenger-cl-count">'+newMessageCount+'</span>'+
					(item.userIsChat ?'<span class="bx-messenger-cl-avatar bx-messenger-cl-avatar-group"><img class="bx-messenger-cl-avatar-img" src="/bitrix/js/im/images/blank.gif"><span class="bx-messenger-cl-status"></span></span>'
								:'<span class="bx-messenger-cl-avatar"><img class="bx-messenger-cl-avatar-img" src="'+user.avatar+'"><span class="bx-messenger-cl-status"></span></span>')+
					'<span class="bx-messenger-cl-user"><div class="bx-messenger-cl-user-title">'+(user.nameList? user.nameList: user.name)+'</div>'+
					'<div class="bx-messenger-cl-user-desc">'+directionIcon+''+BX.IM.prepareText(item.text)+'</div></span>'
		}));
	}

	if (items.length <= 0)
	{
		items.push(BX.create("div", {
			props : { className: "bx-messenger-cl-item-empty"},
			html :  BX.message('IM_MESSENGER_CL_EMPTY')
		}));
	}
	return items;
};

BX.Messenger.prototype.recentListAdd = function(params)
{
	params.text = params.text.replace(/<img.*?data-code="([^"]*)".*?>/ig, '$1');
	params.text = params.text.replace('<br />', ' ').replace(/<\/?[^>]+>/gi, '').replace(/------------------------------------------------------(.*?)------------------------------------------------------/gmi, " ["+BX.message("IM_MESSENGER_QUOTE_BLOCK")+"] ");

	var newRecent = [];
	newRecent.push(params);

	for (var i = 0; i < this.recent.length; i++)
		if (this.recent[i].userId != params.userId)
			newRecent.push(this.recent[i]);

	this.recent = newRecent;

	if (this.recentList)
		this.recentListRedraw();
}
BX.Messenger.prototype.recentListHide = function(userId, sendAjax)
{
	var newRecent = [];
	for (var i = 0; i < this.recent.length; i++)
		if (this.recent[i].userId != userId)
			newRecent.push(this.recent[i]);

	this.recent = newRecent;
	if (this.recentList)
		this.recentListRedraw();

	BX.localStorage.set('mrlr', userId, 5);

	sendAjax = sendAjax == false? false: true;
	if (sendAjax)
	{
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 60,
			data: {'IM_RECENT_HIDE' : 'Y', 'USER_ID' : userId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
		});
		this.readMessage(userId, true, true);
	}
}

BX.Messenger.prototype.recentListGetFromServer = function()
{
	if (this.recentListLoad)
		return false;

	this.recentListLoad = true;
	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 30,
		data: {'IM_RECENT_LIST' : 'Y', 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data)
		{
			if (data.ERROR == '')
			{
				this.recent = [];
				for (var i in data.RECENT)
				{
					data.RECENT[i].date = parseInt(data.RECENT[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
					this.recent.push(data.RECENT[i]);
				}

				var arRecent = false;
				for(var i in this.unreadMessage)
				{
					for (var k = 0; k < this.unreadMessage[i].length; k++)
					{
						if (!arRecent || arRecent.SEND_DATE <= this.message[this.unreadMessage[i][k]].date)
						{
							arRecent = {
								'ID': this.message[this.unreadMessage[i][k]].id,
								'SEND_DATE': this.message[this.unreadMessage[i][k]].date,
								'RECIPIENT_ID': this.message[this.unreadMessage[i][k]].recipientId,
								'SENDER_ID': this.message[this.unreadMessage[i][k]].senderId,
								'USER_ID': this.message[this.unreadMessage[i][k]].senderId,
								'SEND_MESSAGE': this.message[this.unreadMessage[i][k]].text
							};
						}
					}
				}
				if (arRecent)
				{
					this.recentListAdd({
						'userId': arRecent.RECIPIENT_ID.toString().substr(0,4) == 'chat'? arRecent.RECIPIENT_ID: arRecent.USER_ID,
						'id': arRecent.ID,
						'date': arRecent.SEND_DATE,
						'recipientId': arRecent.RECIPIENT_ID,
						'senderId': arRecent.SENDER_ID,
						'text': arRecent.SEND_MESSAGE
					}, true);
				}

				for (var i in data.CHAT)
				{
					if (this.chat[i] && this.chat[i].fake)
						data.CHAT[i].fake = true;
					else if (!this.chat[i])
						data.CHAT[i].fake = true;

					this.chat[i] = data.CHAT[i];
				}

				for (var i in data.USERS)
					this.users[i] = data.USERS[i];

				if (this.recentList)
					this.recentListRedraw();

				this.smile = data.SMILE;
				this.smileSet = data.SMILE_SET;

				if (this.smile != false)
					BX.removeClass(this.popupMessengerTextareaPlace, 'bx-messenger-textarea-smile-disabled');
			}
			else
			{
				this.recentListLoad = false;
				if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					BX.message({'bitrix_sessid': data.BITRIX_SESSID});
					setTimeout(BX.delegate(this.recentListGetFromServer, this), 1000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
				}
				else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					setTimeout(BX.delegate(this.recentListGetFromServer, this), 2000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR]);
				}
			}
		}, this),
		onfailure: BX.delegate(function(){
			this.sendAjaxTry = 0;
			this.recentListLoad = false;
		}, this)
	});
}

/* CL */
BX.Messenger.prototype.contactListRedraw = function(send)
{
	if (this.popupMessenger == null)
		return false;

	this.contactList = true;
	BX.addClass(this.contactListTab, 'bx-messenger-cl-switcher-tab-active');
	this.recentList = false;
	BX.removeClass(this.recentListTab, 'bx-messenger-cl-switcher-tab-active');

	if (this.contactListSearchText != null && this.contactListSearchText.length == 0)
		this.recentListReturn = false;

	this.closeMenuPopup();

	BX.removeClass(this.popupContactListElementsWrap, 'bx-messenger-recent-wrap');
	this.popupContactListElementsWrap.innerHTML = '';
	BX.adjust(this.popupContactListElementsWrap, {children: this.contactListPrepare()});

	send = send == true? true: false;
	if (send)
		BX.localStorage.set('mrd', {viewGroup: this.settings.viewGroup, viewOffline: this.settings.viewOffline}, 5);
}

BX.Messenger.prototype.contactListPrepare = function(params)
{
	params = typeof(params) == 'object'? params: {};
	var items = [];
	var groupsTmp = {};
	var groups = {};
	var unreadUsers = [];
	var userInGroup = {};

	var searchText = typeof(params.searchText) != 'undefined'? params.searchText: this.contactListSearchText;
	var activeSearch = searchText != null && searchText.length == 0? false: true;
	var extraEnable =  typeof(params.extra) != 'undefined'? params.extra: true;
	var groupOpen =  typeof(params.groupOpen) != 'undefined'? params.groupOpen: 'auto';
	var viewGroup =  typeof(params.viewGroup) != 'undefined'? params.viewGroup: activeSearch? false: this.settings.viewGroup;
	var viewOffline =  typeof(params.viewOffline) != 'undefined'? params.viewOffline: activeSearch? true: this.settings.viewOffline;

	if (viewGroup)
	{
		groupsTmp = this.groups;
		userInGroup = this.userInGroup;
	}
	else
	{
		groupsTmp = this.woGroups;
		userInGroup = this.woUserInGroup;
	}
	var groupCount = 0;
	for (var i in groupsTmp)
		groupCount++;

	if (groupCount <= 0 && !this.contactListLoad)
	{
		items.push(BX.create("div", {
			props : { className: "bx-messenger-cl-item-load"},
			html : BX.message('IM_CL_LOAD')
		}));

		this.contactListGetFromServer();
		return items;

	}
	var arSearch = [];
	if (activeSearch)
		arSearch = (searchText+'').split(" ");

	groups[0] = {'id': 0, 'name': BX.message('IM_MESSENGER_CL_UNREAD'), 'status':'open'};
	for (var i in this.unreadMessage) unreadUsers.push(i);
	userInGroup[0] = {'id':0, 'users': unreadUsers};
	for (var i in groupsTmp)
	{
		if (i != 'last' && i != 0 )
			groups[i] = groupsTmp[i];
	}

	for (var i in groups)
	{
		var group = groups[i];
		if (typeof(group) == 'undefined' || !group.name || !BX.type.isNotEmptyString(group.name))
			continue;

		var userItems = [];
		if (userInGroup[i])
		{
			for (var j = 0; j < userInGroup[i].users.length; j++)
			{
				var user = this.users[userInGroup[i].users[j]];
				if (user == undefined || this.BXIM.userId == user.id || user.name == undefined)
					continue;

				if (activeSearch)
				{
					var skipUser = false;
					for (var s = 0; s < arSearch.length; s++)
						if (user.name.toLowerCase().indexOf(arSearch[s].toLowerCase()) < 0)
							skipUser = true;

					if (skipUser)
						continue;
				}

				var newMessage = '';
				var newMessageCount = '';
				if (extraEnable && this.unreadMessage[user.id] && this.unreadMessage[user.id].length>0)
				{
					newMessage = 'bx-messenger-cl-status-new-message';
					newMessageCount = '<span class="bx-messenger-cl-count-digit">'+(this.unreadMessage[user.id].length<100? this.unreadMessage[user.id].length: '99+')+'</span>';
				}

				var writingMessage = '';
				if (extraEnable && this.writingList[user.id])
					writingMessage = 'bx-messenger-cl-status-writing';

				if (i != 'last' && viewOffline == false && user.status == "offline" && newMessage == '')
					continue;

				var src = '_src="'+user.avatar+'" src="/bitrix/js/im/images/blank.gif"';
				if (activeSearch || (group.status == "open" && groupOpen == 'auto') || groupOpen == true)
					src = 'src="'+user.avatar+'" _src="/bitrix/js/im/images/blank.gif"';

				userItems.push(BX.create("a", {
					props : { className: "bx-messenger-cl-item bx-messenger-cl-status-" +(user.birthday? 'birthday': user.status)+ " " +newMessage+" "+writingMessage },
					attrs : { href:'#user'+user.id, 'data-userId' : user.id, 'data-name' : user.name, 'data-status' : user.status, 'data-avatar' : user.avatar },
					html :  '<span class="bx-messenger-cl-count">'+newMessageCount+'</span>'+
							'<span class="bx-messenger-cl-avatar"><img class="bx-messenger-cl-avatar-img" '+src+'><span class="bx-messenger-cl-status"></span></span>'+
							'<span class="bx-messenger-cl-user">'+(user.nameList? user.nameList: user.name)+'</span>'
				}));
			}
			if (userItems.length > 0)
			{
				items.push(BX.create("div", {
					attrs : { 'data-groupId-wrap' : group.id },
					props : { className: "bx-messenger-cl-group" +  (activeSearch || (group.status == "open" && groupOpen == 'auto') || groupOpen == true ? " bx-messenger-cl-group-open" : "")},
					children : [
						BX.create("div", {props : { className: "bx-messenger-cl-group-title"}, attrs : { 'data-groupId' : group.id, title : group.name }, html : group.name}),
						BX.create("span", {props : { className: "bx-messenger-cl-group-wrapper"}, children : userItems})
					]
				}));
			}
		}
	}
	if (items.length <= 0)
	{
		items.push(BX.create("div", {
			props : { className: "bx-messenger-cl-item-empty"},
			html :  BX.message('IM_MESSENGER_CL_EMPTY')
		}));
	}

	return items;
};

BX.Messenger.prototype.contactListGetFromServer = function()
{
	if (this.contactListLoad)
		return false;

	this.contactListLoad = true;
	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 30,
		data: {'IM_CONTACT_LIST' : 'Y', 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data)
		{
			if (data.ERROR == '')
			{
				for (var i in data.USERS)
					this.users[i] = data.USERS[i];

				for (var i in data.GROUPS)
					this.groups[i] = data.GROUPS[i];

				for (var i in data.USER_IN_GROUP)
				{
					if (this.userInGroup[i] == undefined)
						this.userInGroup[i] = data.USER_IN_GROUP[i];
					else
					{
						for (var j = 0; j < data.USER_IN_GROUP[i].users.length; j++)
							this.userInGroup[i].users.push(data.USER_IN_GROUP[i].users[j]);

						this.userInGroup[i].users = BX.util.array_unique(this.userInGroup[i].users)
					}
				}

				for (var i in data.WO_GROUPS)
					this.woGroups[i] = data.WO_GROUPS[i];

				for (var i in data.WO_USER_IN_GROUP)
				{
					if (typeof(this.woUserInGroup[i]) == 'undefined')
						this.woUserInGroup[i] = data.WO_USER_IN_GROUP[i];
					else
					{
						for (var j = 0; j < data.WO_USER_IN_GROUP[i].users.length; j++)
							this.woUserInGroup[i].users.push(data.WO_USER_IN_GROUP[i].users[j]);

						this.woUserInGroup[i].users = BX.util.array_unique(this.woUserInGroup[i].users)
					}
				}

				if (this.contactList)
					this.contactListRedraw();

				if (this.popupChatDialogContactListElements != null)
				{
					this.popupChatDialogContactListElements.innerHTML = '';
					BX.adjust(this.popupChatDialogContactListElements, {children: this.contactListPrepare({'groupOpen': true, 'viewOffline': true, 'viewGroup': false, 'extra': false, 'searchText': this.popupChatDialogContactListSearch.value})});
				}
			}
			else
			{
				this.contactListLoad = false;
				if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					BX.message({'bitrix_sessid': data.BITRIX_SESSID});
					setTimeout(BX.delegate(this.contactListGetFromServer, this), 1000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
				}
				else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					setTimeout(BX.delegate(this.contactListGetFromServer, this), 2000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR]);
				}
			}
		}, this),
		onfailure: BX.delegate(function(){
			this.sendAjaxTry = 0;
			this.contactListLoad = false;
		}, this)
	});
}

BX.Messenger.prototype.openContactList = function()
{
	return this.openMessenger();
};

BX.Messenger.prototype.contactListSearch = function(event)
{
	if (event.keyCode == 16 || event.keyCode == 17 || event.keyCode == 18 || event.keyCode == 20 || event.keyCode == 244 || event.keyCode == 224 || event.keyCode == 91)
		return false;

	this.recentList = false;
	this.contactList = true;

	if (event.keyCode == 27)
	{
		if (this.contactListSearchText <= 0)
			this.popupMessenger.destroy();
		else
			this.popupContactListSearchInput.value = "";
	}

	if (event.keyCode == 13)
	{
		this.popupContactListSearchInput.value = '';
		var item = BX.findChild(this.popupContactListElementsWrap, {className : "bx-messenger-cl-item"}, true);
		if (item)
			this.openMessenger(item.getAttribute('data-userid'));
	}

	this.contactListSearchText = BX.util.trim(this.popupContactListSearchInput.value);
	BX.localStorage.set('mns', this.contactListSearchText, 5);

	if (this.contactListSearchText == '')
	{
		if (this.recentListReturn)
		{
			this.recentList = true;
			this.contactList = false;
		}
	}
	this.userListRedraw();
}

BX.Messenger.prototype.openPopupMenu = function(bind, type)
{
	if (this.popupSmileMenu != null)
		this.popupSmileMenu.destroy();
	if (this.popupPopupMenu != null)
	{
		this.popupPopupMenu.destroy();
		return false;
	}
	var menuItems = [];
	var bindOptions = {};
	if (type == 'status')
	{
		bindOptions = {position: "top"};
		menuItems = [
			{icon: 'bx-messenger-status-online', text: BX.message("IM_STATUS_ONLINE"), onclick: BX.delegate(function(){ this.setStatus('online'); this.closeMenuPopup(); }, this)},
			{icon: 'bx-messenger-status-dnd', text: BX.message("IM_STATUS_DND"), onclick: BX.delegate(function(){ this.setStatus('dnd'); this.closeMenuPopup(); }, this)}
		];
	}
	else if (type == 'callMenu')
	{
		menuItems = [
			this.webrtc.videoMuted? null: {icon: 'bx-messenger-menu-call-video', text: BX.message('IM_MESSENGER_CALL_VIDEO'), onclick: BX.delegate(function(){ this.webrtc.callInvite(this.currentTab, true); this.closeMenuPopup(); }, this)},
			{icon: 'bx-messenger-menu-call-voice', text: BX.message('IM_MESSENGER_CALL_VOICE'), onclick: BX.delegate(function(){ this.webrtc.callInvite(this.currentTab, false); this.closeMenuPopup(); }, this)}
		];
	}
	else if (type == 'chatUser')
	{
		var userId = bind.getAttribute('data-userId');
		var chatId = this.currentTab.substr(4);
		if (userId == this.BXIM.userId)
		{
			menuItems = [
				{icon: 'bx-messenger-menu-chat-exit', text: BX.message('IM_MESSENGER_CHAT_EXIT'), onclick: BX.delegate(function(){ this.leaveFromChat(chatId); this.closeMenuPopup();}, this)}
			];
		}
		else
		{
			menuItems = [
				{icon: 'bx-messenger-menu-chat-put', text: BX.message('IM_MESSENGER_CHAT_PUT'), onclick: BX.delegate(function(){ this.insertTextareaText(' '+this.users[userId].name+', ', false); this.popupMessengerTextarea.focus(); this.closeMenuPopup(); }, this)},
				{icon: 'bx-messenger-menu-write', text: BX.message('IM_MESSENGER_WRITE_MESSAGE'), onclick: BX.delegate(function(){ this.openMessenger(userId); this.closeMenuPopup(); }, this)},
				{icon: 'bx-messenger-menu-profile', text: BX.message('IM_MESSENGER_OPEN_PROFILE'), href: this.users[userId].profile, onclick: BX.delegate(function(){ this.closeMenuPopup(); }, this)},
				this.chat[chatId].owner == this.BXIM.userId? {icon: 'bx-messenger-menu-chat-exit', text: BX.message('IM_MESSENGER_CHAT_KICK'), onclick: BX.delegate(function(){ this.kickFromChat(chatId, userId); this.closeMenuPopup();}, this)}: {}
			];
		}
	}
	else if (type == 'contactList')
	{
		var userId = bind.getAttribute('data-userId');
		var userIsChat = bind.getAttribute('data-userIsChat');
		if (this.recentList)
		{
			menuItems = [
				{icon: 'bx-messenger-menu-write', text: BX.message('IM_MESSENGER_WRITE_MESSAGE'), onclick: BX.delegate(function(){ this.openMessenger(userId); this.closeMenuPopup(); }, this)},
				{icon: 'bx-messenger-menu-history', text: BX.message('IM_MESSENGER_OPEN_HISTORY'), onclick: BX.delegate(function(){ this.openHistory(userId); this.closeMenuPopup();}, this)},
				!userIsChat? {icon: 'bx-messenger-menu-profile', text: BX.message('IM_MESSENGER_OPEN_PROFILE'), href: this.users[userId].profile, onclick: BX.delegate(function(){ this.closeMenuPopup(); }, this)}: {},
				userIsChat ? {icon: 'bx-messenger-menu-chat-rename', text: BX.message('IM_MESSENGER_CHAT_RENAME'), onclick: BX.delegate(function(){ this.openMessenger(userId); this.renameChatDialog();  this.closeMenuPopup();}, this)}: {},
				userIsChat ? {icon: 'bx-messenger-menu-chat-exit', text: BX.message('IM_MESSENGER_CHAT_EXIT'), onclick: BX.delegate(function(){ this.leaveFromChat(userId.toString().substr(4)); this.closeMenuPopup();}, this)}: {},
				userIsChat? {}: {icon: 'bx-messenger-menu-hide-'+(userIsChat? 'chat': 'dialog'), text: BX.message('IM_MESSENGER_HIDE_'+(userIsChat? 'CHAT': 'DIALOG')), onclick: BX.delegate(function(){ this.recentListHide(userId); this.closeMenuPopup();}, this)}
			];
		}
		else
		{
			menuItems = [
				{icon: 'bx-messenger-menu-write', text: BX.message('IM_MESSENGER_WRITE_MESSAGE'), onclick: BX.delegate(function(){ this.openMessenger(userId); this.closeMenuPopup(); }, this)},
				{icon: 'bx-messenger-menu-history', text: BX.message('IM_MESSENGER_OPEN_HISTORY'), onclick: BX.delegate(function(){ this.openHistory(userId); this.closeMenuPopup();}, this)},
				{icon: 'bx-messenger-menu-profile', text: BX.message('IM_MESSENGER_OPEN_PROFILE'), href: this.users[userId].profile, onclick: BX.delegate(function(){ this.closeMenuPopup(); }, this)}
			];
		}
	}
	else if (type == 'settings')
	{
		bindOptions = {position: "top"};
		menuItems = [
			!this.desktop.ready()? null: {
				icon: !this.desktop.autorunStatus()? 'bx-messenger-cl-panel-autorun-active': 'bx-messenger-cl-panel-autorun',
				text: !this.desktop.autorunStatus()? BX.message("IM_MESSENGER_DESKTOP_AUTORUN_ON"): BX.message("IM_MESSENGER_DESKTOP_AUTORUN_OFF"),
				onclick: BX.delegate(function(){
					this.desktop.autorunStatus(!this.desktop.autorunStatus());
					this.closeMenuPopup();
				}, this)
			},
			{
				icon: !this.settings.viewOffline? 'bx-messenger-cl-panel-offline-active': 'bx-messenger-cl-panel-offline',
				text: !this.settings.viewOffline? BX.message("IM_MESSENGER_VIEW_OFFLINE_ON"): BX.message("IM_MESSENGER_VIEW_OFFLINE_OFF"),
				onclick: BX.delegate(function(){
					this.settings.viewOffline = this.settings.viewOffline? false: true;
					BX.userOptions.save('IM', 'settings', 'viewOffline', this.settings.viewOffline? 'Y': 'N');
					this.userListRedraw(true);
					this.closeMenuPopup();
				}, this)
			},
			{
				icon: !this.settings.viewGroup? 'bx-messenger-cl-panel-group-active': 'bx-messenger-cl-panel-group',
				text: !this.settings.viewGroup? BX.message("IM_MESSENGER_VIEW_GROUP_ON"): BX.message("IM_MESSENGER_VIEW_GROUP_OFF"),
				onclick: BX.delegate(function(){
					this.settings.viewGroup = this.settings.viewGroup? false: true;
					BX.userOptions.save('IM', 'settings', 'viewGroup', this.settings.viewGroup? 'Y': 'N');
					this.userListRedraw(true);
					this.closeMenuPopup();
				}, this)
			},
			!this.BXIM.audioSupport? null:
			{
				icon: !this.BXIM.enableSound? 'bx-messenger-cl-panel-sound-active': 'bx-messenger-cl-panel-sound',
				text: !this.BXIM.enableSound? BX.message("IM_MESSENGER_ENABLE_SOUND_ON"): BX.message("IM_MESSENGER_ENABLE_SOUND_OFF"),
				onclick: BX.delegate(function(){
					this.BXIM.enableSound = this.BXIM.enableSound? false: true;
					BX.userOptions.save('IM', 'settings', 'enableSound', this.BXIM.enableSound? 'Y': 'N');
					BX.localStorage.set('mes', this.BXIM.enableSound, 5);
					this.closeMenuPopup();
				}, this)
			}
		];
	}
	else
	{
		menuItems = [];
	}

	this.popupPopupMenu = new BX.PopupWindow('bx-messenger-popup-status-menu', bind, {
		lightShadow : true,
		offsetTop: 0,
		offsetLeft: 10,
		autoHide: true,
		closeByEsc: true,
		zIndex: 200,
		bindOptions: bindOptions,
		events : {
			onPopupClose : function() { this.destroy() },
			onPopupDestroy : BX.delegate(function() { this.popupPopupMenu = null; }, this)
		},
		content : BX.create("div", { props : { className : "bx-messenger-popup-menu" }, children: [
			BX.create("div", { props : { className : "bx-messenger-popup-menu-items" }, children: BX.Messenger.MenuPrepareList(this.contactListPanelStatus, menuItems)})
		]})
	});
	this.popupPopupMenu.setAngle({offset: 4});
	this.popupPopupMenu.show();
	BX.bind(this.popupPopupMenu.popupContainer, "click", BX.IM.preventDefault);

	return false;
};

BX.Messenger.prototype.resizeCLStart = function(e)
{
	if(!e) e = window.event;

	this.popupMessengerCLResize = {};
	this.popupMessengerCLResize.wndSize = BX.GetWindowScrollPos();
	this.popupMessengerCLResize.pos = BX.pos(this.popupContactListResize);
	this.popupMessengerCLResize.x = e.clientX + this.popupMessengerCLResize.wndSize.scrollLeft;
	this.popupMessengerCLResize.offsetLeft = this.popupContactListResize.offsetLeft;

	BX.bind(document, "mousemove", BX.proxy(this.resizeCLMove, this));
	BX.bind(document, "mouseup", BX.proxy(this.resizeCLStop, this));

	if(document.body.setCapture)
		document.body.setCapture();

	document.onmousedown = BX.False;

	var b = document.body;
	b.ondrag = b.onselectstart = BX.False;
	b.style.MozUserSelect = 'none';
	b.style.cursor = 'move';
};
BX.Messenger.prototype.resizeCLMove = function(e)
{
	if(!e) e = window.event;

	var windowScroll = BX.GetWindowScrollPos();
	var x = e.clientX + windowScroll.scrollLeft;
	var y = e.clientY + windowScroll.scrollTop;
	if(this.popupMessengerCLResize.x == x)
		return;

	this.popupContactListSize = Math.max(Math.min((x-this.popupMessengerCLResize.pos.left) + this.popupMessengerCLResize.offsetLeft, 500), 254);
	this.popupContactListWrap.style.width = this.popupContactListSize + 'px';
	this.popupContactListResize.style.marginLeft = this.popupContactListSize + 'px';
	this.popupMessengerExtra.style.marginLeft = this.popupContactListSize + 'px';
	this.popupMessengerDialog.style.marginLeft = this.popupContactListSize + 'px';

	clearTimeout(this.BXIM.adjustSizeTimeout);
	this.BXIM.adjustSizeTimeout = setTimeout(BX.delegate(function(){
		this.BXIM.setLocalConfig('msz', {
			'wz': this.desktop.run() ? this.desktop.width: this.desktop.ready()? document.body.offsetWidth: this.popupMessengerFullWidth,
			'ta': this.popupMessengerTextareaSize,
			'b': this.popupMessengerBodySize,
			'cl': this.popupContactListSize,
			'hi': this.popupHistoryItemsSize,
			'fz': this.popupMessengerFullHeight,
			'ez': this.popupContactListElementsSize,
			'nz': this.notify.popupNotifySize,
			'hf': this.popupHistoryFilterVisible,
			'place': 'clMove'
		});
	}, this), 500);

	this.popupMessengerCLResize.x = x;
	this.popupMessengerCLResize.y = y;
}

BX.Messenger.prototype.resizeCLStop = function()
{
	if(document.body.releaseCapture)
		document.body.releaseCapture();

	BX.unbind(document, "mousemove", BX.proxy(this.resizeCLMove, this));
	BX.unbind(document, "mouseup", BX.proxy(this.resizeCLStop, this));

	document.onmousedown = null;

	var b = document.body;
	b.ondrag = b.onselectstart = null;
	b.style.MozUserSelect = '';
	b.style.cursor = '';
}

/* HISTORY */
BX.Messenger.prototype.openHistory = function(userId)
{
	if (userId == this.BXIM.userId)
		return false;

	if (this.historyWindowBlock)
		return false;

	if (this.popupHistory != null)
		this.popupHistory.destroy();

	var chatId = 0;
	var isChat = false;
	if (userId.toString().substr(0,4) == 'chat')
	{
		isChat = true;
		chatId = parseInt(userId.toString().substr(4));
		if (chatId <= 0)
			return false;
	}
	else
	{
		userId = parseInt(userId);
		if (userId <= 0)
			return false;
	}

	if (!isChat && !this.users[userId])
		this.users[userId] = {'id': userId, 'avatar': '/bitrix/js/im/images/blank.gif', 'name': BX.message('IM_MESSENGER_LOAD_USER'), 'profile': this.BXIM.path.profileTemplate.replace('#user_id#', userId), 'status': 'na', 'fake': true};
	else if (isChat && !this.chat[chatId])
		this.chat[chatId] = {'id': chatId, 'name': BX.message('IM_MESSENGER_LOAD_USER'), 'owner': 0, 'fake': true};

	this.historyUserId = userId;

	if (this.popupMessenger != null && !this.desktop.run())
		this.popupMessenger.setClosingByEsc(false);

	this.popupHistoryElements = BX.create("div", { props : { className : "bx-messenger-history" }, children: [
			!isChat?
			BX.create("div", { props : { className : "bx-messenger-panel bx-messenger-panel-bg2" }, children : [
				BX.create('a', { attrs : { href : this.users[userId].profile}, props : { className : "bx-messenger-panel-avatar bx-messenger-panel-avatar-status-"+(this.users[userId].birthday? 'birthday': this.users[userId].status) }, children: [
					BX.create('img', { attrs : { src : this.users[userId].avatar}, props : { className : "bx-messenger-panel-avatar-img" }}),
					BX.create('span', { props : { className : "bx-messenger-panel-avatar-status" }})
				]}),
				this.popupHistoryButtonDeleteAll = BX.create("a", { props : { className : "bx-messenger-panel-basket"}}),
				this.popupHistoryButtonFilter = BX.create("a", { props : { className : "bx-messenger-panel-filter"}, html: (this.popupHistoryFilterVisible? BX.message("IM_HISTORY_FILTER_OFF"):BX.message("IM_HISTORY_FILTER_ON"))}),
				BX.create("span", { props : { className : "bx-messenger-panel-title"}, html: this.users[userId].name}),
				BX.create("span", { props : { className : "bx-messenger-panel-desc"}, html: BX.message("IM_STATUS_"+this.users[userId].status.toUpperCase())})
			]})
			:BX.create("div", { props : { className : "bx-messenger-panel bx-messenger-panel-bg2" }, children : [
				BX.create('span', { props : { className : "bx-messenger-panel-avatar" }}),
				this.popupHistoryButtonDeleteAll = BX.create("a", { props : { className : "bx-messenger-panel-basket"}}),
				this.popupHistoryButtonFilter = BX.create("a", { props : { className : "bx-messenger-panel-filter"}, html: (this.popupHistoryFilterVisible? BX.message("IM_HISTORY_FILTER_OFF"):BX.message("IM_HISTORY_FILTER_ON"))}),
				BX.create("span", { props : { className : "bx-messenger-panel-title bx-messenger-panel-title-middle"}, html: this.chat[chatId].name})
			]}),
			this.popupHistoryButtonFilterBox = BX.create("div", { props : { className : "bx-messenger-panel-filter-box" }, style : {display: this.popupHistoryFilterVisible? 'block': 'none'}, children : [
				BX.create('div', {props : { className : "bx-messenger-filter-name" }, html: BX.message('IM_HISTORY_FILTER_NAME')}),
				//BX.create('div', {props : { className : "bx-messenger-filter-date bx-messenger-input-wrap" }, html: '<input type="text" class="bx-messenger-input" value="" placeholder="'+BX.message('IM_PANEL_FILTER_DATE')+'" />'}),
				this.popupHistorySearchWrap = BX.create('div', {props : { className : "bx-messenger-filter-text bx-messenger-history-filter-text bx-messenger-input-wrap" }, html: '<a class="bx-messenger-input-close" href="#close"></a><input type="text" class="bx-messenger-input" placeholder="'+BX.message('IM_PANEL_FILTER_TEXT')+'" value="" />'})
			]}),
			this.popupHistoryItems = BX.create("div", { props : { className : "bx-messenger-history-items" }, style : {height: this.popupHistoryItemsSize+'px'}, children : [
				this.popupHistoryBodyWrap = BX.create("div", { props : { className : "bx-messenger-history-items-wrap" }})
			]})
	]});

	if (this.BXIM.init && this.desktop.ready())
	{
		this.desktop.openHistory(userId, this.popupHistoryElements, "BXIM.openHistory('"+userId+"');");
		return false;
	}
	else if (this.desktop.ready())
	{
		this.popupHistory = new BX.PopupWindowDesktop();
		this.desktop.drawOnPlaceholder(this.popupHistoryElements);
	}
	else
	{
		this.popupHistory = new BX.PopupWindow('bx-messenger-popup-history', null, {
			lightShadow : true,
			offsetTop: 0,
			autoHide: false,
			zIndex: 300,
			draggable: {restrict: true},
			closeByEsc: true,
			bindOptions: {position: "top"},
			events : {
				onPopupClose : function() { this.destroy(); },
				onPopupDestroy : BX.delegate(function() { this.popupHistory = null; this.historySearch = ''; if (this.popupMessenger != null && !this.webrtc.callInit) { this.popupMessenger.setClosingByEsc(true) }}, this)
			},
			titleBar: {content: BX.create('span', {props : { className : "bx-messenger-title" }, html: BX.message('IM_MESSENGER_HISTORY')})},
			closeIcon : {'top': '10px', 'right': '13px'},
			content : this.popupHistoryElements
		});
		this.popupHistory.show();
		BX.bind(this.popupHistory.popupContainer, "click", BX.IM.preventDefault);
	}
	this.drawHistory(this.historyUserId);

	this.popupHistorySearchInput = BX.findChild(this.popupHistorySearchWrap, {className : "bx-messenger-input"}, true);
	this.popupHistorySearchInputClose = BX.findChild(this.popupHistorySearchInput.parentNode, {className : "bx-messenger-input-close"}, true);

	if (this.popupHistoryFilterVisible && !BX.browser.IsAndroid() && !BX.browser.IsIOS())
		BX.focus(this.popupHistorySearchInput);

	BX.bind(this.popupHistorySearchInputClose, "click",  BX.delegate(function(e){
		this.popupHistorySearchInput.value = '';
		this.historySearch = "";
		this.drawHistory(this.historyUserId);
		return BX.PreventDefault(e);
	}, this));
	BX.bind(this.popupHistorySearchInput, "keyup", BX.delegate(this.newHistorySearch, this));

	BX.bind(this.popupHistoryButtonFilter, "click",  BX.delegate(function(){
		if (this.popupHistoryFilterVisible)
		{
			this.popupHistoryButtonFilter.innerHTML = BX.message("IM_HISTORY_FILTER_ON");
			this.popupHistoryItemsSize = this.popupHistoryItemsSize+this.popupHistoryButtonFilterBox.offsetHeight;
			this.popupHistoryItems.style.height = this.popupHistoryItemsSize+'px';
			BX.style(this.popupHistoryButtonFilterBox, 'display', 'none');
			this.popupHistoryFilterVisible = false;
			this.popupHistorySearchInput.value = '';
			this.historySearch = "";
			this.drawHistory(this.historyUserId);
		}
		else
		{
			this.popupHistoryButtonFilter.innerHTML = BX.message("IM_HISTORY_FILTER_OFF");
			BX.style(this.popupHistoryButtonFilterBox, 'display', 'block');
			this.popupHistoryItemsSize = this.popupHistoryItemsSize-this.popupHistoryButtonFilterBox.offsetHeight;
			this.popupHistoryItems.style.height = this.popupHistoryItemsSize+'px';
			BX.focus(this.popupHistorySearchInput);
			this.popupHistoryFilterVisible = true;
		}
	}, this));

	//this.popupHistoryButtonDeleteAll = BX.findChild(this.popupHistoryElements, {className : "bx-messenger-history-delete-icon"}, true);
	BX.bind(this.popupHistoryButtonDeleteAll, "click",  BX.delegate(function(){
		if (!confirm(BX.message('IM_MESSENGER_HISTORY_DELETE_ALL_CONFIRM')))
			return false;
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 30,
			data: {'IM_HISTORY_REMOVE_ALL' : 'Y', 'USER_ID' : userId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
		});
		BX.localStorage.set('mhra', userId, 5);

		this.history[userId] = [];
		this.showMessage[userId] = [];
		this.popupHistoryBodyWrap.innerHTML = '';
		this.popupHistoryBodyWrap.appendChild(BX.create("div", { props : { className : "bx-messenger-content-history-empty" }, children : [
			BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_NO_MESSAGE')})
		]}));
		this.openMessenger(userId);
	}, this));

	var endOfList = false;
	var tmpLoadMoreWaitFlag = false;
	BX.bind(this.popupHistoryItems, "scroll", BX.delegate(function(){
		if (tmpLoadMoreWaitFlag)
			return;

		if (this.historySearch != "")
			return;

		if (!(this.popupHistoryItems.scrollTop > this.popupHistoryItems.scrollHeight - this.popupHistoryItems.offsetHeight-50))
			return;

		if (!endOfList)
		{
			tmpLoadMoreWaitFlag = true;

			if (this.history[userId])
				this.historyOpenPage[userId] = Math.floor(this.history[userId].length/20)+1;
			else
				this.historyOpenPage[userId] = 1;

			var tmpLoadMoreWait = null;
			this.popupHistoryBodyWrap.appendChild(tmpLoadMoreWait = BX.create("div", { props : { className : "bx-messenger-content-load-more-history" }, children : [
				BX.create('span', { props : { className : "bx-messenger-content-load-img" }}),
				BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_LOAD_MESSAGE')})
			]}));

			BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				timeout: 30,
				data: {'IM_HISTORY_LOAD_MORE' : 'Y', 'USER_ID' : userId, 'PAGE_ID' : this.historyOpenPage[userId], 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
				onsuccess: BX.delegate(function(data){
					BX.remove(tmpLoadMoreWait);
					tmpLoadMoreWaitFlag = false;
					if (data.MESSAGE.length == 0)
					{
						endOfList = true;
						return;
					}

					for (var i in data.MESSAGE)
					{
						data.MESSAGE[i].date = parseInt(data.MESSAGE[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
						if (this.message[i])
						{
							this.message[i].moreHistoryDraw = false;
						}
						else
						{
							data.MESSAGE[i].moreHistoryDraw = true;
							this.message[i] = data.MESSAGE[i];
						}
					}
					for (var i in data.USERS_MESSAGE)
					{
						if (this.history[i])
							this.history[i] = BX.util.array_merge(this.history[i], data.USERS_MESSAGE[i]);
						else
							this.history[i] = data.USERS_MESSAGE[i];
					}
					for (var i = 0; i < data.USERS_MESSAGE[userId].length; i++)
					{
						var history = this.message[data.USERS_MESSAGE[userId][i]];
						if (history && history.moreHistoryDraw)
						{
							this.popupHistoryBodyWrap.appendChild(
								BX.create("div", { attrs : { 'data-messageId' : history.id}, props : { className : "bx-messenger-history-item"+(history.senderId == 0? " bx-messenger-history-item-3": (history.senderId == this.BXIM.userId?"": " bx-messenger-history-item-2")) }, children : [
									BX.create("div", { props : { className : "bx-messenger-history-item-name" }, html : (this.users[history.senderId]? this.users[history.senderId].name: BX.message('IM_MESSENGER_SYSTEM_USER'))+' <span class="bx-messenger-history-hide">[</span><span class="bx-messenger-history-item-date">'+BX.IM.formatDate(history.date)+'</span><span class="bx-messenger-history-hide">]</span>'/*<span class="bx-messenger-history-item-delete-icon" title="'+BX.message('IM_MESSENGER_HISTORY_DELETE')+'" data-messageId="'+history.id+'"></span>*/}),
									//BX.create("div", { props : { className : "bx-messenger-history-item-nearby" }, html : BX.message('IM_HISTORY_NEARBY')}),
									BX.create("div", { props : { className : "bx-messenger-history-item-text" }, html : BX.IM.prepareText(history.text, false, true)}),
									BX.create("div", { props : { className : "bx-messenger-history-hide" }, html : this.historyMessageSplit})
								]})
							);
						}
					}
				}, this),
				onfailure: function(){
					BX.remove(tmpLoadMoreWait);
				}
			});
		}
	}, this));
};


BX.Messenger.prototype.drawHistory = function(userId, boxOfHistory)
{
	if (this.popupHistory == null)
		return false;

	var userIsChat = false;
	if (userId.toString().substr(0,4) == 'chat')
	{
		userIsChat = true;
		var chatId = userId.toString().substr(4);
	}

	var activeSearch = this.historySearch.length == 0? false: true;
	var boxOfHistory = boxOfHistory == undefined? this.history: boxOfHistory;
	if (boxOfHistory[userId] && (!userIsChat && this.users[userId] || userIsChat && this.chat[chatId]))
	{
		var arHistory = [];
		var arHistorySort = BX.util.array_unique(boxOfHistory[userId]);
		arHistorySort.sort(BX.delegate(function(i, ii) {i = parseInt(i); ii = parseInt(ii); if (!this.message[i] || !this.message[ii]){return 0;} var i1 = parseInt(this.message[i].date); var i2 = parseInt(this.message[ii].date); if (i1 > i2) { return -1; } else if (i1 < i2) { return 1;} else{ if (i > ii) { return -1; } else if (i < ii) { return 1;}else{ return 0;}}}, this));
		for (var i = 0; i < arHistorySort.length; i++)
		{
			var history = this.message[boxOfHistory[userId][i]];

			if (history)
			{
				if (activeSearch && history.text.toLowerCase().indexOf((this.historySearch+'').toLowerCase()) < 0)
					continue;

				arHistory.push(
					BX.create("div", { attrs : { 'data-messageId' : history.id}, props : { className : "bx-messenger-history-item"+(history.senderId == 0? " bx-messenger-history-item-3": (history.senderId == this.BXIM.userId?"": " bx-messenger-history-item-2")) }, children : [
						BX.create("div", { props : { className : "bx-messenger-history-item-name" }, html : (this.users[history.senderId]? this.users[history.senderId].name: BX.message('IM_MESSENGER_SYSTEM_USER'))+' <span class="bx-messenger-history-hide">[</span><span class="bx-messenger-history-item-date">'+BX.IM.formatDate(history.date)+'</span><span class="bx-messenger-history-hide">]</span>'/*<span class="bx-messenger-history-item-delete-icon" title="'+BX.message('IM_MESSENGER_HISTORY_DELETE')+'" data-messageId="'+history.id+'"></span>*/}),
						//BX.create("div", { props : { className : "bx-messenger-history-item-nearby" }, html : BX.message('IM_HISTORY_NEARBY')}),
						BX.create("div", { props : { className : "bx-messenger-history-item-text" }, html : BX.IM.prepareText(history.text, false, true)}),
						BX.create("div", { props : { className : "bx-messenger-history-hide" }, html : this.historyMessageSplit})
					]})
				);
			}
		}

		if (arHistory.length <= 0)
		{
			if (this.historySearchBegin)
			{
				arHistory = [
					BX.create("div", { props : { className : "bx-messenger-content-load-history" }, children : [
						BX.create('span', { props : { className : "bx-messenger-content-load-img" }}),
						BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_LOAD_MESSAGE')})
					]})
				];
			}
			else
			{
				arHistory = [
					BX.create("div", { props : { className : "bx-messenger-content-history-empty" }, children : [
						BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_NO_MESSAGE')})
					]})
				];
			}
		}
	}
	else if (this.showMessage[userId] && this.showMessage[userId].length <= 0)
	{
		arHistory = [
			BX.create("div", { props : { className : "bx-messenger-content-history-empty" }, children : [
				BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_NO_MESSAGE')})
			]})
		];
	}
	else
	{
		arHistory = [
			BX.create("div", { props : { className : "bx-messenger-content-load-history" }, children : [
				BX.create('span', { props : { className : "bx-messenger-content-load-img" }}),
				BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_LOAD_MESSAGE')})
			]})
		];
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 30,
			data: {'IM_HISTORY_LOAD' : 'Y', 'USER_ID' : userId, 'USER_LOAD' : userIsChat? (this.chat[userId.toString().substr(4)] && this.chat[userId.toString().substr(4)].fake? 'Y': 'N'): (this.users[userId] && this.users[userId].fake? 'Y': 'N'), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
			onsuccess: BX.delegate(function(data)
			{
				if (data.ERROR == '')
				{
					this.sendAjaxTry = 0;
					for (var i in data.MESSAGE)
					{
						data.MESSAGE[i].date = parseInt(data.MESSAGE[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
						this.message[i] = data.MESSAGE[i];
					}
					for (var i in data.USERS_MESSAGE)
					{
						if (this.history[i])
							this.history[i] = BX.util.array_merge(this.history[i], data.USERS_MESSAGE[i]);
						else
							this.history[i] = data.USERS_MESSAGE[i];
					}
					if ((!userIsChat && this.users[userId] && !this.users[userId].fake) ||
						(userIsChat && this.chat[userId.toString().substr(4)] && !this.chat[userId.toString().substr(4)].fake))
					{
						BX.cleanNode(this.popupHistoryBodyWrap);
						if (!data.USERS_MESSAGE[userId] || data.USERS_MESSAGE[userId].length <= 0)
						{
							this.popupHistoryBodyWrap.appendChild(
								BX.create("div", { props : { className : "bx-messenger-content-history-empty" }, children : [
									BX.create("span", { props : { className : "bx-messenger-content-load-text" }, html : BX.message('IM_MESSENGER_NO_MESSAGE')})
								]})
							);
						}
						else
						{
							for (var i = 0; i < data.USERS_MESSAGE[userId].length; i++)
							{
								var history = this.message[data.USERS_MESSAGE[userId][i]];
								if (history)
								{
									this.popupHistoryBodyWrap.appendChild(
										BX.create("div", { attrs : { 'data-messageId' : history.id}, props : { className : "bx-messenger-history-item"+(history.senderId == 0? " bx-messenger-history-item-3": (history.senderId == this.BXIM.userId?"": " bx-messenger-history-item-2")) }, children : [
											BX.create("div", { props : { className : "bx-messenger-history-item-name" }, html : (this.users[history.senderId]? this.users[history.senderId].name: BX.message('IM_MESSENGER_SYSTEM_USER'))+' <span class="bx-messenger-history-hide">[</span><span class="bx-messenger-history-item-date">'+BX.IM.formatDate(history.date)+'</span><span class="bx-messenger-history-hide">]</span>'/*<span class="bx-messenger-history-item-delete-icon" title="'+BX.message('IM_MESSENGER_HISTORY_DELETE')+'" data-id="'+history.id+'"></span>*/}),
											//BX.create("div", { props : { className : "bx-messenger-history-item-nearby" }, html : BX.message('IM_HISTORY_NEARBY')}),
											BX.create("div", { props : { className : "bx-messenger-history-item-text" }, html : BX.IM.prepareText(history.text, false, true)}),
											BX.create("div", { props : { className : "bx-messenger-history-hide" }, html : this.historyMessageSplit})
										]})
									);
								}
							}
						}
					}
					else
					{

						if (userIsChat && this.chat[data.USER_ID.substr(4)].fake)
							this.chat[data.USER_ID.toString().substr(4)].name = BX.message('IM_MESSENGER_USER_NO_ACCESS');

						if (!userIsChat)
							this.users[userId] = {'id': userId, 'avatar': '/bitrix/js/im/images/blank.gif', 'name': BX.message('IM_MESSENGER_USER_NO_ACCESS'), 'profile': '#', 'status': 'na'};

						for (var i in data.USERS)
						{
							this.users[i] = data.USERS[i];
						}
						for (var i in data.USER_IN_GROUP)
						{
							if (this.userInGroup[i] == undefined)
								this.userInGroup[i] = data.USER_IN_GROUP[i];
							else
							{
								for (var j = 0; j < data.USER_IN_GROUP[i].users.length; j++)
									this.userInGroup[i].users.push(data.USER_IN_GROUP[i].users[j]);

								this.userInGroup[i].users = BX.util.array_unique(this.userInGroup[i].users)
							}

						}
						for (var i in data.WO_USER_IN_GROUP)
						{
							if (this.woUserInGroup[i] == undefined)
								this.woUserInGroup[i] = data.WO_USER_IN_GROUP[i];
							else
							{
								for (var j = 0; j < data.WO_USER_IN_GROUP[i].users.length; j++)
									this.woUserInGroup[i].users.push(data.WO_USER_IN_GROUP[i].users[j]);

								this.woUserInGroup[i].users = BX.util.array_unique(this.woUserInGroup[i].users)
							}
						}
						for (var i in data.CHAT)
						{
							this.chat[i] = data.CHAT[i];
						}
						for (var i in data.USER_IN_CHAT)
						{
							this.userInChat[i] = data.USER_IN_CHAT[i];
						}
						if (!userIsChat)
							this.userListRedraw();
						this.dialogStatusRedraw();

						this.openHistory(userId);
					}
				}
				else
				{
					if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
					{
						this.sendAjaxTry++;
						BX.message({'bitrix_sessid': data.BITRIX_SESSID});
						setTimeout(BX.delegate(function(){this.drawHistory(userId, boxOfHistory)}, this), 1000);
						BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
					}
					else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
					{
						this.sendAjaxTry++;
						setTimeout(BX.delegate(function(){this.drawHistory(userId, boxOfHistory)}, this), 2000);
						BX.onCustomEvent(window, 'onImError', [data.ERROR]);
					}
				}
			}, this),
			onfailure: BX.delegate(function(){
				this.sendAjaxTry = 0;
			}, this)
		});
	}

	this.popupHistoryBodyWrap.innerHTML = '';
	BX.adjust(this.popupHistoryBodyWrap, {children: arHistory});
	this.popupHistoryItems.scrollTop = 0;
}

BX.Messenger.prototype.newHistorySearch = function(event)
{
	event = event||window.event;
	if (event.keyCode == 27 && this.historySearch != '')
		BX.IM.preventDefault(event);

	if (event.keyCode == 27)
		this.popupHistorySearchInput.value = '';

	this.historySearchBegin = true;

	if (this.popupHistorySearchInput.value.length < 3)
	{
		this.historySearch = "";
		this.drawHistory(this.historyUserId);
		return false;
	}

	this.historySearch = this.popupHistorySearchInput.value;
	this.drawHistory(this.historyUserId);

	clearTimeout(this.historySearchTimeout);
	if (this.popupHistorySearchInput.value != '')
	{
		this.historySearchTimeout = setTimeout(BX.delegate(function(){
			BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				timeout: 30,
				data: {'IM_HISTORY_SEARCH' : 'Y', 'USER_ID' : this.historyUserId, 'SEARCH' : this.popupHistorySearchInput.value, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
				onsuccess: BX.delegate(function(data){
					this.historySearchBegin = false;
					if (data.MESSAGE.length == 0)
					{
						this.drawHistory(data.USER_ID);
						return;
					}

					for (var i in data.MESSAGE)
					{
						data.MESSAGE[i].date = parseInt(data.MESSAGE[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
						data.MESSAGE[i].moreHistoryDraw = false;
						this.message[i] = data.MESSAGE[i];
					}

					this.drawHistory(data.USER_ID, data.USERS_MESSAGE);
				}, this),
				onfailure: function(data)	{}
			});
		}, this), 1500);
	}

	return BX.PreventDefault(event);
}

/* GET DATA */
BX.Messenger.prototype.setUpdateStateStep = function(send)
{
	send = send == false? false: true;

	var step = this.updateStateStepDefault;
	if (!this.BXIM.ppStatus)
	{
		if (this.popupMessenger != null)
		{
			step = 20;
			if (this.updateStateVeryFastCount > 0)
			{
				step = 5;
				this.updateStateVeryFastCount--;
			}
			else if (this.updateStateFastCount > 0)
			{
				step = 10;
				this.updateStateFastCount--;
			}
		}
	}

	this.updateStateStep = parseInt(step);

	if (send)
		BX.localStorage.set('uss', this.updateStateStep, 5);

	this.updateState();
}

BX.Messenger.prototype.updateState = function(force, send)
{
	if (!this.BXIM.tryConnect)
		return false;

	force = force == true? true: false;
	send = send == false? false: true;
	clearTimeout(this.updateStateTimeout);
	this.updateStateTimeout = setTimeout(
		BX.delegate(function(){
			var _ajax = BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				lsId: 'IM_UPDATE_STATE',
				lsTimeout: 1,
				timeout: 30,
				data: {'IM_UPDATE_STATE' : 'Y', 'OPEN_MESSENGER' : this.popupMessenger != null? 1: 0, 'OPEN_CONTACT_LIST' : this.popupMessenger != null? 1: 0, 'TAB' : this.currentTab, 'FM' : JSON.stringify(this.flashMessage), 'FN' :  JSON.stringify(this.notify.flashNotify), 'SITE_ID': BX.message('SITE_ID'),'IM_AJAX_CALL' : 'Y', 'DESKTOP' : (this.desktop.run()? 'Y': 'N'), 'sessid': BX.bitrix_sessid()},
				onsuccess: BX.delegate(function(data)
				{
					if (data.ERROR == '')
					{
						if (!this.BXIM.checkRevision(data.REVISION))
							return false;

						BX.message({'SERVER_TIME': data.SERVER_TIME});
						this.notify.updateNotifyCounters(data.COUNTERS, send);
						this.notify.updateNotifyMailCount(data.MAIL_COUNTER, send);

						if (!this.BXIM.xmppStatus && data.XMPP_STATUS && data.XMPP_STATUS == 'Y')
							this.BXIM.xmppStatus = true;

						if (data.DESKTOP_STATUS)
							this.BXIM.desktopStatus = data.DESKTOP_STATUS == 'Y'? true: false;

						if (BX.PULL && data.PULL_CONFIG)
						{
							BX.PULL.updateChannelID({
								'METHOD': data.PULL_CONFIG.METHOD,
								'CHANNEL_ID': data.PULL_CONFIG.CHANNEL_ID,
								'CHANNEL_DT': data.PULL_CONFIG.CHANNEL_DT,
								'PATH': data.PULL_CONFIG.PATH,
								'LAST_ID': data.PULL_CONFIG.LAST_ID,
								'PATH_WS': data.PULL_CONFIG.PATH_WS
							});
						}

						var contactListRedraw = false;
						if (!(data.ONLINE.length <= 0))
						{
							var userChangeStatus = {};
							for (var i in this.users)
							{
								if (data.ONLINE[i] == undefined)
								{
									if (this.users[i].status != 'offline')
									{
										userChangeStatus[i] = this.users[i].status;
										this.users[i].status = 'offline';
										contactListRedraw = true;
									}
								}
								else
								{
									if (this.users[i].status != data.ONLINE[i].status)
									{
										userChangeStatus[i] = this.users[i].status;
										this.users[i].status = data.ONLINE[i].status;
										contactListRedraw = true;
									}
								}
							}
						}
						if (typeof(data.MESSAGE) != "undefined")
							for (var i in data.MESSAGE)
								data.MESSAGE[i].date = parseInt(data.MESSAGE[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));

						this.updateStateVar(data, send);
						if (typeof(data.USERS_MESSAGE) != "undefined")
							contactListRedraw = true;

						if (contactListRedraw)
						{
							this.dialogStatusRedraw();
							this.userListRedraw();
						}

						if (typeof(data.NOTIFY) != "undefined")
						{
							for (var i in data.NOTIFY)
							{
								data.NOTIFY[i].date = parseInt(data.NOTIFY[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
								this.notify.notify[i] = data.NOTIFY[i];
								this.BXIM.lastRecordId = parseInt(i) > this.BXIM.lastRecordId? parseInt(i): this.BXIM.lastRecordId;
							}

							for (var i in data.FLASH_NOTIFY)
								if (typeof(this.notify.flashNotify[i]) == 'undefined')
									this.notify.flashNotify[i] = data.FLASH_NOTIFY[i];

							this.notify.changeUnreadNotify(data.UNREAD_NOTIFY, send);
						}
						if (send)
							BX.localStorage.set('mus', true, 5);

						if (BX.PULL)
							BX.PULL.tryConnect();

						this.setUpdateStateStep(false);
					}
					else
					{
						if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
						{
							this.sendAjaxTry++;
							BX.message({'bitrix_sessid': data.BITRIX_SESSID});
							setTimeout(BX.delegate(function(){
								this.updateState(true, send);
							}, this), 1000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
						}
						else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
						{
							this.sendAjaxTry++;
							setTimeout(BX.delegate(function(){
								this.updateState(true, send);
							}, this), 2000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR]);
						}
						else
						{
							this.sendAjaxTry++;
							setTimeout(BX.delegate(function(){
								this.updateState(true, send);
							}, this), 20000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR]);
						}
					}
				}, this),
				onfailure: BX.delegate(function() {
					this.sendAjaxTry = 0;
					this.setUpdateStateStep(false);
					try {
						if (typeof(_ajax) == 'object' && _ajax.status == 0)
							BX.onCustomEvent(window, 'onImError', ['CONNECT_ERROR']);
					}
					catch(e) {}
				}, this)
			});
		}, this)
	, force? 150: this.updateStateStep*1000);
};

BX.Messenger.prototype.updateStateLight = function(force, send)
{
	if (!this.BXIM.tryConnect)
		return false;

	force = force == true? true: false;
	send = send == false? false: true;
	clearTimeout(this.updateStateTimeout);
	this.updateStateTimeout = setTimeout(
		BX.delegate(function(){
			BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				lsId: 'IM_UPDATE_STATE_LIGHT',
				lsTimeout: 5,
				timeout: this.updateStateStepDefault > 10? this.updateStateStepDefault-2: 10,
				data: {'IM_UPDATE_STATE_LIGHT' : 'Y', 'SITE_ID': BX.message('SITE_ID'), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
				onsuccess: BX.delegate(function(data)
				{
					if (data.ERROR == '')
					{
						if (!this.BXIM.checkRevision(data.REVISION))
							return false;

						BX.message({'SERVER_TIME': data.SERVER_TIME});

						this.notify.updateNotifyCounters(data.COUNTERS, send);

						if (BX.PULL && data.PULL_CONFIG)
						{
							BX.PULL.updateChannelID({
								'METHOD': data.PULL_CONFIG.METHOD,
								'CHANNEL_ID': data.PULL_CONFIG.CHANNEL_ID,
								'CHANNEL_DT': data.PULL_CONFIG.CHANNEL_DT,
								'PATH': data.PULL_CONFIG.PATH,
								'LAST_ID': data.PULL_CONFIG.LAST_ID,
								'PATH_WS': data.PULL_CONFIG.PATH_WS
							});
						}

						if (send)
							BX.localStorage.set('musl', true, 5);

						if (BX.PULL)
							BX.PULL.tryConnect();

						this.updateStateLight(force, send);
					}
					else
					{
						if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
						{
							this.sendAjaxTry++;
							BX.message({'bitrix_sessid': data.BITRIX_SESSID});
							setTimeout(BX.delegate(function(){
								this.updateStateLight(true, send);
							}, this), 1000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
						}
						else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
						{
							this.sendAjaxTry++;
							setTimeout(BX.delegate(function(){
								this.updateStateLight(true, send);
							}, this), 2000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR]);
						}
					}
				}, this),
				onfailure: BX.delegate(function() {
					this.sendAjaxTry = 0;
					this.updateStateLight(force, send);
				}, this)
			});
		}, this)
	, force? 150: this.updateStateStepDefault*1000);
};

BX.Messenger.prototype.updateStateVar = function(data, send, writeMessage)
{
	writeMessage = writeMessage === false? false: true;
	if (typeof(data.CHAT) != "undefined")
	{
		for (var i in data.CHAT)
		{
			if (this.chat[i] && this.chat[i].fake)
				data.CHAT[i].fake = true;
			else if (!this.chat[i])
				data.CHAT[i].fake = true;

			this.chat[i] = data.CHAT[i];
		}
	}
	if (typeof(data.USER_IN_CHAT) != "undefined")
	{
		for (var i in data.USER_IN_CHAT)
		{
			this.userInChat[i] = data.USER_IN_CHAT[i];
		}
	}
	if (typeof(data.USERS) != "undefined")
	{
		for (var i in data.USERS)
		{
			this.users[i] = data.USERS[i];
		}
	}
	if (typeof(data.USER_IN_GROUP) != "undefined")
	{
		for (var i in data.USER_IN_GROUP)
		{
			if (this.userInGroup[i] == undefined)
				this.userInGroup[i] = data.USER_IN_GROUP[i];
			else
			{
				for (var j = 0; j < data.USER_IN_GROUP[i].users.length; j++)
					this.userInGroup[i].users.push(data.USER_IN_GROUP[i].users[j]);

				this.userInGroup[i].users = BX.util.array_unique(this.userInGroup[i].users)
			}
		}
	}
	if (typeof(data.WO_USER_IN_GROUP) != "undefined")
	{
		for (var i in data.WO_USER_IN_GROUP)
		{
			if (this.woUserInGroup[i] == undefined)
				this.woUserInGroup[i] = data.WO_USER_IN_GROUP[i];
			else
			{
				for (var j = 0; j < data.WO_USER_IN_GROUP[i].users.length; j++)
					this.woUserInGroup[i].users.push(data.WO_USER_IN_GROUP[i].users[j]);

				this.woUserInGroup[i].users = BX.util.array_unique(this.woUserInGroup[i].users)
			}
		}
	}
	if (typeof(data.MESSAGE) != "undefined")
	{
		for (var i in data.MESSAGE)
		{
			this.message[i] = data.MESSAGE[i];
			this.BXIM.lastRecordId = parseInt(i) > this.BXIM.lastRecordId? parseInt(i): this.BXIM.lastRecordId;
		}
	}
	this.changeUnreadMessage(data.UNREAD_MESSAGE, send);
	if (typeof(data.USERS_MESSAGE) != "undefined")
	{
		for (var i in data.USERS_MESSAGE)
		{
			data.USERS_MESSAGE[i].sort(BX.delegate(function(i, ii) {i = parseInt(i); ii = parseInt(ii); if (!this.message[i] || !this.message[ii]){return 0;} var i1 = parseInt(this.message[i].date); var i2 = parseInt(this.message[ii].date); if (i1 < i2) { return -1; } else if (i1 > i2) { return 1;} else{ if (i < ii) { return -1; } else if (i > ii) { return 1;}else{ return 0;}}}, this));
			if (!this.showMessage[i])
				this.showMessage[i] = data.USERS_MESSAGE[i];

			for (var j = 0; j < data.USERS_MESSAGE[i].length; j++)
			{
				if (!BX.util.in_array(data.USERS_MESSAGE[i][j], this.showMessage[i]))
				{
					this.showMessage[i].push(data.USERS_MESSAGE[i][j]);
					if (this.history[i])
						this.history[i] = BX.util.array_merge(this.history[i], data.USERS_MESSAGE[i]);
					else
						this.history[i] = data.USERS_MESSAGE[i];

					if (writeMessage && this.currentTab == i)
						this.drawMessage(i, this.message[data.USERS_MESSAGE[i][j]]);
				}
			}
		}
	}
};

BX.Messenger.prototype.changeUnreadMessage = function(unreadMessage, send)
{
	send = send == false? false: true;
	if (this.BXIM.xmppStatus)
		unreadMessage = {};

	var playSound = false;
	var contactListRedraw = false;
	for (var i in unreadMessage)
	{
		if (this.popupMessenger != null && this.currentTab == i)
			this.dialogStatusRedraw();

		if (this.popupMessenger != null && this.currentTab == i && this.BXIM.isFocus())
		{
			if (typeof (this.flashMessage[i]) == 'undefined')
				this.flashMessage[i] = {};

			for (var k = 0; k < unreadMessage[i].length; k++)
			{
				if (this.BXIM.isFocus())
					this.flashMessage[i][unreadMessage[i][k]] = false;

				if (this.message[unreadMessage[i][k]] && this.message[unreadMessage[i][k]].senderId == this.currentTab)
					playSound = true;
			}
			this.readMessage(i, true, true, true);
		}
		else
		{
			contactListRedraw = true;
			if (this.unreadMessage[i])
				this.unreadMessage[i] = BX.util.array_unique(BX.util.array_merge(this.unreadMessage[i], unreadMessage[i]));
			else
				this.unreadMessage[i] = unreadMessage[i];

			if (this.BXIM.userStatus != 'dnd')
			{
				if (typeof (this.flashMessage[i]) == 'undefined')
				{
					this.flashMessage[i] = {};
					for (var k = 0; k < unreadMessage[i].length; k++)
						this.flashMessage[i][unreadMessage[i][k]] = send? true: false;
				}
				else
				{
					for (var k = 0; k < unreadMessage[i].length; k++)
					{
						if (!send && !this.BXIM.isFocus())
						{
							this.flashMessage[i][unreadMessage[i][k]] = false;
						}
						else
						{
							if (typeof (this.flashMessage[i][unreadMessage[i][k]]) == 'undefined')
								this.flashMessage[i][unreadMessage[i][k]] = true;
						}
					}
				}
			}
		}
		var arRecent = false;
		for (var k = 0; k < unreadMessage[i].length; k++)
		{
			if (!arRecent || arRecent.SEND_DATE <= this.message[unreadMessage[i][k]].date)
			{
				arRecent = {
					'ID': this.message[unreadMessage[i][k]].id,
					'SEND_DATE': this.message[unreadMessage[i][k]].date,
					'RECIPIENT_ID': this.message[unreadMessage[i][k]].recipientId,
					'SENDER_ID': this.message[unreadMessage[i][k]].senderId,
					'USER_ID': this.message[unreadMessage[i][k]].senderId,
					'SEND_MESSAGE': this.message[unreadMessage[i][k]].text
				};
			}
		}
		if (arRecent)
		{
			this.recentListAdd({
				'userId': arRecent.RECIPIENT_ID.toString().substr(0,4) == 'chat'? arRecent.RECIPIENT_ID: arRecent.USER_ID,
				'id': arRecent.ID,
				'date': arRecent.SEND_DATE,
				'recipientId': arRecent.RECIPIENT_ID,
				'senderId': arRecent.SENDER_ID,
				'text': arRecent.SEND_MESSAGE
			}, true);
		}
	}
	if (this.popupMessenger != null && contactListRedraw)
		this.userListRedraw();

	this.newMessage(send);

	this.updateMessageCount(send);

	if (send && playSound && this.BXIM.userStatus != 'dnd')
	{
		this.BXIM.playSound("newMessage2");
	}
}

BX.Messenger.prototype.readMessage = function(userId, send, sendAjax, skipCheck)
{
	skipCheck = skipCheck == true? true: false;
	if (!skipCheck && (!this.unreadMessage[userId] || this.unreadMessage[userId].length <= 0))
		return false;

	send = send == false? false: true;
	sendAjax = this.readMessageTimeoutSend == null && sendAjax == false? false: true;
	if (sendAjax)
		this.readMessageTimeoutSend = true;

	clearTimeout(this.readMessageTimeout);
	this.readMessageTimeout = setTimeout(BX.delegate(function(){
		if (this.popupMessenger != null)
		{
			var elements = BX.findChildren(this.popupContactListElementsWrap, {attribute: {'data-userId': ''+userId+''}}, true);
			if (elements != null)
				for (var i = 0; i < elements.length; i++)
					elements[i].firstChild.innerHTML = '';

			var elements = BX.findChildren(this.popupMessengerBodyWrap, {className : "bx-messenger-content-item-new"}, false);
			if (elements != null)
				for (var i = 0; i < elements.length; i++)
					if (elements[i].getAttribute('data-notifyType') != 1)
						BX.removeClass(elements[i], 'bx-messenger-content-item-new');
		}
		var lastId = 0;
		if (Math && this.unreadMessage[userId])
			lastId = Math.max.apply(Math, this.unreadMessage[userId]);

		if (this.unreadMessage[userId])
			delete this.unreadMessage[userId];

		if (this.flashMessage[userId])
			delete this.flashMessage[userId];

		BX.localStorage.set('mfm', this.flashMessage, 80);

		this.updateMessageCount(send);

		if (sendAjax)
		{
			this.readMessageTimeoutSend = null;
			var sendData = {'IM_READ_MESSAGE' : 'Y', 'USER_ID' : userId, 'TAB' : this.currentTab, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()};
			if (parseInt(lastId) > 0)
				sendData['LAST_ID'] = lastId;
			var _ajax = BX.ajax({
				url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
				method: 'POST',
				dataType: 'json',
				timeout: 60,
				data: sendData,
				onsuccess: BX.delegate(function(data)
				{
					if (data.ERROR != '')
					{
						if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
						{
							this.sendAjaxTry++;
							BX.message({'bitrix_sessid': data.BITRIX_SESSID});
							setTimeout(BX.delegate(function(){
								this.readMessage(userId, false, true);
							}, this), 1000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
						}
						else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
						{
							this.sendAjaxTry++;
							setTimeout(BX.delegate(function(){
								this.readMessage(userId, false, true);
							}, this), 2000);
							BX.onCustomEvent(window, 'onImError', [data.ERROR]);
						}
					}
				}, this),
				onfailure: BX.delegate(function()	{
					this.sendAjaxTry = 0;
					try {
						if (typeof(_ajax) == 'object' && _ajax.status == 0)
							BX.onCustomEvent(window, 'onImError', ['CONNECT_ERROR']);
					}
					catch(e) {}
				}, this)
			});
		}
		if (send)
			BX.localStorage.set('mrm', userId, 5);

	}, this), 500);
}

BX.Messenger.prototype.drawReadMessage = function(userId, messageId, date, animation)
{
	var lastId = Math.max.apply(Math, this.showMessage[userId]);
	if (lastId != messageId || this.message[lastId].senderId == userId)
	{
		this.readedList[userId] = false;
		return false;
	}

	this.readedList[userId] = {
		'messageId' : messageId,
		'date' : date
	};
	if (!this.writingList[userId])
	{
		animation = animation == false? false: true;

		this.drawNotifyMessage(userId, 'readed', BX.message('IM_MESSENGER_READED').replace('#DATE#', BX.IM.formatDate(date)), animation);
	}
}

BX.Messenger.prototype.loadLastMessage = function(userId, userIsChat)
{
	this.historyWindowBlock = true;
	delete this.redrawTab[userId];
	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 90,
		data: {'IM_LOAD_LAST_MESSAGE' : 'Y', 'CHAT' : userIsChat? 'Y': 'N', 'USER_ID' : userId, 'USER_LOAD' : userIsChat? (this.chat[userId.toString().substr(4)] && this.chat[userId.toString().substr(4)].fake? 'Y': 'N'): (this.users[userId] && this.users[userId].fake? 'Y': 'N'), 'TAB' : this.currentTab, 'READ' : this.BXIM.isFocus()? 'Y': 'N', 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data)
		{
			if (data.ERROR == '')
			{
				if (!userIsChat && data.USER_LOAD == 'Y')
					this.users[userId] = {'id': userId, 'avatar': '/bitrix/js/im/images/blank.gif', 'name': BX.message('IM_MESSENGER_USER_NO_ACCESS'), 'profile': '#', 'status': 'na'};

				for (var i in data.USERS)
				{
					this.users[i] = data.USERS[i];
				}
				for (var i in data.USER_IN_GROUP)
				{
					if (this.userInGroup[i] == undefined)
						this.userInGroup[i] = data.USER_IN_GROUP[i];
					else
					{
						for (var j = 0; j < data.USER_IN_GROUP[i].users.length; j++)
							this.userInGroup[i].users.push(data.USER_IN_GROUP[i].users[j]);

						this.userInGroup[i].users = BX.util.array_unique(this.userInGroup[i].users)
					}
				}
				for (var i in data.WO_USER_IN_GROUP)
				{
					if (this.woUserInGroup[i] == undefined)
						this.woUserInGroup[i] = data.WO_USER_IN_GROUP[i];
					else
					{
						for (var j = 0; j < data.WO_USER_IN_GROUP[i].users.length; j++)
							this.woUserInGroup[i].users.push(data.WO_USER_IN_GROUP[i].users[j]);

						this.woUserInGroup[i].users = BX.util.array_unique(this.woUserInGroup[i].users)
					}
				}

				for (var i in data.READED_LIST)
				{
					data.READED_LIST[i].date = parseInt(data.READED_LIST[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
					this.readedList[i] = data.READED_LIST[i];
				}

				if (!userIsChat && data.USER_LOAD == 'Y')
					this.userListRedraw();

				this.sendAjaxTry = 0;
				var messageCnt = 0
				for (var i in data.MESSAGE)
				{
					messageCnt++;
					data.MESSAGE[i].date = parseInt(data.MESSAGE[i].date)+parseInt(BX.message('USER_TZ_OFFSET'));
					this.message[i] = data.MESSAGE[i];
					this.BXIM.lastRecordId = parseInt(i) > this.BXIM.lastRecordId? parseInt(i): this.BXIM.lastRecordId;
				}

				if (messageCnt <= 0)
					delete this.redrawTab[data.USER_ID];

				for (var i in data.USERS_MESSAGE)
				{
					if (this.showMessage[i])
						this.showMessage[i] = BX.util.array_unique(BX.util.array_merge(data.USERS_MESSAGE[i], this.showMessage[i]));
					else
						this.showMessage[i] = data.USERS_MESSAGE[i];
				}
				if (userIsChat && this.chat[data.USER_ID.substr(4)].fake)
					this.chat[data.USER_ID.toString().substr(4)].name = BX.message('IM_MESSENGER_USER_NO_ACCESS');

				for (var i in data.CHAT)
				{
					this.chat[i] = data.CHAT[i];
				}
				for (var i in data.USER_IN_CHAT)
				{
					this.userInChat[i] = data.USER_IN_CHAT[i];
				}
				this.drawTab(data.USER_ID, this.currentTab == data.USER_ID? true: false);

				if (this.currentTab == data.USER_ID && this.readedList[data.USER_ID])
					this.drawReadMessage(data.USER_ID, this.readedList[data.USER_ID].messageId, this.readedList[data.USER_ID].date, false);

				this.historyWindowBlock = false;
				if (this.BXIM.isFocus())
					this.readMessage(data.USER_ID, true, false);
			}
			else
			{
				this.redrawTab[userId] = true;
				if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					BX.message({'bitrix_sessid': data.BITRIX_SESSID});
					setTimeout(BX.delegate(function(){this.loadLastMessage(userId, userIsChat)}, this), 1000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
				}
				else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					setTimeout(BX.delegate(function(){this.loadLastMessage(userId, userIsChat)}, this), 2000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR]);
				}
			}
		}, this),
		onfailure: BX.delegate(function(){
			this.historyWindowBlock = false;
			this.sendAjaxTry = 0;
			this.redrawTab[userId] = true;
		}, this)
	});
}

/* EXTRA */
BX.Messenger.prototype.extraOpen = function(content)
{
	if (this.popupMessenger != null)
		this.popupMessenger.setClosingByEsc(false);

	if (!this.BXIM.extraBind)
	{
		BX.bind(window, "keydown", this.BXIM.extraBind = BX.proxy(function(e) {
			if (e.keyCode == 27 && !this.webrtc.callInit)
			{
				if (this.desktop.run())
					this.extraClose(true);
				else if (this.popupMessenger)
					this.popupMessenger.destroy();
			}
		}, this));
	}

	this.BXIM.extraOpen = true;
	this.BXIM.dialogOpen = false;

	BX.style(this.popupMessengerDialog, 'display', 'none');
	BX.style(this.popupMessengerExtra, 'display', 'block');

	this.popupMessengerExtra.innerHTML = '';
	BX.adjust(this.popupMessengerExtra, {children: [content]});

	this.resizeMainWindow();
}
BX.Messenger.prototype.extraClose = function(openDialog, callToggle)
{
	setTimeout(BX.delegate(function(){
		if (this.popupMessenger != null && !this.webrtc.callInit)
			this.popupMessenger.setClosingByEsc(true);
	}, this), 200);

	if (this.BXIM.extraBind)
	{
		BX.unbind(window, "keydown", this.BXIM.extraBind);
		this.BXIM.extraBind = null;
	}

	this.BXIM.extraOpen = false;
	this.BXIM.dialogOpen = true;

	openDialog = openDialog == true? true: false;
	callToggle = callToggle == false? false: true;

	if (this.BXIM.notifyOpen)
		this.notify.closeNotify();

	this.closeMenuPopup();

	if (this.currentTab == 0)
	{
		this.extraOpen(
			BX.create("div", { attrs : { style : "padding-top: 300px"}, props : { className : "bx-messenger-box-empty" }, html: BX.message('IM_MESSENGER_EMPTY')})
		);
	}
	else
	{
		BX.style(this.popupMessengerDialog, 'display', 'block');
		BX.style(this.popupMessengerExtra, 'display', 'none');
		this.popupMessengerExtra.innerHTML = '';

		if (openDialog)
		{
			this.openChatFlag = this.currentTab.toString().substr(0,4) == 'chat'? true: false;
			this.openDialog(this.currentTab, false, callToggle);
		}
	}
	this.resizeMainWindow();
}

/* WRITING */
BX.Messenger.prototype.startWriting = function(userId, recipientId)
{
	if (recipientId == this.BXIM.userId)
	{
		this.writingList[userId] = true;
		this.drawWriting(userId);
		clearTimeout(this.writingListTimeout[userId]);
		this.writingListTimeout[userId] = setTimeout(BX.delegate(function(){
			this.endWriting(userId);
		}, this), 29500);
	}
}
BX.Messenger.prototype.endWriting = function(userId)
{
	clearTimeout(this.writingListTimeout[userId]);
	this.writingList[userId] = false;
	this.drawWriting(userId);
}
BX.Messenger.prototype.drawWriting = function(userId)
{
	if (this.openChatFlag)
		return false;

	if (this.writingList[userId])
	{
		if (this.popupMessenger != null)
		{
			var elements = BX.findChildren(this.popupContactListElementsWrap, {attribute: {'data-userId': ''+userId+''}}, true);
			if (elements)
			{
				for (var i = 0; i < elements.length; i++)
					BX.addClass(elements[i], 'bx-messenger-cl-status-writing');
			}
			if (this.currentTab == userId)
			{
				this.popupMessengerPanelAvatar.parentNode.className = 'bx-messenger-panel-avatar bx-messenger-panel-avatar-status-writing';
				this.drawNotifyMessage(userId, 'writing', BX.message('IM_MESSENGER_WRITING').replace('#USER_NAME#', this.users[userId].name));
			}
		}
	}
	else if (!this.writingList[userId])
	{
		if (this.popupMessenger != null)
		{
			var elements = BX.findChildren(this.popupContactListElementsWrap, {attribute: {'data-userId': ''+userId+''}}, true);
			if (elements)
			{
				for (var i = 0; i < elements.length; i++)
					BX.removeClass(elements[i], 'bx-messenger-cl-status-writing');
			}
			if (this.currentTab == userId)
			{
				this.popupMessengerPanelAvatar.parentNode.className = 'bx-messenger-panel-avatar bx-messenger-panel-avatar-status-'+(this.users[userId].birthday? 'birthday': this.users[userId].status);
				var lastMessage = this.popupMessengerBodyWrap.lastChild;
				if (lastMessage && BX.hasClass(lastMessage, "bx-messenger-content-item-notify"))
				{
					if (this.readedList[userId])
					{
						this.drawReadMessage(userId, this.readedList[userId].messageId, this.readedList[userId].date, false);
					}
					else if (this.BXIM.animationSupport)
					{
						if (this.popupMessengerBodyAnimation != null)
							this.popupMessengerBodyAnimation.stop();
						(this.popupMessengerBodyAnimation = new BX.easing({
							duration : 800,
							start : { scroll : this.popupMessengerBody.scrollTop},
							finish : { scroll : this.popupMessengerBody.scrollTop - lastMessage.offsetHeight},
							transition : BX.easing.makeEaseInOut(BX.easing.transitions.quart),
							step : BX.delegate(function(state){
								this.popupMessengerBody.scrollTop = state.scroll;
							}, this),
							complete : function(){
								BX.remove(lastMessage);
							}
						})).animate();
					}
					else
					{
						this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollTop - lastMessage.offsetHeight;
						BX.remove(lastMessage);
					}
				}
			}
		}
	}
}
BX.Messenger.prototype.sendWriting = function(userId)
{
	if (!this.writingSendList[userId] && this.BXIM.ppServerStatus && !this.openChatFlag)
	{
		clearTimeout(this.writingSendListTimeout[userId]);
		this.writingSendList[userId] = true;
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 10,
			data: {'IM_START_WRITING' : 'Y', 'RECIPIENT_ID' : userId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
		});
		this.writingSendListTimeout[userId] = setTimeout(BX.delegate(function(){
			this.endSendWriting(userId);
		}, this), 30000);
	}
}
BX.Messenger.prototype.endSendWriting = function(userId)
{
	clearTimeout(this.writingSendListTimeout[userId]);
	this.writingSendList[userId] = false;
}


/* TEXTAREA */

BX.Messenger.prototype.sendMessage = function(recipientId)
{
	recipientId = typeof(recipientId) == 'string' || typeof(recipientId) == 'number' ? recipientId: this.currentTab;
	this.endSendWriting(recipientId);

	this.popupMessengerTextarea.value = this.popupMessengerTextarea.value.replace('    ', "\t");
	this.popupMessengerTextarea.value = BX.util.trim(this.popupMessengerTextarea.value);
	if (this.popupMessengerTextarea.value.length == 0)
		return false;

	var messageTmpIndex = this.messageTmpIndex;
	this.message['temp'+messageTmpIndex] = {'id' : 'temp'+messageTmpIndex, 'senderId' : this.BXIM.userId, 'recipientId' : recipientId, 'date' : BX.IM.getNowDate(), 'text' : BX.IM.prepareText(this.popupMessengerTextarea.value, true) };
	if (!this.showMessage[recipientId])
		this.showMessage[recipientId] = [];
	this.showMessage[recipientId].push('temp'+messageTmpIndex);

	this.messageTmpIndex++;
	BX.localStorage.set('mti', this.messageTmpIndex, 5);
	if (this.popupMessengerTextarea == null || recipientId != this.currentTab)
		return false;

	clearTimeout(this.textareaHistoryTimeout);
	if (!BX.browser.IsAndroid() && !BX.browser.IsIOS())
		BX.focus(this.popupMessengerTextarea);

	if (this.desktop.ready())
	{
		if (this.popupMessengerTextarea.value == '/openDeveloperTools')
		{
			this.popupMessengerTextarea.value = '';
			this.desktop.openDeveloperTools();

			console.log('NOTICE: User ('+this.BXIM.userId+') use /openDeveloperTools');
			return false;
		}
		else if (this.popupMessengerTextarea.value == '/windowReload')
		{
			this.popupMessengerTextarea.value = '';
			location.reload();

			console.log('NOTICE: User ('+this.BXIM.userId+') use /windowReload');
			return false;
		}
	}

	var elLoad = BX.findChild(this.popupMessengerBodyWrap, {className : "bx-messenger-content-load"}, true);
	if (elLoad)
		BX.remove(elLoad);

	var elEmpty = BX.findChild(this.popupMessengerBodyWrap, {className : "bx-messenger-content-empty"}, true);
	if (elEmpty)
		BX.remove(elEmpty);

	this.drawMessage(recipientId, this.message['temp'+messageTmpIndex]);

	var messageText = this.popupMessengerTextarea.value;
	this.popupMessengerLastMessage = messageText;

/*
	var easing = new BX.easing({
		duration : 1000,
		start : { scroll : this.popupMessengerBody.scrollTop},
		finish : { scroll : this.popupMessengerBody.scrollHeight - this.popupMessengerBody.offsetHeight},
		transition : BX.easing.makeEaseInOut(BX.easing.transitions.quart),
		step : BX.delegate(function(state){
			this.popupMessengerBody.scrollTop = state.scroll;
		}, this),
		complete : function(){}
	});
	easing.animate();
*/

	this.sendMessageAjax(messageTmpIndex, recipientId, messageText, this.openChatFlag);

	if (this.BXIM.userStatus != 'dnd')
	{
		this.BXIM.playSound("send");
	}

	this.popupMessengerTextarea.value = '';
	this.textareaHistory[this.currentTab] = '';
	setTimeout(BX.delegate(function(){
		this.popupMessengerTextarea.value = '';
	}, this), 0);
}
BX.Messenger.prototype.sendMessageAjax = function(messageTmpIndex, recipientId, messageText, sendMessageToChat)
{
	if (this.sendMessageFlag < 0)
		this.sendMessageFlag = 0;

	if (this.sendMessageTmp[messageTmpIndex])
		return false;

	this.sendMessageTmp[messageTmpIndex] = true;
	sendMessageToChat = sendMessageToChat == true? true: false;
	this.sendMessageFlag++;

	var _ajax = BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 60,
		data: {'IM_SEND_MESSAGE' : 'Y', 'CHAT': sendMessageToChat? 'Y': 'N', 'ID' : 'temp'+messageTmpIndex, 'RECIPIENT_ID' : recipientId, 'MESSAGE' : messageText, 'TAB' : this.currentTab, 'USER_TZ_OFFSET': BX.message('USER_TZ_OFFSET'), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data)
		{
			this.sendMessageFlag--;
			if (data.ERROR == '')
			{
				this.recentListAdd({
					'id': data.ID,
					'date': data.SEND_DATE,
					'recipientId': data.RECIPIENT_ID,
					'senderId': data.SENDER_ID,
					'text': data.SEND_MESSAGE,
					'userId': data.RECIPIENT_ID
				}, true);

				this.sendAjaxTry = 0;
				this.message[data.TMP_ID].text = data.SEND_MESSAGE;
				this.message[data.TMP_ID].date = data.SEND_DATE;
				this.message[data.TMP_ID].id = data.ID;
				this.message[data.ID] = this.message[data.TMP_ID];
				delete this.message[data.TMP_ID];
				var message = this.message[data.ID];

				var idx = BX.util.array_search(''+data.TMP_ID+'', this.showMessage[data.RECIPIENT_ID]);
				this.showMessage[data.RECIPIENT_ID][idx] = ''+data.ID+'';

				if (data.RECIPIENT_ID == this.currentTab)
				{
					var element = BX.findChild(this.popupMessengerBodyWrap, {attribute: {'data-messageid': ''+data.TMP_ID+''}}, true);
					if (!element)
						return false;

					element.setAttribute('data-messageid',	''+data.ID+'');

					var textElement = BX.findChild(element, {attribute: {'data-textMessageId': ''+data.TMP_ID+''}}, true);
					textElement.setAttribute('data-textMessageId',	''+data.ID+'');
					textElement.innerHTML =  BX.IM.prepareText(data.SEND_MESSAGE, false, true);

					var messageUser = this.users[message.senderId];
					var lastMessageElementDate = BX.findChild(element, {className : "bx-messenger-content-item-date"}, true);
					if (lastMessageElementDate)
						lastMessageElementDate.innerHTML = ' &nbsp; '+messageUser.name+' &nbsp; '+BX.IM.formatDate(message.date);

					var lastMessageElementStatus = BX.findChild(element, {className : "bx-messenger-content-item-status"}, true);
					if (lastMessageElementStatus)
					{
						lastMessageElementStatus.innerHTML = '';
						BX.adjust(lastMessageElementStatus, {children: [
							BX.create("span", { attrs: {title : BX.message('IM_MESSENGER_QUOTE_TITLE')}, props : { className : "bx-messenger-content-item-quote"}})
						]});
					}
				}

				if (this.history[data.RECIPIENT_ID])
					this.history[data.RECIPIENT_ID].push(message.id)
				else
					this.history[data.RECIPIENT_ID] = [message.id];

				this.updateStateVeryFastCount = 2;
				this.updateStateFastCount = 5;
				this.setUpdateStateStep();

				if (BX.PULL)
				{
					BX.PULL.setUpdateStateStepCount(2,5);
				}
				this.updateStateVar(data, true, true);
				BX.localStorage.set('msm', {'id': data.ID, 'recipientId': data.RECIPIENT_ID, 'date': data.SEND_DATE, 'text' : data.SEND_MESSAGE, 'senderId' : this.BXIM.userId, 'MESSAGE': data.MESSAGE, 'USERS_MESSAGE': data.USERS_MESSAGE, 'USERS': data.USERS, 'USER_IN_GROUP': data.USER_IN_GROUP, 'WO_USER_IN_GROUP': data.WO_USER_IN_GROUP}, 5);
			}
			else
			{
				if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					BX.message({'bitrix_sessid': data.BITRIX_SESSID});
					setTimeout(BX.delegate(function(){
						this.sendMessageTmp[messageTmpIndex] = false;
						this.sendMessageAjax(messageTmpIndex, recipientId, messageText, sendMessageToChat);
					}, this), 1000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
				}
				else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					setTimeout(BX.delegate(function(){
						this.sendMessageTmp[messageTmpIndex] = false;
						this.sendMessageAjax(messageTmpIndex, recipientId, messageText, sendMessageToChat);
					}, this), 2000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR]);
				}
				else
				{
					this.sendMessageTmp[messageTmpIndex] = false;
					var element = BX.findChild(this.popupMessengerBodyWrap, {attribute: {'data-messageid': 'temp'+messageTmpIndex}}, true);
					var lastMessageElementDate = BX.findChild(element, {className : "bx-messenger-content-item-date"}, true);
					if (lastMessageElementDate)
					{
						if (data.ERROR == 'SESSION_ERROR' || data.ERROR == 'AUTHORIZE_ERROR' || data.ERROR == 'UNKNOWN_ERROR' || data.ERROR == 'IM_MODULE_NOT_INSTALLED')
							lastMessageElementDate.innerHTML = BX.message('IM_MESSENGER_NOT_DELIVERED');
						else
							lastMessageElementDate.innerHTML = data.ERROR;
					}
					BX.onCustomEvent(window, 'onImError', ['SEND_ERROR', data.ERROR, data.TMP_ID, data.SEND_DATE, data.SEND_MESSAGE, data.RECIPIENT_ID]);

					var lastMessageElementStatus = BX.findChild(element, {className : "bx-messenger-content-item-status"}, true);
					if (lastMessageElementStatus)
					{
						lastMessageElementStatus.innerHTML = '';
						BX.adjust(lastMessageElementStatus, {children: [
							BX.create("span", { attrs: { title: BX.message('IM_MESSENGER_RETRY') }, props : { className : "bx-messenger-content-item-error"}, children:[
								BX.create("span", { props : { className : "bx-messenger-content-item-error-icon"}})
							]})
						]});
					}
				}

			}
		}, this),
		onfailure: BX.delegate(function(data)	{
			this.sendMessageTmp[messageTmpIndex] = false;
			var element = BX.findChild(this.popupMessengerBodyWrap, {attribute: {'data-messageid': 'temp'+messageTmpIndex}}, true);
			var lastMessageElementDate = BX.findChild(element, {className : "bx-messenger-content-item-date"}, true);
			if (lastMessageElementDate)
				lastMessageElementDate.innerHTML = BX.message('IM_MESSENGER_NOT_DELIVERED');

			var lastMessageElementStatus = BX.findChild(element, {className : "bx-messenger-content-item-status"}, true);
			if (lastMessageElementStatus)
			{
				lastMessageElementStatus.innerHTML = '';
				BX.adjust(lastMessageElementStatus, {children: [
					BX.create("span", { attrs: { title: BX.message('IM_MESSENGER_RETRY'), 'data-messageid': 'temp'+messageTmpIndex, 'data-chat': sendMessageToChat? 'Y':'N' }, props : { className : "bx-messenger-content-item-error"}, children:[
						BX.create("span", { props : { className : "bx-messenger-content-item-error-icon"}})
					]})
				]});
			}
			this.sendAjaxTry = 0;
			try {
				if (typeof(_ajax) == 'object' && _ajax.status == 0)
					BX.onCustomEvent(window, 'onImError', ['CONNECT_ERROR']);
			}
			catch(e) {}
		}, this)
	});
}
BX.Messenger.prototype.sendMessageRetry = function()
{
	var currentTab = this.currentTab;
	var openChatFlag = this.openChatFlag;
	var messageError = false;
	var messageStack = [];
	for (var i = 0; i < this.showMessage[currentTab].length; i++)
	{
		var message = this.message[this.showMessage[currentTab][i]];
		if (!message || message.id.indexOf('temp') != 0)
			continue;

		message.text = BX.IM.prepareTextBack(message.text);

		messageStack.push(message);
		messageError = true;
	}
	if (!messageError)
		return false;

	messageStack.sort(BX.delegate(function(i, ii) {i = i.id.substr(4); ii = ii.id.substr(4);  if (i < ii) { return -1; } else if (i > ii) { return 1;}else{ return 0;}}, this));

	var sendFunction = BX.delegate(function (message, timeout){
		setTimeout(BX.delegate(function() {
			this.sendMessageAjax(message.id.substr(4), message.recipientId, message.text, openChatFlag);
		}, this), timeout);
	}, this);

	for (var i = 0; i < messageStack.length; i++)
	{
		var element = BX.findChild(this.popupMessengerBodyWrap, {attribute: {'data-messageid': ''+messageStack[i].id+''}}, true);
		var lastMessageElementStatus = BX.findChild(element, {className : "bx-messenger-content-item-status"}, true);
		if (lastMessageElementStatus)
		{
			lastMessageElementStatus.innerHTML = '';
			BX.adjust(lastMessageElementStatus, {children: [
				BX.create("span", { props : { className : "bx-messenger-content-item-progress"}})
			]});
		}

		var lastMessageElementDate = BX.findChild(element, {className : "bx-messenger-content-item-date"}, true);
		if (lastMessageElementDate)
		{
			lastMessageElementDate.innerHTML = BX.message('IM_MESSENGER_DELIVERED');
		}
		sendFunction(messageStack[i], 50*i);
	}

}
BX.Messenger.prototype.openSmileMenu = function()
{
	if (!BX.proxy_context)
		return false;

	if (this.popupPopupMenu != null)
		this.popupPopupMenu.destroy();

	if (this.popupSmileMenu != null)
	{
		this.popupSmileMenu.destroy();
		return false;
	}

	var arGalleryItem = {};
	for (var id in this.smile)
	{
		if (!arGalleryItem[this.smile[id].SET_ID])
			arGalleryItem[this.smile[id].SET_ID] = [];

		arGalleryItem[this.smile[id].SET_ID].push(
			BX.create("img", { props : { className : 'bx-messenger-smile-gallery-image'}, attrs : { 'data-code': BX.util.htmlspecialcharsback(id), style: "width: "+this.smile[id].WIDTH+"px; height: "+this.smile[id].HEIGHT+"px", src : this.smile[id].IMAGE, alt : id, title : BX.util.htmlspecialcharsback(this.smile[id].NAME)}})
		);
	}

	var setCount = 0;
	var arGallery = [];
	var arSet = [
		BX.create("span", { props : { className : "bx-messenger-smile-nav-name" }, html: BX.message('IM_SMILE_SET')})
	];
	for (var id in this.smileSet)
	{
		if (!arGalleryItem[id])
			continue;

		setCount++;
		arGallery.push(
			BX.create("span", { attrs : { 'data-set-id': id }, props : { className : "bx-messenger-smile-gallery-set"+(setCount > 1? ' bx-messenger-smile-gallery-set-hide': '') }, children: arGalleryItem[id]})
		);
		arSet.push(
			BX.create("span", { attrs : { 'data-set-id': id, title : BX.util.htmlspecialcharsback(this.smileSet[id].NAME) }, props : { className : "bx-messenger-smile-nav-item"+(setCount == 1? ' bx-messenger-smile-nav-item-active': '')}})
		);
	}

	this.popupSmileMenu = new BX.PopupWindow('bx-messenger-popup-smile', BX.proxy_context, {
		lightShadow : false,
		offsetTop: this.desktop.run()? 0: -7,
		offsetLeft: 5,
		autoHide: true,
		closeByEsc: true,
		bindOptions: {position: "top"},
		zIndex: 200,
		events : {
			onPopupClose : function() { this.destroy() },
			onPopupDestroy : BX.delegate(function() { this.popupSmileMenu = null; }, this)
		},
		content : BX.create("div", { props : { className : "bx-messenger-smile" }, children: [
			this.popupSmileMenuGallery = BX.create("div", { props : { className : "bx-messenger-smile-gallery" }, children: arGallery}),
			this.popupSmileMenuSet = BX.create("div", { props : { className : "bx-messenger-smile-nav"+(setCount <= 1? " bx-messenger-smile-nav-disabled": "")}, children: arSet})
		]})
	});
	this.popupSmileMenu.setAngle({offset: 4});
	this.popupSmileMenu.show();

	BX.bindDelegate(this.popupSmileMenuGallery, "click", {className: 'bx-messenger-smile-gallery-image'}, BX.delegate(function(e){
		this.insertTextareaText(' '+BX.proxy_context.getAttribute('data-code')+' ', false);
		this.popupSmileMenu.close();
	}, this));

	BX.bindDelegate(this.popupSmileMenuSet, "click", {className: 'bx-messenger-smile-nav-item'}, BX.delegate(function(e){
		if (BX.hasClass(BX.proxy_context, 'bx-messenger-smile-nav-item-active'))
			return false;

		var nodesGallery = BX.findChildren(this.popupSmileMenuGallery, {className : "bx-messenger-smile-gallery-set"}, false);
		var nodesSet = BX.findChildren(this.popupSmileMenuSet, {className : "bx-messenger-smile-nav-item"}, false);
		for (var i = 0; i < nodesSet.length; i++)
		{
			if (BX.proxy_context == nodesSet[i])
			{
				BX.removeClass(nodesGallery[i], 'bx-messenger-smile-gallery-set-hide');
				BX.addClass(nodesSet[i], 'bx-messenger-smile-nav-item-active');
			}
			else
			{
				BX.addClass(nodesGallery[i], 'bx-messenger-smile-gallery-set-hide');
				BX.removeClass(nodesSet[i], 'bx-messenger-smile-nav-item-active');
			}
		}
	}, this));


	return false;
}
BX.Messenger.prototype.insertTextareaText = function(text, returnBack)
{
	if (this.popupMessengerTextarea.selectionStart || this.popupMessengerTextarea.selectionStart == '0')
	{
		var selectionStart = this.popupMessengerTextarea.selectionStart;
		var selectionEnd = this.popupMessengerTextarea.selectionEnd;
		this.popupMessengerTextarea.value = this.popupMessengerTextarea.value.substring(0,selectionStart)+text+this.popupMessengerTextarea.value.substring(selectionEnd, this.popupMessengerTextarea.value.length);

		returnBack = returnBack == false? false: true;
		if (returnBack)
		{
			this.popupMessengerTextarea.selectionStart = selectionStart+1;
			this.popupMessengerTextarea.selectionEnd = selectionStart+1;
		}
		else if (BX.browser.IsChrome() || BX.browser.IsSafari() || this.desktop.ready())
		{
			this.popupMessengerTextarea.selectionStart = this.popupMessengerTextarea.value.length+1;
			this.popupMessengerTextarea.selectionEnd = this.popupMessengerTextarea.value.length+1;
		}
	}
	if (document.selection && document.documentMode && document.documentMode <= 8)
	{
		this.popupMessengerTextarea.focus();
		var select=document.selection.createRange();
		select.text = text;
	}
}
BX.Messenger.prototype.resizeTextareaStart = function(e)
{
	if (this.webrtc.callOverlayFullScreen) return false;

	if(!e) e = window.event;

	this.popupMessengerTextareaResize.wndSize = BX.GetWindowScrollPos();
	this.popupMessengerTextareaResize.pos = BX.pos(this.popupMessengerTextarea);
	this.popupMessengerTextareaResize.y = e.clientY + this.popupMessengerTextareaResize.wndSize.scrollTop;
	this.popupMessengerTextareaResize.textOffset = this.popupMessengerTextarea.offsetHeight;
	this.popupMessengerTextareaResize.bodyOffset = this.popupMessengerBody.offsetHeight;

	BX.bind(document, "mousemove", BX.proxy(this.resizeTextareaMove, this));
	BX.bind(document, "mouseup", BX.proxy(this.resizeTextareaStop, this));

	if(document.body.setCapture)
		document.body.setCapture();

	document.onmousedown = BX.False;

	var b = document.body;
	b.ondrag = b.onselectstart = BX.False;
	b.style.MozUserSelect = 'none';
	b.style.cursor = 'move';

	if (this.popupSmileMenu)
		this.popupSmileMenu.close();
};
BX.Messenger.prototype.resizeTextareaMove = function(e)
{
	if(!e) e = window.event;

	var windowScroll = BX.GetWindowScrollPos();
	var x = e.clientX + windowScroll.scrollLeft;
	var y = e.clientY + windowScroll.scrollTop;
	if(this.popupMessengerTextareaResize.y == y)
		return;

	var textareaHeight = Math.max(Math.min(-(y-this.popupMessengerTextareaResize.pos.top) + this.popupMessengerTextareaResize.textOffset, 225), 43);

	this.popupMessengerTextareaSize = textareaHeight;
	this.popupMessengerTextarea.style.height = textareaHeight + 'px';
	this.popupMessengerBodySize = this.popupMessengerTextareaResize.textOffset-textareaHeight + this.popupMessengerTextareaResize.bodyOffset;
	this.popupMessengerBody.style.height = this.popupMessengerBodySize + 'px';
	this.resizeMainWindow();

	this.popupMessengerTextareaResize.x = x;
	this.popupMessengerTextareaResize.y = y;

}
BX.Messenger.prototype.resizeTextareaStop = function()
{
	if(document.body.releaseCapture)
		document.body.releaseCapture();

	BX.unbind(document, "mousemove", BX.proxy(this.resizeTextareaMove, this));
	BX.unbind(document, "mouseup", BX.proxy(this.resizeTextareaStop, this));

	document.onmousedown = null;

	this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollHeight;

	var b = document.body;
	b.ondrag = b.onselectstart = null;
	b.style.MozUserSelect = '';
	b.style.cursor = '';

	clearTimeout(this.BXIM.adjustSizeTimeout);
	this.BXIM.adjustSizeTimeout = setTimeout(BX.delegate(function(){
		this.BXIM.setLocalConfig('msz', {
			'wz': this.desktop.run() ? this.desktop.width: this.desktop.ready()? document.body.offsetWidth: this.popupMessengerFullWidth,
			'ta': this.popupMessengerTextareaSize,
			'b': this.popupMessengerBodySize,
			'cl': this.popupContactListSize,
			'hi': this.popupHistoryItemsSize,
			'fz': this.popupMessengerFullHeight,
			'ez': this.popupContactListElementsSize,
			'nz': this.notify.popupNotifySize,
			'hf': this.popupHistoryFilterVisible,
			'place': 'taMove'
		});
	}, this), 500);
}

BX.Messenger.prototype.resizeWindowStart = function(e)
{
	if (this.webrtc.callOverlayFullScreen) return false;

	if(!e) e = window.event;

	this.popupMessengerWindow.pos = BX.pos(this.popupMessengerContent);
	this.popupMessengerWindow.mb = this.popupMessengerBodySize;
	this.popupMessengerWindow.nb = this.notify.popupNotifySize;

	BX.bind(document, "mousemove", BX.proxy(this.resizeWindowMove, this));
	BX.bind(document, "mouseup", BX.proxy(this.resizeWindowStop, this));

	if (document.body.setCapture)
		document.body.setCapture();

	document.onmousedown = BX.False;

	var b = document.body;
	b.ondrag = b.onselectstart = BX.False;
	b.style.MozUserSelect = 'none';
	b.style.cursor = 'move';

	// TODO popup window close
};
BX.Messenger.prototype.resizeWindowMove = function(e)
{
	if(!e) e = window.event;

	var windowScroll = BX.GetWindowScrollPos();
	var x = e.clientX + windowScroll.scrollLeft;
	var y = e.clientY + windowScroll.scrollTop;

	this.popupMessengerFullHeight = Math.max(Math.min(y-this.popupMessengerWindow.pos.top, 1000), this.popupMessengerMinHeight);
	this.popupMessengerFullWidth = Math.max(Math.min(x-this.popupMessengerWindow.pos.left, 1200), this.popupMessengerMinWidth);

	this.popupMessengerContent.style.height = this.popupMessengerFullHeight+'px';
	this.popupMessengerContent.style.width = this.popupMessengerFullWidth+'px';

	var changeHeight = this.popupMessengerFullHeight-Math.max(Math.min(this.popupMessengerWindow.pos.height, 1000), this.popupMessengerMinHeight);

	this.popupMessengerBodySize = this.popupMessengerWindow.mb+changeHeight;
	if (this.popupMessengerBody != null)
		this.popupMessengerBody.style.height = this.popupMessengerBodySize + 'px';

	if (this.popupMessengerExtra != null)
		this.popupMessengerExtra.style.height = this.popupMessengerFullHeight+'px';

	this.notify.popupNotifySize = Math.max(this.popupMessengerWindow.nb+(this.popupMessengerBodySize - this.popupMessengerWindow.mb), 383);
	if (this.notify.popupNotifyItem != null)
		this.notify.popupNotifyItem.style.height = this.notify.popupNotifySize+'px';

	if (this.webrtc.callOverlay)
	{
		BX.style(this.webrtc.callOverlay, 'transition', 'none');
		BX.style(this.webrtc.callOverlay, 'width', (this.popupMessengerExtra.style.display == "block"? this.popupMessengerExtra.offsetWidth-1: this.popupMessengerDialog.offsetWidth-1)+'px');
		BX.style(this.webrtc.callOverlay, 'height', (this.popupMessengerFullHeight-1)+'px');
	}

	this.BXIM.messenger.redrawChatHeader();
	this.resizeMainWindow();
}
BX.Messenger.prototype.resizeWindowStop = function()
{
	if(document.body.releaseCapture)
		document.body.releaseCapture();

	BX.unbind(document, "mousemove", BX.proxy(this.resizeWindowMove, this));
	BX.unbind(document, "mouseup", BX.proxy(this.resizeWindowStop, this));

	document.onmousedown = null;

	this.popupMessengerBody.scrollTop = this.popupMessengerBody.scrollHeight;

	var b = document.body;
	b.ondrag = b.onselectstart = null;
	b.style.MozUserSelect = '';
	b.style.cursor = '';

	if (this.webrtc.callOverlay)
		BX.style(this.webrtc.callOverlay, 'transition', '');

	clearTimeout(this.BXIM.adjustSizeTimeout);
	this.BXIM.adjustSizeTimeout = setTimeout(BX.delegate(function(){
		this.BXIM.setLocalConfig('msz', {
			'wz': this.desktop.run() ? this.desktop.width: this.desktop.ready()? document.body.offsetWidth: this.popupMessengerFullWidth,
			'ta': this.popupMessengerTextareaSize,
			'b': this.popupMessengerBodySize,
			'cl': this.popupContactListSize,
			'hi': this.popupHistoryItemsSize,
			'fz': this.popupMessengerFullHeight,
			'ez': this.popupContactListElementsSize,
			'nz': this.notify.popupNotifySize,
			'hf': this.popupHistoryFilterVisible,
			'place': 'winMove'
		});
	}, this), 500);
}

/* COMMON */

BX.Messenger.prototype.newMessage = function(send)
{
	send = send == false? false: true;

	var arNewMessage = [];
	var flashCount = 0;

	for (var i in this.flashMessage)
	{
		if (this.BXIM.isFocus() && this.popupMessenger != null)
		{
			var skip = false;
			if (i == this.currentTab)
				skip = true;

			if (skip)
			{
				for (var k in this.flashMessage[i])
				{
					if (this.flashMessage[i][k] !== false)
					{
						this.flashMessage[i][k] = false;
						flashCount++;
					}
				}
				continue;
			}
		}

		for (var k in this.flashMessage[i])
		{
			if (this.flashMessage[i][k] !== false)
			{
				var isChat = this.message[k].recipientId.toString().substr(0,4) == 'chat'? true: false;
				var recipientId = this.message[k].recipientId;
				var senderId = !isChat && this.message[k].senderId == 0? i: this.message[k].senderId;
				var messageText = this.message[k].text_mobile? this.message[k].text_mobile: this.message[k].text;
				messageText = messageText.replace(/------------------------------------------------------(.*?)------------------------------------------------------/gmi, "["+BX.message("IM_MESSENGER_QUOTE_BLOCK")+"]").replace(/<\/?[^>]+>/gi, '');

				if (messageText.length > 120)
				{
					var linkEnabled = messageText.indexOf('</a>');
					if (linkEnabled == -1)
					{
						messageText = this.message[k].text.substr(0, 120);
						var lastSpace = messageText.lastIndexOf(' ');
						if (lastSpace>100)
							messageText = messageText.substr(0, lastSpace)+'...';
						else
							messageText = messageText.substr(0, 120)+'...';
					}
					else
					{
						var messageOriginal = messageText;
						messageText = this.message[k].text.substr(0, linkEnabled+4);
						if (messageOriginal.length > messageText.length)
							messageText = messageText+'...';
					}
				}

				var element = BX.create("div", {attrs : { 'data-userId' : isChat? recipientId: senderId, 'data-messageId' : k}, props : { className: "bx-notifier-item"}, children : [
					BX.create('span', {props : { className : "bx-notifier-item-content" }, children : [
						isChat? BX.create('span', {props : { className : "bx-notifier-item-avatar bx-notifier-item-avatar-chat" }})
						:BX.create('span', {props : { className : "bx-notifier-item-avatar" }, children : [
							BX.create('img', {props : { className : "bx-notifier-item-avatar-img" },attrs : {src : this.users[senderId].avatar}})
						]}),
						BX.create("a", {attrs : {href : '#', 'data-messageId' : k}, props : { className: "bx-notifier-item-delete"}}),
						BX.create('span', {props : { className : "bx-notifier-item-date" }, html: BX.IM.formatDate(this.message[k].date)}),
						BX.create('span', {props : { className : "bx-notifier-item-name" }, html: isChat? this.chat[recipientId.substr(4)].name: this.users[senderId].name}),
						BX.create('span', {props : { className : "bx-notifier-item-text" }, html: (isChat && senderId>0?'<i>'+this.users[senderId].name+'</i>: ':'')+BX.IM.prepareText(messageText, false, true)})
					]})
				]});

				arNewMessage.push(element);
				this.flashMessage[i][k] = false;
			}
		}
	}
	if (!(!this.desktop.ready() && this.desktop.run()) && (this.BXIM.xmppStatus || !this.desktop.ready() && this.BXIM.desktopStatus))
		return false;

	if (arNewMessage.length == 0)
	{
		if (flashCount > 0)
			this.desktop.flashIcon();

		if (send && flashCount > 0 && this.BXIM.userStatus != 'dnd')
		{
			this.BXIM.playSound("newMessage2");
		}

		return false;
	}
	this.desktop.flashIcon();
	if (this.BXIM.userStatus == 'dnd')
		return false;

	if (this.desktop.ready())
	{
		for (var i = 0; i < arNewMessage.length; i++)
		{
			var dataMessageId = arNewMessage[i].getAttribute("data-messageId");
			var messsageJs =
				'var notify = BX.findChild(document.body, {className : "bx-notifier-item"}, true);'+
				'notify.style.cursor = "pointer";'+
				'BX.bind(notify, "click", function(){BXIM.desktop.onCustomEvent("bxImClickNewMessage", [notify.getAttribute("data-userId")]); BXIM.desktop.windowCommand("hide")});'+
				'BX.bind(BX.findChild(notify, {className : "bx-notifier-item-delete"}, true), "click", function(event){ BXIM.desktop.onCustomEvent("bxImClickCloseMessage", [notify.getAttribute("data-userId")]); BXIM.desktop.windowCommand("hide"); BX.IM.preventDefault(event); });'+
				'BX.bind(notify, "contextmenu", function(){ BXIM.desktop.windowCommand("hide")});';
			this.desktop.openNewMessage(dataMessageId, arNewMessage[i], messsageJs);
		}
	}
	else
	{
		for (var i = 0; i < arNewMessage.length; i++)
		{
			this.BXIM.notifyManager.add({
				'html': arNewMessage[i],
				'tag': 'im-message-'+arNewMessage[i].getAttribute('data-userId'),
				'userId': arNewMessage[i].getAttribute('data-userId'),
				'click': BX.delegate(function(popup) {
					this.openMessenger(popup.notifyParams.userId);
				}, this),
				'close': BX.delegate(function(popup) {
					this.readMessage(popup.notifyParams.userId);
				}, this)
			});
		}
	}

	this.desktop.flashIcon();
	if (send)
	{
		this.BXIM.playSound("newMessage1");
	}
};


BX.Messenger.prototype.updateMessageCount = function(send)
{
	send = send == false? false: true;
	var count = 0;
	for (var i in this.unreadMessage)
		count = count+this.unreadMessage[i].length;

	if (send)
		BX.localStorage.set('mumc', {'unread':this.unreadMessage, 'flash':this.flashMessage}, 5);
	if (this.messageCount != count)
		BX.onCustomEvent(window, 'onImUpdateCounterMessage', [count, 'MESSAGE']);

	this.messageCount = count;

	var messageCountLabel = '';
	if (this.messageCount > 99)
		messageCountLabel = '99+';
	else if (this.messageCount > 0)
		messageCountLabel = this.messageCount;

	if (this.notify.panelButtonMessageCount != null)
	{
		this.notify.panelButtonMessageCount.innerHTML = messageCountLabel;
		this.notify.adjustPosition({"resize": true, "timeout": 500});
	}

	if (this.recentListTabCounter != null)
		this.recentListTabCounter.innerHTML = this.messageCount>0? '<span class="bx-messenger-cl-count-digit">'+messageCountLabel+'</span>': '';

	if (this.desktop.ready())
	{
		if (this.messageCount == 0)
			BX.hide(this.notify.panelButtonMessage);
		else
			BX.show(this.notify.panelButtonMessage);
	}
	return this.messageCount;
}

BX.Messenger.prototype.checkLastActivity = function()
{
	if (this.updateLastActivity+100 < BX.IM.getNowDate())
	{
		this.updateLastActivity = BX.IM.getNowDate();
		return 'Y';
	}
	return 'N';
}

BX.Messenger.prototype.setStatus = function(status, send)
{
	send = send == false? false: true;

	this.BXIM.userStatus = status;
	this.BXIM.updateCounter();

	if (this.contactListPanelStatus != null && !BX.hasClass(this.contactListPanelStatus, 'bx-messenger-cl-panel-status-'+status))
	{
		this.contactListPanelStatus.className = 'bx-messenger-cl-panel-status-wrap bx-messenger-cl-panel-status-'+status;

		var statusText = BX.findChild(this.contactListPanelStatus, {className : "bx-messenger-cl-panel-status-text"}, true);

		statusText.innerHTML = BX.message("IM_STATUS_"+status.toUpperCase());

		if (send)
		{
			BX.userOptions.save('IM', 'settings', 'status', status);
			this.notify.setStatus(status);
			BX.onCustomEvent(this, 'onStatusChange', [status]);
			BX.localStorage.set('mms', status, 5);
		}
	}
};

BX.Messenger.prototype.resizeMainWindow = function()
{
	if (this.popupMessengerExtra.style.display == "block")
		this.popupContactListElementsSize = this.popupMessengerExtra.offsetHeight-175;
	else
		this.popupContactListElementsSize = this.popupMessengerDialog.offsetHeight-175;

	this.popupContactListElements.style.height = this.popupContactListElementsSize+'px';
	this.desktop.autoResize();
}

BX.Messenger.prototype.closeMenuPopup = function()
{
	if (this.popupPopupMenu != null)
		this.popupPopupMenu.close();
	if (this.popupSmileMenu != null)
		this.popupSmileMenu.close();
	if (this.notify.popupNotifyMore != null)
		this.notify.popupNotifyMore.destroy();
	if (this.popupChatUsers != null)
		this.popupChatUsers.destroy();
	if (this.popupChatDialog != null)
		this.popupChatDialog.destroy();
}
BX.Messenger.MenuPrepareList = function(element, menuItems)
{
	var items = [];
	var hrLine = false;
	for (var i = 0; i < menuItems.length; i++)
	{
		var item = menuItems[i];
		if (item == null || !item.text || !BX.type.isNotEmptyString(item.text))
			continue;

		if (hrLine)
			items.push(BX.create("div", { props : { className : "popup-window-hr" }, children : [ BX.create("i", {}) ]}));

		hrLine = true;
		var a = BX.create("a", {
			props : { className: "bx-messenger-popup-menu-item" +  (BX.type.isNotEmptyString(item.className) ? " " + item.className : "")},
			attrs : { title : item.title ? item.title : "",  href : item.href ? item.href : ""},
			events : item.onclick && BX.type.isFunction(item.onclick) ? { click : BX.delegate(item.onclick, element) } : null,
			html :  '<span class="bx-messenger-popup-menu-item-left"></span>'+(item.icon? '<span class="bx-messenger-popup-menu-item-icon '+item.icon+'"></span>':'')+'<span class="bx-messenger-popup-menu-item-text">' + item.text + '</span><span class="bx-messenger-popup-menu-right"></span>'
		});

		if (item.href)
			a.href = item.href;
		items.push(a);
	}
	return items;
};

BX.Messenger.prototype.openSettings = function()
{
	if (this.popupSettings != null)
		this.popupSettings.destroy();

	if (this.popupMessenger != null)
		this.popupMessenger.setClosingByEsc(false);

	this.popupSettings = new BX.PopupWindow('bx-messenger-popup-settings', null, {
		lightShadow : true,
		offsetTop: 0,
		offsetLeft: 0,
		autoHide: false,
		zIndex: 200,
		draggable: {restrict: true},
		closeByEsc: true,
		bindOptions: {position: "top"},
		events : {
			onPopupClose : function() { this.destroy(); },
			onPopupDestroy : BX.delegate(function() { this.popupSettings = null; if (this.popupMessenger != null && !this.webrtc.callInit) { this.popupMessenger.setClosingByEsc(true) }}, this)
		},
		titleBar: {content: BX.create('span', {props : { className : "bx-messenger-title" }, html: BX.message('IM_MESSENGER_SETTINGS')})},
		closeIcon : {'top': '10px', 'right': '13px'},
		content : this.popupHistoryElements = BX.create("div", { props : { className : "bx-messenger-history" }, html: '<div style="width:200px; height: 33px; line-height:33px; text-align:center">Coming soon ;)</div>'})
	});
	this.popupSettings.show();
	BX.bind(this.popupSettings.popupContainer, "click", BX.IM.preventDefault);

};

BX.Messenger.prototype.storageSet = function(params)
{
	if (params.key == 'mus')
	{
		this.updateState(true, false);
	}
	else if (params.key == 'musl')
	{
		this.updateStateLight(true, false);
	}
	else if (params.key == 'mms')
	{
		this.setStatus(params.value, false);
	}
	else if (params.key == 'mct')
	{
		this.currentTab = params.value;
	}
	else if (params.key == 'mrlr')
	{
		this.recentListHide(userId, false);
	}
	else if (params.key == 'mrd')
	{
		this.settings.viewGroup = params.value.viewGroup;
		this.settings.viewOffline = params.value.viewOffline;

		this.userListRedraw();
	}
	else if (params.key == 'mgp')
	{
		var viewGroup =  this.contactListSearchText != null && this.contactListSearchText.length > 0? false: this.settings.viewGroup;
		if (viewGroup)
			this.groups[params.value.id].status = params.value.status;
		else
			this.woGroups[params.value.id].status = params.value.status;

		this.userListRedraw();
	}
	else if (params.key == 'mrm')
	{
		this.readMessage(params.value, false, false);
	}
	else if (params.key == 'mcl')
	{
		this.leaveFromChat(params.value, false);
	}
	else if (params.key == 'mclk')
	{
		this.kickFromChat(params.value.chatId, params.value.userId);
	}
	else if (params.key == 'mes')
	{
		this.BXIM.enableSound = params.value;
	}
	else if (params.key == 'mti')
	{
		this.messageTmpIndex = params.value;
	}
	else if (params.key == 'mns')
	{
		if (this.popupContactListSearchInput != null)
			this.popupContactListSearchInput.value = params.value+'';

		this.contactListSearchText = params.value != null? params.value+'': '';
	}
	else if (params.key == 'msm')
	{
		// hack for fix LocalStorage IE8 bug (event to current window)
		if (this.message[params.value.id])
			return;

		this.message[params.value.id] = params.value;

		if (this.history[params.value.recipientId])
			this.history[params.value.recipientId].push(params.value.id)
		else
			this.history[params.value.recipientId] = [params.value.id];

		if (this.showMessage[params.value.recipientId])
			this.showMessage[params.value.recipientId].push(params.value.id)
		else
			this.showMessage[params.value.recipientId] = [params.value.id];

		this.updateStateVar(params.value, false, false);

		this.drawTab(params.value.recipientId, true);
	}
	else if (params.key == 'uss')
	{
		this.updateStateStep = parseInt(params.value);
	}
	else if (params.key == 'mumc')
	{
		setTimeout(BX.delegate(function(){
			var send = false;
			if (this.popupMessenger != null && this.BXIM.isFocus())
			{
				delete params.value.unread[this.currentTab];
				send = true;
			}

			this.unreadMessage = params.value.unread;
			this.flashMessage = params.value.flash;

			this.updateMessageCount(send);
		}, this), 500);
	}
	else if (params.key == 'mum')
	{
		this.message[params.value.message.id] = params.value.message;

		if (this.showMessage[params.value.userId])
		{
			this.showMessage[params.value.userId].push(params.value.message.id);
			this.showMessage[params.value.userId] = BX.util.array_unique(this.showMessage[params.value.userId]);
		}
		else
			this.showMessage[params.value.userId] = [params.value.message.id];

		this.drawMessage(params.value.userId, params.value.message, this.currentTab == params.value.userId? true: false);
	}
	else if (params.key == 'muum')
	{
		this.changeUnreadMessage(params.value, false);
	}
	else if (params.key == 'mcam')
	{
		if (this.popupMessenger != null && !this.webrtc.callInit)
			this.popupMessenger.close();
	}
};

})();

/* IM Desktop class */
(function() {

if (!BX.IM || BX.IM.Desktop)
	return;

BX.IM.Desktop = function(BXIM, params)
{
	this.BXIM = BXIM;
	this.enable = params.desktop? true: false;
	this.apiReady = typeof(BXDesktopSystem)!="undefined" || typeof(BXDesktopWindow)!="undefined"? true: false;
	this.desktopLinkOpen = params.desktopLinkOpen? true: false;
	this.markup = params.desktop? BX('placeholder-messenger'): null;
	this.htmlWrapperHead = null;
	this.showNotifyId = {};
	this.showMessageId = {};
	this.autorun = null;
	this.linkLFCounter = null;

	this.width = 864;
	this.minWidth = 864;
	this.minHeight = 493;
	this.currentTab = 'im';
	this.minHistoryWidth = 608;
	this.minHistoryHeight = 547;

	if (this.apiReady && !this.enableInVersion(9))
	{
		this.BXIM.init = false;
		this.BXIM.tryConnect = false;
		BX.PULL.tryConnectSet(null, false);

		BXDesktopWindow.SetProperty("minClientSize", { Width: this.minWidth, Height: this.minHeight });
		BXDesktopWindow.SetProperty("clientSize", { Width: this.minWidth, Height: this.minHeight });
		BXDesktopWindow.SetProperty("resizable", false);

		BX.remove(BX('bx-desktop-tabs'));
		BX.remove(BX('bx-desktop-links'));

		var updateContent = BX.create("div", { props : { className : "bx-messenger-update-box" }, children : [
			BX.create("div", { props : { className : "bx-messenger-update-box-text" }, html: BX.message('IM_DESKTOP_NEED_UPDATE')}),
			BX.create("div", { props : { className : "bx-messenger-update-box-btn" }, events : { click :  function(){ BXDesktopSystem.ExecuteCommand("update.check", { NotifyNoUpdates: true, ShowNotifications: true}); }}, html: '<span class="bx-notifier-item-button bx-notifier-item-button-green"><i class="bx-notifier-item-button-fc"></i><span>'+BX.message('IM_DESKTOP_NEED_UPDATE_BTN')+'</span><i></i></span>'})
		]});
		this.drawOnPlaceholder(updateContent);
	}
	else if (this.enable)
	{
		if (this.BXIM.animationSupport && /Microsoft Windows NT 5/i.test(navigator.userAgent))
			this.BXIM.animationSupport = false;

		this.BXIM.changeFocus(this.windowIsFocused());

		if (this.BXIM.init && this.enableInVersion(9))
		{
			BXDesktopWindow.SetProperty("minClientSize", { Width: this.minWidth, Height: this.minHeight });
			BXDesktopWindow.SetProperty("resizable", true);
		}

		this.linkLFCounter = BX('bx-desktop-tab-lf-count');
		var bxDesktopLinks = BX('bx-desktop-links');
		if (bxDesktopLinks != null)
		{
			bxDesktopLinks.insertBefore(
				BX.create('a', { attrs : { href : this.BXIM.userParams.profile}, props : { className : "bx-desktop-link" }, html: this.BXIM.userParams.name})
			, bxDesktopLinks.firstChild);
			bxDesktopLinks.insertBefore(
				BX.create('a', { attrs : { href : this.BXIM.userParams.profile}, props : { className : "bx-desktop-link-avatar" }, children: [
					BX.create('img', { attrs : { src : this.BXIM.userParams.avatar}, props : { className : "bx-desktop-link-avatar-img" }})
				]})
			, bxDesktopLinks.firstChild);
		}
		if (this.enableInVersion(3))
			BXDesktopWindow.ExecuteCommand("protocol.check");

		BX.addCustomEvent("onPullError", function(error) {
			if (error == 'AUTHORIZE_ERROR')
			{
				BXDesktopSystem.Login({});
			}
		});
		BX.addCustomEvent("onImError", function(error) {
			if (error == 'AUTHORIZE_ERROR')
			{
				BXDesktopSystem.Login({});
			}
			else if (error == 'CONNECT_ERROR')
			{
				setTimeout(function(){
					BXDesktopSystem.Login({});
				}, 30000);
			}
		});
		BX.addCustomEvent("onPullStatus", BX.delegate(function(status){
			if (status == 'offline')
				this.setIconStatus('offline');
			else
				this.setIconStatus(this.BXIM.userStatus);
		}, this));
		BX.bind(window, "offline", BX.delegate(function(){
			this.setIconStatus('offline');
		}, this));
		BX.bind(window, "online", BX.delegate(function(){
			this.setIconStatus(this.BXIM.userStatus);
		}, this));
		BX.bind(window, "resize", BX.delegate(this.adjustSize, this));

		this.addCustomEvent("bxImClickNewMessage", BX.delegate(function(userId) {
			BXDesktopSystem.GetMainWindow().ExecuteCommand("show");
			this.BXIM.openMessenger(userId);
		}, this));
		this.addCustomEvent("bxImClickCloseMessage", BX.delegate(function(userId) {
			this.BXIM.messenger.readMessage(userId);
		}, this));
		this.addCustomEvent("bxImClickCloseNotify", BX.delegate(function(notifyId) {
			this.BXIM.notify.viewNotify(notifyId);
		}, this));
		this.addCustomEvent("bxImClickConfirmNotify", BX.delegate(function(notifyId) {
			delete this.BXIM.notify.notify[notifyId];
			delete this.BXIM.notify.unreadNotify[notifyId];
			delete this.BXIM.notify.flashNotify[notifyId];
			this.BXIM.notify.updateNotifyCount(false);
			if (this.BXIM.openNotify)
				this.BXIM.notify.openNotify(true, true);
		}, this));
		this.addCustomEvent("BXExitApplication", BX.delegate(function() {
			BXDesktopSystem.PreventShutdown();
			this.logout(true);
		}, this));
		this.addCustomEvent("BXTrayAction", BX.delegate(function (){
			var messengerCounter = this.BXIM.notify.getCounter('im_message');
			var notifyCounter = this.BXIM.notify.getCounter('im_notify');
			if (messengerCounter > 0)
			{
				if (this.BXIM.notifyOpen == true && notifyCounter > 0)
				{
					this.BXIM.notify.openNotify(false, true);
					this.BXIM.messenger.popupContactListSearchInput.focus();
				}
				else
				{
					this.BXIM.messenger.openMessenger();
					this.BXIM.messenger.popupMessengerTextarea.focus();
				}
			}
			else if (notifyCounter > 0)
			{
				this.BXIM.notify.openNotify(false, true);
				this.BXIM.messenger.popupContactListSearchInput.focus();
			}
			else
			{
				this.BXIM.messenger.popupMessengerTextarea.focus();
			}
			BXDesktopSystem.GetMainWindow().ExecuteCommand("show");
		}, this));
		if (BX.browser.IsMac())
		{
			this.addCustomEvent("BXForegroundChanged", BX.delegate(function(focus) {
				clearTimeout(this.windowFocusTimeout);
				this.windowFocusTimeout = setTimeout(BX.delegate(function(){
					this.changeFocus(focus);
					if (this.isFocus() && this.messenger.unreadMessage[this.messenger.currentTab] && this.messenger.unreadMessage[this.messenger.currentTab].length>0)
						this.messenger.readMessage(this.messenger.currentTab);

					if (this.isFocus('notify'))
					{
						if (this.notify.unreadNotifyLoad)
							this.notify.loadNotify();
						else if (this.notify.notifyUpdateCount > 0)
							this.notify.viewNotifyAll();
					}
				}, this), focus? 500: 0);
			}, this.BXIM));
		}
		this.addCustomEvent("BXTrayConstructMenu", BX.delegate(function (){
			var lFcounter = BXIM.notify.getCounter('**');
			var notifyCounter = BXIM.notify.getCounter('im_notify');
			var messengerCounter = BXIM.notify.getCounter('im_message');

			BXDesktopWindow.AddTrayMenuItem({Id: "messenger",Highlight: true, Order: 1,Title: (BX.message('IM_DESKTOP_OPEN_MESSENGER') || '').replace('#COUNTER#', (messengerCounter>0? '('+messengerCounter+')':'')), Callback: function(){
				BXIM.messenger.openMessenger(BXIM.messenger.currentTab);
				BXDesktopSystem.GetMainWindow().ExecuteCommand("show");
			},Default: true	});
			BXDesktopWindow.AddTrayMenuItem({Id: "notify",Order: 2,Title: (BX.message('IM_DESKTOP_OPEN_NOTIFY') || '').replace('#COUNTER#', (notifyCounter>0? '('+notifyCounter+')':'')), Callback: function(){
				BXIM.notify.openNotify(false, true);
				BXDesktopSystem.GetMainWindow().ExecuteCommand("show");
			},Default: true	});
			BXDesktopWindow.AddTrayMenuItem({Id: "site",Order: 3, Title: (BX.message('IM_DESKTOP_GO_SITE') || '').replace('#COUNTER#', (lFcounter>0? '('+lFcounter+')':'')), Callback: BX.delegate(function(){
				BXIM.desktop.openLF();
			}, this)});
			BXDesktopWindow.AddTrayMenuItem({Id: "separator1",IsSeparator: true,Order: 6});
			BXDesktopWindow.AddTrayMenuItem({Id: "separator2",IsSeparator: true,Order: 1240});
			BXDesktopWindow.AddTrayMenuItem({Id: "logout",Order: 1250, Title: BX.message('IM_DESKTOP_LOGOUT'),Callback: BX.delegate(function(){ this.logout() }, this)});
		}, this));
		this.addCustomEvent("BXProtocolUrl", BX.delegate(function(command) {
			BXDesktopSystem.GetMainWindow().ExecuteCommand("show");
			if (command == 'openMessenger')
			{
				this.BXIM.openMessenger();
			}
			else if (command == 'openNotify')
			{
				this.BXIM.openNotify();
			}
			else if (command.lastIndexOf('openMessenger-') == 0)
			{
				var userId = command.substr(14);
				this.BXIM.openMessenger(userId);
			}
			else if (command.lastIndexOf('openHistory-') == 0)
			{
				var userId = command.substr(12);
				this.BXIM.openHistory(userId);
			}
		}, this));

		if (this.enableInVersion(13))
		{
			BX.addCustomEvent("onPullEvent", BX.delegate(function(module_id,command,params) {

				if (module_id == "webdav")
				{
					BXDesktopSystem.ReportStorageNotification(command, params);
				}
				else if (module_id == "main" && command == 'user_counter' && params[BX.message('SITE_ID')])
				{
					if (params[BX.message('SITE_ID')]['**'])
					{
						var lfCounter = parseInt(params[BX.message('SITE_ID')]['**']);
						this.notify.updateNotifyCounters({'**':lfCounter});
					}
				}
			}, this));
		}
	}
};

BX.IM.Desktop.prototype.openLF = function()
{
	if (this.ready())
		this.browse(this.getCurrentUrl());
}

BX.IM.Desktop.prototype.getCurrentUrl = function()
{
	return document.location.protocol+'//'+document.location.hostname+(document.location.port == ''?'':':'+document.location.port)
}

BX.IM.Desktop.prototype.openInDesktop = function()
{
	return this.desktopLinkOpen;
}

BX.IM.Desktop.prototype.run = function()
{
	return this.enable;
}

BX.IM.Desktop.prototype.ready = function()
{
	return this.apiReady;
}

BX.IM.Desktop.prototype.supportSound = function()
{
	if (!this.ready()) return false;
	return this.enableInVersion(4);
}

BX.IM.Desktop.prototype.debugBuild = function()
{
	if (!this.ready()) return false;
	return BXDesktopSystem.CheckDebugBuild();
}

BX.IM.Desktop.prototype.getBuild = function()
{
	if (!this.ready()) return false;
	var arVersion = BXDesktopSystem.GetProperty('versionParts');
	return arVersion[3];
}

BX.IM.Desktop.prototype.enableInVersion = function(version)
{
	return (this.getBuild() >= parseInt(version))? true: false;
}

BX.IM.Desktop.prototype.addCustomEvent = function(eventName, eventHandler)
{
	window.addEventListener(eventName, function (e)
	{
		var arEventParams = [];
		for(var i in e.detail)
			arEventParams.push(e.detail[i]);

		eventHandler.apply(window, arEventParams);
	});
}

BX.IM.Desktop.prototype.onCustomEvent = function(eventName, arEventParams)
{
	if (!this.ready()) return false;

	var objEventParams = {};
	for (var i = 0; i < arEventParams.length; i++)
		objEventParams[i] = arEventParams[i];

	BXDesktopSystem.GetMainWindow().DispatchCustomEvent(eventName, objEventParams);
}

BX.IM.Desktop.prototype.windowCommand = function(command)
{
	if (!this.ready()) return false;

	if (command == "hide" || command == "freeze" || command == "unfreeze")
		BXDesktopWindow.ExecuteCommand(command);
}

BX.IM.Desktop.prototype.logout = function(terminate)
{
	terminate = terminate == true? true: false;

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/im.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 10,
		data: {'IM_DESKTOP_LOGOUT' : 'Y', 'sessid': BX.bitrix_sessid()},
		onsuccess: BX.delegate(function(data)
		{
			if (data.ERROR == '')
			{
				this.sendAjaxTry = 0;
				if (terminate)
					BXDesktopSystem.Shutdown();
				else
					BXDesktopSystem.Logout();
			}
			else
			{
				if (data.ERROR == 'SESSION_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					BX.message({'bitrix_sessid': data.BITRIX_SESSID});
					setTimeout(BX.delegate(function(){
						this.logout(terminate);
					}, this), 1000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR, data.BITRIX_SESSID]);
				}
				else if (data.ERROR == 'AUTHORIZE_ERROR' && this.sendAjaxTry < 2)
				{
					this.sendAjaxTry++;
					setTimeout(BX.delegate(function(){
						this.logout(terminate);
					}, this), 2000);
					BX.onCustomEvent(window, 'onImError', [data.ERROR]);
				}
				else
				{
					this.sendAjaxTry = 0;
					if (terminate)
						BXDesktopSystem.Shutdown();
					else
						BXDesktopSystem.Logout();
				}
			}
		}, this),
		onfailure: BX.delegate(function(){
			this.sendAjaxTry = 0;
			if (terminate)
				BXDesktopSystem.Shutdown();
			else
				BXDesktopSystem.Logout();
		}, this)
	});

	return false;
}

BX.IM.Desktop.prototype.drawOnPlaceholder = function(content)
{
	if (this.markup == null) return false;

	this.markup.innerHTML = '';
	this.markup.style.display = 'block';
	this.markup.appendChild(content);
}

BX.IM.Desktop.prototype.clearPlaceholder = function()
{
	if (this.markup == null) return false;

	this.markup.innerHTML = '';
	this.markup.style.display = 'none';
}

BX.IM.Desktop.prototype.windowIsFocused = function()
{
	if (!this.ready()) return false;
	return BXDesktopWindow.GetProperty("isForeground");
}

BX.IM.Desktop.prototype.setIconTooltip = function(iconTitle)
{
	if (!this.ready()) return false;
	return BXDesktopSystem.ExecuteCommand('tooltip.change', iconTitle);
}

BX.IM.Desktop.prototype.setIconStatus = function(status)
{
	if (!this.ready()) return;
	BXDesktopSystem.SetIconStatus(status);
}

BX.IM.Desktop.prototype.setIconBadge = function(count, important)
{
	if (!this.ready()) return;

	important = important == true? true: false;

	if (this.enableInVersion(1))
		BXDesktopSystem.SetIconBadge(count+'', important);
	else
		BXDesktopSystem.SetIconBadge(count+'');
}

BX.IM.Desktop.prototype.setWindowTitle = function(title)
{
	if (!this.ready()) return;

	if (typeof(title) == 'undefined')
		return false;

	title = BX.util.trim(title);
	if (title.length <= 0)
		return false;

	BXDesktopWindow.SetProperty("title", title);
}

BX.IM.Desktop.prototype.flashIcon = function(voiced)
{
	if (!this.ready()) return;

	if (this.enableInVersion(9))
		BXDesktopSystem.FlashIcon(voiced? true: false);
	else
		BXDesktopSystem.FlashIcon();
}

BX.IM.Desktop.prototype.openNewNotify = function(notifyId, content, js)
{
	if (!this.ready()) return;
	if (content == "") return false;

	if (this.showNotifyId[notifyId])
		return false;

	this.showNotifyId[notifyId] = true;

	var sendNotify = {};
	sendNotify[notifyId] = this.BXIM.notify.notify[notifyId];

	BXDesktopSystem.ExecuteCommand('notification.show.html', this.getHtmlPage(content, js, {'notify' : sendNotify}, 'im-notify-popup'));
}


BX.IM.Desktop.prototype.openNewMessage = function(messageId, content, js)
{
	if (!this.ready()) return;
	if (content == "") return false;

	if (this.showMessageId[messageId])
		return false;

	this.showMessageId[messageId] = true;

	BXDesktopSystem.ExecuteCommand('notification.show.html', this.getHtmlPage(content, js, true, 'im-notify-popup'));
}


BX.IM.Desktop.prototype.adjustSize = function(change)
{
	if (!this.run() || !this.BXIM.init || !this.BXIM.messenger || !this.BXIM.notify) return false;

	var newHeight = 0;
	change = typeof(change) == "boolean"? change: false;
	if (!change)
	{
		var windowInnerSize = BX.GetWindowInnerSize();

		if (this.minHeight > windowInnerSize.innerHeight)
			windowInnerSize.innerHeight = this.minHeight;

		newHeight = parseInt(windowInnerSize.innerHeight)-parseInt(document.body.offsetHeight);
	}
	this.BXIM.messenger.popupMessengerBodySize = this.BXIM.messenger.popupMessengerBodySize+newHeight;
	if (this.BXIM.messenger.popupMessengerBody != null)
	{
		this.BXIM.messenger.popupMessengerBody.style.height = this.BXIM.messenger.popupMessengerBodySize+'px';
		this.BXIM.messenger.redrawChatHeader();
	}

	this.BXIM.messenger.popupContactListElementsSize = this.BXIM.messenger.popupContactListElementsSize+newHeight;
	if (this.BXIM.messenger.popupContactListElements != null)
		this.BXIM.messenger.popupContactListElements.style.height = this.BXIM.messenger.popupContactListElementsSize+'px';

	this.BXIM.messenger.popupMessengerFullHeight = Math.max(this.BXIM.messenger.popupMessengerFullHeight+newHeight, 454);
	if (this.BXIM.messenger.popupMessengerExtra != null)
	{
		this.BXIM.messenger.popupMessengerExtra.style.height = this.BXIM.messenger.popupMessengerFullHeight+'px';
		//this.BXIM.messenger.popupContactListResize.style.height = this.BXIM.messenger.popupMessengerFullHeight+'px';
	}

	this.BXIM.notify.popupNotifySize = Math.max(this.BXIM.notify.popupNotifySize+newHeight, 383);
	if (this.BXIM.notify.popupNotifyItem != null)
		this.BXIM.notify.popupNotifyItem.style.height = this.BXIM.notify.popupNotifySize+'px';

	this.width = document.body.offsetWidth;
	this.currentHeight = BX('bx-desktop-contents').offsetHeight+newHeight;
	BX('placeholder-disk').parentNode.style.height = this.currentHeight+'px';

	this.BXIM.messenger.closeMenuPopup();

	clearTimeout(this.BXIM.adjustSizeTimeout);
	this.BXIM.adjustSizeTimeout = setTimeout(BX.delegate(function(){
		this.BXIM.setLocalConfig('msz', {
			'wz': this.width,
			'ta': this.BXIM.messenger.popupMessengerTextareaSize,
			'b': this.BXIM.messenger.popupMessengerBodySize,
			'cl': this.BXIM.messenger.popupContactListSize,
			'hi': this.BXIM.messenger.popupHistoryItemsSize,
			'fz': this.BXIM.messenger.popupMessengerFullHeight,
			'ez': this.BXIM.messenger.popupContactListElementsSize,
			'nz': this.BXIM.notify.popupNotifySize,
			'hf': this.BXIM.messenger.popupHistoryFilterVisible,
			'place': 'desktop'
		});
	}, this), 500);

	return true;
}

BX.IM.Desktop.prototype.autoResize = function()
{
	if (!this.ready()) return;
	BXDesktopWindow.SetProperty("clientSize", { Width: this.BXIM.init? this.width: document.body.offsetWidth, Height: document.body.offsetHeight });
}

BX.IM.Desktop.prototype.openHistory = function(userId, content, js)
{
	if (!this.ready()) return false;

	BXDesktopSystem.GetWindow("history", BX.delegate(function(history)
	{
		var data = {'chat':{}, 'users':{}};
		if (userId.toString().substr(0,4) == 'chat')
		{
			var chatId = userId.substr(4);
			data['chat'][chatId] = this.messenger.chat[chatId];
			for (var i = 0; i < this.messenger.userInChat[chatId].length; i++)
				data['users'][this.messenger.userInChat[chatId][i]] = this.messenger.users[this.messenger.userInChat[chatId][i]];
		}
		else
		{
			data['users'][userId] = this.messenger.users[userId];
			data['users'][this.BXIM.userId] = this.messenger.users[this.BXIM.userId];
		}

		history.SetProperty("clientSize", { Width: this.minHistoryWidth, Height: this.minHistoryHeight });
		history.SetProperty("minClientSize", { Width: this.minHistoryWidth, Height: this.minHistoryHeight });
		history.SetProperty("resizable", false);
		history.ExecuteCommand("html.load", this.getHtmlPage(content, js, data));
		history.SetProperty("title", BX.message('IM_MESSENGER_HISTORY'));
		//history.OpenDeveloperTools();
	},this));
}

BX.IM.Desktop.prototype.getHtmlPage = function(content, jsContent, initImJs, bodyClass)
{
	if (!this.ready()) return;

	content = content || '';
	jsContent = jsContent || '';
	bodyClass = bodyClass || '';

	var initImConfig = typeof(initImJs) == "undefined" || typeof(initImJs) != "object"? {}: initImJs;
	initImJs = typeof(initImJs) == "undefined"? false: true;

	if (this.htmlWrapperHead == null)
		this.htmlWrapperHead = document.head.outerHTML.replace('<script type="text/javascript">BX.PULL.start();</script>', '');

	if (content != '' && BX.type.isDomNode(content))
		content = content.outerHTML;

	if (jsContent != '' && BX.type.isDomNode(jsContent))
		jsContent = jsContent.outerHTML;

	if (jsContent != '')
		jsContent = '<script type="text/javascript">BX.ready(function(){'+jsContent+'});</script>';

	var initJs = '';
	if (initImJs == true)
	{
		initJs = "<script type=\"text/javascript\">"+
			"BX.ready(function() {"+
				"BXIM = new BX.IM(null, {"+
					"'init': false,"+
					"'userStatus': '"+this.BXIM.userStatus+"',"+
					"'ppStatus': "+this.BXIM.ppStatus+","+
					"'ppServerStatus': "+this.BXIM.ppServerStatus+","+
					"'xmppStatus': "+this.BXIM.xmppStatus+","+
					"'bitrix24Status': "+this.BXIM.bitrix24Status+","+
					"'bitrixIntranet': "+this.BXIM.bitrixIntranet+","+
					"'desktop': "+this.run()+","+
					"'enableSound': "+this.BXIM.enableSound+","+
					"'notify' : "+(initImConfig.notify? JSON.stringify(initImConfig.notify): '{}')+","+
					"'users' : "+(initImConfig.users? JSON.stringify(initImConfig.users): '{}')+","+
					"'chat' : "+(initImConfig.chat? JSON.stringify(initImConfig.chat): '{}')+","+
					"'userId': "+this.BXIM.userId+","+
					"'path' : "+JSON.stringify(this.BXIM.path)+
				"});"+
			"});"+
		"</script>";
	}

	return '<!DOCTYPE html><html>'+this.htmlWrapperHead+'<body class="im-desktop im-desktop-popup '+bodyClass+'"><div id="placeholder-messenger" class="placeholder-messenger">'+content+'</div>'+initJs+jsContent+'</body></html>';
}

BX.IM.Desktop.prototype.openDeveloperTools = function()
{
	if (!this.ready()) return false;
	BXDesktopWindow.OpenDeveloperTools()
}
BX.IM.Desktop.prototype.browse = function(url)
{
	if (!this.ready()) return false;
	BXDesktopSystem.ExecuteCommand('browse', url);
}
BX.IM.Desktop.prototype.autorunStatus = function(value)
{
	if (!this.ready()) return false;

	if (typeof(value) !='boolean')
	{
		if (this.autorun == null)
			this.autorun = BXDesktopSystem.GetProperty("autostart");

		return this.autorun;
	}
	else
	{
		this.autorun = value;
		BXDesktopSystem.SetProperty("autostart", this.autorun);
		return value;
	}
}
BX.IM.Desktop.prototype.changeTab = function(currentTab)
{
	var tabsContent = BX.findChildren(BX('bx-desktop-contents'), {className : "bx-desktop-content"}, false);

	if (!tabsContent)
		return false;

	var tabs = BX.findChildren(BX('bx-desktop-tabs'), {className : "bx-desktop-tab"}, false);
	for (var i = 0; i < tabs.length; i++)
	{
		if (tabs[i] === currentTab)
		{
			BX.addClass(tabs[i], "bx-desktop-tab-active");
			BX.removeClass(tabsContent[i], "bx-desktop-content-hide");
			this.currentTab = tabsContent[i].getAttribute('data-page');
			BX.onCustomEvent(window, 'onDesktopChangeTab', [this.currentTab]);
		}
		else
		{
			BX.removeClass(tabs[i], "bx-desktop-tab-active");
			BX.addClass(tabsContent[i], "bx-desktop-content-hide");
		}
	}

	this.adjustSize(true);
	this.autoResize();
	return false;
}

BX.PopupWindowDesktop = function(BXIM)
{
	this.BXIM = BXIM;
	this.closeByEsc = true;
	this.setClosingByEsc = function(enable) { this.closeByEsc = enable; };
	this.close = function(){};
	this.destroy = function(){};
	/*
	this.destroy = function() { this.BXIM.desktop.windowCommand('hide'); };
	BX.bind(window, "keydown", BX.delegate(function(e) { if (this.closeByEsc && e.keyCode == 27) {this.BXIM.desktop.windowCommand('hide');} }, this));
	*/
};

/* WebRTC */
BX.IM.WebRTC = function(BXIM, params)
{
	this.BXIM = BXIM;
	this.videoMuted = false;
	this.audioMuted = false;
	this.detectedBrowser = 'none';
	this.attachMediaStream = null;
	this.debug = false;

	this.panel = params.panel;
	this.desktop = params.desktopClass;

	this.initiator = false;
	this.connected = false;
	this.callInit = false;
	this.callActive = false;
	this.callUserId = 0;
	this.callVideo = false;
	this.callStreamSelf = null;
	this.callStreamApponent = null;
	this.sendRequestUserMedia = {};
	this.callOverlayFullScreen = false;

	this.pc = null;
	this.pcStart = false;

	this.callInviteTimeout = null;
	this.callNotify = null;
	this.callAllowTimeout = null;
	this.callDialogAllow = null;
	this.callOverlay = null;
	this.callOverlayMinimize = null;
	this.callOverlayUserId = 0;
	this.callDeclineSelfDisabled = false;
	this.callOverlayTitleBlock = null;
	this.callOverlayPhotoLeft = null;
	this.callOverlayPhotoRight = null;
	this.callOverlayPhotoMini = null;
	this.callOverlayVideoMain = null;
	this.callOverlayVideoMini = null;
	this.callOverlayProgressBlock = null;
	this.callOverlayStatusBlock = null;
	this.callOverlayButtonsBlock = null;
	this.callRecallCount = 5;

	this.turnServer = params.turnServer;
	this.turnServerFirefox = params.turnServerFirefox;
	this.turnServerLogin = params.turnServerLogin;
	this.turnServerPassword = params.turnServerPassword;

	this.constraints = {"audio": true, "video": {"mandatory": {}, "optional": []}};
	this.sdpConstraints = {'mandatory': { 'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};

	this.enabled = false;
	this.adapter();
	if (this.enabled)
	{
		this.initAudio();

		BX.addCustomEvent("onPullEvent", BX.delegate(function(module_id,command,params) {
			if (module_id == "im")
			{
				if (command == 'call')
				{
					if (this.debug) console.log('WebRTC: incoming -> ', params.command, JSON.stringify(params));

					if (params.command == 'invite')
					{
						for (var i in params.users)
							this.messenger.users[i] = params.users[i];

						for (var i in params.hrphoto)
							this.messenger.hrphoto[i] = params.hrphoto[i];

						if (this.callInit || this.callActive)
						{
							if (this.callUserId == params.senderId)
							{
								this.callCommand(params.senderId, 'busy_self');
								this.callOverlayClose(false);
							}
							else
							{
								BX.ajax({
									url: '/bitrix/components/bitrix/im.messenger/video.ajax.php',
									method: 'POST',
									dataType: 'json',
									timeout: 10,
									data: {'IM_CALL' : 'Y', 'COMMAND': 'busy', 'RECIPIENT_ID' : params.senderId, 'VIDEO': params.video? 'Y': 'N', 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
								});
							}
						}
						else
						{
							this.BXIM.repeatSound('ringtone', 5000);
							this.callCommand(params.senderId, 'wait');
							this.callNotifyWait(params.senderId, params.video);
						}
					}
					else if (this.callInit && params.command == 'wait')
					{
						this.callWaitSoundTimeout = setTimeout(BX.delegate(function(){
							this.BXIM.repeatSound('dialtone', 5000);
						}, this), 2000);
						this.callWait(params.senderId);
					}
					else if (this.initiator && params.command == 'accept')
					{
						this.callDialog();
					}
					else if (this.callActive && params.command == 'ready')
					{
						if (this.callStreamSelf == null)
						{
							this.callAllowTimeout = setTimeout(BX.delegate(function(){
								this.callOverlayProgress('offline');
								this.callCommand(this.callUserId, 'errorAccess');
								this.callAbort(BX.message('IM_MESSENGER_CALL_ST_NO_ACCESS_3'));
								this.callOverlayButtons([{
									text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
									className: 'bx-messenger-call-overlay-button-close',
									events: {
										click : BX.delegate(function() {
											this.callOverlayClose();
										}, this)
									}
								}]);
								this.callOverlayDeleteEvents();
							}, this), 60000);
						}
						if (this.debug) console.log('WebRTC: apponent ready!');
						this.connected = true;
					}
					else if (this.callActive && params.command == 'errorAccess')
					{
						this.callOverlayProgress('offline');
						this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_NO_ACCESS_2'));
						this.callOverlayButtons([
							{
								text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
								className: 'bx-messenger-call-overlay-button-close',
								events: {
									click : BX.delegate(function() {
										this.callOverlayClose();
									}, this)
								}
							}
						]);
						this.callOverlayDeleteEvents();
					}
					else if (this.callActive && params.command == 'signaling')
					{
						if (!this.callActive)
							return false;

						var signal = JSON.parse(params.peer);
						if (signal.type === 'offer')
						{
							if (!this.initiator && !this.pcStart)
								this.initPeerConnection();

							if (this.pc == null)
								return false;

							this.pc.setRemoteDescription(new RTCSessionDescription(signal));
							this.pc.createAnswer(BX.delegate(this.setLocalAndSend, this), null, this.sdpConstraints);

						}
						else if (signal.type === 'answer' && this.pcStart)
						{
							if (this.pc == null)
								return false;

							this.pc.setRemoteDescription(new RTCSessionDescription(signal));
						}
						else if (signal.type === 'candidate' && this.pcStart)
						{
							if (this.pc == null)
								return false;

							var candidate = new RTCIceCandidate({sdpMLineIndex:signal.label, candidate:signal.candidate});
							this.pc.addIceCandidate(candidate);
						}
						else if (signal.type === 'bye' && this.pcStart)
						{
							// TODO close connection etc
							this.callAbort();
							this.callOverlayClose();
						}
					}
					else if (this.callInit && params.command == 'waitTimeout')
					{
						this.callAbort();
						this.callOverlayClose();
					}
					else if (this.callInit && params.command == 'busy_self')
					{
						this.callAbort();
						this.callOverlayClose();
					}
					else if (this.callInit && params.command == 'busy')
					{
						this.callOverlayProgress('offline');
						this.callAbort(BX.message('IM_MESSENGER_CALL_ST_BUSY'));
						this.callOverlayButtons([
							{
								text: BX.message('IM_MESSENGER_CALL_BTN_RECALL'),
								className: 'bx-messenger-call-overlay-button-recall',
								events: {
									click : BX.delegate(function() {
										this.callInvite(params.senderId, params.video);
										//this.callOverlayRecall(params.senderId, params.video);
									}, this)
								}
							},
							{
								text: BX.message('IM_MESSENGER_CALL_BTN_HISTORY'),
								title: BX.message('IM_MESSENGER_CALL_BTN_HISTORY_2'),
								showInMinimize: true,
								className: 'bx-messenger-call-overlay-button-history',
								events: { click : BX.delegate(function(){
									this.messenger.openHistory(this.messenger.currentTab);
								}, this) }
							},
							{
								text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
								className: 'bx-messenger-call-overlay-button-close',
								events: {
									click : BX.delegate(function() {
										this.callOverlayClose();
									}, this)
								}
							}
						]);
						this.callOverlayDeleteEvents();
					}
					else if (this.callInit && params.command == 'decline')
					{
						if (this.callInitUserId != this.BXIM.userId || this.callActive)
						{
							var callVideo = this.callVideo;
							this.callAbort(BX.message('IM_MESSENGER_CALL_ST_DECLINE'));

							this.BXIM.playSound('stop');
							if (callVideo && this.callStreamSelf != null)
								this.callOverlayVideoClose();
							else
								this.callOverlayClose();
						}
						else if (this.callInitUserId == this.BXIM.userId)
						{
							this.callAbort(BX.message('IM_MESSENGER_CALL_ST_DECLINE'));
							this.callOverlayProgress('offline');
							this.callOverlayButtons([
								{
									text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
									className: 'bx-messenger-call-overlay-button-close',
									events: {
										click : BX.delegate(function() {
											this.callOverlayClose();
										}, this)
									}
								}
							]);
							this.callOverlayDeleteEvents();
						}
						else
						{
							this.callAbort();
						}
					}
					else if ((params.command == 'decline_self' || params.command == 'accept_self' && !this.callActive) && !this.callDeclineSelfDisabled)
					{
						this.callOverlayClose(true);
					}
					else
					{
						if (this.debug) console.log('WebRTC: command "'+params.command+'" skip');
					}
				}
			}
		}, this));

		if (BX.browser.SupportLocalStorage())
		{
			BX.addCustomEvent(window, "onLocalStorageSet", BX.delegate(this.storageSet, this));
		}

		BX.garbage(function(){
			if (this.callInit && !this.callActive)
			{
				if (this.initiator)
				{
					this.callCommand(this.callUserId, 'decline', {'CONNECTED': this.pc? 'Y': 'N', 'ACTIVE': this.callActive? 'Y': 'N', 'INITIATOR': this.initiator? 'Y': 'N'}, false);
					this.callAbort();
				}
				else
				{
					var calledUsers = {};
					for (var i in this.messenger.hrphoto)
						calledUsers[i] = this.messenger.users[i];

					BX.localStorage.set('mcr', {
						'users': calledUsers,
						'hrphoto': this.messenger.hrphoto,
						'callUserId': this.callUserId,
						'callVideo': this.callVideo
					}, 5);
				}
			}
			if (this.callActive)
				this.callCommand(this.callUserId, 'errorAccess', {}, false);

			this.callOverlayClose();
		}, this);
	}
	else if(!this.desktop.ready())
	{
		this.initAudio(true);
		BX.addCustomEvent("onPullEvent", BX.delegate(function(module_id,command,params) {
			if (module_id == "im" && command == 'call' && params.command == 'invite')
			{
				for (var i in params.users)
					this.messenger.users[i] = params.users[i];

				for (var i in params.hrphoto)
					this.messenger.hrphoto[i] = params.hrphoto[i];

				this.callOverlayShow({
					toUserId : this.BXIM.userId,
					fromUserId : params.senderId,
					video : params.video,
					progress : 'offline',
					minimize : false,
					status : BX.message('IM_MESSENGER_CALL_ST_NO_WEBRTC_2'),
					buttons : [
						this.desktop.ready()? null: {
							text: BX.message('IM_MESSENGER_CALL_BTN_DOWNLOAD'),
							className: 'bx-messenger-call-overlay-button-download',
							events: {
								click : function() {
									window.open("http://google.com/chrome/", "googleChrome");
									this.callOverlayClose();
								}
							}
						},
						{
							text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
							className: 'bx-messenger-call-overlay-button-close',
							events: {
								click : BX.delegate(function() {
									this.callOverlayClose();
								}, this)
							}
						}
					]
				});
				this.callOverlayDeleteEvents({'closeNotify': false});
			}
		}, this));
	}
}

BX.IM.WebRTC.prototype.adapter = function()
{
	if (navigator.mozGetUserMedia && typeof(mozRTCPeerConnection) != 'undefined' && navigator.userAgent.substr(navigator.userAgent.indexOf('Firefox/')+8, 2) >= 23)
	{
		this.enabled = true;
		this.detectedBrowser = 'firefox';

		this.pcConfig = { "iceServers": [ { url:"stun:"+this.turnServerFirefox}, { url:"turn:"+this.turnServerLogin+"@"+this.turnServerFirefox, credential:this.turnServerPassword} ] };
		this.pcConstraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};

		RTCPeerConnection = mozRTCPeerConnection;
		RTCSessionDescription = mozRTCSessionDescription;
		RTCIceCandidate = mozRTCIceCandidate;

		getUserMedia = navigator.mozGetUserMedia.bind(navigator);

		this.attachMediaStream = function(element, stream)
		{
			element.mozSrcObject = stream;
			element.play();
		};

		MediaStream.prototype.getVideoTracks = function()
		{
			return [];
		};

		MediaStream.prototype.getAudioTracks = function()
		{
			return [];
		};

	} // Chrome version >= 26
	else if (navigator.webkitGetUserMedia && typeof(webkitRTCPeerConnection) != 'undefined' && navigator.appVersion.substr(navigator.appVersion.indexOf('Chrome/')+7, 2) >= 26)
	{
		this.enabled = true;
		this.detectedBrowser = 'chrome';

		this.pcConfig = { "iceServers": [ { url:"stun:"+this.turnServer}, { url:"turn:"+this.turnServerLogin+"@"+this.turnServer, credential:this.turnServerPassword} ] };
		this.pcConstraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};

		RTCPeerConnection = webkitRTCPeerConnection;

		getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

		this.attachMediaStream = function(element, stream)
		{
			element.src = webkitURL.createObjectURL(stream);
		};

		if (!webkitMediaStream.prototype.getVideoTracks)
		{
			webkitMediaStream.prototype.getVideoTracks = function()
			{
				return this.videoTracks;
			};
			webkitMediaStream.prototype.getAudioTracks = function()
			{
				return this.audioTracks;
			};
		}

		if (!webkitRTCPeerConnection.prototype.getLocalStreams)
		{
			webkitRTCPeerConnection.prototype.getLocalStreams = function()
			{
				return this.localStreams;
			};
			webkitRTCPeerConnection.prototype.getRemoteStreams = function()
			{
				return this.remoteStreams;
			};
		}
	}
	else
	{
		RTCPeerConnection = null;
		getUserMedia = null;
	}

};

BX.IM.WebRTC.prototype.initAudio = function(onlyError)
{
	if (onlyError === true)
	{
		if (this.desktop.supportSound())
		{
			BXDesktopSystem.BindSound("error", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/video-error.ogg");
		}
		else
		{
			this.panel.appendChild(this.BXIM.audio.error = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-error.ogg", type : "audio/ogg; codecs=vorbis" }}),
				BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-error.mp3", type : "audio/mpeg" }})
			]}));
		}
		return false;
	}
	if (this.desktop.supportSound())
	{
		BXDesktopSystem.BindSound("dialtone", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/video-dialtone.ogg");
		BXDesktopSystem.BindSound("ringtone", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/video-ringtone.ogg");
		BXDesktopSystem.BindSound("start", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/video-start.ogg");
		BXDesktopSystem.BindSound("error", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/video-error.ogg");
		BXDesktopSystem.BindSound("stop", this.desktop.getCurrentUrl()+"/bitrix/js/im/audio/video-stop.ogg");
	}
	else
	{
		this.panel.appendChild(this.BXIM.audio.dialtone = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-dialtone.ogg", type : "audio/ogg; codecs=vorbis" }}),
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-dialtone.mp3", type : "audio/mpeg" }})
		]}));

		this.panel.appendChild(this.BXIM.audio.ringtone = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-ringtone.ogg", type : "audio/ogg; codecs=vorbis" }}),
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-ringtone.mp3", type : "audio/mpeg" }})
		]}));

		this.panel.appendChild(this.BXIM.audio.start = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-start.ogg", type : "audio/ogg; codecs=vorbis" }}),
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-start.mp3", type : "audio/mpeg" }})
		]}));

		this.panel.appendChild(this.BXIM.audio.stop = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-stop.ogg", type : "audio/ogg; codecs=vorbis" }}),
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-stop.mp3", type : "audio/mpeg" }})
		]}));

		this.panel.appendChild(this.BXIM.audio.error = BX.create("audio", { props : { className : "bx-messenger-audio" }, children : [
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-error.ogg", type : "audio/ogg; codecs=vorbis" }}),
			BX.create("source", { attrs : { src : "/bitrix/js/im/audio/video-error.mp3", type : "audio/mpeg" }})
		]}));

		if (typeof(this.BXIM.audio.stop.play) == 'undefined')
		{
			this.BXIM.enableSound = false;
			this.BXIM.audioSupport = false;
		}
	}
}

BX.IM.WebRTC.prototype.doGetUserMedia = function()
{
	if (this.sendRequestUserMedia[this.callVideo])
		return false;

	var constraints = {"audio": true, "video": this.callVideo? {"mandatory": {}, "optional": []}: false};
	try {
		clearTimeout(this.callInviteTimeout);
		clearTimeout(this.callWaitSoundTimeout);
		this.callWaitSoundTimeout = setTimeout(BX.delegate(function(){
			this.BXIM.stopRepeatSound('ringtone');
			this.BXIM.stopRepeatSound('dialtone');
			this.callDialogAllowShow();
		}, this), 1500);
		this.sendRequestUserMedia[this.callVideo? 'video': 'audio'] = true;
		getUserMedia(constraints, BX.delegate(this.onUserMediaSuccess, this), BX.delegate(this.onUserMediaError, this));
		if (this.debug) console.log("WebRTC: Requested access to local media with mediaConstraints:\n  \"" + JSON.stringify(constraints) + "\"");
	} catch (e) {
		if (this.debug) console.log("WebRTC: getUserMedia failed with exception: " + e.message);
	}
}

BX.IM.WebRTC.prototype.onUserMediaSuccess = function(stream)
{
	clearTimeout(this.callAllowTimeout);
	this.sendRequestUserMedia[this.callVideo? 'video': 'audio'] = false;
	if (this.callStreamSelf)
		return false;

	if (!this.callActive)
	{
		stream.stop();
		return false;
	}
	if (this.debug) console.log("WebRTC: User has granted access to local media.");
	this.callOverlayProgress('online');
	this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_WAIT_ACCESS_2'));
	if (this.callDialogAllow)
		this.callDialogAllow.close();

	this.callStreamSelf = stream;
	this.attachMediaStream(this.callOverlayVideoMain, stream);
	this.callOverlayPhotoMini.src = this.callOverlayPhotoLeft.src;

	BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-call-active');

	this.callOverlayVideoMain.muted = true;
	this.callCommand(this.callUserId, 'ready');
	if (this.initiator) this.initPeerConnection();
 }

BX.IM.WebRTC.prototype.onUserMediaError = function(error)
{
	clearTimeout(this.callAllowTimeout);
	this.sendRequestUserMedia[this.callVideo? 'video': 'audio'] = false;
	if (!this.callActive)
		return false;

	if (this.debug) console.log("WebRTC: Failed to get access to local media. Error code was " + error.code);
	if (this.callDialogAllow)
		this.callDialogAllow.close();

	this.callOverlayProgress('offline');
	this.callCommand(this.callUserId, 'errorAccess');
	this.callAbort(BX.message('IM_MESSENGER_CALL_ST_NO_ACCESS'));

	this.callOverlayButtons([{
		text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
		className: 'bx-messenger-call-overlay-button-close',
		events: {
			click : BX.delegate(function() {
				this.callOverlayClose();
			}, this)
		}
	}]);
}

BX.IM.WebRTC.prototype.trace = function(text)
{
	if (!this.enabled)
		return null;

	if (text[text.length - 1] == '\n')
		text = text.substring(0, text.length - 1);

	console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

/* Signaling API for WebRTC */

BX.IM.WebRTC.prototype.callSupport = function(userId, messengerClass)
{
	messengerClass = messengerClass? messengerClass: this.messenger;
	var userCheck = true;
	if (typeof(userId) != 'undefined')
	{
		userCheck = messengerClass.users[userId] && messengerClass.users[userId].status != 'offline' && messengerClass.users[userId].status != 'na'? true: false;
	}

	return (this.BXIM.bitrixIntranet && this.BXIM.ppServerStatus && this.enabled && userCheck)? true: false;
};

BX.IM.WebRTC.prototype.callInvite = function(userId, video)
{
	if (!this.callSupport())
		return false;

	userId = parseInt(userId);
	video = video == true? true: false;

	if (!this.callActive && !this.callInit && userId > 0)
	{
		this.initiator = true;
		this.callInitUserId = this.BXIM.userId;
		this.callInit = true;
		this.callUserId = userId;
		this.callVideo = video;

		this.callOverlayShow({
			toUserId : userId,
			fromUserId : this.BXIM.userId,
			video : video,
			status : BX.message('IM_MESSENGER_CALL_ST_CONNECT'),
			buttons : [
				{
					text: BX.message('IM_MESSENGER_CALL_BTN_HANGUP'),
					className: 'bx-messenger-call-overlay-button-hangup',
					events: {
						click : BX.delegate(function() {
							this.callDeclineSelfDisabled = true;
							this.callCommand(this.callUserId, 'decline', {'CONNECTED': this.pc? 'Y': 'N', 'ACTIVE': this.callActive? 'Y': 'N', 'INITIATOR': this.initiator? 'Y': 'N'});
							this.callAbort();
							this.callOverlayClose();
						}, this)
					}
				},
				{
					text: BX.message('IM_MESSENGER_CALL_BTN_HISTORY'),
					title: BX.message('IM_MESSENGER_CALL_BTN_HISTORY_2'),
					className: 'bx-messenger-call-overlay-button-history',
					showInMinimize: true,
					events: { click : BX.delegate(function(){
						this.messenger.openHistory(this.messenger.currentTab);
					}, this) }
				},
				{
					text: BX.message('IM_MESSENGER_CALL_BTN_CHAT'),
					className: 'bx-messenger-call-overlay-button-chat',
					showInMaximize: true,
					events: { click : BX.delegate(this.callOverlayToggleSize, this) }
				},
				{
					title: BX.message('IM_MESSENGER_CALL_BTN_MAXI'),
					className: 'bx-messenger-call-overlay-button-maxi',
					showInMinimize: true,
					events: { click : BX.delegate(this.callOverlayToggleSize, this) }
				}
			]
		});

		this.BXIM.playSound("start");

		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/video.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 10,
			data: {'IM_CALL' : 'Y', 'COMMAND': 'invite', 'RECIPIENT_ID' : userId, 'VIDEO' : video? 'Y': 'N', 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
			onsuccess: BX.delegate(function(data) {
				for (var i in data.HR_PHOTO)
					this.messenger.hrphoto[i] = data.HR_PHOTO[i];

				this.callOverlayUpdatePhoto();

				this.callInviteTimeout  = setTimeout(BX.delegate(function(){
					this.callOverlayProgress('offline');
					this.callCommand(this.callUserId, 'errorOffline');
					this.callAbort(BX.message('IM_MESSENGER_CALL_ST_NO_WEBRTC'));
					this.callOverlayButtons([{
						text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
						className: 'bx-messenger-call-overlay-button-close',
						events: {
							click : BX.delegate(function() {
								this.callOverlayClose();
							}, this)
						}
					}]);
					this.callOverlayDeleteEvents();
				}, this), 10000);
			}, this),
			onfailure: BX.delegate(function() {
				this.callAbort(BX.message('IM_MESSENGER_CALL_ERR'));
			}, this)
		});
	}
};

BX.IM.WebRTC.prototype.callWait = function()
{
	if (!this.callSupport())
		return false;

	this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_WAIT'));

	clearTimeout(this.callInviteTimeout);
	this.callInviteTimeout  = setTimeout(BX.delegate(function(){
		this.callOverlayProgress('offline');
		this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_NO_ANSWER'));
		var callUserId = this.callUserId;
		var callVideo = this.callVideo;
		this.callOverlayButtons([
			{
				text: BX.message('IM_MESSENGER_CALL_BTN_RECALL'),
				className: 'bx-messenger-call-overlay-button-recall',
				events: {
					click : BX.delegate(function() {
						this.callInvite(callUserId, callVideo);
						//this.callOverlayRecall(callUserId, callVideo);
					}, this)
				}
			},
			{
				text: BX.message('IM_MESSENGER_CALL_BTN_HISTORY'),
				title: BX.message('IM_MESSENGER_CALL_BTN_HISTORY_2'),
				className: 'bx-messenger-call-overlay-button-history',
				showInMinimize: true,
				events: { click : BX.delegate(function(){
					this.messenger.openHistory(this.messenger.currentTab);
				}, this) }
			},
			{
				text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
				className: 'bx-messenger-call-overlay-button-close',
				events: {
					click : BX.delegate(function() {
						this.callOverlayClose();
					}, this)
				}
			}
		]);
		this.callCommand(this.callUserId, 'waitTimeout');
		this.callOverlayDeleteEvents();
	}, this), 60000);
};

BX.IM.WebRTC.prototype.callAbort = function(reason)
{
	if (!this.callSupport() || !this.callInit)
		return false;

	this.callActive = false;
	this.callInit = false;
	this.callUserId = 0;
	this.callVideo = false;

	if (this.callNotify)
		this.callNotify.destroy();

	if (this.callDialogAllow)
		this.callDialogAllow.close();

	if (this.pc)
	{
		this.pc.close();
		this.pc = null;
		this.pcStart = false;
		this.connected = false;
	}

	if (this.callUM)
	{
		this.callUM.stop();
		this.callUM = null;
	}

	clearTimeout(this.callInviteTimeout);
	if (reason)
		this.callOverlayStatus(reason);
};

BX.IM.WebRTC.prototype.callCommand = function(userId, command, params, async)
{
	if (!this.callSupport())
		return false;

	userId = parseInt(userId);
	async = async == false? false: true;
	params = typeof(params) == 'object' ? params: {};

	if (userId > 0)
	{
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/video.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 10,
			async: async,
			data: {'IM_CALL' : 'Y', 'COMMAND': command, 'RECIPIENT_ID' : userId, 'PARAMS' : JSON.stringify(params), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
			onsuccess: BX.delegate(function(){
				if (this.callDialogAllow)
					this.callDialogAllow.close();
			}, this)
		});
	}
};

BX.IM.WebRTC.prototype.callNotifyWait = function(userId, video)
{
	if (!this.callSupport())
		return false;

	video = video == true? true: false;

	this.callInitUserId = userId;
	this.callInit = true;
	this.callActive = false;
	this.callUserId = userId;
	this.callVideo = video;

	this.callOverlayShow({
		toUserId : this.BXIM.userId,
		fromUserId : userId,
		video : video,
		status : BX.message('IM_MESSENGER_CALL_ST_INVITE'),
		buttons : [
			{
				text: BX.message('IM_MESSENGER_CALL_BTN_ANSWER'),
				className: 'bx-messenger-call-overlay-button-answer',
				events: {
					click : BX.delegate(function() {
						this.callDialog();
						BX.ajax({
							url: '/bitrix/components/bitrix/im.messenger/video.ajax.php',
							method: 'POST',
							dataType: 'json',
							timeout: 10,
							data: {'IM_CALL' : 'Y', 'COMMAND': 'accept', 'RECIPIENT_ID' : this.callUserId, 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
						});
					}, this)
				}
			},
			{
				text: BX.message('IM_MESSENGER_CALL_BTN_HANGUP'),
				className: 'bx-messenger-call-overlay-button-hangup',
				events: {
					click : BX.delegate(function() {
						this.callDeclineSelfDisabled = true;
						this.callCommand(this.callUserId, 'decline', {'CONNECTED': this.pc? 'Y': 'N', 'ACTIVE': this.callActive? 'Y': 'N', 'INITIATOR': this.initiator? 'Y': 'N'});
						this.callAbort();
						this.callOverlayClose();
					}, this)
				}
			},
			{
				text: BX.message('IM_MESSENGER_CALL_BTN_CHAT'),
				className: 'bx-messenger-call-overlay-button-chat',
				showInMaximize: true,
				events: { click : BX.delegate(this.callOverlayToggleSize, this) }
			},
			{
				title: BX.message('IM_MESSENGER_CALL_BTN_MAXI'),
				className: 'bx-messenger-call-overlay-button-maxi',
				showInMinimize: true,
				events: { click : BX.delegate(this.callOverlayToggleSize, this) }
			}
		]
	});
};

BX.IM.WebRTC.prototype.initPeerConnection = function()
{
	if (!this.pcStart && this.callStreamSelf /* && turnReady*/)
	{
		if (this.connected)
		{
			if (this.debug) console.log("WebRTC: Creating PeerConnection.");
			this.createPeerConnection();
			if (!this.callStreamSelf || !this.pc)
				return false;

			if (this.debug) console.log("WebRTC: Adding local stream.", JSON.stringify(this.pc), this.callStreamSelf);

			this.pc.addStream(this.callStreamSelf);
			this.pcStart = true;

			// Caller initiates offer to peer.
			if (this.initiator)
				this.doCall();
		}
		else
		{
			setTimeout(BX.delegate(function(){
				this.initPeerConnection();
			}, this), 2000);
		}
	}

}
BX.IM.WebRTC.prototype.doCall = function  ()
{
	if (this.pc == null)
      	return false;

	var constraints = {"optional": [], "mandatory": {"MozDontOfferDataChannel": true}};

	// temporary measure to remove Moz* constraints in Chrome
	if (this.detectedBrowser === "chrome")
	{
		for (var prop in constraints.mandatory)
		{
			if (prop.indexOf("Moz") != -1)
				delete constraints.mandatory[prop];
		}
	}
	if (this.debug) console.log('WebRTC: Constraints', constraints);
	constraints = this.mergeConstraints(constraints, this.sdpConstraints);

	if (this.debug) console.log("WebRTC: Sending offer to peer, with constraints: \n  \"" + JSON.stringify(constraints) + "\".")
	this.pc.createOffer(BX.delegate(this.setLocalAndSend, this), null, constraints);
}
BX.IM.WebRTC.prototype.setLocalAndSend = function(desc)
{
	if (this.pc == null || !this.callActive)
      	return false;

	this.pc.setLocalDescription(desc);
	if (this.debug) console.log('WebRTC: send offer', JSON.stringify(desc));

	BX.ajax({
		url: '/bitrix/components/bitrix/im.messenger/video.ajax.php',
		method: 'POST',
		dataType: 'json',
		timeout: 10,
		data: {'IM_CALL' : 'Y', 'COMMAND': 'signaling', 'RECIPIENT_ID' : this.callUserId, 'PEER': JSON.stringify( desc ), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
	});
}
BX.IM.WebRTC.prototype.mergeConstraints = function (cons1, cons2) {
	var merged = cons1;
	for (var name in cons2.mandatory)
	{
		merged.mandatory[name] = cons2.mandatory[name];
	}
	merged.optional.concat(cons2.optional);
	return merged;
}
BX.IM.WebRTC.prototype.createPeerConnection = function()
{
	try {
		this.pc = new RTCPeerConnection(this.pcConfig, this.pcConstraints);
		this.pc.onicecandidate = BX.delegate(this.onIceCandidate, this);
		this.pc.onaddstream = BX.delegate(this.onRemoteStreamAdded, this);
    	this.pc.onremovestream = BX.delegate(this.onRemoteStreamRemoved, this);

		if (this.debug) console.log("WebRTC: Created RTCPeerConnnection with:\n" +
		"  config: \"" + JSON.stringify(this.pcConfig) + "\";\n" +
		"  constraints: \"" + JSON.stringify(this.pcConstraints) + "\".");
	}
	catch (e)
	{
		if (this.debug) console.log('WebRTC: PeerConnection: ', JSON.stringify(this.pcConfig), JSON.stringify(this.pcConstraints));
		if (this.debug) console.log("WebRTC: Failed to create PeerConnection, exception: " + e.message);
		if (this.callDialogAllow)
			this.callDialogAllow.close();

		this.callOverlayProgress('offline');
		this.callCommand(this.callUserId, 'errorAccess');
		this.callAbort(BX.message('IM_MESSENGER_CALL_ST_CON_ERROR'));

		this.callOverlayButtons([{
			text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
			className: 'bx-messenger-call-overlay-button-close',
			events: {
				click : BX.delegate(function() {
					this.callOverlayClose();
				}, this)
			}
		}]);
	}

}
BX.IM.WebRTC.prototype.onRemoteStreamAdded = function (event) {
	if (this.debug) console.log('WebRTC: Remote stream added', JSON.stringify(event));
    this.callStreamApponent = event.stream;

    this.attachMediaStream(this.callOverlayVideoMain, this.callStreamApponent);
    this.attachMediaStream(this.callOverlayVideoMini, this.callStreamSelf);

	this.callOverlayVideoMain.muted = false;
	this.callOverlayVideoMain.volume = 1;
	this.callOverlayVideoMini.muted = true;
	this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_ONLINE'));
	BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-online');
	if (this.initiator)
		this.callCommand(this.callUserId, 'start');
}
BX.IM.WebRTC.prototype.onRemoteStreamRemoved = function(event) {
	BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-online');
    if (this.debug) console.log("WebRTC: Remote stream removed.");
}
BX.IM.WebRTC.prototype.onIceCandidate = function (event) {
	if (event.candidate)
	{
		BX.ajax({
			url: '/bitrix/components/bitrix/im.messenger/video.ajax.php',
			method: 'POST',
			dataType: 'json',
			timeout: 10,
			data: {'IM_CALL' : 'Y', 'COMMAND': 'signaling', 'RECIPIENT_ID' : this.callUserId, 'PEER': JSON.stringify({type: 'candidate', label: event.candidate.sdpMLineIndex, id: event.candidate.sdpMid, candidate: event.candidate.candidate}), 'IM_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
		});
	}
	else
	{
		if (this.debug) console.log("WebRTC: End of candidates.");
	}
}

/* WebRTC dialogs markup */
BX.IM.WebRTC.prototype.callDialog = function()
{
	if (!this.callSupport() && this.callOverlay == null)
		return false;

	clearTimeout(this.callInviteTimeout);
	clearTimeout(this.callWaitSoundTimeout);
	this.BXIM.stopRepeatSound('ringtone');
	this.BXIM.stopRepeatSound('dialtone');

	this.callActive = true;
	this.callOverlayProgress('wait');
	this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_WAIT_ACCESS'));

	this.callOverlayButtons([
		{
			text: BX.message('IM_MESSENGER_CALL_BTN_HANGUP'),
			className: 'bx-messenger-call-overlay-button-hangup',
			events: {
				click : BX.delegate(function() {
					var callVideo = this.callVideo;
					this.callDeclineSelfDisabled = true;
					this.callCommand(this.callUserId, 'decline', {'CONNECTED': this.pc? 'Y': 'N', 'ACTIVE': this.callActive? 'Y': 'N', 'INITIATOR': this.initiator? 'Y': 'N'});
					this.callAbort();
					this.BXIM.playSound('stop');
					if (callVideo && this.callStreamSelf != null)
						this.callOverlayVideoClose();
					else
						this.callOverlayClose();

				}, this)
			}
		},
		/*{
			text: BX.message('IM_MESSENGER_CALL_BTN_MIC'),
			subtext: this.audioMuted? BX.message('IM_MESSENGER_CALL_BTN_MIC_OFF'): BX.message('IM_MESSENGER_CALL_BTN_MIC_ON'),
			className: 'bx-messenger-call-overlay-button-mic '+(this.audioMuted? ' bx-messenger-call-overlay-button-mic-off': ''),
			events: {
				click : BX.delegate(function() {
					this.audioMuted = !this.audioMuted;

					var icon = BX.findChild(BX.proxy_context, {className : "bx-messenger-call-overlay-button-mic"}, true);
					if (icon)
						BX.toggleClass(icon, 'bx-messenger-call-overlay-button-mic-off');

					var text = BX.findChild(BX.proxy_context, {className : "bx-messenger-call-overlay-button-text-sub"}, true);
					if (text)
						text.innerHTML = this.audioMuted? BX.message('IM_MESSENGER_CALL_BTN_MIC_OFF'): BX.message('IM_MESSENGER_CALL_BTN_MIC_ON');

				}, this)
			}
		},*/
		{
			text: BX.message('IM_MESSENGER_CALL_BTN_HISTORY'),
			title: BX.message('IM_MESSENGER_CALL_BTN_HISTORY_2'),
			className: 'bx-messenger-call-overlay-button-history',
			events: { click : BX.delegate(function(){
				this.messenger.openHistory(this.messenger.currentTab);
			}, this) }
		},
		{
			text: BX.message('IM_MESSENGER_CALL_BTN_CHAT'),
			className: 'bx-messenger-call-overlay-button-chat',
			showInMaximize: true,
			events: { click : BX.delegate(this.callOverlayToggleSize, this) }
		},
		{
			title: BX.message('IM_MESSENGER_CALL_BTN_MAXI'),
			className: 'bx-messenger-call-overlay-button-maxi',
			showInMinimize: true,
			events: { click : BX.delegate(this.callOverlayToggleSize, this) }
		},
		!this.callVideo? null: {
			title: BX.message('IM_MESSENGER_CALL_BTN_FULL'),
			className: 'bx-messenger-call-overlay-button-full',
			events: { click : BX.delegate(this.overlayEnterFullScreen, this) }
		}
	]);


	if (this.messenger.popupMessenger == null)
	{
		this.messenger.openMessenger(this.callUserId);
		this.callOverlayToggleSize(false);
	}

	BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-maxi ');
	BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-mini');
	BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-line');
	BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-call');
	BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-call-'+(this.callVideo? 'video': 'audio'));

	// TODO need turn server
	this.doGetUserMedia();
};

BX.IM.WebRTC.prototype.callOverlayShow = function(params)
{
	if (!params || !params.toUserId || !params.fromUserId || !params.buttons)
		return false;

	if (this.callOverlay != null)
	{
		this.callOverlayClose(false, true);

	}

	this.messenger.closeMenuPopup();

	params.video = params.video == false? false: true;
	params.minimize = typeof(params.minimize) == 'undefined'? (this.messenger.popupMessenger == null? true: false): (params.minimize == true? true: false);
	params.status = params.status? params.status: "";
	params.progress = params.progress? params.progress: "connect";

	this.callOldBeforeUnload = window.onbeforeunload;
	window.onbeforeunload = function(){
		return BX.message('IM_MESSENGER_CALL_EFP')
	};
	var callIncoming = params.toUserId == this.BXIM.userId;
	var callTitle = callIncoming? BX.message('IM_MESSENGER_CALL_'+(params.video? 'VIDEO':'VOICE')+'_FROM').replace('#USER#', this.messenger.users[params.fromUserId].name)
								: BX.message('IM_MESSENGER_CALL_'+(params.video? 'VIDEO':'VOICE')+'_TO').replace('#USER#', this.messenger.users[params.toUserId].name);

	var callPhotoLeftUserId = callIncoming? params.fromUserId: params.toUserId;
	var callPhotoRightUserId = callIncoming? params.toUserId: params.fromUserId;
	var callPhotoLeft = this.messenger.hrphoto[callPhotoLeftUserId]? this.messenger.hrphoto[callPhotoLeftUserId]: this.messenger.users[callPhotoLeftUserId].avatar;
	var callPhotoRight = this.messenger.hrphoto[callPhotoRightUserId]? this.messenger.hrphoto[callPhotoRightUserId]: this.messenger.users[callPhotoRightUserId].avatar;

	this.callOverlayMinimize = params.minimize;
	this.callOverlayUserId = this.callUserId;

	var scrollableArea = null;
	if (this.BXIM.dialogOpen)
		scrollableArea = this.messenger.popupMessengerBody;
	else if (this.BXIM.notifyOpen)
		scrollableArea = this.messenger.popupNotifyItem;

	if (scrollableArea)
	{
		if (this.BXIM.isScrollMin(scrollableArea))
		{
			setTimeout(BX.delegate(function(){
				BX.addClass(this.messenger.popupMessengerContent, 'bx-messenger-call');
			},this), params.minimize? 0: 400);
		}
		else
		{
			BX.addClass(this.messenger.popupMessengerContent, 'bx-messenger-call');
			scrollableArea.scrollTop = scrollableArea.scrollTop+50;
		}
	}
	else
	{
		BX.addClass(this.messenger.popupMessengerContent, 'bx-messenger-call');
	}
	var callOverlayStyle = {
		width : !this.messenger.popupMessenger? '610px': (this.messenger.popupMessengerExtra.style.display == "block"? this.messenger.popupMessengerExtra.offsetWidth-1: this.messenger.popupMessengerDialog.offsetWidth-1)+'px',
		height : (this.messenger.popupMessengerFullHeight-1)+'px',
		marginLeft : this.messenger.popupContactListSize+'px'
	};
	this.callOverlay = BX.create("div", { props : { className : 'bx-messenger-call-overlay '+(params.minimize? 'bx-messenger-call-overlay-mini': 'bx-messenger-call-overlay-maxi')}, style : callOverlayStyle, children: [
		BX.create("div", { props : { className : 'bx-messenger-call-overlay-lvl-1'}, children: [
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-lvl-2'}, children: [
				BX.create("div", { props : { className : 'bx-messenger-call-video-main'}, children: [
					BX.create("div", { props : { className : 'bx-messenger-call-video-main-wrap'}, children: [
						BX.create("div", { props : { className : 'bx-messenger-call-video-main-cell'}, children: [
							BX.create("div", { props : { className : 'bx-messenger-call-video-main-bg'}, children: [
								BX.create("div", { props : { className : 'bx-messenger-call-video-main-watermark'}, children: [
									BX.create("img", { props : { className : 'bx-messenger-call-video-main-watermark-img'},  attrs : {src : '/bitrix/js/im/images/watermark_'+(this.BXIM.language == 'ru'? 'ru': 'en')+'.png'}})
								]}),
								this.callOverlayVideoMain = BX.create("video", { attrs : { autoplay : true }, props : { className : 'bx-messenger-call-video-main-block'}})
							]})
						]})
					]})
				]})
			]})
		]}),
		BX.create("div", { props : { className : 'bx-messenger-call-overlay-body'}, children: [
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-line-maxi'}, attrs : { title: BX.message('IM_MESSENGER_CALL_BTN_RETURN')}, children: [
				BX.create("div", { props : { className : 'bx-messenger-call-overlay-line-maxi-block'}})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-title'}, children: [
				this.callOverlayTitleBlock = BX.create("div", { props : { className : 'bx-messenger-call-overlay-title-block'}, html: callTitle})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-photo'}, children: [
				BX.create("div", { props : { className : 'bx-messenger-call-overlay-photo-left'}, children: [
					BX.create("div", { props : { className : 'bx-messenger-call-overlay-photo-block'}, children: [
						this.callOverlayPhotoLeft = BX.create("img", { props : { className : 'bx-messenger-call-overlay-photo-img'}, attrs : { 'data-userId': callPhotoLeftUserId, src : callPhotoLeft}})
					]})
				]}),
				this.callOverlayProgressBlock = BX.create("div", { props : { className : 'bx-messenger-call-overlay-photo-progress'}}),
				BX.create("div", { props : { className : 'bx-messenger-call-overlay-photo-right'}, children: [
					BX.create("div", { props : { className : 'bx-messenger-call-overlay-photo-block'}, children: [
						this.callOverlayPhotoRight = BX.create("img", { props : { className : 'bx-messenger-call-overlay-photo-img'}, attrs : { 'data-userId': callPhotoRightUserId, src : callPhotoRight}})
					]})
				]})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-status'}, children: [
				this.callOverlayStatusBlock = BX.create("div", { props : { className : 'bx-messenger-call-overlay-status-block'}})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-video-mini'}, children: [
				this.callOverlayVideoMini = BX.create("video", { attrs : { autoplay : true }, props : { className : 'bx-messenger-call-video-mini-block'}}),
				BX.create("div", { props : { className : 'bx-messenger-call-video-mini-photo'}, children: [
					this.callOverlayPhotoMini = BX.create("img", { props : { className : 'bx-messenger-call-video-mini-photo-img'}, attrs : { src : callPhotoRight}})
				]})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-buttons'}, children: [
				this.callOverlayButtonsBlock = BX.create("div", { props : { className : 'bx-messenger-call-overlay-buttons-block'}})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-alfa'}, html: BX.message('IM_MESSENGER_CALL_ST_ALFA')+' <span class="bx-messenger-call-overlay-webrtc" valign="middle"></span> WebRTC'})
		]})
	]});
	if (this.messenger.popupMessenger != null)
	{
		this.messenger.popupMessenger.setClosingByEsc(false);
		this.messenger.popupMessengerContent.insertBefore(this.callOverlay, this.messenger.popupMessengerContent.firstChild);
	}
	else if (this.callNotify != null)
	{
		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-float');
		this.callNotify.setContent(this.callOverlay);
	}
	else
	{
		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-float');
		this.callNotify = new BX.PopupWindow('bx-messenger-call-notify', null, {
			lightShadow : true,
			zIndex: 200,
			events : {
				onPopupClose : function() { this.destroy(); },
				onPopupDestroy : BX.delegate(function() {
					BX.unbind(window, "scroll", this.popupCallNotifyEvent);
					this.callNotify = null;
				}, this)},
			content : this.callOverlay
		});
		this.callNotify.show();

		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-float');
		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-show');
		BX.addClass(this.callNotify.popupContainer.children[0], 'bx-messenger-popup-window-transparent');
		BX.bind(window, "scroll", this.popupCallNotifyEvent = BX.proxy(function(){ this.callNotify.adjustPosition();}, this));
	}

	this.callOverlayStatus(params.status);
	this.callOverlayButtons(params.buttons);
	this.callOverlayProgress(params.progress);

	setTimeout(BX.delegate(function(){
		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-show');
	}, this), 100);
}

BX.IM.WebRTC.prototype.overlayEnterFullScreen = function()
{
	if (this.callOverlayFullScreen)
	{
		BX.removeClass(this.messenger.popupMessengerContent, 'bx-messenger-call-overlay-full');
		if (document.cancelFullScreen)
			document.cancelFullScreen();
		else if (document.mozCancelFullScreen)
			document.mozCancelFullScreen();
		else if (document.webkitCancelFullScreen)
			document.webkitCancelFullScreen();
	}
	else
	{
		BX.addClass(this.messenger.popupMessengerContent, 'bx-messenger-call-overlay-full');
		if (this.detectedBrowser == 'chrome')
		{
			BX.bind(window, "webkitfullscreenchange", this.callOverlayFullScreenBind = BX.proxy(this.overlayEventFullScreen, this));
			this.messenger.popupMessengerContent.webkitRequestFullScreen(this.messenger.popupMessengerContent.ALLOW_KEYBOARD_INPUT);
		}
		else if (this.detectedBrowser == 'firefox')
		{
			BX.bind(window, "mozfullscreenchange", this.callOverlayFullScreenBind = BX.proxy(this.overlayEventFullScreen, this));
			this.messenger.popupMessengerContent.mozRequestFullScreen(this.messenger.popupMessengerContent.ALLOW_KEYBOARD_INPUT);
		}
	}
}

BX.IM.WebRTC.prototype.overlayEventFullScreen = function()
{
	if (this.callOverlayFullScreen)
	{
		if (this.detectedBrowser == 'chrome')
			BX.unbind(window, "webkitfullscreenchange", this.callOverlayFullScreenBind);
		else if (this.detectedBrowser == 'firefox')
			BX.unbind(window, "mozfullscreenchange", this.callOverlayFullScreenBind);

		BX.removeClass(this.messenger.popupMessengerContent, 'bx-messenger-call-overlay-full');
		this.callOverlayFullScreen = false;
	}
	else
	{
		BX.addClass(this.messenger.popupMessengerContent, 'bx-messenger-call-overlay-full');
		this.callOverlayFullScreen = true;
	}
	this.messenger.popupMessengerBody.scrollTop = this.messenger.popupMessengerBody.scrollHeight;
}

BX.IM.WebRTC.prototype.callOverlayToggleSize = function(minimize)
{
	if (this.callOverlay == null)
		return false;

	if (!this.enabled)
	{
		this.callOverlayClose(true);
		return false;
	}

	var resizeToMax = typeof(minimize) == 'boolean'? !minimize: this.callOverlayMinimize;

	var minimizeToLine = false;
	if (this.messenger.popupMessenger != null && !this.BXIM.dialogOpen)
		minimizeToLine = true;
	else if (this.messenger.popupMessenger != null && this.callOverlayUserId != this.messenger.currentTab)
		minimizeToLine = true;

	if (resizeToMax && this.callActive)
		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-call');
	else
		BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-call');

	BX.unbindAll(this.callOverlay);
	if (resizeToMax)
	{
		this.callOverlayMinimize = false;

		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-maxi');
		BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-line');
		BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-mini');
	}
	else
	{
		this.callOverlayMinimize = true;

		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-mini');
		BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-maxi');

		if (minimizeToLine)
		{
			BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-line');

			setTimeout(BX.delegate(function(){
				BX.bind(this.callOverlay, 'click', BX.delegate(function() {
					if (this.BXIM.dialogOpen)
					{
						this.messenger.openChatFlag = false;
						this.messenger.openDialog(this.callOverlayUserId, false, false);
					}
					else
					{
						this.messenger.openChatFlag = false;
						this.messenger.currentTab = this.callOverlayUserId;
						this.messenger.extraClose(true, false);
					}
					this.callOverlayToggleSize(false);
				}, this));
			}, this), 200);
		}
		else
			BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-line');

		if (this.BXIM.isFocus())
			this.messenger.readMessage(this.messenger.currentTab);
		if (this.BXIM.isFocus() && this.notify.notifyUpdateCount > 0)
			this.notify.viewNotifyAll();
	}

	if (this.callDialogAllow != null)
	{
		if (this.callDialogAllow)
			this.callDialogAllow.close();
		setTimeout(BX.delegate(function(){
			this.callDialogAllowShow();
		}, this), 2000);
	}
}

BX.IM.WebRTC.prototype.callOverlayClose = function(animation, onlyMarkup)
{
	if (this.callOverlay == null)
		return false;

	onlyMarkup = onlyMarkup == true? true: false;

	if (!onlyMarkup && this.callOverlayFullScreen)
	{
		// hack for FF, we cant use closeFullscreen without button or key
		if (this.detectedBrowser == 'firefox')
		{
			BX.removeClass(this.messenger.popupMessengerContent, 'bx-messenger-call-overlay-full');
			BX.remove(this.messenger.popupMessengerContent);
			BX.hide(this.messenger.popupMessenger.popupContainer);
			setTimeout(BX.delegate(function(){
				this.messenger.popupMessenger.destroy();
				this.messenger.openMessenger();
			}, this), 200);
		}
		else
			this.overlayEnterFullScreen();
	}

	if (this.messenger.popupMessenger != null)
	{
		var scrollableArea = null;
		if (this.BXIM.dialogOpen)
			scrollableArea = this.messenger.popupMessengerBody;
		else if (this.BXIM.notifyOpen)
			scrollableArea = this.messenger.popupNotifyItem;

		if (scrollableArea)
		{
			if (this.BXIM.isScrollMax(scrollableArea))
			{
				BX.removeClass(this.messenger.popupMessengerContent, 'bx-messenger-call');
			}
			else
			{
				BX.removeClass(this.messenger.popupMessengerContent, 'bx-messenger-call');
				scrollableArea.scrollTop = scrollableArea.scrollTop-50;
			}
		}
		else
		{
			BX.removeClass(this.messenger.popupMessengerContent, 'bx-messenger-call');
		}
	}

	animation = animation == false? false: true;
	if (animation)
		BX.addClass(this.callOverlay, 'bx-messenger-call-overlay-hide');

	if (animation)
	{
		setTimeout(BX.delegate(function(){
			BX.remove(this.callOverlay);
			this.callOverlay = null;
			this.callOverlayButtonsBlock = null;
			this.callOverlayStatusBlock = null;
			this.callOverlayProgressBlock = null;
			this.callOverlayMinimize = null;
			this.callOverlayUserId = 0;
			this.callDeclineSelfDisabled = false;
		}, this), 300);
	}
	else
	{
		BX.remove(this.callOverlay);
		this.callOverlay = null;
		this.callOverlayButtonsBlock = null;
		this.callOverlayStatusBlock = null;
		this.callOverlayProgressBlock = null;
		this.callOverlayMinimize = null;
		this.callOverlayUserId = 0;
		this.callDeclineSelfDisabled = false;
	}

	if (onlyMarkup)
	{
		clearTimeout(this.callOverlayRecallCountersetTimeout);
		window.onbeforeunload = this.callOldBeforeUnload;
	}
	else
	{
		this.callOverlayDeleteEvents();
	}
}

BX.IM.WebRTC.prototype.callOverlayVideoClose = function()
{
	BX.style(this.callOverlayVideoMain, 'height', this.callOverlayVideoMain.parentNode.offsetHeight+'px');
	BX.addClass(this.callOverlayVideoMain.parentNode, 'bx-messenger-call-video-main-bg-start');

	setTimeout(BX.delegate(function(){
		this.callOverlayClose();
	}, this), 1700);
}
BX.IM.WebRTC.prototype.callOverlayDeleteEvents = function(params)
{
	clearTimeout(this.callInviteTimeout);
	clearTimeout(this.callOverlayRecallCountersetTimeout);
	window.onbeforeunload = this.callOldBeforeUnload;
	params = params? params: {};

	var closeNotify = params.closeNotify === false? false: true;

	this.initiator = false;
	this.callInit = false;
	this.callActive = false;
	this.callVideo = false;

	if (this.callStreamSelf)
	{
		this.callStreamSelf.stop();
		this.callStreamSelf = null;
		BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-call-active');
	}
	if (this.callStreamApponent)
	{
		if (this.callStreamApponent.stop)
			this.callStreamApponent.stop();
		this.callStreamApponent = null;
	}
	if (this.messenger.popupMessenger)
	{
		this.messenger.popupMessenger.setClosingByEsc(true);
		this.messenger.dialogStatusRedraw();
	}
	if (closeNotify && this.callNotify)
		this.callNotify.destroy();

	if (this.callDialogAllow)
		this.callDialogAllow.destroy();

	this.BXIM.stopRepeatSound('ringtone');
	this.BXIM.stopRepeatSound('dialtone');
	clearTimeout(this.callWaitSoundTimeout);
}

BX.IM.WebRTC.prototype.callOverlayProgress = function(status)
{
	if (this.callOverlay == null)
		return false;

	this.callOverlayProgressBlock.innerHTML = '';
	if (status == 'connect')
	{
		this.callOverlayProgressBlock.appendChild(
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-progress'}, children: [
				BX.create("img", { props : { className : 'bx-messenger-call-overlay-progress-status bx-messenger-call-overlay-progress-status-anim-1'}}),
				BX.create("img", { props : { className : 'bx-messenger-call-overlay-progress-status bx-messenger-call-overlay-progress-status-anim-2'}})
			]})
		);
	}
	else if (status == 'online')
	{
		this.callOverlayProgressBlock.appendChild(
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-progress bx-messenger-call-overlay-progress-online'}, children: [
				BX.create("img", { props : { className : 'bx-messenger-call-overlay-progress-status bx-messenger-call-overlay-progress-status-anim-3'}})
			]})
		);
	}
	else if (status == 'wait' || status == 'offline')
	{
		if (status == 'offline')
		{
			BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-online');
			BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-call');
			BX.removeClass(this.callOverlay, 'bx-messenger-call-overlay-call-active');
			this.BXIM.playSound('error');
		}
		this.callOverlayProgressBlock.appendChild(
			BX.create("div", { props : { className : 'bx-messenger-call-overlay-progress bx-messenger-call-overlay-progress-'+status}})
		);
	}
	else
		return false;
}

BX.IM.WebRTC.prototype.callOverlayStatus = function(status)
{
	if (this.callOverlay == null || typeof(status) == 'undefined')
		return false;

	this.callOverlayStatusBlock.innerHTML = status.toString();
}

BX.IM.WebRTC.prototype.callOverlayRecall = function(userId, video)
{
	this.callRecallCount = 5;
	this.callOverlayProgress('wait');
	clearTimeout(this.callOverlayRecallCountersetTimeout);
	this.callOverlayRecallCounter(userId, video);
	this.callOverlayButtons([{
		text: BX.message('IM_MESSENGER_CALL_BTN_CLOSE'),
		className: 'bx-messenger-call-overlay-button-close',
		events: {
			click : BX.delegate(function() {
				this.callOverlayClose();
			}, this)
		}
	}]);
}
BX.IM.WebRTC.prototype.callOverlayRecallCounter = function(userId, video)
{
	this.callOverlayStatus(BX.message('IM_MESSENGER_CALL_ST_RECALL').replace('#MINUTE#', this.callRecallCount));
	this.callOverlayRecallCountersetTimeout = setTimeout(BX.delegate(function(){
		if (this.callRecallCount == 1)
		{
			this.callInvite(userId, video);
		}
		else
		{
			this.callRecallCount = this.callRecallCount-1;
			this.callOverlayRecallCounter(userId, video);
		}
	}, this), 60000);
}
BX.IM.WebRTC.prototype.callOverlayUpdatePhoto = function()
{
	var callPhotoLeftUserId = this.callOverlayPhotoLeft.getAttribute('data-userId');
	var callPhotoRightUserId = this.callOverlayPhotoRight.getAttribute('data-userId');

	this.callOverlayPhotoLeft.src  = this.messenger.hrphoto[callPhotoLeftUserId]? this.messenger.hrphoto[callPhotoLeftUserId]: this.messenger.users[callPhotoLeftUserId].avatar;
	this.callOverlayPhotoRight.src = this.messenger.hrphoto[callPhotoRightUserId]? this.messenger.hrphoto[callPhotoRightUserId]: this.messenger.users[callPhotoRightUserId].avatar;
	this.callOverlayPhotoMini.src = this.callOverlayPhotoRight.src;
}

BX.IM.WebRTC.prototype.callOverlayButtons = function(buttons)
{
	if (this.callOverlay == null)
		return false;

	BX.cleanNode(this.callOverlayButtonsBlock);
	for (var i = 0; i < buttons.length; i++)
	{
		if (buttons[i] == null)
			continue;

		var button = {};
		button.title = buttons[i].title || "";
		button.text = buttons[i].text || "";
		button.subtext = buttons[i].subtext || "";
		button.className = buttons[i].className || "";
		button.events = buttons[i].events || {};

		var classHide = "";
		if (typeof(buttons[i].showInMinimize) == 'boolean')
			classHide = ' bx-messenger-call-overlay-button-show-'+(buttons[i].showInMinimize? 'mini': 'maxi');
		else if (typeof(buttons[i].showInMaximize) == 'boolean')
			classHide = ' bx-messenger-call-overlay-button-show-'+(buttons[i].showInMaximize? 'maxi': 'mini');

		this.callOverlayButtonsBlock.appendChild(
			BX.create("div", { attrs: {id: button.className, title: button.title}, props : { className : 'bx-messenger-call-overlay-button'+(button.subtext? ' bx-messenger-call-overlay-button-sub': '')+classHide}, events : button.events, html: '<span class="'+button.className+'"></span><span class="bx-messenger-call-overlay-button-text">'+button.text+(button.subtext? '<div class="bx-messenger-call-overlay-button-text-sub">'+button.subtext+'</div>': '')+'</span>'})
		);
	}
}
BX.IM.WebRTC.prototype.callDialogAllowShow = function(checkActive)
{
	checkActive = checkActive == false? false: true;
	if (this.callStreamSelf != null)
		return false;

	if (checkActive && !this.callActive)
		return false;

	if (this.callDialogAllow)
		this.callDialogAllow.close();

	this.callDialogAllow = new BX.PopupWindow('bx-messenger-call-notify', this.popupMessengerDialog, {
		lightShadow : true,
		zIndex: 200,
		offsetTop: (this.popupMessengerDialog? (this.callOverlayMinimize? -20: -this.popupMessengerDialog.offsetHeight/2-100): -20),
		offsetLeft: (this.callOverlay? (this.callOverlay.offsetWidth/2-170): 0),
		events : {
			onPopupClose : function() { this.destroy(); },
			onPopupDestroy : BX.delegate(function() {
				this.callDialogAllow = null;
			}, this)},
		content : BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow'}, children: [
			BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow-image-block'}, children: [
				BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow-center'}, children: [
					BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow-arrow'}})
				]}),
				BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow-center'}, children: [
					BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow-button'}, html: BX.message('IM_MESSENGER_CALL_ALLOW_BTN')})
				]})
			]}),
			BX.create("div", { props : { className : 'bx-messenger-call-dialog-allow-text'}, html: BX.message('IM_MESSENGER_CALL_ALLOW_TEXT')})
		]})
	});
	this.callDialogAllow.show();
}


BX.IM.WebRTC.prototype.storageSet = function(params)
{
};


/* NotifyManager */

BX.IM.NotifyManager = function(BXIM)
{
	this.stack = [];
	this.stackTimeout = null;
	this.stackPopup = {};
	this.stackPopupTimeout = {};
	this.stackPopupTimeout2 = {};
	this.stackPopupId = 0;
	this.stackOverflow = false;

	this.tryNativeNotify = false;

	this.notifyShow = 0;
	this.notifyHideTime = 5000;
	this.notifyHeightCurrent = 10;
	this.notifyHeightMax = 0;
	this.notifyGarbageTimeout = null;
	this.notifyAutoHide = true;
	this.notifyAutoHideTimeout = null;

	/*
	BX.bind(window, 'scroll', BX.delegate(function(events){
		if (this.notifyShow > 0)
			for (var i in this.stackPopup)
				this.stackPopup[i].close();
	}, this));
	*/

	this.BXIM = BXIM;
};

BX.IM.NotifyManager.prototype.add = function(params)
{
	if (typeof(params) != "object" || !params.html)
		return false;

	if (BX.type.isDomNode(params.html))
		params.html = params.html.outerHTML;

	this.stack.push(params);

	if (!this.stackOverflow)
		this.setShowTimer(300);
}

BX.IM.NotifyManager.prototype.remove = function(stackId)
{
	delete this.stack[stackId];
}

BX.IM.NotifyManager.prototype.show = function()
{
	this.notifyHeightMax = document.body.offsetHeight;

	var windowPos = BX.GetWindowScrollPos();
	for (var i = 0; i < this.stack.length; i++)
	{
		if (typeof(this.stack[i]) == 'undefined')
			continue;

		/* show notify to calc width & height */
		var notifyPopup = new BX.PopupWindow('bx-im-notify-flash-'+this.stackPopupId, {top: '-1000px', left: 0}, {
			lightShadow : true,
			zIndex: 200,
			events : {
				onPopupClose : BX.delegate(function() {
					BX.proxy_context.popupContainer.style.opacity = 0;
					this.notifyShow--;
					this.notifyHeightCurrent -= BX.proxy_context.popupContainer.offsetHeight+10;
					this.stackOverflow = false;
					setTimeout(BX.delegate(function() {
						this.destroy();
					}, BX.proxy_context), 1500);
				}, this),
				onPopupDestroy : BX.delegate(function() {
					BX.unbindAll(BX.findChild(BX.proxy_context.popupContainer, {className : "bx-notifier-item-delete"}, true));
					BX.unbindAll(BX.proxy_context.popupContainer);
					delete this.stackPopup[BX.proxy_context.uniquePopupId];
					delete this.stackPopupTimeout[BX.proxy_context.uniquePopupId];
					delete this.stackPopupTimeout2[BX.proxy_context.uniquePopupId];
				}, this)
			},
			bindOnResize: false,
			content : BX.create("div", {props : { className: "bx-notifyManager-item"}, html: this.stack[i].html})
		});
		notifyPopup.notifyParams = this.stack[i];
		notifyPopup.notifyParams.id = i;
		notifyPopup.show();

		/* move notify out monitor */
		notifyPopup.popupContainer.style.left = document.body.offsetWidth-notifyPopup.popupContainer.offsetWidth-10+'px';
		notifyPopup.popupContainer.style.opacity = 0;

		if (this.notifyHeightMax < this.notifyHeightCurrent+notifyPopup.popupContainer.offsetHeight+10)
		{
			if (this.notifyShow > 0)
			{
				notifyPopup.destroy();
				this.stackOverflow = true;
				break;
			}
		}

		/* move notify to top-right */
		BX.addClass(notifyPopup.popupContainer, 'bx-notifyManager-animation');
		notifyPopup.popupContainer.style.opacity = 1;
		notifyPopup.popupContainer.style.top = windowPos.scrollTop+this.notifyHeightCurrent+'px';

		this.notifyHeightCurrent = this.notifyHeightCurrent+notifyPopup.popupContainer.offsetHeight+10;
		this.stackPopupId++;
		this.notifyShow++;
		this.remove(i);

		/* notify events */
		this.stackPopupTimeout[notifyPopup.uniquePopupId] = null;

		BX.bind(notifyPopup.popupContainer, "mouseover", BX.delegate(function() {
			this.clearAutoHide();
		}, this));

		BX.bind(notifyPopup.popupContainer, "mouseout", BX.delegate(function() {
			this.setAutoHide(this.notifyHideTime/2);
		}, this));

		BX.bind(notifyPopup.popupContainer, "contextmenu", BX.delegate(function(e){
			if (this.stackPopup[BX.proxy_context.id].notifyParams.tag)
				this.closeByTag(this.stackPopup[BX.proxy_context.id].notifyParams.tag);
			else
				this.stackPopup[BX.proxy_context.id].close();

			return BX.PreventDefault(e);
		}, this));

		var arLinks = BX.findChildren(notifyPopup.popupContainer, {tagName : "a"}, true);
		for (var j = 0; j < arLinks.length; j++)
		{
			if (arLinks[j].href != '#')
				arLinks[j].target = "_blank";
		}

		BX.bind(BX.findChild(notifyPopup.popupContainer, {className : "bx-notifier-item-delete"}, true), 'click', BX.delegate(function(e){
			var id = BX.proxy_context.parentNode.parentNode.parentNode.parentNode.id.replace('popup-window-content-', '');

			if (this.stackPopup[id].notifyParams.close)
				this.stackPopup[id].notifyParams.close(this.stackPopup[id]);

			this.stackPopup[id].close();

			if (this.notifyAutoHide == false)
			{
				this.clearAutoHide();
				this.setAutoHide(this.notifyHideTime/2);
			}
			return BX.PreventDefault(e);
		}, this));

		BX.bindDelegate(notifyPopup.popupContainer, "click", {className: "bx-notifier-item-button"}, BX.delegate(function(e){
			var id = BX.proxy_context.getAttribute('data-id');
			this.BXIM.notify.confirmRequest({
				'notifyId': id,
				'notifyValue': BX.proxy_context.getAttribute('data-value'),
				'notifyURL': BX.proxy_context.getAttribute('data-url'),
				'notifyTag': this.BXIM.notify.notify[id] && this.BXIM.notify.notify[id].tag? this.BXIM.notify.notify[id].tag: null,
				'groupDelete': BX.proxy_context.getAttribute('data-group') == null? false: true
			}, true);
			for (var i in this.stackPopup)
			{
				if (this.stackPopup[i].notifyParams.notifyId == id)
					this.stackPopup[i].close();
			}
			if (this.notifyAutoHide == false)
			{
				this.clearAutoHide();
				this.setAutoHide(this.notifyHideTime/2);
			}
			return BX.PreventDefault(e);
		}, this));

		if (notifyPopup.notifyParams.click)
		{
			notifyPopup.popupContainer.style.cursor = 'pointer';
			BX.bind(notifyPopup.popupContainer, 'click', BX.delegate(function(e){
				this.notifyParams.click(this);
				return BX.PreventDefault(e);
			}, notifyPopup));
		}
		this.stackPopup[notifyPopup.uniquePopupId] = notifyPopup;
	}

	if (this.stack.length > 0)
	{
		this.clearAutoHide(true);
		this.setAutoHide(this.notifyHideTime);
	}
	this.garbage();
}

BX.IM.NotifyManager.prototype.closeByTag = function(tag)
{
	for (var i = 0; i < this.stack.length; i++)
	{
		if (typeof(this.stack[i]) != 'undefined' && this.stack[i].tag == tag)
		{
			delete this.stack[i];
		}
	}
	for (var i in this.stackPopup)
	{
		if (this.stackPopup[i].notifyParams.tag == tag)
			this.stackPopup[i].close()
	}
}


BX.IM.NotifyManager.prototype.setShowTimer = function(time)
{
	clearTimeout(this.stackTimeout);
	this.stackTimeout = setTimeout(BX.delegate(this.show, this), time);
}

BX.IM.NotifyManager.prototype.setAutoHide = function(time)
{
	this.notifyAutoHide = true;
	clearTimeout(this.notifyAutoHideTimeout);
	this.notifyAutoHideTimeout = setTimeout(BX.delegate(function(){
		for (var i in this.stackPopupTimeout)
		{
			this.stackPopupTimeout[i] = setTimeout(BX.delegate(function(){
				this.close();
			}, this.stackPopup[i]), time-1000);
			this.stackPopupTimeout2[i] = setTimeout(BX.delegate(function(){
				this.setShowTimer(300);
			}, this), time-700);
		}
	}, this), 1000);
}

BX.IM.NotifyManager.prototype.clearAutoHide = function(force)
{
	clearTimeout(this.notifyGarbageTimeout);
	this.notifyAutoHide = false;
	force = force==true? true: false;
	if (force)
	{
		clearTimeout(this.stackTimeout);
		for (var i in this.stackPopupTimeout)
		{
			clearTimeout(this.stackPopupTimeout[i]);
			clearTimeout(this.stackPopupTimeout2[i]);
		}
	}
	else
	{
		clearTimeout(this.notifyAutoHideTimeout);
		this.notifyAutoHideTimeout = setTimeout(BX.delegate(function(){
			clearTimeout(this.stackTimeout);
			for (var i in this.stackPopupTimeout)
			{
				clearTimeout(this.stackPopupTimeout[i]);
				clearTimeout(this.stackPopupTimeout2[i]);
			}
		}, this), 300);
	}
}

BX.IM.NotifyManager.prototype.garbage = function()
{
	clearTimeout(this.notifyGarbageTimeout);
	this.notifyGarbageTimeout = setTimeout(BX.delegate(function(){
		var newStack = [];
		for (var i = 0; i < this.stack.length; i++)
		{
			if (typeof(this.stack[i]) != 'undefined')
				newStack.push(this.stack[i]);
		}
		this.stack = newStack;
	}, this), 10000);
}

BX.IM.NotifyManager.NativeNotify = function()
{
	return (window.webkitNotifications && window.webkitNotifications.checkPermission() == 0);
}

BX.IM.NotifyManager.prototype.TryEnableNativeNotify = function()
{
	if (this.tryNativeNotify && window.webkitNotifications && window.webkitNotifications.checkPermission() == 1)
	{
		return BX.create("div", { props : { className : "bx-notifier-notify-confirm" }, children: [
			BX.create("div", {html: BX.browser.IsMac()? BX.message("IM_WN_MAC")+" "+BX.message("IM_WN_TEXT"): BX.message("IM_WN_WIN")+" "+BX.message("IM_WN_TEXT")}),
			BX.create("div", { props : { className : "popup-window-buttons" }, children: [
				BX.create("div", { props : { className : "popup-window-button popup-window-button-accept" }, events : { click : BX.delegate(function() { this.notify.closePopup(); window.webkitNotifications.requestPermission();  }, this) }, children: [
					BX.create("div", { props : { className : "popup-window-button-left" }}),
					BX.create("div", { props : { className : "popup-window-button-text" }, html: BX.message("IM_WN_ACCEPT")}),
					BX.create("div", { props : { className : "popup-window-button-right" }})
				]}),
				BX.create("div", { props : { className : "popup-window-button popup-window-button-link popup-window-button-link-cancel" }, events : { click : BX.delegate(function() { this.notify.closePopup(); BX.userOptions.save('IM', 'settings', 'tryInstallNotify', 'N'); }, this)  }, children: [
					BX.create("div", { props : { className : "popup-window-button-link-text" }, html: BX.message("IM_WN_CANCEL")})
				]})
			]})
		]});
	}


	//var notification = window.webkitNotifications.createNotification(arNewMessage[i].avatar, arNewMessage[i].title, arNewMessage[i].text);
	//notification.userId = arNewMessage[i].userId;
	//notification.onshow = BX.proxy(function(){ setTimeout(BX.delegate(function(){this.cancel();}, notification), 8000); }, notification);
	//notification.onclick = BX.proxy(function(){ window.focus(); BXIM.openMessenger(this.BXIM.userId); this.cancel();}, notification);
	//notification.show();

	return null;

}

})();