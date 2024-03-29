<?
global $MESS;
$PathInstall = str_replace("\\", "/", __FILE__);
$PathInstall = substr($PathInstall, 0, strlen($PathInstall)-strlen("/index.php"));

IncludeModuleLangFile($PathInstall."/install.php");

if(class_exists("pull")) return;

Class pull extends CModule
{
	var $MODULE_ID = "pull";
	var $MODULE_VERSION;
	var $MODULE_VERSION_DATE;
	var $MODULE_NAME;
	var $MODULE_DESCRIPTION;
	var $MODULE_GROUP_RIGHTS = "Y";

	function pull()
	{
		$arModuleVersion = array();

		$path = str_replace("\\", "/", __FILE__);
		$path = substr($path, 0, strlen($path) - strlen("/index.php"));
		include($path."/version.php");

		if (is_array($arModuleVersion) && array_key_exists("VERSION", $arModuleVersion))
		{
			$this->MODULE_VERSION = $arModuleVersion["VERSION"];
			$this->MODULE_VERSION_DATE = $arModuleVersion["VERSION_DATE"];
		}
		else
		{
			$this->MODULE_VERSION = PULL_VERSION;
			$this->MODULE_VERSION_DATE = PULL_VERSION_DATE;
		}

		$this->MODULE_NAME = GetMessage("PULL_MODULE_NAME");
		$this->MODULE_DESCRIPTION = GetMessage("PULL_MODULE_DESCRIPTION");
	}

	function DoInstall()
	{
		$this->InstallFiles();
		$this->InstallDB();
		$GLOBALS['APPLICATION']->IncludeAdminFile(GetMessage("PULL_INSTALL_TITLE"), $_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/pull/install/step1.php");
	}

	function InstallDB()
	{
		global $DB, $APPLICATION;

		$this->errors = false;
		if(!$DB->Query("SELECT 'x' FROM b_pull_stack", true))
			$this->errors = $DB->RunSQLBatch($_SERVER['DOCUMENT_ROOT']."/bitrix/modules/pull/install/db/".strtolower($DB->type)."/install.sql");

		if($this->errors !== false)
		{
			$APPLICATION->ThrowException(implode("", $this->errors));
			return false;
		}

		RegisterModule("pull");
		RegisterModuleDependences("main", "OnProlog", "main", "", "", 3, "/modules/pull/ajax_hit.php");
		RegisterModuleDependences("perfmon", "OnGetTableSchema", "pull", "CPullTableSchema", "OnGetTableSchema");
		RegisterModuleDependences("main", "OnAfterRegisterModule", "pull", "CPullOptions", "ClearCheckCache");
		RegisterModuleDependences("main", "OnAfterUnRegisterModule", "pull", "CPullOptions", "ClearCheckCache");

		COption::SetOptionString("pull", "path_to_listener", (CMain::IsHTTPS() ? "https" : "http")."://#DOMAIN#".(CMain::IsHTTPS() ? ":8894" : ":8893").'/bitrix/sub/');
		COption::SetOptionString("pull", "path_to_websocket", (CMain::IsHTTPS() ? "wss" : "ws")."://#DOMAIN#".(CMain::IsHTTPS() ? ":8894" : ":8893").'/bitrix/subws/');
		COption::SetOptionString("pull", "path_to_publish", 'http://127.0.0.1:8895/bitrix/pub/');
		COption::SetOptionString("pull", "websocket", 'N');
		COption::SetOptionString("pull", "nginx", 'N');
		COption::SetOptionString("pull", "push", 'N');

		CAgent::AddAgent("CPullOptions::ClearAgent();", "pull", "N", 30, "", "Y", ConvertTimeStamp(time()+CTimeZone::GetOffset()+30, "FULL"));

		return true;
	}

	function InstallFiles()
	{
		if($_ENV['COMPUTERNAME']!='BX')
		{
			CopyDirFiles($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/pull/install/js", $_SERVER["DOCUMENT_ROOT"]."/bitrix/js", true, true);
			CopyDirFiles($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/pull/install/components", $_SERVER["DOCUMENT_ROOT"]."/bitrix/components", true, true);
		}
		return true;
	}

	function DoUninstall()
	{
		global $DOCUMENT_ROOT, $APPLICATION, $step;
		$step = IntVal($step);
		if($step<2)
		{
			$APPLICATION->IncludeAdminFile(GetMessage("PULL_UNINSTALL_TITLE"), $DOCUMENT_ROOT."/bitrix/modules/pull/install/unstep1.php");
		}
		elseif($step==2)
		{
			$this->UnInstallDB(array("savedata" => $_REQUEST["savedata"]));
			$this->UnInstallFiles();
			$APPLICATION->IncludeAdminFile(GetMessage("PULL_UNINSTALL_TITLE"), $DOCUMENT_ROOT."/bitrix/modules/pull/install/unstep2.php");
		}
	}

	function UnInstallDB($arParams = Array())
	{
		global $APPLICATION, $DB, $errors;

		$this->errors = false;

		if (!$arParams['savedata'])
			$this->errors = $DB->RunSQLBatch($_SERVER['DOCUMENT_ROOT']."/bitrix/modules/pull/install/db/".strtolower($DB->type)."/uninstall.sql");

		$arSQLErrors = Array();
		if(is_array($this->errors))
			$arSQLErrors = array_merge($arSQLErrors, $this->errors);

		if(!empty($arSQLErrors))
		{
			$this->errors = $arSQLErrors;
			$APPLICATION->ThrowException(implode("", $arSQLErrors));
			return false;
		}

		UnRegisterModuleDependences("main", "OnAfterRegisterModule", "pull", "CPullOptions", "ClearCheckCache");
		UnRegisterModuleDependences("main", "OnAfterUnRegisterModule", "pull", "CPullOptions", "ClearCheckCache");
		UnRegisterModuleDependences("perfmon", "OnGetTableSchema", "pull", "CPullTableSchema", "OnGetTableSchema");
		UnRegisterModuleDependences("main", "OnProlog", "main", "", "", "/modules/pull/ajax_hit.php");
		UnRegisterModule("pull");

		return true;
	}

	function UnInstallFiles($arParams = array())
	{
		return true;
	}
}
?>