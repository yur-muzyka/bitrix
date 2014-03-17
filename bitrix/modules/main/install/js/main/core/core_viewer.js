;(function(){

if (window.BX.CViewer)
	return;

BX.viewElementBind = function(div, params, isTarget, groupBy)
{
	var obElementViewer = new BX.CViewer(params);

	if(!isTarget)
		isTarget = function(node){
			return BX.type.isElementNode(node) && (node.getAttribute('data-bx-viewer') || node.tagName.toUpperCase() == 'IMG');
		}
;

	BX.ready(function(){
		_viewerElementBind(div, isTarget, groupBy, obElementViewer);
	});

	return obElementViewer;
};

function _viewerElementBind(div, isTarget, groupBy, obElementViewer)
{
	var div = BX(div);
	if (!!div)
	{
		BX.bindDelegate(div, 'click', isTarget, function(e)
		{
			//not run elementShow if click on folder
			if(this.getAttribute('data-bx-viewer') == 'folder')
				return true;

			var parent = div;
			if (!!groupBy)
			{
				parent = BX.findParent(this, groupBy, div)||parent;
			}

			obElementViewer.setList([]);
			var elementNodeList = BX.findChildren(parent, isTarget, true);
			for(var i=0; i<elementNodeList.length; i++)
			{
				var type = elementNodeList[i].getAttribute('data-bx-viewer');
				if(type == 'image' || elementNodeList[i].getAttribute('data-bx-image'))
				{
					obElementViewer.add(new BX.CViewImageElement({
						src: elementNodeList[i].getAttribute('data-bx-src') || elementNodeList[i].getAttribute('data-bx-download') || elementNodeList[i].getAttribute('data-bx-image'),
	//					width: elementNodeList[i].getAttribute('data-bx-width'),
	//					height: elementNodeList[i].getAttribute('data-bx-height'),
						title: elementNodeList[i].getAttribute('data-bx-title')||elementNodeList[i].alt||elementNodeList[i].title,
						full: elementNodeList[i].getAttribute('data-bx-full'),
						full_width: elementNodeList[i].getAttribute('data-bx-full-width'),
						full_height: elementNodeList[i].getAttribute('data-bx-full-height'),
						full_size: elementNodeList[i].getAttribute('data-bx-full-size'),
						buttons: [
							BX.create('a', {
								props: {
									className: 'bx-viewer-btn',
									href: elementNodeList[i].getAttribute('data-bx-download') || elementNodeList[i].getAttribute('data-bx-full') || elementNodeList[i].getAttribute('data-bx-image') || elementNodeList[i].getAttribute('data-bx-src')
								},
								events: {
									click: BX.eventCancelBubble
								},
								text: BX.message('JS_CORE_VIEWER_DOWNLOAD')
							})
						]
					}));
				}
				else if(type == 'iframe')
				{
					var linkToEdit = elementNodeList[i].getAttribute('data-bx-edit');
					var titleToEdit = elementNodeList[i].getAttribute('data-bx-title');
					var linkToDownload = elementNodeList[i].getAttribute('data-bx-download');

					var iframeElement = new BX.CViewIframeElement({
						title: titleToEdit,
						src: elementNodeList[i].getAttribute('data-bx-src'),
						buttons: []
					});
					iframeElement.buttons.push(
						BX.create('a', {
							props: {
								className: 'bx-viewer-btn',
								href: elementNodeList[i].getAttribute('data-bx-download')
							},
							events: {
								click: BX.proxy(function(e)
								{
									//if click on download link, but iframe not loaded.
									if(!this.loaded)
									{
										var self = this;
										setTimeout(function(){
											obElementViewer.show(self, true);
										}, 1000);
									}
									BX.eventCancelBubble(e);
									return false;
								}
								, iframeElement)
							},
							text: BX.message('JS_CORE_VIEWER_DOWNLOAD')
						}));

					//todo disable editing
					if(0&&linkToEdit)
					{
						iframeElement.buttons.push(
							BX.create('a', {
								props: {
									className: 'bx-viewer-btn',
									href: '#'
								},
								events: {
									click: function(e){
										BX.PreventDefault(e);
										obElementViewer.openModal(linkToEdit, titleToEdit);

										return false;
									}
								},
								text: BX.message('JS_CORE_VIEWER_EDIT')
							})
						);
					}
					obElementViewer.add(iframeElement);
				}
				else if(type == 'unknown')
				{
					obElementViewer.add(new BX.CViewUnknownElement({
						title: elementNodeList[i].getAttribute('data-bx-title'),
						src: elementNodeList[i].getAttribute('data-bx-src'),
						owner: elementNodeList[i].getAttribute('data-bx-owner'),
						size: elementNodeList[i].getAttribute('data-bx-size'),
						dateModify: elementNodeList[i].getAttribute('data-bx-dateModify'),
						tooBigSizeMsg: !!elementNodeList[i].getAttribute('data-bx-tooBigSizeMsg'),
						buttons: [
							BX.create('a', {
								props: {
									className: 'bx-viewer-btn',
									href: elementNodeList[i].getAttribute('data-bx-src')
								},
								events: {
									click: BX.eventCancelBubble
								},
								text: BX.message('JS_CORE_VIEWER_DOWNLOAD')
							})
						]
					}));
				}
				else if(type == 'folder')
				{
					obElementViewer.add(new BX.CViewFolderElement({
						title: elementNodeList[i].getAttribute('data-bx-title'),
						src: elementNodeList[i].getAttribute('data-bx-src'),
						owner: elementNodeList[i].getAttribute('data-bx-owner'),
						dateModify: elementNodeList[i].getAttribute('data-bx-dateModify'),
						buttons: []
					}));
				}
			}

			obElementViewer.show(this.getAttribute('data-bx-image')||this.getAttribute('data-bx-src')||this.src);

			return BX.PreventDefault(e);
		});
	}
};


BX.CViewCoreElement = function(params)
{
	params = params || {};
	this.id = params.id || params.src;
	this.title = params.title;
	this.text = params.text;
	this.width = params.width;
	this._minWidth = params._minWidth;
	this.height = params.height;
	this._minHeight = params._minHeight;
	this.domElement = null;
	this.titleDomElement = null;
	this.titleButtons = null;
	this.src = params.src;
	this.loaded = false;
	this.preventShow = false;
	this.listOfTimeoutIds = [];
	this.contentWrap = null;
	this.isProccessed = false;
	this.topPadding = 0;
	this.buttons = params.buttons || [];
	this.showTitle = params.showTitle || true;


	if(this._minWidth === undefined)
	{
		this._minWidth = 550;
	}
	if(this._minHeight === undefined)
	{
		this._minHeight = 350;
	}
}
BX.CViewCoreElement.prototype.setContentWrap = function(contentWrap){
	this.contentWrap = contentWrap;
};

BX.CViewCoreElement.prototype.getIconClassByName = function(filename)
{
	filename = filename || '';
	var extension = filename.split('.').pop();
	var className = '';
	switch(extension.toLowerCase())
	{
		case 'txt':
			className = 'bx-viewer-icon-txt';
			break;
		case 'archive':
		case 'gz':
		case 'bz2':
		case 'tar':
			className = 'bx-viewer-icon-archive';
			break;
		case 'zip':
			className = 'bx-viewer-icon-zip';
			break;
		case 'rar':
			className = 'bx-viewer-icon-rar';
			break;
		case 'pdf':
			className = 'bx-viewer-icon-pdf';
			break;
		case 'ppt':
		case 'pptx':
			className = 'bx-viewer-icon-ppt';
			break;
		case 'doc':
		case 'docx':
			className = 'bx-viewer-icon-doc';
			break;
		case 'xls':
		case 'xlsx':
			className = 'bx-viewer-icon-xls';
			break;
		default:
			className = 'bx-viewer-icon';
			break;
	}
	return className;
}

BX.CViewCoreElement.prototype.load = function(successLoadCallback)
{
}
BX.CViewCoreElement.prototype.preload = function(successLoadCallback)
{
}
BX.CViewCoreElement.prototype.hide = function(isCloseElement)
{
	isCloseElement = isCloseElement || false;
	this.preventTimeout();
	this.preventShow = true;
}

BX.CViewCoreElement.prototype.show = function()
{
	this.preventShow = false;
}

BX.CViewCoreElement.prototype.successLoad = function(self)
{}

BX.CViewCoreElement.prototype.onLoad = function()
{
}

BX.CViewCoreElement.prototype.getTitle = function()
{
	return this.title;
}
BX.CViewCoreElement.prototype.getSize = function()
{
	return {
		width: this.width,
		height: this.height
	};
}
BX.CViewCoreElement.prototype.resize = function(w, h)
{
	this.width = w;
	this.height = h;
}
BX.CViewCoreElement.prototype.addTimeoutId = function(id)
{
	this.listOfTimeoutIds.push(id);
}
BX.CViewCoreElement.prototype.preventTimeout = function()
{
	if(!BX.type.isArray(this.listOfTimeoutIds))
	{
		return;
	}
	for (var i in this.listOfTimeoutIds)
	{
		if (this.listOfTimeoutIds.hasOwnProperty(i))
		{
			clearTimeout(this.listOfTimeoutIds[i]);
		}
	}
	this.listOfTimeoutIds = [];
}
//##############################################################################

BX.CViewImageElement = function(params)
{
	params = params || {};
	BX.CViewIframeElement.superclass.constructor.apply(this, arguments);
	this.image = null;
	this.width = 200;
	this.height = 200;
	this.full = params.full;
	this.full_width = params.full_width;
	this.full_height = params.full_height;
	this.full_size = params.full_size;
	this.topPadding = 43;
}

BX.extend(BX.CViewImageElement, BX.CViewCoreElement);

BX.CViewImageElement.prototype.setContentWrap = function(contentWrap){
	this.contentWrap = contentWrap;
};
BX.CViewImageElement.prototype.load = function(successLoadCallback)
{
	successLoadCallback = successLoadCallback || BX.CViewImageElement.prototype.successLoad;
	if(!this.loaded)
	{
		this.preload(function(self){
			successLoadCallback(self);
			self.contentWrap.appendChild(self.domElement);
		});
	}
	else
	{
		(function(self){
			successLoadCallback(self);
			self.contentWrap.appendChild(self.domElement);
		})(this);
	}
	//buildDomElement
	//this.contentWrap.appendChild(this.domElement);
	//this.show();
}
BX.CViewImageElement.prototype.preload = function(successLoadCallback)
{
	if(this.isProccessed)
	{
		return false;
	}
	this.successLoad = successLoadCallback || BX.CViewImageElement.prototype.successLoad;
	if(!this.loaded)
	{
		this.titleDomElement = BX.create('span', {
			props: {
				className: 'bx-viewer-file-name',
				title: this.title
			},
			text: this.title
		});
		this.titleButtons = BX.create('span', {
			props: {
				className: 'bx-viewer-top-right'
			},
			style: {
				display: 'none'
			},
			children: this.buttons
		});

		this.image = new Image();
		this.image.onload = BX.proxy(this.onLoad, this);
		this.image.src = this.src;
		this.image.className = 'bx-viewer-image';
		this.image.style.opacity = 0;

		this.isProccessed = true;
		this.domElement = BX.create('div', {
			props: {
				className:'bx-viewer-cap-wrap'
			},
			children: [
			]
		});
	}

	return this.domElement;
}
BX.CViewImageElement.prototype.hide = function(isCloseElement)
{
	isCloseElement = isCloseElement || false;
	this.image.style.opacity = 0;
	this.titleButtons.style.display = 'none';
	this.preventTimeout();
	this.preventShow = isCloseElement? false : true;
}

BX.CViewImageElement.prototype.show = function()
{
	if(!this.domElement)
	{
		return;
	}
	var visibleHeight = this.height;
	if(this.image && this.image.style.height)
	{
		visibleHeight = parseInt(this.image.style.height);
	}
	//vertical align
	if(visibleHeight < this._minHeight)
	{
		BX.adjust(this.domElement, {
			style: {
				paddingTop: (this._minHeight - visibleHeight)/2 + 'px'
			}
		});
	}

	this.titleButtons.style.display = 'block';
	this.image.style.opacity = 1;
	this.preventShow = false;
}

BX.CViewImageElement.prototype.successLoad = function(self)
{}

BX.CViewImageElement.prototype.onLoad = function()
{
	var self = this;
	this.isProccessed = false;
	setTimeout(function(){
		self.loaded = true;
		self.height = self.image.height;
		self.width = self.image.width;
		self.image.style.maxWidth = self.width + "px";
		self.image.style.maxHeight = self.height  + "px";
		self.domElement.appendChild(self.image);
		self.successLoad(self);
	}, 50);
}

//##############################################################################
BX.CViewIframeElement = function(params)
{
	BX.CViewIframeElement.superclass.constructor.apply(this, arguments);
	this.width = 800;
	this._minWidth = 800;
	this.height = 600;
	this._minHeight = 600;
	this.topPadding = 43;
	this.viewerUrl = '';
}

BX.extend(BX.CViewIframeElement, BX.CViewCoreElement);

BX.CViewIframeElement.prototype.load = function(successLoadCallback)
{
	var self = this;
	if(!this.loaded)
	{
		BX.ajax({
			'method': 'POST',
			'dataType': 'json',
			'url': self.src,
			'data':  {
				sessid: BX.bitrix_sessid(),
				json: 1
			},
			'onsuccess': function(data){
				var checkIframeError = function(){
					if(BX.localStorage.get('iframe_options_error'))
					{
						BX.onCustomEvent(self, 'onIframeDocError', [self]);
						return;
					}
					if(BX.localStorage.get('iframe_options_error') !== null)
					{
						return;
					}
					BX.ajax({
						'method': 'POST',
						'dataType': 'json',
						'url': self.src,
						'data':  {
							extLink: data.file,
							sessid: BX.bitrix_sessid(),
							checkViewByGoogle: 1
						},
						'onsuccess': function(data){
							if(!data || !data.viewByGoogle)
							{
								BX.onCustomEvent(self, 'onIframeDocError', [self]);
							}
							else
							{
								BX.onCustomEvent(self, 'onIframeDocSuccess', [self]);
							}
						}
					});
				};

				self.domElement = BX.create('iframe', {
					props: {
						className: 'bx-viewer-image',
						src: data.viewerUrl
					},
					events: {
						load: BX.browser.IsFirefox()? BX.proxy(function(){
							BX.proxy(this.onLoad, this);
							checkIframeError();
						}, self) : BX.proxy(self.onLoad, self)
					},
					style: {
						border: 'none'
					}
				});
				self.contentWrap.appendChild(self.domElement);

				self.viewerUrl = data.viewerUrl;
				if(BX.localStorage.get('iframe_options_error'))
				{
					BX.onCustomEvent(self, 'onIframeDocError', [self]);
				}
				else if(!BX.browser.IsFirefox() && BX.localStorage.get('iframe_options_error') === null)
				{
					self.addTimeoutId(setTimeout(checkIframeError, 15000));
				}

			}
		});

		this.titleDomElement = BX.create('span', {
			props: {
				className: 'bx-viewer-file-name',
				title: this.title
			},
			text: this.title
		});

		this.titleButtons = BX.create('span', {
			props: {
				className: 'bx-viewer-top-right'
			},
			style: {
				//display: 'none'
			},
			children: this.buttons
		});

		this.successLoad = successLoadCallback || BX.CViewIframeElement.prototype.successLoad;
		this.isProccessed = true;
	}
}
BX.CViewIframeElement.prototype.preload = function(successLoadCallback)
{
	return false;
}
BX.CViewIframeElement.prototype.onLoad = function()
{
	if(this.loaded)
	{
		return;
	}
	this.loaded = true;
	this.successLoad(this);
}
BX.CViewIframeElement.prototype.show = function()
{
	this.domElement.style.opacity = 1;
	this.domElement.style.display = 'block';
	//this.titleButtons.style.display = 'block';
	this.preventShow = false;
}
BX.CViewIframeElement.prototype.hide = function(isCloseElement)
{
	isCloseElement = isCloseElement || false;
	if(this.domElement)
	{
		this.domElement.style.opacity = 0;
		//this.titleButtons.style.display = 'none';
		BX.unbind(this.domElement, 'load', BX.proxy(this.onLoad, this));
	}
	//this.domElement.style.display = 'none';
	this.preventTimeout();
	this.loaded = false;
	this.preventShow = false;
	this.isProccessed = false;
}

//##############################################################################
BX.CViewErrorIframeElement = function(params)
{
	BX.CViewErrorIframeElement.superclass.constructor.apply(this, arguments);
	this.width = 600;
	this._minWidth = 600;
	this.height = 350;
	this._minHeight = 350;
	this.topPadding = 43;
	this.buttonUrl = params.buttonUrl;
}

BX.extend(BX.CViewErrorIframeElement, BX.CViewCoreElement);

BX.CViewErrorIframeElement.prototype.load = function(successLoadCallback)
{
	this.titleDomElement = BX.create('span', {
		props: {
			className: 'bx-viewer-file-name',
			title: this.title
		},
		text: this.title
	});

	this.titleButtons = BX.create('span', {
		props: {
			className: 'bx-viewer-top-right'
		},
		children: this.buttons
	});

	this.domElement = BX.create('div', {
		props: {
			className: 'bx-viewer-cap-wrap bx-viewer-cap-file'
		},
		children: [
			(BX.create('div', {
					props: {
					},
					children: [
						(BX.create('div', {
							props: {
								className: 'bx-viewer-icon ' + this.getIconClassByName(this.title)
							}
						})),
						(BX.create('div', {
							props: {
								className: 'bx-viewer-cap-text-block'
							},
							children: [
								(BX.create('div', {
									props: {
										className: 'bx-viewer-cap-title',
										title: this.title
									},
									text: this.title
								})),
								(BX.create('div', {
									props: {
										className: 'bx-viewer-too-big-title'
									},
									text: BX.message('JS_CORE_VIEWER_IFRAME_DESCR_ERROR')
								})),
								(BX.create('a', {
									props: {
										className: 'bx-viewer-btn',
										target: '_blank',
										href: this.buttonUrl
									},
									events: {
										click: BX.eventCancelBubble
									},
									text: BX.message('JS_CORE_VIEWER_OPEN_WITH_GVIEWER')
								}))
							]
						}))
					]
			}))
		]
	});

	this.successLoad = successLoadCallback || BX.CViewUnknownElement.prototype.successLoad;
	this.contentWrap.appendChild(this.domElement);
	this.loaded = true;
	this.successLoad(this);

}

BX.CViewErrorIframeElement.prototype.show = function()
{
	this.domElement.style.opacity = 1;
	this.domElement.style.display = 'block';
	this.titleButtons.style.display = 'block';
	this.preventShow = false;
}
BX.CViewErrorIframeElement.prototype.hide = function()
{
	this.domElement.style.opacity = 0;
	this.preventTimeout();
	this.loaded = false;
	this.preventShow = false;
	this.isProccessed = false;
}


//##############################################################################
BX.CViewUnknownElement = function(params)
{
	BX.CViewUnknownElement.superclass.constructor.apply(this, arguments);
	this.width = 600;
	this._minWidth = 600;
	this.height = 350;
	this._minHeight = 350;
	this.owner = params.owner;
	this.dateModify = params.dateModify;
	this.size = params.size;
	this.topPadding = 43;
	this.tooBigSizeMsg = !!params.tooBigSizeMsg;
}

BX.extend(BX.CViewUnknownElement, BX.CViewCoreElement);

BX.CViewUnknownElement.prototype.load = function(successLoadCallback)
{
	if(this.loaded)
	{
		return;
	}

	this.titleDomElement = BX.create('span', {
		props: {
			className: 'bx-viewer-file-name',
			title: this.title
		},
		text: this.title
	});

	this.titleButtons = BX.create('span', {
		props: {
			className: 'bx-viewer-top-right'
		},
		children: this.buttons
	});

	var srcLink = this.src;
	this.domElement = BX.create('div', {
		props: {
			className: 'bx-viewer-cap-wrap bx-viewer-cap-file'
		},
		children: [
			(BX.create('div', {
					props: {
					},
					children: [
						(BX.create('div', {
							props: {
								className: 'bx-viewer-icon ' + this.getIconClassByName(this.title)
							}
						})),
						(BX.create('div', {
							props: {
								className: 'bx-viewer-cap-text-block'
							},
							children: [
								(BX.create('div', {
									props: {
										className: 'bx-viewer-cap-title',
										title: this.title
									},
									text: this.title
								})),
								(BX.create('div', {
									props: {
										className: 'bx-viewer-too-big-title'
									},
									style: {
										display: this.tooBigSizeMsg? '' : 'none'
									},
									text: BX.message('JS_CORE_VIEWER_TOO_BIG_FOR_VIEW')
								})),
								(BX.create('div', {
									props: {
										className: 'bx-viewer-cap-text'
									},
									html:'<span class="bx-viewer-cap-text-title">' + BX.message('JS_CORE_VIEWER_DESCR_AUTHOR') + ': </span> ' + BX.util.htmlspecialchars(this.owner) + '<br/>' + '<span class="bx-viewer-cap-text-title">' + BX.message('JS_CORE_VIEWER_DESCR_LAST_MODIFY') + ': </span> ' + BX.util.htmlspecialchars(this.dateModify) + '<br/>' + this.size
								})),
								(BX.create('span', {
									props: {
										className: 'bx-viewer-btn'
									},
									events: {
										click: function(e){
											document.location.href = srcLink;
											return false;
										}
									},
									text: BX.message('JS_CORE_VIEWER_DOWNLOAD')
								}))
							]
						}))
					]
			}))
		]
	});
	this.successLoad = successLoadCallback || BX.CViewUnknownElement.prototype.successLoad;
	this.contentWrap.appendChild(this.domElement);
	this.loaded = true;
	this.successLoad(this);
}
BX.CViewUnknownElement.prototype.preload = function(successLoadCallback)
{
}
BX.CViewUnknownElement.prototype.onLoad = function()
{
}
BX.CViewUnknownElement.prototype.show = function()
{
	this.domElement.style.opacity = 1;
	this.domElement.style.display = 'block';
	this.titleButtons.style.display = 'block';
	this.preventShow = false;
}
BX.CViewUnknownElement.prototype.hide = function(isCloseElement)
{
	isCloseElement = isCloseElement || false;
	this.domElement.style.opacity = 0;
	this.titleButtons.style.display = 'none';
	//this.domElement.style.display = 'none';
	this.preventTimeout();
	this.loaded = false;
	this.preventShow = false;
	this.isProccessed = false;
}
//##############################################################################
BX.CViewFolderElement = function(params)
{
	BX.CViewFolderElement.superclass.constructor.apply(this, arguments);
	this.width = 600;
	this._minWidth = 600;
	this.height = 350;
	this._minHeight = 350;
	this.owner = params.owner;
	this.dateModify = params.dateModify;
	this.size = params.size;
	this.topPadding = 0;
	this.showTitle = false;
}

BX.extend(BX.CViewFolderElement, BX.CViewCoreElement);

BX.CViewFolderElement.prototype.load = function(successLoadCallback)
{
	if(this.loaded)
	{
		return;
	}

	this.titleDomElement = null;
	this.titleButtons = null;

	this.domElement = BX.create('div', {
		props: {
			className: 'bx-viewer-cap-wrap bx-viewer-folder'
		},
		children: [
			(BX.create('div', {
					props: {
						className: 'bx-viewer-cap'
					},
					children: [
						(BX.create('div', {
							props: {
								className: 'bx-viewer-icon'
							}
						})),
						(BX.create('div', {
							props: {
								className: 'bx-viewer-cap-text-block'
							},
							children: [
								(BX.create('div', {
									props: {
										className: 'bx-viewer-cap-title',
										title: this.title
									},
									text: this.title
								})),
								(BX.create('div', {
									props: {
										className: 'bx-viewer-cap-text'
									},
									html: BX.message('JS_CORE_VIEWER_DESCR_AUTHOR') + ': ' + BX.util.htmlspecialchars(this.owner) + '<br/>' + BX.message('JS_CORE_VIEWER_DESCR_LAST_MODIFY') + ': ' + BX.util.htmlspecialchars(this.dateModify) + '<br/>'
								}))
							]
						}))
					]
			}))
		]
	});
	this.contentWrap.appendChild(this.domElement);
	this.loaded = true;
}
BX.CViewFolderElement.prototype.preload = function(successLoadCallback)
{
}
BX.CViewFolderElement.prototype.onLoad = function()
{
}
BX.CViewFolderElement.prototype.show = function()
{
	this.domElement.style.opacity = 1;
	this.domElement.style.display = 'block';
	this.preventShow = false;
}
BX.CViewFolderElement.prototype.hide = function(isCloseElement)
{
	isCloseElement = isCloseElement || false;
	this.domElement.style.opacity = 0;
	//this.domElement.style.display = 'none';
	this.preventTimeout();
	this.loaded = false;
	this.preventShow = false;
	this.isProccessed = false;
}


BX.CViewer = function(params)
{
	this.params = BX.clone(BX.CViewer.defaultSettings);
	for(var i in params)
	{
		this.params[i] = params[i];
	}

	this.DIV = null;
	this.OVERLAY = null;
	this.CONTENT_WRAP = null;

	this.list = this.params.list;
	this._current = 0;
	this.FULL_TITLE = null;
	this.bVisible = false;
	this.preload = 0; //todo preload don't working! We set to 0;
	this.currentElement = null; //if this not set current element get from this.list
};

BX.CViewer.defaultSettings = {
	list: [],
	cycle: true, // whether to cycle element list - go to first after last
	resize: 'WH', //'W' - resize element to fit width, 'H' - resize element to fit height, 'WH' - W&H , ''||false => show original element size without resizing
	resizeToggle: false,
	showTitle: true, // whether to show element title
	preload: 0, // number of list element to be preloaded !!!!!don't working!
	minMargin: 20, //minimal margin
	minPadding: 11, // minimal padding
	lockScroll: false,
	keyMap: {
		27: 'close', // esc
		33: 'prev', // pgup
		37: 'prev', // left
		38: 'prev', // up
		34: 'next', // pgdn
		39: 'next', // right
		40: 'next', // down
		32: 'next' // space
	}
};

BX.CViewer.prototype._create = function()
{
	if (!this.DIV)
	{
		var specTag = BX.browser.IsIE() && !BX.browser.IsDoctype() ? 'A' : 'SPAN',
			specHref = specTag == 'A' ? 'javascript:void(0)' : null;

		this.OVERLAY = document.body.appendChild(BX.create('DIV', {
			props: {className: 'bx-viewer-overlay'}
		}));

		this.OVERLAY.appendChild(
			(this.PREV_LINK = BX.create(specTag, {
				props: {
					className: 'bx-viewer-prev-outer',
					href: specHref
				},
				events: {
					click: BX.proxy(this.prev, this)
				},
				html: '<span class="bx-viewer-prev"></span>'
			}))
		);
		this.OVERLAY.appendChild(
			(this.NEXT_LINK = BX.create(specTag, {
				props: {
					className: 'bx-viewer-next-outer',
					href: specHref
				},
				events: {
					click: BX.proxy(this.next, this)
				},
				html: '<span class="bx-viewer-next"></span>'
			}))
		);

		this.DIV = this.OVERLAY.appendChild(BX.create('DIV', {
			props: {className: 'bx-viewer-wrap-outer'},
			events: {
				click: BX.eventCancelBubble
			},
			children: [
				BX.create('DIV', {
					props: {className: 'bx-viewer-wrap-inner'},
					//style: {padding:padding},
					children: [
						(this.CONTENT_WRAP = BX.create('DIV', {
							props: {className: 'bx-viewer-wrap bx-viewer-cap'}
						}))
					]
				}),
				(this.CONTENT_TITLE = BX.create('DIV', {
					style: {bottom: '0'},
					props: {className: 'bx-viewer-title'}
				})),
				(this.FULL_TITLE = BX.create('DIV', {
					style: {bottom: '-32px'},
					props: {className: 'bx-viewer-full-title'}
				})),
				BX.create(specTag, {
					props: {
						className: 'bx-viewer-close',
						href: specHref
					},
					events: {click: BX.proxy(this._hide, this)},
					html: '<span class="bx-viewer-close-inner"></span>'
				})
			]
		}));

		if (!!this.params.resizeToggle)
		{
			this.CONTENT_WRAP.appendChild(BX.create('SPAN', {
				props: {className: 'bx-viewer-size-toggle'},
				style: {
					right: this.params.minPadding + 'px',
					bottom: this.params.minPadding + 'px'
				},
				events: {
					click: BX.proxy(this._toggle_resize, this)
				}
			}))
		}
	}

	//from N
	var padding;
	if (this.params.topPadding) {
		padding = this.params.topPadding + 'px ' + this.params.minPadding + 'px ' + this.params.minPadding + 'px'
	} else {
		padding = this.params.minPadding + 'px'
	}
	this.CONTENT_WRAP.parentNode.style.padding = padding;
	//end from N

};

BX.CViewer.prototype.setCurrent = function(element)
{
	if(!BX.is_subclass_of(element, BX.CViewCoreElement))
	{
		BX.debug('current element not instance of BX.CViewCoreElement');
		return;
	}

	this.currentElement = element;
}

BX.CViewer.prototype.getCurrent = function()
{
	if(!BX.is_subclass_of((this.currentElement || this.list[this._current]), BX.CViewCoreElement))
	{
		BX.debug('current element not instance of BX.CViewCoreElement');
	}
	else
	{
		BX.addCustomEvent((this.currentElement || this.list[this._current]), 'onIframeDocSuccess', BX.delegate(function (elementWithError) {
			BX.localStorage.set('iframe_options_error', false, 60*2);
		}, this));
		BX.addCustomEvent((this.currentElement || this.list[this._current]), 'onIframeDocError', BX.delegate(function (elementWithError) {
			if((!elementWithError.id || this.getCurrent().id != elementWithError.id) && this.getCurrent().src != elementWithError.src)
			{
				return;
			}
			this.getCurrent().hide();
			this.setCurrent(new BX.CViewErrorIframeElement({
				buttonUrl: elementWithError.viewerUrl,
				title: elementWithError.title,
				buttons: elementWithError.buttons
			}));
			this.show();
			BX.localStorage.set('iframe_options_error', true, 60*2);
		}, this));

	}
	return (this.currentElement || this.list[this._current]);
}

BX.CViewer.prototype._keypress = function(e)
{
	var key = (e||window.event).keyCode || (e||window.event).charCode;
	if (!!this.params.keyMap && !!this.params.keyMap[key] && !!this[this.params.keyMap[key]])
	{
		this[this.params.keyMap[key]].apply(this);
		return BX.PreventDefault(e);
	}
};

BX.CViewer.prototype._toggle_resize = function()
{
	var tmp = this.params.resize;
	this.params.resize = this.params.resizeToggle;
	this.params.resizeToggle = tmp;

	if (this.params.resize != 'WH')
	{
		this.params.lockScroll = true;
		this._lock_scroll();
	}
	else
	{
		this.params.lockScroll = false;
		this._unlock_scroll();
	}

	this.adjustSize();
	this.adjustPos();
};

BX.CViewer.prototype.adjustPos = function()
{
	if (this.getCurrent().height > 0 && this.getCurrent().width > 0)
	{
		this._adjustPosByElement();
	}
	else
	{
		if (!this.CONTENT_WRAP.style.height)
			this.CONTENT_WRAP.style.height = "100px";
		if (!this.CONTENT_WRAP.style.width)
			this.CONTENT_WRAP.style.width = "100px";

		//this._adjustPosByElement();
		this.getCurrent().addTimeoutId(
			setTimeout(BX.proxy(this._adjustPosByElement, this), 250)
		);
	}
};

BX.CViewer.prototype._adjustPosByElement = function()
{
	if (this.bVisible)
	{
		var wndSize = BX.GetWindowSize(),
			top = parseInt((wndSize.innerHeight - parseInt(this.CONTENT_WRAP.style.height) - 2 * this.params.minPadding - this.params.topPadding)/2),
			left = parseInt((wndSize.innerWidth - parseInt(this.CONTENT_WRAP.style.width) - 2 * this.params.minPadding)/2);

		if (!this.params.lockScroll && wndSize.innerWidth < wndSize.scrollHeight)
			left -= 20;

		if (top < this.params.minMargin)
			top = this.params.minMargin;
		if (left < this.params.minMargin + Math.min(70, this.PREV_LINK.offsetWidth))
			left = this.params.minMargin + Math.min(70, this.PREV_LINK.offsetWidth);

		if (this.params.showTitle && !!this.getCurrent().title)
		{
			top -= 20;
		}

		this.DIV.style.top = top + 'px';
		this.DIV.style.left = left + 'px';
	}
};

BX.CViewer.prototype.adjustSizeTitle = function()
{
	if(!this.getCurrent().titleButtons)
	{
		return false;
	}

	if(this.getCurrent().titleButtons.offsetLeft + this.getCurrent().titleButtons.offsetWidth + 10 > this.getCurrent().titleDomElement.offsetLeft)
	{
		BX.adjust(this.getCurrent().titleDomElement, {
			style: {
				marginLeft: '10px',
//				textAlign: 'inherit',
//				marginLeft: (this.getCurrent().titleButtons.offsetLeft + this.getCurrent().titleButtons.offsetWidth)  + 'px',
				maxWidth: (this.CONTENT_TITLE.offsetWidth - 2*(this.getCurrent().titleButtons.offsetLeft + this.getCurrent().titleButtons.offsetWidth)) + 'px'
			}
		});
		return true;
	}
	return false;
}
	
BX.CViewer.prototype.adjustSize = function()
{
	var wndSize = BX.GetWindowSize(), currentElement = this.getCurrent();

	if (!!currentElement.height && !!currentElement.width)
	{
		if (!this.params.lockScroll && wndSize.innerWidth < wndSize.scrollHeight)
			wndSize.innerWidth -= 20;

		wndSize.innerWidth -= this.params.minMargin * 2 + this.params.minPadding * 2 + Math.min(140, this.PREV_LINK.offsetWidth + this.NEXT_LINK.offsetWidth);
		wndSize.innerHeight -= this.params.topPadding + this.params.minMargin * 2 + this.params.minPadding * 2;

		if (this.params.showTitle && !!currentElement.title)
		{
			wndSize.innerHeight -= 40;
		}

		var height = currentElement.height,
			width = currentElement.width,
			ratio = [1];

		if (this.params.resize)
		{
			if(this.params.resize.indexOf('W') >= 0)
				ratio.push(wndSize.innerWidth/width);
			if (this.params.resize.indexOf('H') >= 0)
				ratio.push(wndSize.innerHeight/height);
		}

		ratio = Math.min.apply(window, ratio);

		height *= ratio;
		width *= ratio;

		if(currentElement._minHeight && currentElement._minWidth && (currentElement._minHeight > height || currentElement._minWidth > width))
		{
			if(currentElement.image)
			{
				//proportional image resize if your original size more than _minHeight||_minWidth of element
				if (width > currentElement._minWidth)
				{
					height = height*(currentElement._minWidth/width);
					width = currentElement._minWidth;
				}
				if (height > currentElement._minHeight)
				{
					width = width*(currentElement._minHeight/height);
					height = currentElement._minHeight;
				}
				currentElement.image.style.height = parseInt(height) + 'px';
				currentElement.image.style.width = parseInt(width) + 'px';
				currentElement.show(); //reshow for vertical align
			}
			height = currentElement._minHeight;
			width = currentElement._minWidth;
		}
		else
		{
			if(currentElement.image)
			{
				//skip proportional image resize  if window resized.
				currentElement.image.style.height = '';
				currentElement.image.style.width = '';
			}
		}

		this.CONTENT_WRAP.style.height = parseInt(height) + 'px';
		this.CONTENT_WRAP.style.width = parseInt(width) + 'px';

		if(this.getCurrent().domElement && this.getCurrent().titleDomElement)
		{
			var self = this;
			setTimeout(function(){
				if(!self.adjustSizeTitle())
				{
					BX.adjust(self.getCurrent().titleDomElement, {
						style: {
							marginLeft: '',
							maxWidth: '100%'
						}
					});
					self.adjustSizeTitle();
				}
			}, 220);
		}

		if (BX.browser.IsIE())
		{
			var h = parseInt(this.CONTENT_WRAP.style.height) + this.params.minPadding * 2;

			this.PREV_LINK.style.height = this.NEXT_LINK.style.height = h + 'px';
			this.PREV_LINK.firstChild.style.top = this.NEXT_LINK.firstChild.style.top = parseInt(h/2-20) + 'px';
		}
	}
};

BX.CViewer.prototype._lock_scroll = function()
{
	if (this.params.lockScroll)
		BX.addClass(document.body, 'bx-viewer-lock-scroll');
};

BX.CViewer.prototype._unlock_scroll = function()
{
	if (this.params.lockScroll)
		BX.removeClass(document.body, 'bx-viewer-lock-scroll');
};

BX.CViewer.prototype._unhide = function()
{
	this.bVisible = true;

	this.DIV.style.display = 'block';
	this.OVERLAY.style.display = 'block';

	this.PREV_LINK.style.display = this.NEXT_LINK.style.display = 'none';
	if(this.list.length > 1 && (this.params.cycle || this._current > 0))
	{
		this.PREV_LINK.style.display = 'block';
		this.PREV_LINK.style.opacity = '0.2';
	}
	if(this.list.length > 1 && (this.params.cycle || this._current < this.list.length-1))
	{
		this.NEXT_LINK.style.display = 'block';
		this.NEXT_LINK.style.opacity = '0.2';
	}

	this.adjustPos();

	BX.unbind(document, 'keydown', BX.proxy(this._keypress, this));
	BX.unbind(window, 'resize', BX.proxy(this.adjustSize, this));
	BX.unbind(window, 'resize', BX.proxy(this.adjustPos, this));
	BX.bind(document, 'keydown', BX.proxy(this._keypress, this));
	BX.bind(window, 'resize', BX.proxy(this.adjustSize, this));
	BX.bind(window, 'resize', BX.proxy(this.adjustPos, this));

	this._lock_scroll();
};

BX.CViewer.prototype._hide = function()
{
	this.bVisible = false;

	this.DIV.style.display = 'none';
	this.OVERLAY.style.display = 'none';

	BX.unbind(document, 'keydown', BX.proxy(this._keypress, this));
	BX.unbind(window, 'resize', BX.proxy(this.adjustSize, this));
	BX.unbind(window, 'resize', BX.proxy(this.adjustPos, this));

	this._unlock_scroll();
	//todo may set PreventShow = false  to all element in cycle
	this.getCurrent().hide(true);
	this.currentElement = null;
	BX.onCustomEvent(this, 'onElementViewClose', [this.getCurrent()]);
};

BX.CViewer.prototype.add = function(data)
{
	this.list.push(data);
};

BX.CViewer.prototype.setList = function(list)
{
	this.list = [];

	if (!!list && BX.type.isArray(list))
	{
		for(var i=0; i<list.length; i++)
		{
			if(!BX.is_subclass_of(list[i], BX.CViewCoreElement))
			{
				this.add(new BX.CViewCoreElement(list[i]));
			}
			else
			{
				this.add(list[i]);
			}
		}
	}

	if (this.bVisible)
	{
		if (this.list.length > 0)
			this.show();
		else
			this.close();
	}
};

BX.CViewer.prototype.show = function(element, force)
{
	force = force || false;
	BX.browser.addGlobalClass();

	var _current = this._current;
	var self = this;

	if(typeof(element) == 'object' && (!!element.image || !!element.thumb))
		element = (element.id||element.image||element.thumb||element.src);

	if (BX.type.isString(element))
	{
		for(var i=0; i < this.list.length; i++)
		{
			if(this.list[i].image == element || this.list[i].thumb == element || this.list[i].src == element || this.list[i].id == element)
			{
				_current = i;
				break;
			}
		}
	}
	if(!this.currentElement)
	{
		var currentElement = this.list[_current];

		if (!currentElement)
			return;
		this._current = _current;
	}
	else
	{
		//this is current not from list of elements
		var currentElement = this.currentElement;
	}

	this.params.topPadding = 0;
	if(currentElement.showTitle && currentElement.title)
	{
		this.params.topPadding = currentElement.topPadding || 0;
	}

	this._create();
	currentElement.setContentWrap(this.CONTENT_WRAP);
	BX.cleanNode(this.CONTENT_WRAP);
	this.adjustSize();
	if(force)
	{
		currentElement.loaded = false;
		currentElement.hide();
	}
	if(!currentElement.loaded)
	{
		BX.addClass(this.CONTENT_WRAP, 'bx-viewer-wrap-loading');
		currentElement.load(function (element) {
			BX.removeClass(self.CONTENT_WRAP, 'bx-viewer-wrap-loading');
			//if(!element.preventShow)
				element.show();
			self.adjustSize();
			self.adjustPos();
			self._preload();
		});
	}
	else
	{
		currentElement.load(function (element) {
			BX.removeClass(self.CONTENT_WRAP, 'bx-viewer-wrap-loading');
			//self.adjustSize();
			self.adjustPos();
			element.addTimeoutId(setTimeout(function(){
				//if(!element.preventShow)
					element.show();
					self.adjustSize();
			}, 200));
			self._preload();
		});
	}

	//this._check_title()
	this.getCurrent().addTimeoutId(
		setTimeout(BX.proxy(this._check_title, this), 10)
	);
	this._unhide();

	BX.onCustomEvent(this, 'onElementViewShow', [currentElement]);
};

BX.CViewer.prototype._check_title = function()
{
	BX.cleanNode(this.CONTENT_TITLE);
	BX.cleanNode(this.FULL_TITLE);
	if (this.params.showTitle)
	{
		if(this.getCurrent().showTitle && this.getCurrent().title)
		{
			if(BX.type.isDomNode(this.getCurrent().titleDomElement))
			{
				if(BX.type.isDomNode(this.getCurrent().titleButtons))
				{
					this.CONTENT_TITLE.appendChild(this.getCurrent().titleButtons);
				}

				this.CONTENT_TITLE.appendChild(this.getCurrent().titleDomElement);
			}
			else if(BX.type.isNotEmptyString(this.getCurrent().title))
			{
				BX.adjust(this.CONTENT_TITLE, {
					text: this.getCurrent().title
				});
			}
			else
			{
				this.CONTENT_TITLE.style.opacity = '0';
				this.CONTENT_TITLE.style.bottom = '0';
			}
		}
		else
		{
			//so bad...
			this.params.topPadding = 0;
		}
		if(this.getCurrent().full)
		{
			BX.cleanNode(this.FULL_TITLE);

			var p = [];
			if(this.getCurrent().full_height && this.getCurrent().full_width)
			{
				p.push(this.getCurrent().full_width+'x'+this.getCurrent().full_height);
			}

			if(this.getCurrent().full_size)
			{
				p.push(this.getCurrent().full_size);
			}

			var html = '<a href="'+this.getCurrent().full+'" class="bx-viewer-full-link" target="_blank">' + BX.message('JS_CORE_IMAGE_FULL') + (p.length > 0 ? (' ('+p.join(', ')+')') : '') + '</a>';
			BX.adjust(this.FULL_TITLE, {
				style: {
					opacity: '1'
				},
				children: [BX.create('div', {props: {className: 'bx-viewer-full-item '}, html: html})]
			});
		}
	}
	else
	{
		this.CONTENT_TITLE.style.opacity = '0';
		this.CONTENT_TITLE.style.bottom = '0';
		BX.cleanNode(this.CONTENT_TITLE);
	}
}

BX.CViewer.prototype._preload = function()
{
	if (this.params.preload > 0)
	{
		var finish = Math.max(this._current-this.params.preload, this.params.cycle ? -1000 : 0),
			start = Math.min(this._current+this.params.preload, this.params.cycle ? this.list.length + 1000 : this.list.length-1);

		if (finish < start)
		{
			for (var i=start; i>=finish; i--)
			{
				var ix = i;
				if (ix < 0)
					ix += this.list.length;
				else if (ix >= this.list.length)
					ix -= this.list.length;

				if (!this.list[ix].isProccessed)
				{
					this.list[ix].preload();
				}
			}
		}

	}
};

BX.CViewer.prototype.next = function()
{
	if (this.list.length > 1)
	{
		this.getCurrent().hide();
		this.currentElement = null;
		this._current++;
		if(this._current >= this.list.length)
		{
			if(!!this.params.cycle)
				this._current = 0;
			else
				this._current--;

			BX.onCustomEvent(this, 'onElementViewFinishList', [this.getCurrent(), 1]);
		}
		this.getCurrent().preventShow = false;
		this.show();
	}
};

BX.CViewer.prototype.prev = function()
{
	if (this.list.length > 1)
	{
		this.getCurrent().hide();
		this.currentElement = null;
		this._current--;
		if(this._current < 0)
		{
			if(!!this.params.cycle)
				this._current = this.list.length-1;
			else
				this._current++;

			BX.onCustomEvent(this, 'onElementViewFinishList', [this.getCurrent(), -1]);
		}
		this.getCurrent().preventShow = false;
		this.show();
	}
};

BX.CViewer.prototype.close = function()
{
	this._hide();
};

BX.CViewer.prototype.openModal = function(link, title, width, height)
{
	width = width || 1030;
	height = height || 700;

	var modalWindow = BX.util.popup(link, width, height);
	modalWindow.elementViewer = this;

	return modalWindow;
};

})(window);