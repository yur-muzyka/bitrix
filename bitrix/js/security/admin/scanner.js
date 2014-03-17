
(function() {

JCSecurityScanner = function(pLastResult)
{
	this.results = pLastResult || [];
	this.problemsCount = 0;
	this.actionUrl = '/bitrix/admin/security_scanner.php?lang=' + BX.message('LANGUAGE_ID');
	this.started = false;

	BX.ready(BX.delegate(this.onTestingComplete, this));
};

JCSecurityScanner.prototype.getCriticalErrorsContainer = function() {
	var errorsContainerParent = BX.findChild(
		BX('error_container'), {
			tagName: 'div',
			className: 'adm-info-message'
		},
		true
	);
	var errorsContainer = BX.findChild(
		errorsContainerParent, {
			tagName: 'div',
			className: 'adm-info-message-errors'
		}
	);
	if(!errorsContainer) {
		errorsContainer = BX.create('div', {
			'props': {
				'className': 'adm-info-message-errors'
			}
		});
		errorsContainerParent.appendChild(errorsContainer);
	}
	return errorsContainer;
};

JCSecurityScanner.prototype.showCriticalError = function(pMessage, pTestName) {
	var testName = pTestName || '';
	if(testName)
		testName += ': ';

	BX.show(BX('error_container'));
	var newError = BX.create('div', {
		'html': testName + pMessage
	});
	this.getCriticalErrorsContainer().appendChild(newError);
};

JCSecurityScanner.prototype.setProblemCount = function(pCount) {
	BX('problems_count').innerHTML = BX.message('SEC_SCANNER_PROBLEMS_COUNT') + pCount + BX.message('SEC_SCANNER_CRITICAL_PROBLEMS_COUNT') + this.getCriticalErrorsCount();
};

JCSecurityScanner.prototype.getCriticalErrorsCount = function() {
	var count = 0;

	for (var i = 0; i < this.results.length; i++) {
		if(this.results[i]['critical'] && this.results[i]['critical'] == 'HIGHT') {
			count++;
		}
	}
	return count;
};

JCSecurityScanner.prototype.isStarted = function() {
	return this.started;
};

JCSecurityScanner.prototype.initializeTesting = function() {
	this.results = [];
	this.problemsCount = 0;
	this.started = true;
	this.setProgress(0);
	this.setProblemCount(0);
};

JCSecurityScanner.prototype.onTestingStart = function() {
	BX.show(BX('results_info'));
	BX.show(BX('status_bar'));
	BX('current_test').innerHTML = BX.message('SEC_SCANNER_INIT');
	BX.hide(BX('last_activity'));
	BX.hide(BX('error_container'));
	BX.hide(BX('start_container'));
	BX.hide(BX('results'));
	BX.hide(BX('first_start'));

	BX.cleanNode(BX('results'));
	BX.cleanNode(this.getCriticalErrorsContainer());
};

JCSecurityScanner.prototype.onTestingComplete = function() {
	BX.show(BX('start_container'));
	BX.show(BX('results'));
	this.showTestingResults();
	BX.hide(BX('status_bar'));
};


JCSecurityScanner.prototype.sortResults = function() {
	var getSortValue = function(pKey) {
		if(pKey == 'LOW') {
			return 3;
		} else if(pKey == 'MIDDLE') {
			return 2;
		} else {
			return 1;
		}
	};

	this.results.sort(function(a,b) {
		return getSortValue(a.critical) - getSortValue(b.critical);
	});
};

JCSecurityScanner.prototype.showTestResult = function(pResult, pIndex) {
	var uniqId = Math.random();
	var container = BX.create('div', {
		'props': {
			'className': pResult['critical'] == 'HIGHT' ? 'adm-security-block adm-security-block-important' : 'adm-security-block'
		}
	});

	container.appendChild(BX.create('div', {
		'props': {
			'className': 'adm-security-block-title'
		},
		'children': [
			BX.create('span', {
				'props': {
					'className': 'adm-security-block-num'
				},
				'text': pIndex + '.'
			}),
			BX.create('span', {
				'props': {
					'className': 'adm-security-block-title-name'
				},
				'text': pResult['title']
			}),
			BX.create('span', {
				'props': {
					'className': 'adm-security-block-status'
				},
				'text': BX.message('SEC_SCANNER_CRITICAL_ERROR')
			})
		]
	}));

	container.appendChild(BX.create('div', {
		'props': {
			'className': 'adm-security-block-text'},
		'html': pResult['detail']
	}));

	container.appendChild(BX.create('div', {
		'props': {
			'id': 'tip_arrow_' + uniqId,
			'className': 'adm-security-tip'
		},
		'events': {
			'click': function() {
				BX.toggleClass(BX('tip_arrow_' + uniqId), 'adm-security-tip-open');
				if(BX.hasClass(this, 'adm-security-tip-open')) {
					BX('tip_text_' + uniqId).innerHTML = BX.message('SEC_SCANNER_TIP_BUTTON_ON');
				} else {
					BX('tip_text_' + uniqId).innerHTML = BX.message('SEC_SCANNER_TIP_BUTTON_OFF');
				}
			}
		},
		'children': [
			BX.create('div', {
				'props': {
					'className': 'adm-security-tip-text'
				},
				'html': pResult['recommendation']
			}),
			BX.create('span', {
				'props': {
					'id': 'tip_text_' + uniqId,
					'className': 'adm-security-tip-link'
				},
				'text': BX.message('SEC_SCANNER_TIP_BUTTON_OFF')
			}),
			BX.create('div', {
				'props': {
					'className': 'adm-security-tip-arrow'
				}
			})
		]
	}));

	BX('results').appendChild(container);
};

JCSecurityScanner.prototype.setProgress = function(pProgress) {
	BX('progress_text').innerHTML = pProgress + '%';
	BX('progress_bar_inner').style.width = 500 * pProgress / 100 + 'px';
};

JCSecurityScanner.prototype.setCurrentTest = function(pTestName) {
	BX('current_test').innerHTML = BX.message('SEC_SCANNER_CURRENT_TEST') + pTestName;
};

JCSecurityScanner.prototype.showTestingResults = function() {
	this.sortResults();
	for (var i = 0; i < this.results.length; i++) {
		this.showTestResult(this.results[i], i + 1);
	}
};

JCSecurityScanner.prototype.sendCheckRequest = function(pAction, pData, pSuccessCallback, pFailureCallback) {
	var action = pAction || 'check';
	var data = pData || {};
	var successCallback = pSuccessCallback || BX.delegate(this.processCheckingResults, this);
	var failureCallback = pFailureCallback || BX.delegate(this.onRequestFailure, this);
	data['action'] = action;
	data['sessid'] = BX.bitrix_sessid();
	data = BX.ajax.prepareData(data);

	return BX.ajax({
		'method': 'POST',
		'dataType': 'json',
		'url': this.actionUrl,
		'data':  data,
		'onsuccess': successCallback,
		'onfailure': failureCallback
	});
};

JCSecurityScanner.prototype.startStopChecking = function() {
	if(this.isStarted()) {
		this.started = false;
		this.onTestingComplete();
	} else {
		this.initializeTesting();
		this.sendCheckRequest('check', {'first_start': 'Y'});
		this.onTestingStart();
	}
};

JCSecurityScanner.prototype.retrieveResults = function(pResults) {
	if(pResults['problem_count']) {
		this.problemsCount += parseInt(pResults['problem_count']);
		this.setProblemCount(this.problemsCount);
	}

	if(pResults['errors']) {
		for (var i = 0; i < pResults['errors'].length; i++) {
			this.results.push(pResults['errors'][i]);
		}
	}
};

JCSecurityScanner.prototype.completeTesting = function() {
	this.onTestingComplete();
	this.started = false;
	this.sendCheckRequest('save', {'results' : this.results});
};

JCSecurityScanner.prototype.onRequestFailure = function(pReason)
{
	var reason = pReason || BX.message('SEC_SCANNER_TESTING_FAILURE');
	this.showCriticalError(reason);
	this.onTestingComplete();
	this.started = false;
};

JCSecurityScanner.prototype.processCheckingResults = function(pResponce) {
	if(!this.isStarted())
		return;

	if(pResponce == 'ok' || pResponce == 'error')
		return;

	if(!pResponce['status']) {
		this.retrieveResults(pResponce);
	}

	if(pResponce['fatal_error_text']) {
		this.showCriticalError(pResponce['fatal_error_text'], pResponce['name']);
	}

	if(pResponce['all_done'] == 'Y') {
		this.completeTesting();
	} else {
		var timeOut = 0;
		if(pResponce['timeout']) {
			timeOut = pResponce['timeout'];
		}

		setTimeout(
			BX.delegate(
				function() {
					this.sendCheckRequest();
				}
			, this
			),
			timeOut*1000);
	}

	if(pResponce['percent']) {
		this.setProgress(pResponce['percent']);
	}

	if(pResponce['name']) {
		this.setCurrentTest(pResponce['name']);
	}
};

})();