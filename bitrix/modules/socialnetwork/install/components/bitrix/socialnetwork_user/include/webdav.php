<?if(!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true)die();
if (!CModule::IncludeModule("webdav")):
	ShowError(GetMessage("SONET_WD_MODULE_IS_NOT_INSTALLED"));
	return 0;
elseif (!CModule::IncludeModule("iblock")):
	ShowError(GetMessage("SONET_IB_MODULE_IS_NOT_INSTALLED"));
	return 0;
endif;

if (!function_exists("__wd_replace_user_and_groups"))
{
	function __wd_replace_user_and_groups(&$val, $key, $params = array())
	{
		if ($val == 1)
			$val = $params["moderator"];
		elseif ($val == "user_1")
			$val = "user_".$params["owner"];
		elseif ($key == "MailText")
		{
			$val = str_replace(
				"/company/personal/bizproc/{=Workflow:id}/",
				$params["path"],
				$val);
		}
		return true;
	}
}

if (!function_exists("__wd_create_default_bp_user_and_groups"))
{
	function __wd_create_default_bp_user_and_groups($arr)
	{
		if($handle = opendir($_SERVER['DOCUMENT_ROOT'].'/'.BX_ROOT.'/modules/bizproc/templates'))
		{
			$documentType = array("webdav", "CIBlockDocumentWebdavSocnet", $arr["document_type"]);

			while(false !== ($file = readdir($handle)))
			{
				if(!is_file($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/bizproc/templates/'.$file))
				{
					continue;
				}


				$arFields = false;
				include($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/bizproc/templates/'.$file);
				if(is_array($arFields))
				{
					$arFields["DOCUMENT_TYPE"] = $documentType;
					$arFields["SYSTEM_CODE"] = $file;
					$arFields["USER_ID"]	= $GLOBALS['USER']->GetID();
					array_walk_recursive($arFields["TEMPLATE"], "__wd_replace_user_and_groups", $arr);
					if ($file == "status.php")
					{
						$arFields["AUTO_EXECUTE"] = CBPDocumentEventType::Create;
						if (!empty($arFields["PARAMETERS"]) && !empty($arFields["PARAMETERS"]["Approvers"]))
						{
							$name = "";
							if ($GLOBALS["USER"]->IsAuthorized() && $arr["owner"] == $GLOBALS["USER"]->GetID())
							{
								$name = trim($GLOBALS["USER"]->GetFirstName()." ".$GLOBALS["USER"]->GetLastName());
								$name = (empty($name) ? $GLOBALS["USER"]->GetLogin() : $name);
							}
							else
							{
								$dbUser = CUser::GetByID($arr["owner"]);
								$arUser = $dbUser->Fetch();
								$name = trim($arUser["NAME"]." ".$arUser["LAST_NAME"]);
								$name = (empty($name) ? $arUser["LOGIN"] : $name);
							}

							$arFields["PARAMETERS"]["Approvers"]["Default"] = $name.' ['.$arr["owner"].']';
						}
					}

					try
					{
						CBPWorkflowTemplateLoader::Add($arFields);
					}
					catch (Exception $e)
					{
					}
				}
			}
			closedir($handle);
		}
	}
}

$file = trim(preg_replace("'[\\\\/]+'", "/", (dirname(__FILE__)."/../lang/".LANGUAGE_ID."/include/webdav.php")));

__IncludeLang($file);

$object = (strPos($componentPage, "group_files")!== false ? "group" : "user");
/********************************************************************
				Input params
********************************************************************/
/***************** BASE ********************************************/
$arParams["IBLOCK_TYPE"] = intVal($object == "user" ? $arParams["FILES_USER_IBLOCK_TYPE"] : $arParams["FILES_GROUP_IBLOCK_TYPE"]);
$arParams["IBLOCK_ID"] = intVal($object == "user" ? $arParams["FILES_USER_IBLOCK_ID"] : $arParams["FILES_GROUP_IBLOCK_ID"]);
$arParams['USE_AUTH'] = ($arParams['FILES_USE_AUTH'] == "Y" ? "Y" : "N");
$arParams["NAME_FILE_PROPERTY"] = strToupper(trim(empty($arParams["FILE_NAME_FILE_PROPERTY"]) ? "FILE" : $arParams["FILE_NAME_FILE_PROPERTY"]));
$arParams["FILES_PATH_TO_SMILE"] = (!empty($arParams["PATH_TO_FORUM_SMILE"]) ? $arParams["PATH_TO_FORUM_SMILE"] : "/bitrix/images/forum/smile/");
$arResult['BASE_URL'] = ($object == "user" ? $arParams["FILES_USER_BASE_URL"] : $arParams["FILES_GROUP_BASE_URL"]);
if ($arParams["SEF_MODE"] == "Y"):
	$arResult['BASE_URL'] = ($object == "user" ? $arResult["PATH_TO_USER_FILES"] : $arResult["PATH_TO_GROUP_FILES"]);
endif;	
$arResult['BASE_URL'] = rtrim(str_replace(
	array("#user_id#", "#group_id#", "#path#"),
	array($arResult["VARIABLES"]["user_id"], $arResult["VARIABLES"]["group_id"], ""), $arResult['BASE_URL']), '/');
/***************** ADDITIONAL **************************************/
$arParams["SET_NAV_CHAIN"] = ($arParams["SET_NAV_CHAIN"] == "N" ? "N" : "Y");

if ($object == 'user')
	CIBlockWebdavSocnet::UserERights($arParams['IBLOCK_ID']);
elseif ($object == 'group')
	CIBlockWebdavSocnet::GroupERights($arParams['IBLOCK_ID']);

$res = CIBlockWebdavSocnet::GetUserMaxPermission(
	$object,
	($object == "user" ? $arResult["VARIABLES"]["user_id"] : $arResult["VARIABLES"]["group_id"]),
	$USER->GetID(),
	$arParams['IBLOCK_ID']
);
$arParams["PERMISSION"] = $res["PERMISSION"];
$arParams["CHECK_CREATOR"] = $res["CHECK_CREATOR"];
$arParams["STR_TITLE"] = GetMessage("SONET_FILES");
$arParams["SHOW_WEBDAV"] = "Y";
/********************************************************************
				/Input params
********************************************************************/

$arError = array();

/********************************************************************
				Check Socnet Permission and Main Data
********************************************************************/
/************** Can View *******************************************/
if ($arParams["PERMISSION"] < "R"):
	$arError[] = array(
		"id" => "access_denied",
		"text" => GetMessage("SONET_ACCESS_DENIED"));
/************** Active Feature *************************************/
elseif ((
		$object == "user"
		&&
		!CSocNetFeatures::IsActiveFeature(
			SONET_ENTITY_USER,
			$arResult["VARIABLES"]["user_id"],
			"files")
	)
	||
	(
		$object == "group"
		&&
		!CSocNetFeatures::IsActiveFeature(
			SONET_ENTITY_GROUP,
			$arResult["VARIABLES"]["group_id"],
			"files")
	)):
	$arError[] = array(
		"id" => "fiture_is_not_active",
		"text" => GetMessage("SONET_FILES_IS_NOT_ACTIVE"));
/************** Check Iblock ID ************************************/
elseif (($object == "user" && $arParams["FILES_USER_IBLOCK_ID"] <= 0) ||
	($object == "group" && $arParams["FILES_GROUP_IBLOCK_ID"] <= 0)):
	$arError[] = array(
		"id" => "iblock_id_empty",
		"text" => GetMessage("SONET_IBLOCK_ID_EMPTY"));
elseif ($arParams["USE_AUTH"] == "Y" && 
	(CWebDavBase::IsDavHeaders() || ($_SERVER['REQUEST_METHOD'] != "GET" && $_SERVER['REQUEST_METHOD'] != "POST")) &&
	!$USER->IsAuthorized()):
	$APPLICATION->RestartBuffer();
	CWebDavBase::SetAuthHeader();
	header('Content-length: 0');
	die();
endif;

/************** Set Page Title or Add Navigation *******************/
if ($arParams["SET_NAV_CHAIN"] == "Y" || $arParams["SET_TITLE"] == "Y")
{

	$strTitle = "";
	if($object == "group")
	{
		$arResult["GROUP"] = $arGroup = CSocNetGroup::GetByID($arResult["VARIABLES"]["group_id"]);
		$db_res = CSocNetFeatures::GetList(
			array(),
			array(
				"ENTITY_ID" => $arResult["GROUP"]["ID"],
				"ENTITY_TYPE" => SONET_ENTITY_GROUP,
				"FEATURE" => "files"));
		if ($db_res && $arResult["GROUP"]["FEATURE"] = $db_res->GetNext()):
			$arParams["STR_TITLE"] = $arResult["GROUP"]["FEATURE"]["FEATURE_NAME"] = (empty($arResult["GROUP"]["FEATURE"]["FEATURE_NAME"]) ?
				$arParams["STR_TITLE"] : $arResult["GROUP"]["FEATURE"]["FEATURE_NAME"]);
		else:
			$arResult["GROUP"]["FEATURE"] = array(
				"FEATURE_NAME" => $arParams["STR_TITLE"]);
		endif;

		$strTitle = $arGroup["~NAME"].": ".$arParams["STR_TITLE"];
		if ($arParams["SET_NAV_CHAIN"] == "Y")
		{
			$APPLICATION->AddChainItem($arGroup["NAME"], CComponentEngine::MakePathFromTemplate($arResult["PATH_TO_GROUP"],
				array("group_id" => $arGroup["ID"])));
			$APPLICATION->AddChainItem($arParams["STR_TITLE"], CComponentEngine::MakePathFromTemplate($arResult["PATH_TO_GROUP_FILES"],
				array("group_id" => $arGroup["ID"], "path" => "")));
		}
	}
	else
	{
		if (strlen($arParams["NAME_TEMPLATE"]) <= 0)
			$arParams["NAME_TEMPLATE"] = CSite::GetNameFormat();

		$arParams["TITLE_NAME_TEMPLATE"] = str_replace(
			array("#NOBR#", "#/NOBR#"),
			array("", ""),
			$arParams["NAME_TEMPLATE"]
		);
		$bUseLogin = $arParams['SHOW_LOGIN'] != "N" ? true : false;

		$name = "";
		if ($USER->IsAuthorized() && $arResult["VARIABLES"]["user_id"] == $USER->GetID())
		{
			$arTmpUser = array(
				"NAME" => $USER->GetFirstName(),
				"LAST_NAME" => $USER->GetLastName(),
				"SECOND_NAME" => $USER->GetParam("SECOND_NAME"),
				"LOGIN" => $USER->GetLogin(),
			);
			$name = CUser::FormatName($arParams['TITLE_NAME_TEMPLATE'], $arTmpUser, $bUseLogin);
		}
		else
		{
			$dbUser = CUser::GetByID($arResult["VARIABLES"]["user_id"]);
			$arUser = $dbUser->Fetch();
			$name = CUser::FormatName($arParams['TITLE_NAME_TEMPLATE'], $arUser, $bUseLogin);
		}
		$arResult["USER"] = array(
			"ID" => $arResult["VARIABLES"]["user_id"],
			"NAME" => $name);
		$db_res = CSocNetFeatures::GetList(
			array(),
			array(
				"ENTITY_ID" => $arResult["USER"]["ID"],
				"ENTITY_TYPE" => SONET_ENTITY_USER,
				"FEATURE" => "files"));
		if ($db_res && $arResult["USER"]["FEATURE"] = $db_res->GetNext()):
			$arParams["STR_TITLE"] = $arResult["USER"]["FEATURE"]["FEATURE_NAME"] = (empty($arResult["USER"]["FEATURE"]["FEATURE_NAME"]) ?
				$arParams["STR_TITLE"] : $arResult["USER"]["FEATURE"]["FEATURE_NAME"]);
		else:
			$arResult["USER"]["FEATURE"] = array(
				"FEATURE_NAME" => $arParams["STR_TITLE"]);
		endif;


		$name = trim($name);
		$strTitle = $name.": ".$arParams["STR_TITLE"];
		if ($arParams["SET_NAV_CHAIN"] == "Y")
		{
			$APPLICATION->AddChainItem($name, CComponentEngine::MakePathFromTemplate($arResult["PATH_TO_USER"],
				array("user_id" => $arResult["VARIABLES"]["user_id"])));
			$APPLICATION->AddChainItem($arParams["STR_TITLE"], CComponentEngine::MakePathFromTemplate($arResult["PATH_TO_USER_FILES"],
					array("user_id" => $arResult["VARIABLES"]["user_id"], "path" => "")));
		}
	}
	if ($arParams["SET_TITLE"] == "Y")
	{
		$APPLICATION->SetTitle($strTitle);
		if ($componentPage == "user_files" && (empty($arResult["VARIABLES"]["path"]) || $arResult["VARIABLES"]["path"] == "index.php"))
			$arParams["SET_TITLE"] = "N";
	}
}

if (!empty($arError))
{
	$e = new CAdminException($arError);
	$arParams["ERROR_MESSAGE"] = $e->GetString();
	return -1;
}
/********************************************************************
				/Check Socnet Permission and Main Data
********************************************************************/

/********************************************************************
				Default params
********************************************************************/
define("WEBDAV_SETTINGS_LIMIT_INCLUDE", "Y");
$file = trim(preg_replace("'[\\\\/]+'", "/", (dirname(__FILE__)."/webdav_settings.php")));
require_once($file);

/************** Path ***********************************************/
$sBaseUrl = $APPLICATION->GetCurDir();
$arParsedUrl = parse_url($_SERVER['REQUEST_URI']);
$page = ($arParsedUrl ? $arParsedUrl['path'] : $_SERVER['REQUEST_URI']);
/************** Initial object *************************************/
$arParams["DOCUMENT_TYPE"] = array("webdav", "CIBlockDocumentWebdavSocnet", "iblock_".$arParams["IBLOCK_ID"]."_".$object."_".
		intVal($object == "user" ? $arResult["VARIABLES"]["user_id"] : $arResult["VARIABLES"]["group_id"]));

$arBizProcParameters = array(
	"object" => $object,
	"owner" => ($object == "user" ? $arResult["VARIABLES"]["user_id"] : $arResult["GROUP"]["OWNER_ID"]),
	"moderator" => strtolower($object == "user" ? SONET_RELATIONS_TYPE_NONE : SONET_ROLES_MODERATOR),
	"path" => ($object == "user" ? $arResult["PATH_TO_USER_FILES_WEBDAV_BIZPROC_VIEW"] : $arResult["PATH_TO_GROUP_FILES_WEBDAV_BIZPROC_VIEW"]),
	"document_type" => $ob->wfParams['DOCUMENT_TYPE'][2]);
$user_id_str = (intVal($arResult["VARIABLES"]["user_id"]) > 0 ? $arResult["VARIABLES"]["user_id"] : $GLOBALS["USER"]->GetId());
$arBizProcParameters["path"] = str_replace(
	array(
		"#user_id#",
		"#group_id#",
		"#element_id#"),
	array(
		$user_id_str,
		$arResult["VARIABLES"]["group_id"],
		"{=Document:ID}"),
	$arBizProcParameters["path"]);
/************** Root Section ***************************************/


$arParams["ROOT_SECTION_ID"] = __wd_get_root_section(
	$arParams["IBLOCK_ID"],
	$object,
	(($object=='user') ? $arResult["VARIABLES"]["user_id"] : $arResult["VARIABLES"]["group_id"])
);

/*if ($arParams["ROOT_SECTION_ID"] === true) // created new section
{
	BXClearCache(true, $ob->CACHE_PATH);
	LocalRedirect($APPLICATION->GetCurPageParam("", array("create_lib", "sessid")));
}*/

if ($object == "user")
{
	CIBlockWebdavSocnet::CreateSharedFolder(
		$arParams["IBLOCK_ID"],
		$arParams["ROOT_SECTION_ID"],
		$arResult["VARIABLES"]["user_id"]
	);
}

$arParams["OBJECT"] = $ob = new CWebDavIblock($arParams['IBLOCK_ID'], $arResult['BASE_URL'], 
	$arParams + array(
		"SHORT_PATH_TEMPLATE" => "/".($object == "user" ? $arDefaultUrlTemplates404["user_files_short"] : $arDefaultUrlTemplates404["group_files_short"]),
		"ATTRIBUTES" => ($object == "user" ? array('user_id' => $arResult["VARIABLES"]["user_id"]) : array('group_id' => $arResult["VARIABLES"]["group_id"]))
	));

if ($arParams["ROOT_SECTION_ID"] === true) // created new section
{
	BXClearCache(true, $ob->CACHE_PATH);
	LocalRedirect($APPLICATION->GetCurPageParam("", array("create_lib", "sessid")));
}

if (!empty($ob->arError))
{
	$e = new CAdminException($ob->arError);
	$GLOBALS["APPLICATION"]->ThrowException($e);
	$res = $GLOBALS["APPLICATION"]->GetException();
	if ($res)
	{
		ShowError($res->GetString());
		return false;
	}
}
elseif ($ob->permission <= "D")
{
	ShowError(GetMessage("WD_ACCESS_DENIED"));
	return false;
}

//=====
if(class_exists("CWebDavExtLinks"))
{
if(array_key_exists("GetExtLink", $_REQUEST) && intval($_REQUEST["GetExtLink"]) == 1)
{
	CUtil::JSPostUnescape();
	CWebDavExtLinks::CheckSessID();
	CWebDavExtLinks::CheckRights($ob);
	$o = array();
	$o["PASSWORD"] = (array_key_exists("PASSWORD", $_REQUEST) ? $_REQUEST["PASSWORD"] : "");
	$o["LIFETIME_NUMBER"] = (array_key_exists("LIFETIME_NUMBER", $_REQUEST) ? intval($_REQUEST["LIFETIME_NUMBER"]) : 0);
	$o["LIFETIME_TYPE"] = (array_key_exists("LIFETIME_TYPE", $_REQUEST) ? $_REQUEST["LIFETIME_TYPE"] : "notlimited");
	$o["URL"] = $ob->_path;
	$o["BASE_URL"] = $arResult['BASE_URL'];
	$o["DESCRIPTION"] = (array_key_exists("DESCRIPTION", $_REQUEST) ? $_REQUEST["DESCRIPTION"] : "");
	$fileOptT = CWebDavExtLinks::GetFileOptions($ob);
	$o["F_SIZE"] = $fileOptT["F_SIZE"];
	CWebDavExtLinks::GetExtLink($arParams, $o);
}

if(!empty($_REQUEST['editInGoogle']))
{
	CUtil::JSPostUnescape();
	CWebDavExtLinks::CheckSessID();
	CWebDavExtLinks::CheckRights($ob);

	CModule::IncludeModule('socialservices');
	$socGoogleOAuth = new CSocServGoogleOAuth();
	$googleOAuth = CUtil::JSEscape($socGoogleOAuth->GetFormHtml(array('GET_URL' => true)));

	$oAuthManager = new CSocServAuthManager();
	$arServices = $oAuthManager->GetActiveAuthServices(array());//check active google oauth service
	$dbSocservUser = CSocServAuthDB::GetList(array(), array('EXTERNAL_AUTH_ID' => 'GoogleOAuth', 'USER_ID' => $USER->GetId()));
	$row = $dbSocservUser->Fetch();
	if(!$row || empty($row['OATOKEN']))
	{
		$APPLICATION->RestartBuffer();
		echo <<<HTML
<script type="text/javascript">
	window.location.href = "{$googleOAuth}";
</script>
HTML;
	}
	else
	{
		//todo drive edit
		//require_once $_SERVER['DOCUMENT_ROOT'].'/'.BX_ROOT.'/modules/drive/worker.php';
		$appID = trim(CSocServGoogleOAuth::GetOption("google_appid"));
		$appSecret = trim(CSocServGoogleOAuth::GetOption("google_appsecret"));

		$oauthCredentials = new OauthCredentials($row['OATOKEN'], '', time(), 3600, $appID, $appSecret);

		if(!empty($_REQUEST['commit']) && !empty($_REQUEST['id']))
		{

			$filename = CTempFile::GetFileName(uniqid('_wd'));
			CheckDirPath($filename);
			file_put_contents($_SERVER['DOCUMENT_ROOT'] . '/log_deb.txt', var_export('in commit', true), FILE_APPEND);
			$doc = downloadDoc($_REQUEST['id'], $ob->get_mime_type($ob->_path), $oauthCredentials);
			$a = removeDoc($_REQUEST['id'], $oauthCredentials);
			file_put_contents($filename, $doc['content']);
			$options = array(
				'new' => false,
				'FILE_NAME' => $ob->arParams['element_name'],
				'ELEMENT_ID' => $ob->arParams['item_id'],
				'TMP_FILE' => $filename,
			);

			global $DB;
			$DB->startTransaction();
			if (!$ob->put_commit($options))
			{
				$DB->rollback();
				@unlink($filename);
				//return false;
				$response = array('status' => 'error');
			}
			else
			{
				$DB->commit();
				$response = array('status' => 'success');
			}
			$APPLICATION->RestartBuffer();
			echo json_encode($response);
		}
		else
		{
			$opt = array('getContent' => true);
			$status = $ob->GET($opt);
			$response = publicDoc(array('name' => $APPLICATION->ConvertCharset($ob->arParams['element_name'], SITE_CHARSET, 'UTF-8'), 'content' => $opt['content']), $oauthCredentials);
			$googleIdDoc = CUtil::JSEscape($response['id']);
			$uriToDoc = CUtil::JSEscape($ob->uri . '?' . bitrix_sessid_get() . '&editInGoogle=1&start=1');
			$APPLICATION->RestartBuffer();
			echo CJSCore::GetHTML(array('ajax'));
					echo <<<HTML
			<script type="text/javascript">
				BX.ready(function(){
					window.onunload = function(){
						BX.ajax.loadJSON('{$uriToDoc}', {commit: 1, id: '{$googleIdDoc}'}, function(result){
							//todo catch error
							if(window.opener)
							{
								if(window.elementViewer)
								{
									window.elementViewer.show(window.elementViewer.getCurrent(), true);
								}
							}
						});
					};
				});
			</script>
			<iframe src={$response['link']} style="width: 100%; height: 100%;border: none;" onload=""></iframe>
HTML;

		}

	}
	die;
}
if(!empty($_REQUEST['showInViewer']))
{
	CUtil::JSPostUnescape();
	CWebDavExtLinks::CheckSessID();
	//alert to check_permissions
	$wdElement = $ob->GetObject(array('check_permissions' => false), false);
	if(!$ob->CheckWebRights('',  array('action' => 'read', 'arElement' => $wdElement), false))
	{
		$APPLICATION->RestartBuffer();
		echo json_encode(array(
			'error' => 'access_denied',
		));
		die;
	}

	if(!empty($_POST['checkViewByGoogle']))
	{
		$APPLICATION->RestartBuffer();
		echo json_encode(array(
			'viewByGoogle' => CWebDavExtLinks::getDownloadCountForLink($_POST['extLink']) > 0,
		));
		die;
	}

	$hash = CWebDavExtLinks::getHashLink(array(
				'IBLOCK_TYPE' => $ob->IBLOCK_TYPE,
				'IBLOCK_ID' => $ob->IBLOCK_ID,
				'ROOT_SECTION_ID' => $ob->arRootSection['ID']
			), array(
				'PASSWORD' => '',
				'LIFETIME_NUMBER' => CWebDavExtLinks::LIFETIME_TYPE_AUTO,
				'LIFETIME_TYPE' => 'minute',
				'URL' => $ob->_path,
				'BASE_URL' => $ob->base_url,
				'SINGLE_SESSION' => false,
				'LINK_TYPE' => CWebDavExtLinks::LINK_TYPE_AUTO,
			), null);

	if(!empty($_POST['json']))
	{
		$APPLICATION->RestartBuffer();
		echo json_encode(array(
			'file' => $APPLICATION->convertCharset($hash, LANG_CHARSET, 'UTF-8'),
			'viewerUrl' => $APPLICATION->convertCharset(CWebDavExtLinks::$urlGoogleViewer . $hash . '&embedded=true', LANG_CHARSET, 'UTF-8'),
		));
		die;
	}
}

if(array_key_exists("GetDialogDiv", $_REQUEST) && intval($_REQUEST["GetDialogDiv"]) == 1)
{
	CWebDavExtLinks::CheckSessID();
	CWebDavExtLinks::CheckRights($ob);
	CWebDavExtLinks::PrintDialogDiv($ob);
}

if(array_key_exists("DeleteLink", $_REQUEST) && strlen($_REQUEST["DeleteLink"]) > 0)
{
	CWebDavExtLinks::CheckSessID();
	CWebDavExtLinks::CheckRights($ob);
	CWebDavExtLinks::DeleteLink($_REQUEST["DeleteLink"]);
}

if(array_key_exists("DeleteAllLinks", $_REQUEST) && strlen($_REQUEST["DeleteAllLinks"]) > 0)
{
	CWebDavExtLinks::CheckSessID();
	CWebDavExtLinks::CheckRights($ob);
	CWebDavExtLinks::DeleteAllLinks($_REQUEST["DeleteAllLinks"], $ob);
}

}
//=====

$ob->file_prop = $arParams["NAME_FILE_PROPERTY"];
$ob->replace_symbols = ($arParams["REPLACE_SYMBOLS"] == "Y" ? true : false);

$arParams['WORKFLOW'] = $ob->workflow;
$arResult['CURRENT_PATH'] = $ob->_path;

$res = $ob->SetRootSection($arParams["ROOT_SECTION_ID"]); 

/********************************************************************
				/
********************************************************************/
if (($_SERVER['REQUEST_METHOD'] == 'POST' || $_SERVER['REQUEST_METHOD'] == 'GET') && !$ob->IsDavHeaders()) 
{
	if ($componentPage == "user_files" || $componentPage == "group_files")
	{
		$arResult["VARIABLES"]["SECTION_ID"] = 0;

		if ($arParams["SEF_MODE"] != "Y")
		{
			$res = explode("/", urldecode($_REQUEST["path"]));
			$result = array();
			foreach ($res as $r)
			{
				$result[] = urlencode($APPLICATION->ConvertCharset($r, SITE_CHARSET, 'UTF-8'));
			}
			$arResult["VARIABLES"]["PATH"] = implode("/", $result);
			$ob->SetPath("/".$arResult["VARIABLES"]["PATH"]);
		}

		$ob->IsDir(array('check_permissions' => false));
		if ($ob->arParams['is_file'])
		{
			$APPLICATION->RestartBuffer();
			$ob->base_GET();
			die();
		}
		elseif ($ob->arParams['is_dir'])
		{
			$arResult["VARIABLES"]["SECTION_ID"] = $ob->arParams["item_id"];
		}
	}
	elseif ($componentPage == "user_files_short" || $componentPage == "group_files_short")
	{
		if ($arResult["VARIABLES"]["element_id"] > 0)
		{
			$ob->IsDir(array("element_id" => $arResult["VARIABLES"]["element_id"]));
			if ($ob->arParams['is_file'])
			{
				$APPLICATION->RestartBuffer();
				$ob->base_GET();
				die();
			}
		}
		$arResult["VARIABLES"]["SECTION_ID"] = intval($arResult["VARIABLES"]["section_id"]);
		$componentPage = str_replace("_short", "", $componentPage);
	}
	elseif ($componentPage == "user_files_element_history_get" || $componentPage == "group_files_element_history_get")
	{
		$APPLICATION->RestartBuffer();
		$ob->SendHistoryFile($arResult["VARIABLES"]["element_id"], 0, false, $_REQUEST);
		die();
	}
	elseif ($componentPage == "user_files_webdav_bizproc_history_get" || $componentPage == "group_files_webdav_bizproc_history_get")
	{
		$APPLICATION->RestartBuffer();
		$ob->SendHistoryFile($arResult["VARIABLES"]["element_id"], $arResult["VARIABLES"]["id"]);
		die();
	}

	elseif (($componentPage == "user_files_section_edit" || $componentPage == "group_files_section_edit") &&
		strToUpper($_REQUEST["use_light_view"]) == "Y")
	{
		$componentPage .= "_simple";
	}
	elseif (($componentPage == "user_files_element_comment") || ($componentPage == "group_files_element_comment"))
	{
		$topicID = intval($arResult["VARIABLES"]['topic_id']);
		$messageID = intval($arResult["VARIABLES"]['message_id']);
		if (
			($topicID > 0) &&
			($messageID > 0) &&
			CModule::IncludeModule('forum')
		)
		{
			$dbMessage = CForumMessage::GetList(array(), array(
				'FORUM_ID' => $arParams['FILES_FORUM_ID'],
				'TOPIC_ID' => $topicID,
				'NEW_TOPIC' => 'Y',
				'PARAM1' => 'IB'
			));
			if ($dbMessage && $arMessage = $dbMessage->Fetch())
			{
				$elementID = intval($arMessage['PARAM2']);
				if ($elementID > 0)
				{
					// check if this iblock
					$dbElement = CIBlockElement::GetList(array(), array('ID' => $elementID), false, false, array('IBLOCK_ID'));
					if (
						$dbElement
						&& ($arElement = $dbElement->Fetch())
						&& ($arElement['IBLOCK_ID'] == $arParams['IBLOCK_ID'])
					)
					{
						$elementUrl = '';
						if (
							is_array($arResult['USER']) &&
							isset($arResult['USER']['ID'])
						)
						{
							$elementUrl = str_replace("#user_id#", $arResult['USER']['ID'], $arResult['PATH_TO_USER_FILES_ELEMENT']);
						}
						elseif (
							is_array($arResult['GROUP']) &&
							isset($arResult['GROUP']['ID'])
						)
						{
							$elementUrl = str_replace("#group_id#", $arResult['GROUP']['ID'], $arResult['PATH_TO_GROUP_FILES_ELEMENT']);
						}

						if (!empty($elementUrl))
						{
							$arParams["FORM_ID"] = "webdavForm".$arParams["IBLOCK_ID"];
							$elementUrl = str_replace('#element_id#', $elementID, $elementUrl);
							$elementUrl .= (strpos($elementUrl, '?') !== false ? '&' : '?');
							$elementUrl .= $arParams["FORM_ID"].'_active_tab=tab_comments';

							LocalRedirect($elementUrl);
						}
					}
				}
			}
		}
		LocalRedirect($arParams['SEF_FOLDER']);
	}
}
elseif ($ob->IsMethodAllow($_SERVER['REQUEST_METHOD'])) 
{
	$APPLICATION->RestartBuffer();
	$fn = 'base_' . $_SERVER['REQUEST_METHOD'];
	call_user_func(array(&$ob, $fn));
	die();
}
else
{
	CHTTP::SetStatus('405 Method not allowed');
	header('Allow: ' . join(',', array_keys($ob->allow)));
	$this->IncludeComponentTemplate('notallowed');
	return 1;
}

/********************************************************************
				/Default params
********************************************************************/
/********************************************************************
				Path
********************************************************************/
foreach ($arDefaultUrlTemplates404 as $url => $value)
{
	if (strPos($componentPage, "user_files") === false && strPos($componentPage, "group_files") === false &&
		strPos($componentPage, "bizproc") === false)
		continue;
	$user_id_str = (intVal($arResult["VARIABLES"]["user_id"]) > 0 ? $arResult["VARIABLES"]["user_id"] : $GLOBALS["USER"]->GetId());
	$arResult["~PATH_TO_".strToUpper($url)] = str_replace(
		array(
			"#user_id#",
			"#group_id#",
			"#path#",
			"#section_id#",
			"#element_id#",
			"#element_name#",
			"#action#",
			"#id#",
			"#task_id#"),
		array(
			$user_id_str,
			$arResult["VARIABLES"]["group_id"],
			"#PATH#",
			"#SECTION_ID#",
			"#ELEMENT_ID#",
			"#ELEMENT_NAME#",
			"#ACTION#",
			"#ID#",
			"#ID#"),
		$arResult["PATH_TO_".strToUpper($url)]);
}

if ($ob->workflow == 'bizproc' || $ob->workflow == 'bizproc_limited')
{
	$arResult["~PATH_TO_GROUP_FILES_ELEMENT_HISTORY"] = $arResult["~PATH_TO_GROUP_FILES_WEBDAV_BIZPROC_HISTORY"];
	$arResult["~PATH_TO_USER_FILES_ELEMENT_HISTORY"] = $arResult["~PATH_TO_USER_FILES_WEBDAV_BIZPROC_HISTORY"];
}

$arResult["~PATH_TO_USER"] = str_replace("#user_id#", "#USER_ID#", (empty($arResult["PATH_TO_USER"]) ? $arParams["PATH_TO_USER"] : $arResult["PATH_TO_USER"]));
$arResult["VARIABLES"]["ROOT_SECTION_ID"] = $arParams["ROOT_SECTION_ID"];
if (empty($arResult["VARIABLES"]["SECTION_ID"]))
	$arResult["VARIABLES"]["SECTION_ID"] = $arResult["VARIABLES"]["section_id"];
$arResult["VARIABLES"]["ELEMENT_ID"] = $arResult["VARIABLES"]["element_id"];
$arResult["VARIABLES"]["ID"] = $arResult["VARIABLES"]["id"];
$arResult["VARIABLES"]["ACTION"] = $arResult["VARIABLES"]["action"];
$arResult["VARIABLES"]["PERMISSION"] = $arParams["PERMISSION"];
$arResult["VARIABLES"]["CHECK_CREATOR"] = $arParams["CHECK_CREATOR"];
$arResult["VARIABLES"]["BASE_URL"] = $arResult['BASE_URL'];
$arResult["VARIABLES"]["STR_TITLE"] = $arParams["STR_TITLE"];
$arResult["VARIABLES"]["PAGE_NAME"] = strtoupper(str_replace(array("user_files_", "user_files", "group_files_", "group_files"), "", $componentPage));
$arResult["VARIABLES"]["PAGE_NAME"] = ($arResult["VARIABLES"]["PAGE_NAME"] == "" ? "SECTIONS" : $arResult["VARIABLES"]["PAGE_NAME"]);
$arResult["VARIABLES"]["MODULE_ID"] = $ob->wfParams['DOCUMENT_TYPE'][0];
$arResult["VARIABLES"]["ENTITY"] = $ob->wfParams['DOCUMENT_TYPE'][1]; 
$arResult["VARIABLES"]["DOCUMENT_TYPE"] = $ob->wfParams['DOCUMENT_TYPE'][2];
$arResult["VARIABLES"]["BIZPROC"] = array(
	"MODULE_ID" => $ob->wfParams['DOCUMENT_TYPE'][0],
	"ENTITY" => $ob->wfParams['DOCUMENT_TYPE'][1],
	"DOCUMENT_TYPE" => $ob->wfParams['DOCUMENT_TYPE'][2]);
$arResult["VARIABLES"]["NOTE"] = str_replace(
		"#HREF#",
		($object == "user" ? $arResult["~PATH_TO_USER_FILES_HELP"] : $arResult["~PATH_TO_GROUP_FILES_HELP"]),
		GetMessage("WD_HOW_TO_INCREASE_QUOTA"));

//$arResult["~PATH_TO_USER_FILES_BIZPROC_WORKFLOW_ADMIN"] = "";
//$arResult["~PATH_TO_USER_FILES_BIZPROC_WORKFLOW_EDIT"] = "";
/********************************************************************
				/Path
********************************************************************/
/********************************************************************
				Activity before
********************************************************************/
if (($componentPage == "group_photo_element_upload" || $componentPage == "group_files_element_upload" || 
	$componentPage == "user_photo_element_upload" || $componentPage == "user_files_element_upload") &&
	$_REQUEST["save_upload"] == "Y" && !isset($_REQUEST['AJAX_CALL']))
{
	$_REQUEST["FORMAT_ANSWER"] = "return";
	$arParams["ANSWER_UPLOAD_PAGE"] = array();
}
/********************************************************************
				/Activity before
********************************************************************/

return 1;
?>
