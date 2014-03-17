/**********Filter************/
__MAAdminFilter = function(params) {
	/*filterFields{VALUE:,NAME:,TYPE:(input)}
	applyEvent, filterId*/
	for(var key in params)
		this[key] = params[key];

	this.floatDiv = new __MAAdminFilterFDiv({
		onSaveCallback: this.setField
	});

	this.curFieldId = "";
	this.fieldFilter = false,
	this.optionParams = {
			moduleId: 'mobileapp',
			optionName: 'maAdminFilter_'+this.filterId
		};
};

__MAAdminFilter.prototype.init = function ()
{
	for(var i in filterFields)
		this.setField(i);
};

__MAAdminFilter.prototype.showDiv = function (domObj)
{
	this.onEditFieldValue(domObj);
};

__MAAdminFilter.prototype.hideDiv = function ()
{
	this.floatDiv.hide();
};

__MAAdminFilter.prototype.onSaveFieldValue = function ()
{
	this.floatDiv.onSave(this.curFieldId);
};


__MAAdminFilter.prototype.resetField = function (fieldId)
{
	this.setField(fieldId, 0, true);
};

__MAAdminFilter.prototype.setField = function (fieldId, value, reset)
{
	if(!fieldId)
		return;

	var conditionObj = BX("cond_"+fieldId);

	if(conditionObj)
	{
		if(reset)
		{
			delete(filterFields[fieldId]);
			conditionObj.innerHTML = '';
			return;
		}

		if(value !== false) //copy to array, html from value
			conditionObj.innerHTML = filterFields[fieldId].VALUE = value;
		else if(filterFields[fieldId].VALUE) //copy from array to html
			conditionObj.innerHTML = filterFields[fieldId].VALUE;
	}
};

__MAAdminFilter.prototype.apply = function()
{
	if(!this.optionParams || !this.optionParams.moduleId || this.optionParams.optionName)
		return;

	BX.userOptions.del(this.optionParams.moduleId, this.optionParams.optionName);

	for(var fieldId in filterFields)
		BX.userOptions.save(this.optionParams.moduleId, this.optionParams.optionName, fieldId, filterFields[fieldId].VALUE);

	app.onCustomEvent(this.applyEvent);
	app.closeModalDialog();
};

__MAAdminFilter.prototype.reset = function()
{
	for(var i in filterFields)
		this.resetField(i);
};

__MAAdminFilter.prototype.addField = function()
{
	alert("Добавляем поле");
};

__MAAdminFilter.prototype.deleteField = function()
{
	alert("Удаляем поле");
};

__MAAdminFilter.prototype.onEditFieldValue = function(domObj)
{
	var curFieldId = this.curFieldId = domObj.id.substr(7),
		value =this.filterFields[curFieldId].VALUE ? this.filterFields[curFieldId].VALUE : "",
		divTitle = "<b>"+this.filterFields[curFieldId].NAME+":</b>",
		fieldParams = {
			id: curFieldId,
			value: this.filterFields[curFieldId].VALUE
		};

	switch (this.filterFields[curFieldId].TYPE)
	{
		case "date":
			this.fieldFilter	=	new __MAAdminFilterFTypeDate();
			break;
		case "select":
			this.fieldFilter	=	new __MAAdminFilterFTypeSelect();
			break;
		case "multiSelect":
			this.fieldFilter	=	new __MAAdminFilterFTypeMSelect();
			break;
		case "input":
			this.fieldFilter	=	new __MAAdminFilterFTypeInput();
			break;
	}

	this.fieldFilter.init(fieldParams);
	var fieldHtml = this.fieldFilter.getHtml();
	this.floatDiv.setContent(divTitle, fieldHtml, this.fieldFilter.getValue);
	this.floatDiv.show();
	this.fieldFilter.getValue();
};

/********* Float Div *********/
__MAAdminFilterFDiv = function(params) {
	//onSaveCallback
	for(var key in params)
		this[key] = params[key];

	this.titleId = "float_title";
	this.bodyId = "float_body";
	this.id = "float_div";
	this.getValueFunc = false;
};

__MAAdminFilterFDiv.prototype.setContent = function (title, bodyHtml, getValueFunc)
{
		BX(this.titleId).innerHTML = title;
		BX(this.bodyId).innerHTML = bodyHtml;
		this.getValueFunc = getValueFunc;
};

__MAAdminFilterFDiv.prototype.show = function ()
{
		BX(this.id).style.display='block';
};

__MAAdminFilterFDiv.prototype.hide = function ()
{
		BX(this.id).style.display='none';
};

__MAAdminFilterFDiv.prototype.onSave = function(fieldId)
{
	var _this = this,
		fieldValue = false;

	//if(this.getValueFunc && typeof this.getValueFunc == 'function')
		fieldValue = this.getValueFunc.call(_this);

	console.log("__MAAdminFilterFDiv.prototype.onSave: "+fieldValue+", "+fieldId);

	//if(this.onSaveCallback && typeof this.onSaveCallback == 'function')
		this.onSaveCallback.call(_this, fieldValue, fieldId);

	this.hide();
};

//Filter fields types
__MAAdminFilterFType = function() {};
__MAAdminFilterFType.prototype.init = function(params){
	this.id = params.id;
	this.value = params.value;
};
__MAAdminFilterFType.prototype.getValue = function(){};
__MAAdminFilterFType.prototype.getHtml = function(){};

// Input type
__MAAdminFilterFTypeInput = function() {};
__MAAdminFilterFTypeInput.prototype = new __MAAdminFilterFType();
__MAAdminFilterFTypeInput.prototype.init = function(params)
{
	console.log("__MAAdminFilterFTypeInput.prototype.init");
	console.log(params);
	console.log(this);
	this.id = "input_"+params.id;
	this.html = '<input type="text" id="'+
					this.id+'" value="'+params.value+'" size="25" style="font-size: 20px; line-height: 20px;text-shadow: 0 1px 0 #FFFFFF;">';

};
__MAAdminFilterFTypeInput.prototype.getValue = function()
{
	console.log("__MAAdminFilterFTypeInput.prototype.getValue this: "+this);

	var inputObj = BX(this.id),
		retVal = false;
	console.log(inputObj);
	if(inputObj)
		retVal = inputObj.value;

	console.log(retVal);

	return retVal;
};

__MAAdminFilterFTypeInput.prototype.getHtml = function()
{
	return this.html;
};