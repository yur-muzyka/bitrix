/* PULL manager JS class */

;(function(window){

	if (!window.BX)
	{
		if (typeof(console) == 'object') console.log('PULL Error: bitrix core not loaded');
		return;
	}
	if (window.BX.PULL)
	{
		if (typeof(console) == 'object') console.log('PULL Error: script is already loaded');
		return;
	}

	var BX = window.BX,
	_updateStateVeryFastCount = 0,
	_updateStateFastCount = 0,
	_updateStateStep = 60,
	_updateStateTimeout = null,
	_updateStateSend = false,
	_pullTryConnect = true,
	_pullPath = null,
	_pullMethod = 'PULL',
	_pullTimeConfig = 0,
	_pullTimeConst = (new Date(2022, 2, 19)).toUTCString(),
	_pullTime = _pullTimeConst,
	_pullTag = 1,
	_pullTimeout = 60,
	_watchTag = {},
	_watchTimeout = null,
	_channelID = null,
	_channelClear = null,
	_channelDie = null,
	_channelLastID = 0,
	_channelStack = {},
	_ws = null,
	_wsPath = '',
	_wsSupport = false,
	_wsConnected = false,
	_wsTryReconnect = 0,
	_lsSupport = false,
	_escStatus = false,
	_sendAjaxTry = 0;

	BX.PULL = function() {};

	BX.PULL.init = function()
	{
		if (_channelID == null)
			BX.PULL.getChannelID();
		else
			BX.PULL.updateState();

		BX.PULL.updateWatch();
	}

	BX.PULL.start = function(params)
	{
		_lsSupport = true;
		if (typeof(params) == "object" && params.LOCAL_STORAGE == 'N')
			_lsSupport = false;

		_wsSupport = true;
		if (typeof(params) == "object" && params.WEBSOCKET == 'N')
			_wsSupport = false;

		BX.bind(window, "offline", function(){
			_pullTryConnect = false;
		});

		BX.bind(window, "online", function(){
			if (!BX.PULL.tryConnect())
				BX.PULL.updateState(true);
		});

		// TODO fix FF bug
		if (BX.browser.IsFirefox())
		{
			BX.bind(window, "keypress", function(event){
				if (event.keyCode == 27)
					_escStatus = true;
			});
		}

		if (!BX.browser.SupportLocalStorage())
			_lsSupport = false;

		if (typeof(WebSocket) != 'function')
			_wsSupport = false;

		if (_lsSupport)
		{
			BX.addCustomEvent(window, "onLocalStorageSet", BX.PULL.storageSet);
			var pset = BX.localStorage.get('pset');
			_channelID = !!pset? pset.CHANNEL_ID: _channelID;
			_channelLastID = !!pset? pset.LAST_ID: _channelLastID;
			_pullPath = !!pset? pset.PATH: _pullPath;
			_wsPath = !!pset && pset.PATH_WS? pset.PATH_WS: _wsPath;
			_pullMethod = !!pset? pset.METHOD: _pullMethod;
			_pullTimeConfig = !!pset? pset.TIME_LAST_GET: _pullTimeConfig;

			BX.PULL.expireConfig();

			BX.garbage(function(){
				BX.PULL.expireConfig();
				BX.localStorage.set('pset', {'CHANNEL_ID': _channelID, 'LAST_ID': _channelLastID, 'PATH': _pullPath, 'PATH_WS': _wsPath, 'TIME_LAST_GET': _pullTimeConfig, 'METHOD': _pullMethod}, 600);
			});
		}

		BX.PULL.init();
	}

	BX.PULL.expireConfig = function(repeat)
	{
		if (!_channelID)
			return false;

		clearTimeout(_channelClear);
		if (_channelID && _pullMethod!='PULL' && _pullTimeConfig+43200 < Math.round(+(new Date)/1000)+parseInt(BX.message('SERVER_TZ_OFFSET'))+parseInt(BX.message('USER_TZ_OFFSET')))
		{
			_channelID = null;
			if (_WS) _WS.close();
		}

		if (repeat)
		{
			_channelClear = setTimeout(function(){
				BX.PULL.expireConfig(true);
			}, 60000)
		}
	}

	BX.PULL.tryConnect = function()
	{
		if (_pullTryConnect)
			return false;

		_pullTryConnect = true;
		BX.PULL.init();

		return true;
	}

	BX.PULL.getChannelID = function()
	{
		if (!_pullTryConnect)
			return false;

		BX.ajax({
			url: '/bitrix/components/bitrix/pull.request/ajax.php',
			method: 'POST',
			dataType: 'json',
			lsId: 'PULL_GET_CHANNEL',
			lsTimeout: 1,
			timeout: 30,
			data: {'PULL_GET_CHANNEL' : 'Y', 'SITE_ID': BX.message('SITE_ID'), 'PULL_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()},
			onsuccess: BX.delegate(function(data) {
				if (data.ERROR == '')
				{
					BX.onCustomEvent(window, 'onPullStatus', ['online']);
					_channelID = data.CHANNEL_ID;
					_pullPath = data.PATH.replace('#DOMAIN#', location.hostname);
					_wsPath = data.PATH_WS.replace('#DOMAIN#', location.hostname);
					_pullMethod = data.METHOD;
					_pullTimeConfig = parseInt(data.CHANNEL_DT)+parseInt(BX.message('SERVER_TZ_OFFSET'))+parseInt(BX.message('USER_TZ_OFFSET'));
					_channelLastID = _pullMethod=='PULL'? data.LAST_ID: _channelLastID;
					_sendAjaxTry = 0;
					data.TIME_LAST_GET = _pullTimeConfig;
					BX.PULL.updateState();
					if (_lsSupport)
						BX.localStorage.set('pset', data, 600);
				}
				else
				{
					BX.onCustomEvent(window, 'onPullStatus', ['offline']);
					if (data.ERROR == 'SESSION_ERROR' && _sendAjaxTry < 2)
					{
						_sendAjaxTry++;
						BX.message({'bitrix_sessid': data.BITRIX_SESSID});
						setTimeout(function(){BX.PULL.updateState(true)}, 1000);
						BX.onCustomEvent(window, 'onPullError', [data.ERROR, data.BITRIX_SESSID]);
					}
					else if (data.ERROR == 'AUTHORIZE_ERROR' && _sendAjaxTry < 2)
					{
						_sendAjaxTry++;
						setTimeout(function(){BX.PULL.updateState(true)}, 10000);
						BX.onCustomEvent(window, 'onPullError', [data.ERROR]);
					}
					else if (_sendAjaxTry == 2)
					{
						_pullTryConnect = false;
						_sendAjaxTry = 0;
					}
					if (typeof(console) == 'object')
					{
						var text = "\n========= PULL ERROR ===========\n"+
									"Error type: getChannel error\n"+
									"Error: "+data.ERROR+"\n"+
									"\n"+
									"Data array: "+JSON.stringify(data)+"\n"+
									"================================\n\n";
						console.log(text);
					}
				}
			}, this),
			onfailure: BX.delegate(function(data)
			{
				if (data == "timeout")
				{
					setTimeout(function(){
						BX.PULL.getChannelID()
					}, 10000);
				}
				else if (typeof(console) == 'object')
				{
					var text = "\n========= PULL ERROR ===========\n"+
								"Error type: getChannel onfailure\n"+
								"Error: "+data.ERROR+"\n"+
								"\n"+
								"Data array: "+JSON.stringify(data)+"\n"+
								"================================\n\n";
					console.log(text);
				}

				if (_sendAjaxTry < 2)
				{
					_sendAjaxTry++;
					setTimeout(function(){BX.PULL.updateState(true)}, 10000);
				}
				else if (_sendAjaxTry == 2)
				{
					_pullTryConnect = false;
					this.sendAjaxTry = 0;
				}
			}, this)
		});
	};

	BX.PULL.updateState = function(force)
	{
		if (!_pullTryConnect || _updateStateSend)
			return false;

		if (_channelID == null || _pullPath == null)
		{
			BX.PULL.getChannelID();
		}
		else
		{
			if (_wsSupport && typeof(_wsPath) == "string" && _wsPath.length > 1 && _pullMethod != 'PULL')
				BX.PULL.connectWebSocket();
			else
				BX.PULL.connectPull(force);
		}
	};

	BX.PULL.connectWebSocket = function()
	{
		if (!_wsSupport)
			return false;

		_updateStateSend = true;
		_WS = new WebSocket(_wsPath);

		_WS.onopen = function() {
			_wsConnected = true;
			_wsTryReconnect = 0;
		};
		_WS.onclose = function(data)
		{
			_updateStateSend = false;
			// if user never connected
			if (!_wsConnected)
			{
				if (_wsTryReconnect == 1)
				{
					BX.PULL.getChannelID();
				}
				else if (_wsTryReconnect <= 5)
				{
					_updateStateTimeout = setTimeout(function(){
						BX.PULL.getChannelID();
					}, 10000);
				}
				else
				{
					_updateStateTimeout = setTimeout(function(){
						BX.PULL.getChannelID();
					}, 30000);
				}
				return false;
			}
			_wsConnected = false;

			// if user press ESC button (FF bug)
			if (data.wasClean && (_escStatus || data.code == 1005))
			{
				BX.PULL.updateState();
			}
			else if (!data.wasClean)
			{
				BX.PULL.updateState();
			}
		};
		_WS.onmessage = function(event)
		{
			var messageCount = 0;
			var dataArray = event.data.match(/#!NGINXNMS!#(.*?)#!NGINXNME!#/gm);
			if (dataArray != null)
			{
				for (var i = 0; i < dataArray.length; i++)
				{
					dataArray[i] = dataArray[i].substring(12, dataArray[i].length-12);
					if (dataArray[i].length <= 0)
						continue;

					var message = BX.parseJSON(dataArray[i]);
					var data = message.text;
					if (typeof (data) == "object")
					{
						if (data.ERROR == "")
						{
							if (message.id)
							{
								message.id = parseInt(message.id);
								if (!_channelStack[''+data.CHANNEL_ID+message.id])
								{
									_channelStack[''+data.CHANNEL_ID+message.id] = message.id;

									if (_channelLastID < message.id)
										_channelLastID = message.id;

									BX.PULL.executeMessages(data.MESSAGE);
								}
							}
						}
						else
						{
							if (typeof(console) == 'object')
							{
								var text = "\n========= PULL ERROR ===========\n"+
											"Error type: updateState fetch\n"+
											"Error: "+data.ERROR+"\n"+
											"\n"+
											"Connect CHANNEL_ID: "+_channelID+"\n"+
											"Connect WS_PATH: "+_wsPath+"\n"+
											"\n"+
											"Data array: "+JSON.stringify(data)+"\n"+
											"================================\n\n";
								console.log(text);
							}
							_channelID = null;
						}
					}
					_pullTag = message.tag;
					_pullTime = message.time;
					messageCount++;
				}
			}
			if (_channelID == null)
			{
				if (_WS) _WS.close();
			}
		};
		_WS.onerror = function() {
			_wsTryReconnect++;
		};

		BX.PULL.expireConfig(true)
	}

	BX.PULL.connectPull = function(force)
	{
		force = force == true? true: false;
		clearTimeout(_updateStateTimeout);
		_updateStateTimeout = setTimeout(function(){
			_updateStateSend = true;
			var _ajax = BX.ajax({
				url: _pullMethod=='PULL'? _pullPath: (_pullPath+(_pullTag != null? "&tag="+_pullTag:"")+"&rnd="+(+new Date)),
				method: _pullMethod=='PULL'?'POST':'GET',
				dataType: _pullMethod=='PULL'?'json':'html',
				timeout: _pullTimeout,
				headers: [
					{'name':'If-Modified-Since', 'value':_pullTime},
					{'name':'If-None-Match', 'value':'0'}
				],
				data: _pullMethod=='PULL'? {'PULL_UPDATE_STATE' : 'Y', 'CHANNEL_ID': _channelID, 'CHANNEL_LAST_ID': _channelLastID, 'SITE_ID': BX.message('SITE_ID'), 'PULL_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}: {},
				onsuccess: function(data)
				{
					_updateStateSend = false;
					if (_pullMethod=='PULL' && typeof(data) == "object")
					{
						if (data.ERROR == "")
						{
							BX.PULL.executeMessages(data.MESSAGE);
							if (_lsSupport)
								BX.localStorage.set('pus', {'TAG':null, 'TIME':null, 'MESSAGE':data.MESSAGE}, 5);
						}
						else
						{
							if (data.ERROR == 'SESSION_ERROR')
							{
								BX.message({'bitrix_sessid': data.BITRIX_SESSID});
								BX.onCustomEvent(window, 'onPullError', [data.ERROR, data.BITRIX_SESSID]);
							}
							else
							{
								BX.onCustomEvent(window, 'onPullError', [data.ERROR]);
							}
							if (typeof(console) == 'object')
							{
								var text = "\n========= PULL ERROR ===========\n"+
											"Error type: updateState error\n"+
											"Error: "+data.ERROR+"\n"+
											"\n"+
											"Connect CHANNEL_ID: "+_channelID+"\n"+
											"Connect PULL_PATH: "+_pullPath+"\n"+
											"\n"+
											"Data array: "+JSON.stringify(data)+"\n"+
											"================================\n\n";
								console.log(text);
							}
							_channelID = null;
						}
						if (_channelID != null && _lsSupport)
							BX.localStorage.set('pset', {'CHANNEL_ID': _channelID, 'LAST_ID': _channelLastID, 'PATH': _pullPath, 'PATH_WS': _wsPath, 'TAG': _pullTag, 'TIME': _pullTime, 'TIME_LAST_GET': _pullTimeConfig, 'METHOD': _pullMethod}, 600);

						BX.PULL.setUpdateStateStep();
					}
					else
					{
						if (data.length > 0)
						{
							var messageCount = 0;
							var dataArray = data.match(/#!NGINXNMS!#(.*?)#!NGINXNME!#/gm);
							if (dataArray != null)
							{
								for (var i = 0; i < dataArray.length; i++)
								{
									dataArray[i] = dataArray[i].substring(12, dataArray[i].length-12);
									if (dataArray[i].length <= 0)
										continue;

									var message = BX.parseJSON(dataArray[i]);
									var data = message.text;
									if (typeof (data) == "object")
									{
										if (data.ERROR == "")
										{
											if (message.id)
											{
												message.id = parseInt(message.id);
												if (!_channelStack[''+data.CHANNEL_ID+message.id])
												{
													_channelStack[''+data.CHANNEL_ID+message.id] = message.id;

													if (_channelLastID < message.id)
														_channelLastID = message.id;

													BX.PULL.executeMessages(data.MESSAGE);
												}
											}
										}
										else
										{
											if (typeof(console) == 'object')
											{
												var text = "\n========= PULL ERROR ===========\n"+
															"Error type: updateState fetch\n"+
															"Error: "+data.ERROR+"\n"+
															"\n"+
															"Connect CHANNEL_ID: "+_channelID+"\n"+
															"Connect PULL_PATH: "+_pullPath+"\n"+
															"\n"+
															"Data array: "+JSON.stringify(data)+"\n"+
															"================================\n\n";
												console.log(text);
											}
											_channelID = null;
										}
									}
									_pullTag = message.tag;
									_pullTime = message.time;
									messageCount++;
								}
							}
							if (messageCount > 0 || _ajax.status == 0)
								BX.PULL.updateState();
							else
							{
								_channelID = null;
								_updateStateTimeout = setTimeout(function(){BX.PULL.updateState()}, 10000);
							}
						}
						else
						{
							if (_ajax.status == 304)
							{
								_updateStateTimeout = setTimeout(function(){
									BX.PULL.updateState();
								}, 2000);
							}
							else if (_ajax.status == 502 || _ajax.status == 500)
							{
								_updateStateTimeout = setTimeout(function(){
									BX.PULL.updateState();
								}, 10000);
							}
							else
							{
								var timeout = 20000;
								if (_ajax.status == 0 && _escStatus)
								{
									timeout = 2000;
									_escStatus = false;
								}
								_updateStateTimeout = setTimeout(function(){
									if (_pullTryConnect)
										_channelID = null;
									BX.PULL.updateState();
								}, timeout);
							}
						}
					}
				},
				onfailure: function(data)
				{
					_updateStateSend = false;
					if (data == "timeout")
					{
						if (_pullMethod=='PULL')
							BX.PULL.setUpdateStateStep();
						else
							BX.PULL.updateState();
					}
					else if (_ajax && (_ajax.status == 403 || _ajax.status == 404))
					{
						_channelID = null;
						BX.PULL.getChannelID();
					}
					else if (_sendAjaxTry == 2)
					{
						_pullTryConnect = false;
						_sendAjaxTry = 0;
					}
					else
					{
						if (typeof(console) == 'object')
						{
							var text = "\n========= PULL ERROR ===========\n"+
										"Error type: updateState onfailure\n"+
										"\n"+
										"Connect CHANNEL_ID: "+_channelID+"\n"+
										"Connect PULL_PATH: "+_pullPath+"\n"+
										"\n"+
										"Data array: "+JSON.stringify(data)+"\n"+
										"================================\n\n";
							console.log(text);
						}
					}
					_sendAjaxTry++;

					if (_pullMethod=='PULL')
						_updateStateTimeout = setTimeout(BX.PULL.setUpdateStateStep, 10000);
					else
						_updateStateTimeout = setTimeout(function(){BX.PULL.updateState();}, 10000);
				}
			});
		}, force? 150: (_pullMethod == 'PULL'? _updateStateStep: 0.3)*1000);
	}

	BX.PULL.extendWatch = function(tag, force)
	{
		if (tag.length <= 0)
			return false;

		_watchTag[tag] = true;

		if (force === true)
			BX.PULL.updateWatch(true);
	};

	BX.PULL.clearWatch = function(id)
	{
		if (id == 'undefined')
			_watchTag = {};
		else if (_watchTag[id])
			delete _watchTag[id];
	}

	BX.PULL.updateWatch = function(force)
	{
		if (!_pullTryConnect)
			return false;

		force = force == true? true: false;
		clearTimeout(_watchTimeout);
		_watchTimeout = setTimeout(function()
		{
			var arWatchTag = [];
			for(var i in _watchTag)
				arWatchTag.push(i);

			if (arWatchTag.length > 0)
			{
				BX.ajax({
					url: '/bitrix/components/bitrix/pull.request/ajax.php',
					method: 'POST',
					dataType: 'json',
					timeout: 30,
					data: {'PULL_UPDATE_WATCH' : 'Y', 'WATCH' : arWatchTag, 'SITE_ID': BX.message('SITE_ID'), 'PULL_AJAX_CALL' : 'Y', 'sessid': BX.bitrix_sessid()}
				});
			}

			BX.PULL.updateWatch();
		}, force? 5000: 540000);
	};

	BX.PULL.executeMessages = function(message, pull)
	{
		pull = pull == false? false: true;
		for (var i = 0; i < message.length; i++)
		{
			if (message[i].id)
			{
				message[i].id = parseInt(message[i].id);
				if (_channelStack[''+_channelID+message[i].id])
					continue;
				else
					_channelStack[''+_channelID+message[i].id] = message[i].id;

				if (_channelLastID < message[i].id)
					_channelLastID = message[i].id;
			}
			if (message[i].module_id == 'pull')
			{
				if (pull)
				{
					if (message[i].command == 'channel_die')
					{
						_channelID = null;

					}
					if (message[i].command == 'config_die')
						_pullPath = null;
				}
			}
			else
			{
				if (!(message[i].module_id == 'main' && message[i].command == 'user_counter'))
					BX.PULL.setUpdateStateStepCount(1,4);
				
				try { BX.onCustomEvent(window, 'onPullEvent', [message[i].module_id, message[i].command, message[i].params]); }
				catch(e)
				{
					if (typeof(console) == 'object')
					{
						var text = "\n========= PULL ERROR ===========\n"+
									"Error type: onPullEvent onfailure\n"+
									"Error event: "+JSON.stringify(e)+"\n"+
									"\n"+
									"Message MODULE_ID: "+message[i].module_id+"\n"+
									"Message COMMAND: "+message[i].command+"\n"+
									"Message PARAMS: "+message[i].params+"\n"+
									"\n"+
									"Message array: "+JSON.stringify(message[i])+"\n"+
									"================================\n";
						console.log(text);
					}
				}
			}
		}
	}

	BX.PULL.setUpdateStateStep = function(send)
	{
		var send = send == false? false: true;
		var step = 60;

		if (_updateStateVeryFastCount > 0)
		{
			step = 10;
			_updateStateVeryFastCount--;
		}
		else if (_updateStateFastCount > 0)
		{
			step = 20;
			_updateStateFastCount--;
		}

		_updateStateStep = parseInt(step);

		BX.PULL.updateState();

		if (send && _lsSupport)
			BX.localStorage.set('puss', _updateStateStep, 5);
	}

	BX.PULL.setUpdateStateStepCount = function(veryFastCount, fastCount)
	{
		_updateStateVeryFastCount = parseInt(veryFastCount);
		_updateStateFastCount = parseInt(fastCount);
	}

	BX.PULL.storageSet = function(params)
	{
		if (params.key == 'pus')
		{
			if (params.value.TAG != null)
				_pullTag = params.value.TAG;

			if (params.value.TIME != null)
				_pullTime = params.value.TIME;

			BX.PULL.executeMessages(params.value.MESSAGE, false);
		}
		else if (params.key == 'puss')
		{
			_updateStateStep = 70;
			BX.PULL.updateState();
		}
		else if (params.key == 'pset')
		{
			_channelID = params.value.CHANNEL_ID;
			_channelLastID = params.value.LAST_ID;
			_pullPath = params.value.PATH;
			_wsPath = params.value.PATH_WS;
			_pullMethod = params.value.METHOD;
			if (params.value.TIME)
				_pullTime = params.value.TIME;
			if (params.value.TAG)
				_pullTag = params.value.TAG;
			if (params.value.TIME_LAST_GET)
				_pullTimeConfig = params.value.TIME_LAST_GET;
		}
	}

	BX.PULL.updateChannelID = function(params, param1, param2, param3, param4)
	{
		if (typeof(params) == 'object')
		{
			var method = params.METHOD;
			var channelID = params.CHANNEL_ID;
			var channelDie = params.CHANNEL_DT;
			var pullPath = params.PATH;
			var lastId = params.LAST_ID;
			var wsPath = params.PATH_WS;
		}
		else // TODO delete in 12.5.4
		{
			var method = params;
			var channelID = param1;
			var channelDie = Math.round(+(new Date)/1000)+parseInt(BX.message('SERVER_TZ_OFFSET'));
			var pullPath = param2;
			var lastId = param3;
			var wsPath = param4;
		}

		if (typeof(channelID) == 'undefined' || typeof(pullPath) == 'undefined')
			return false;

		if (channelID == _channelID && pullPath == _pullPath && wsPath == _wsPath)
			return false;

		BX.onCustomEvent(window, 'onPullStatus', ['online']);

		_sendAjaxTry = 0;
		_channelID = channelID;
		_pullTimeConfig = parseInt(channelDie)+parseInt(BX.message('USER_TZ_OFFSET'));
		_pullPath = pullPath.replace('#DOMAIN#', location.hostname);
		_wsPath = wsPath.replace('#DOMAIN#', location.hostname);
		_channelLastID = _pullMethod=='PULL' && typeof(lastId) == 'number'? lastId: _channelLastID;
		if (typeof(method) == 'string')
			_pullMethod = method;

		if (_lsSupport)
			BX.localStorage.set('pset', {'CHANNEL_ID': _channelID, 'LAST_ID': _channelLastID, 'PATH': _pullPath, 'PATH': _wsPath, 'TAG': _pullTag, 'TIME': _pullTime, 'TIME_LAST_GET': _pullTimeConfig, 'METHOD': _pullMethod}, 600);

		if (_WS) _WS.close();

		return true;
	}

	/* DEBUG commands */
	BX.PULL.tryConnectSet = function(sendAjaxTry, pullTryConnect)
	{
		if (typeof(sendAjaxTry) == 'number')
			_sendAjaxTry = parseInt(sendAjaxTry);

		if (typeof(pullTryConnect) == 'boolean')
			_pullTryConnect = pullTryConnect;
	}

	BX.PULL.getPullServerStatus = function()
	{
		return _pullMethod == 'PULL'? false: true;
	}
	BX.PULL.getDebugInfo = function()
	{
		if (!console || !console.log || !JSON || !JSON.stringify)
			return false;

		var textWT = JSON.stringify(_watchTag);
		var text = "\n========= PULL DEBUG ===========\n"+
					"Connect: "+(_updateStateSend? 'Y': 'N')+"\n"+
					"WebSocket connect: "+(_wsConnected? 'Y': 'N')+"\n"+
					"LocalStorage status: "+(_lsSupport? 'Y': 'N')+"\n"+
					"WebSocket support: "+(_wsSupport && _wsPath.length > 0? 'Y': 'N')+"\n"+
					"Queue Server: "+(_pullMethod == 'PULL'? 'N': 'Y')+"\n"+
					"Try connect: "+(_pullTryConnect? 'Y': 'N')+"\n"+
					"Try number: "+(_sendAjaxTry)+"\n"+
					"\n"+
					"Path: "+_pullPath+"\n"+
					(_wsPath.length > 0? "WebSocket Path: "+_wsPath+"\n": '')+
					"ChannelID: "+_channelID+"\n"+
					"\n"+
					"Last message: "+(_channelLastID > 0? _channelLastID: '-')+"\n"+
					"Time init connect: "+(_pullTimeConst)+"\n"+
					"Time last connect: "+(_pullTime == _pullTimeConst? '-': _pullTime)+"\n"+
					"Watch tags: "+(textWT == '{}'? '-': textWT)+"\n"+
					"================================\n";

		return console.log(text);
	}

	BX.PULL.clearChannelId = function(send)
	{
		send = send == false? false: true;

		_channelID = null;
		_pullPath = null;
		_updateStateSend = false;
		clearTimeout(_updateStateTimeout);

		if (send)
			BX.PULL.updateState();
	}

	BX.PULL();
})(window);
