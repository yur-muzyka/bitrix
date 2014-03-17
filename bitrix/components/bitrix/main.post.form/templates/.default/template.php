<?if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true)die();
include($_SERVER["DOCUMENT_ROOT"].$templateFolder."/file.php");
$array = (((!empty($arParams["DESTINATION"]) || in_array("MentionUser", $arParams["BUTTONS"])) && IsModuleInstalled("socialnetwork")) ?
	array('socnetlogdest') : array());

CUtil::InitJSCore($array);
$arButtonsHTML = array();

foreach($arParams["BUTTONS"] as $val)
{
	switch($val)
	{
		case "CreateLink":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-link" id="bx-b-link"></span>';
			break;
		case "UploadImage":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-img" id="bx-b-uploadimage"></span>';
			break;
		case "UploadFile":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-file" id="bx-b-uploadfile" '.
					'title="'.GetMessage('MPF_FILE_TITLE').'"></span>';
			break;
		case "InputVideo":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-video" id="bx-b-video"></span>';
			break;
		case "InputTag":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-tag" id="bx-b-tag-input" '.
				'title="'.GetMessage("MPF_TAG_TITLE").'"></span>';
			break;
		case "MentionUser":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-mention" id="bx-b-mention" '.
				'title="'.GetMessage("MPF_MENTION_TITLE").'"></span>';
			break;
		case "Quote":
			$arButtonsHTML[] = '<span class="feed-add-post-form-but feed-add-quote" id="bx-b-quote"></span>';
			break;
		default:
			if (array_key_exists($val, $arParams["BUTTONS_HTML"]))
				$arButtonsHTML[] = $arParams["BUTTONS_HTML"][$val];
			break;
	}
}

?>
<div class="feed-add-post-micro" id="micro<?=$arParams["LHE"]["jsObjName"]?>" <?
	?>onclick="BX.onCustomEvent(BX('div<?=$arParams["LHE"]["jsObjName"]?>'), 'OnShowLHE', ['show'])" <?
	?><?if(!$arParams["LHE"]["bInitByJS"]){?> style="display:none;"<?}?>><?=GetMessage("BLOG_LINK_SHOW_NEW")?></div><?
?><div class="feed-add-post" id="div<?=$arParams["LHE"]["jsObjName"]?>" <?if($arParams["LHE"]["bInitByJS"]){?> style="display:none;"<?}?>>
	<div class="feed-add-post-form feed-add-post-edit-form">
		<?=$arParams["~HTML_BEFORE_TEXTAREA"]?>
		<div class="feed-add-post-text">
			<div class="feed-add-close-icon" onclick="window['<?=$arParams["JS_OBJECT_NAME"]?>'].showPanelEditor(false); BX.userOptions.save('main.post.form', 'postEdit', 'showBBCode', 'N');" id="bx-panel-close"></div>
			<?

if (IsModuleInstalled("fileman"))
	include($_SERVER["DOCUMENT_ROOT"].$templateFolder."/lhe.php");
?>
<script type="text/javascript">
	BX.message({
		'BX_FPD_LINK_1':'<?=GetMessageJS("MPF_DESTINATION_1")?>',
		'BX_FPD_LINK_2':'<?=GetMessageJS("MPF_DESTINATION_2")?>',
		'TAG_ADD': '<?=GetMessageJS("MPF_ADD_TAG1")?>',
		'MPF_IMAGE': '<?=GetMessageJS("MPF_IMAGE_TITLE")?>',
		'MPF_FILE': '<?=GetMessageJS("MPF_INSERT_FILE")?>',
		'MPF_FILE_INSERT_IN_TEXT': '<?=GetMessageJS("MPF_FILE_INSERT_IN_TEXT")?>',
		'MPF_FILE_IN_TEXT': '<?=GetMessageJS("MPF_FILE_IN_TEXT")?>',
		'MPF_NAME_TEMPLATE' : '<?=urlencode($arParams['NAME_TEMPLATE'])?>'
	});

	if(window.BX)
	{
		BX.ready(function()
		{
			window['<?=$arParams["JS_OBJECT_NAME"]?>'] = new LHEPostForm(
				'<?=$arParams["FORM_ID"]?>',
			<?=CUtil::PhpToJSObject(
				array(
					"sNewFilePostfix" => $arParams["FILES"]["POSTFIX"],
					"LHEJsObjId" => $arParams["LHE"]["id"],
					"LHEJsObjName" => $arParams["LHE"]["jsObjName"],
					"arSize" => $arParams["UPLOAD_FILE_PARAMS"],
					"WDLoadFormController" => !empty($arParams["UPLOAD_WEBDAV_ELEMENT"]),
					"WDControllerCID" => $arParams["UPLOAD_WEBDAV_ELEMENT_CID"],
					"BFileDLoadFormController" => !empty($arParams["UPLOAD_FILE"]),
					"FControllerID" => $arParams["UPLOAD_FILE_CONTROL_ID"],
					"arFiles" => $arParams["FILES"]["VALUE_JS"],
					"arActions" => $arParams["BUTTONS"]
				));?>,
				window['<?=$arParams["LHE"]["id"]?>Settings']['parsers']
			);
		});
	}
</script>

		<div style="display:none;"><input type="text" tabindex="<?=($arParams["TEXT"]["TABINDEX"]++)?>" onFocus="window['<?=$arParams["LHE"]["jsObjName"]?>'].SetFocus()" name="hidden_focus" /></div>
		</div>
		<div class="feed-add-post-form-but-wrap" id="post-buttons-bottom"><?=implode("", $arButtonsHTML);
	if(!empty($arParams["ADDITIONAL"]))
	{

		if ($arParams["ADDITIONAL_TYPE"] == "popup") {
			?><div class="feed-add-post-form-but-more" <?
				?>onclick="BX.PopupMenu.show('menu-more<?=$arParams["FORM_ID"]?>', this, [<?=implode(", ", $arParams["ADDITIONAL"])?>], {offsetLeft: 42, offsetTop: 3, lightShadow: false, angle: top, events : {onPopupClose : function(popupWindow) {BX.removeClass(this.bindElement, 'feed-add-post-form-but-more-act');}}}); BX.addClass(this, 'feed-add-post-form-but-more-act');"><?
				?><?=GetMessage("MPF_MORE")?><?
				?><div class="feed-add-post-form-but-arrow"></div><?
			?></div><?
		}
		else if (count($arParams["ADDITIONAL"]) < 5)
		{
			?><div class="feed-add-post-form-but-more-open"><?
				?><?=implode("", $arParams["ADDITIONAL"])?>
			</div><?
		}
		else {
			foreach($arParams["ADDITIONAL"] as $key => $val) {
				$arParams["ADDITIONAL"][$key] = array("text" => $val, "onclick" => "BX.PopupMenu.Data['menu-more".$arParams["FORM_ID"]."'].popupWindow.close();");
			}
			?><script type="text/javascript">window['more<?=$arParams["FORM_ID"]?>']=<?=CUtil::PhpToJSObject($arParams["ADDITIONAL"])?>;</script><?
			?><div class="feed-add-post-form-but-more" <?
				?>onclick="BX.PopupMenu.show('menu-more<?=$arParams["FORM_ID"]?>', this, window['more<?=$arParams["FORM_ID"]?>'], {offsetLeft: 42, offsetTop: 3, lightShadow: false, angle: top, events : {onPopupClose : function(popupWindow) {BX.removeClass(this.bindElement, 'feed-add-post-form-but-more-act');}}}); BX.addClass(this, 'feed-add-post-form-but-more-act');"><?
				?><?=GetMessage("MPF_MORE")?><?
				?><div class="feed-add-post-form-but-arrow"></div><?
			?></div><?
		}
	}
	?></div>
</div>
<?=$arParams["~HTML_AFTER_TEXTAREA"]?><?

if ($arParams["DESTINATION_SHOW"] == "Y" || in_array("MentionUser", $arParams["BUTTONS"]))
{
?>
<script>
	var lastUsers = <?=(empty($arParams["DESTINATION"]['LAST']['USERS'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['LAST']['USERS']))?>;
	var users = <?=(empty($arParams["DESTINATION"]['USERS'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['USERS']))?>;
	var department = <?=(empty($arParams["DESTINATION"]['DEPARTMENT'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['DEPARTMENT']))?>;
	<?if(empty($arParams["DESTINATION"]['DEPARTMENT_RELATION']))
	{
		?>
		var relation = {};
		for(var iid in department)
		{
			var p = department[iid]['parent'];
			if (!relation[p])
				relation[p] = [];
			relation[p][relation[p].length] = iid;
		}
		function makeDepartmentTree(id, relation)
		{
			var arRelations = {};
			if (relation[id])
			{
				for (var x in relation[id])
				{
					var relId = relation[id][x];
					var arItems = [];
					if (relation[relId] && relation[relId].length > 0)
						arItems = makeDepartmentTree(relId, relation);

					arRelations[relId] = {
						id: relId,
						type: 'category',
						items: arItems
					};
				}
			}

			return arRelations;
		}
		var departmentRelation = makeDepartmentTree('DR0', relation);
		<?
	}
	else
	{
		?>var departmentRelation = <?=CUtil::PhpToJSObject($arParams["DESTINATION"]['DEPARTMENT_RELATION'])?>;<?
	}
	?>
</script>
<?
}
if($arParams["DESTINATION_SHOW"] == "Y" || !empty($arParams["TAGS"]))
{
?><ol class="feed-add-post-strings-blocks"><?
}
if($arParams["DESTINATION_SHOW"] == "Y")
{
?>
<li class="feed-add-post-destination-block">
	<div class="feed-add-post-destination-title"><?=GetMessage("MPF_DESTINATION")?></div>
	<div class="feed-add-post-destination-wrap" id="feed-add-post-destination-container">
		<span id="feed-add-post-destination-item"></span>
		<span class="feed-add-destination-input-box" id="feed-add-post-destination-input-box">
			<input type="text" value="" class="feed-add-destination-inp" id="feed-add-post-destination-input">
		</span>
		<a href="#" class="feed-add-destination-link" id="bx-destination-tag"></a>
		<script type="text/javascript">
			BXSocNetLogDestinationFormName = '<?=randString(6)?>';
			BXSocNetLogDestinationDisableBackspace = null;
			BX.SocNetLogDestination.init({
				'name' : BXSocNetLogDestinationFormName,
				'searchInput' : BX('feed-add-post-destination-input'),
				'extranetUser' :  <?=($arParams["DESTINATION"]["EXTRANET_USER"] == 'Y'? 'true': 'false')?>,
				'bindMainPopup' : { 'node' : BX('feed-add-post-destination-container'), 'offsetTop' : '5px', 'offsetLeft': '15px'},
				'bindSearchPopup' : { 'node' : BX('feed-add-post-destination-container'), 'offsetTop' : '5px', 'offsetLeft': '15px'},
				'callback' : {
					'select' : BXfpdSelectCallback,
					'unSelect' : BXfpdUnSelectCallback,
					'openDialog' : BXfpdOpenDialogCallback,
					'closeDialog' : BXfpdCloseDialogCallback,
					'openSearch' : BXfpdOpenDialogCallback,
					'closeSearch' : BXfpdCloseSearchCallback
				},
				'items' : {
					'users' : users,
					'groups' : <?=($arParams["DESTINATION"]["EXTRANET_USER"] == 'Y'? '{}': "{'UA' : {'id':'UA','name': '".(!empty($arParams["DESTINATION"]['DEPARTMENT']) ? GetMessageJS("MPF_DESTINATION_3"): GetMessageJS("MPF_DESTINATION_4"))."'}}")?>,
					'sonetgroups' : <?=(empty($arParams["DESTINATION"]['SONETGROUPS'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['SONETGROUPS']))?>,
					'department' : department,
					'departmentRelation' : departmentRelation
				},
				'itemsLast' : {
					'users' : lastUsers,
					'sonetgroups' : <?=(empty($arParams["DESTINATION"]['LAST']['SONETGROUPS'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['LAST']['SONETGROUPS']))?>,
					'department' : <?=(empty($arParams["DESTINATION"]['LAST']['DEPARTMENT'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['LAST']['DEPARTMENT']))?>,
					'groups' : <?=($arParams["DESTINATION"]["EXTRANET_USER"] == 'Y'? '{}': "{'UA':true}")?>
				},
				'itemsSelected' : <?=(empty($arParams["DESTINATION"]['SELECTED'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['SELECTED']))?>
			});
			BX.bind(BX('feed-add-post-destination-input'), 'keyup', BXfpdSearch);
			BX.bind(BX('feed-add-post-destination-input'), 'keydown', BXfpdSearchBefore);
			BX.bind(BX('bx-destination-tag'), 'click', function(e){BX.SocNetLogDestination.openDialog(BXSocNetLogDestinationFormName); BX.PreventDefault(e); });
			BX.bind(BX('feed-add-post-destination-container'), 'click', function(e){BX.SocNetLogDestination.openDialog(BXSocNetLogDestinationFormName); BX.PreventDefault(e); });
		</script>
	</div>
</li>
<?
}
if (!empty($arParams["TAGS"]))
{
?>
<li class="feed-add-post-tags-block">
	<div class="feed-add-post-tags-title"><?=GetMessage("MPF_TAGS")?></div>
	<div class="feed-add-post-tags-wrap" id="post-tags-container">
		<?
		$bHasTags = false;
		foreach($arParams["TAGS"]["VALUE"] as $val)
		{
			$val = trim($val);
			if(strlen($val) > 0)
			{
				$bHasTags = true;
				?><span class="feed-add-post-tags"><?
				?><?=htmlspecialcharsbx($val)?><span class="feed-add-post-del-but" onclick="deleteTag('<?=CUtil::JSEscape($val)?>', this.parentNode)"></span><?
				?></span><?
			}
		}
		?><span class="feed-add-post-tags-add" id="bx-post-tag"><?=GetMessage("MPF_ADD_TAG")?></span>
		<input type="hidden" name="<?=$arParams["TAGS"]["NAME"]?>" id="tags-hidden" value="<?=implode(",", $arParams["TAGS"]["VALUE"])?>,">
	</div>
<div id="post-tags-input" style="display:none;">
	<?if($arParams["TAGS"]["USE_SEARCH"] == "Y" && IsModuleInstalled("search"))
{
	$APPLICATION->IncludeComponent(
		"bitrix:search.tags.input",
		".default",
		Array(
			"NAME"	=>	$arParams["TAGS"]["NAME"],
			"VALUE"	=>	"",
			"arrFILTER"	=>	$arParams["TAGS"]["FILTER"],
			"PAGE_ELEMENTS"	=>	"10",
			"SORT_BY_CNT"	=>	"Y",
			"TEXT" => 'size="30" tabindex="'.($arParams["TEXT"]["TABINDEX"]++).'"',
			"ID" => "TAGS"
		),
		false,
		array("HIDE_ICONS" => "Y")
	);
}
else
{
	?><input type="text" tabindex="<?=($arParams["TEXT"]["TABINDEX"]++)?>" name="<?=$arParams["TAGS"]["NAME"]?>" size="30" value=""><?
}?>
</div>
<script type="text/javascript">
	if(window.BX)
	{
		BX.ready(function()
		{
			BX.bind(BX("bx-post-tag"), "click", function(e) {
				if(!e) e = window.event;
				popupTag.setAngle({position:'top'});
				popupTag.show();
				BX(BX.findChild(BX('post-tags-input'), {'tag': 'input' })).focus();
				BX.PreventDefault(e);
			});
			BX.bind(BX("bx-b-tag-input"), "click", function(e) {
				if(!e) e = window.event;

				var el = BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'className': /feed-add-post-tags-block/ }, true, false);
				BX.show(el);

				popupTag.setAngle({position:'top'});
				popupTag.show();
				BX(BX.findChild(BX('post-tags-input'), {'tag': 'input' })).focus();
				BX.PreventDefault(e);
			});
			BX.bind(BX("bx-post-tag-button"), "click", function(e) {
				if(!e) e = window.event;
				popupTag.setAngle({position:'top'});
				popupTag.show();
				BX(BX.findChild(BX('post-tags-input'), {'tag': 'input' })).focus();
				BX.PreventDefault(e);
			});

			var popupBindElement = BX('bx-post-tag');
			popupTag = new BX.PopupWindow('bx-post-tag-popup', popupBindElement, {
				lightShadow : false,
				offsetTop: 8,
				offsetLeft: 10,
				autoHide: true,
				closeByEsc: true,
				zIndex: -910,
				bindOptions: {position: "bottom"},
				buttons: [
					new BX.PopupWindowButton({
						text : BX.message('TAG_ADD'),
						events : {
							click : function() {
								addTag();
							}
						}
					})
				]
			});

			popupTag.setContent(BX('post-tags-input'));
			tagInput = BX.findChild(BX('post-tags-input'), {'tag': 'input' });
			BX.bind(tagInput, "keydown", BX.proxy(__onKeyTags, this ));
			BX.bind(tagInput, "keyup", BX.proxy(__onKeyTags, this ));
			<?
			if(!empty($arParams["TAGS"]) && $bHasTags)
			{
				?>
				var el = BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'className': /feed-add-post-tags-block/ }, true, false);
				BX.show(el);<?
			}
			?>
		});
	}
</script>
</li>
<?
}
if($arParams["DESTINATION_SHOW"] == "Y" || !empty($arParams["TAGS"]))
{
?></ol><?
}
?>
<div class="feed-add-post-buttons">
	<a class="feed-add-button feed-add-com-button" href="javascript:void(0)" id="submit<?=$arParams["LHE"]["jsObjName"]?>" <?
		?>onmousedown="BX.addClass(this, 'feed-add-button-press')" onmouseup="BX.removeClass(this,'feed-add-button-press')" <?
		?>onclick="BX.onCustomEvent(BX('div<?=$arParams["LHE"]["jsObjName"]?>'), 'OnButtonClick', ['submit']);"><?
		?><span class="feed-add-button-left"></span><?
		?><span class="feed-add-button-text"><?=GetMessage("MPF_BUTTON_SEND")?></span><?
		?><span class="feed-add-button-right"></span></a>
	<a class="feed-cancel-com" href="javascript:void(0)" id="cancel<?=$arParams["LHE"]["jsObjName"]?>" <?
		?>onclick="BX.onCustomEvent(BX('div<?=$arParams["LHE"]["jsObjName"]?>'), 'OnButtonClick', ['cancel']);"><?=GetMessage("MPF_BUTTON_CANCEL")?></a>
</div>
<?

if (in_array("MentionUser", $arParams["BUTTONS"]))
{
?>
<script type="text/javascript">
	window['bMentListen'] = false;
	window['bPlus'] = false;
	function BXfpdSelectCallbackMent<?=$arParams["FORM_ID"]?>(item, type, search)
	{
		BXfpdSelectCallbackMent(item, type, search, '<?=$arParams["FORM_ID"]?>', '<?=$arParams["LHE"]["jsObjName"]?>');
	}

	function BXfpdStopMent<?=$arParams["FORM_ID"]?>()
	{
		window['bMentListen'] = false;
		clearTimeout(BX.SocNetLogDestination.searchTimeout);
		BX.SocNetLogDestination.closeDialog();
		BX.SocNetLogDestination.closeSearch();
		if(window['<?=$arParams["LHE"]["jsObjName"]?>'])
			window['<?=$arParams["LHE"]["jsObjName"]?>'].SetFocus();
	}

	BXSocNetLogDestinationFormNameMent<?=$arParams["FORM_ID"]?> = '<?=randString(6)?>';
	BXSocNetLogDestinationDisableBackspace = null;
	var bxBMent = BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'attr': {id: 'bx-b-mention'}}, true, false);
	BX.SocNetLogDestination.init({
		'name' : BXSocNetLogDestinationFormNameMent<?=$arParams["FORM_ID"]?>,
		'searchInput' : bxBMent,
		'extranetUser' :  <?=($arParams["DESTINATION"]["EXTRANET_USER"] == 'Y'? 'true': 'false')?>,
		'bindMainPopup' :  { 'node' : bxBMent, 'offsetTop' : '1px', 'offsetLeft': '12px'},
		'bindSearchPopup' : { 'node' : bxBMent, 'offsetTop' : '1px', 'offsetLeft': '12px'},
		'callback' : {'select' : BXfpdSelectCallbackMent<?=$arParams["FORM_ID"]?>},
		'items' : {
			'users' : users,
			'groups' : {},
			'sonetgroups' : {},
			'department' : department,
			'departmentRelation' : departmentRelation

		},
		'itemsLast' : {
			'users' : lastUsers,
			'sonetgroups' : {},
			'department' : {},
			'groups' : {}
		},
		'itemsSelected' : <?=(empty($arParams["DESTINATION"]['SELECTED'])? '{}': CUtil::PhpToJSObject($arParams["DESTINATION"]['SELECTED']))?>,
		'departmentSelectDisable' : true,
		'obWindowClass' : 'bx-lm-mention',
		'obWindowCloseIcon' : false
	});

	if(window.BX)
	{
		BX.ready(
			function()
			{
				if(/MSIE 8/.test(navigator.userAgent))
				{
					var ment = BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'attr': {id: 'bx-b-mention'}}, true, false);
					ment.style.width = '1px';
					ment.style.marginRight = '0';
				}
				else
				{
					BX.addCustomEvent(
						BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'attr': {id: 'bx-b-mention'}}, true, false),
						'mentionClick',
						function(e){
						setTimeout(function()
						{
							if(!BX.SocNetLogDestination.isOpenDialog())
								BX.SocNetLogDestination.openDialog(BXSocNetLogDestinationFormNameMent<?=$arParams["FORM_ID"]?>);
							bPlus = false;
							window['bMentListen'] = true;
							window["mentionText"] = '';
							window['<?=$arParams["LHE"]["jsObjName"]?>'].SetFocus();

							if(BX.browser.IsIE())
							{
								r = window['<?=$arParams["LHE"]["jsObjName"]?>'].GetSelectionRange();
								win = window['<?=$arParams["LHE"]["jsObjName"]?>'].pEditorWindow;
								if(win.document.selection) // IE8 and below
								{
									r = BXfixIERangeObject(r, win);
									if (r && r.endContainer)
									{
										txt = r.endContainer.nodeValue;
										if(txt && window['rngEndOffset'] > txt.length)
											window['rngEndOffset'] = txt.length;

										var rng = window['<?=$arParams["LHE"]["jsObjName"]?>'].pEditorDocument.createRange();
										rng.setStart(r.endContainer, window['rngEndOffset']);
										rng.setEnd(r.endContainer, window['rngEndOffset']);
										window['<?=$arParams["LHE"]["jsObjName"]?>'].SelectRange(rng);
										window['<?=$arParams["LHE"]["jsObjName"]?>'].SetFocus();
									}
								}
							}


						}, 100);
						}
					);

					//mousedown for IE, that lost focus on button click
					BX.bind(
						BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'attr': {id: 'bx-b-mention'}}, true, false),
						"mousedown",
						function(e)
						{
							if(window['bMentListen'] !== true)
							{
								if(window['<?=$arParams["LHE"]["jsObjName"]?>'].sEditorMode == 'html') // WYSIWYG
								{
									window['<?=$arParams["LHE"]["jsObjName"]?>'].InsertHTML('@');
									window['bMentListen'] = true;
									window["mentionText"] = '';
									bPlus = false;

									if(BX.browser.IsIE())
									{
										r = window['<?=$arParams["LHE"]["jsObjName"]?>'].GetSelectionRange();

										win = window['<?=$arParams["LHE"]["jsObjName"]?>'].pEditorWindow;
										if(win.document.selection) // IE8 and below
										{
											r = BXfixIERangeObject(r, win);
											window['rngEndOffset'] = r.endOffset;
										}
									}
								}

								BX.onCustomEvent(BX.findChild(BX('<?=$arParams["FORM_ID"]?>'), {'attr': {id: 'bx-b-mention'}}, true, false), 'mentionClick');
							}
						}
					);
				}
			}
		);
	}
</script>
<?
}
/***************** Upload files ************************************/
?><?=$arParams["UPLOAD_FILE_HTML"]?><?
?><?=$arParams["UPLOAD_WEBDAV_ELEMENT_HTML"]?><?
if (!empty($arParams["FILES"]["VALUE"]) && $arParams["FILES"]["SHOW"] != "N")
{
?>
<div class="feed-add-post-files-block">
	<div class="feed-add-post-files-title feed-add-post-p"><?=GetMessage("MPF_FILES")?></div>
	<div class="feed-add-post-files-list-wrap">
		<div class="feed-add-photo-block-wrap" id="post-form-files">
			<?=implode($arParams["FILES"]["VALUE_HTML"])?>
		</div>
	</div>
</div>
<?
}
?>
</div>