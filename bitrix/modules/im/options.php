<?php
if(!$USER->IsAdmin())
	return;

global $MESS;
include(GetLangFileName($GLOBALS['DOCUMENT_ROOT'].'/bitrix/modules/im/lang/', '/options.php'));
IncludeModuleLangFile($_SERVER['DOCUMENT_ROOT'].BX_ROOT.'/modules/main/options.php');

$module_id = 'im';
CModule::IncludeModule($module_id);

$MOD_RIGHT = $APPLICATION->GetGroupRight($module_id);

if (CIMConvert::ConvertCount() > 0)
{
	$aMenu = array(
		array(
			"TEXT"=>GetMessage("IM_OPTIONS_CONVERT"),
			"LINK"=>"im_convert.php?lang=".LANGUAGE_ID,
			"TITLE"=>GetMessage("IM_OPTIONS_CONVERT_TITLE"),
		),
	);
	$context = new CAdminContextMenu($aMenu);
	$context->Show();
}


$arDefaultValues['default'] = array(
	'path_to_user_profile' => (IsModuleInstalled("intranet") ? '/company/personal/user/#user_id#/':'/club/user/#user_id#/'),
	'user_name_template' => "#LAST_NAME# #NAME#"
);
$arDefaultValues['extranet'] = array(
	'path_to_user_profile' => '/extranet/contacts/personal/user/#user_id#/',
	'user_name_template' => "#LAST_NAME# #NAME#"
);

$dbSites = CSite::GetList(($b = ""), ($o = ""), Array("ACTIVE" => "Y"));
$arSites = array();
$aSubTabs = array();
while ($site = $dbSites->Fetch())
{
	$site["ID"] = htmlspecialcharsbx($site["ID"]);
	$site["NAME"] = htmlspecialcharsbx($site["NAME"]);
	$arSites[] = $site;

	$aSubTabs[] = array("DIV" => "opt_site_".$site["ID"], "TAB" => "(".$site["ID"].") ".$site["NAME"], 'TITLE' => '');
}
$subTabControl = new CAdminViewTabControl("subTabControl", $aSubTabs);

$aTabs = array(
	array(
		"DIV" => "edit1", "TAB" => GetMessage("IM_TAB_SETTINGS"), "ICON" => "im_path", "TITLE" => GetMessage("IM_TAB_TITLE_SETTINGS"),
	),
);
$tabControl = new CAdminTabControl("tabControl", $aTabs);

if(strlen($_POST['Update'].$_GET['RestoreDefaults'])>0 && check_bitrix_sessid())
{
	if(strlen($_GET['RestoreDefaults'])>0)
	{
		COption::RemoveOption("im", "turn_server_self");
		COption::RemoveOption("im", "turn_server");
		COption::RemoveOption("im", "turn_server_firefox");
		COption::RemoveOption("im", "turn_server_login");
		COption::RemoveOption("im", "turn_server_password");
		foreach($arSites as $site)
		{
			$arDefValues = $site["LID"] == 'ex'? $arDefaultValues['extranet']: $arDefaultValues['default'];
			foreach($arDefValues as $key=>$value)
			{
				if (in_array($key, Array("user_name_template")))
					COption::RemoveOption("im", $key);
				else
					COption::SetOptionString("im", $key, $value, false, $site["LID"]);
			}
		}
	}
	elseif(strlen($_POST['Update'])>0)
	{
		foreach($arSites as $site)
		{
			foreach($arDefaultValues['default'] as $key=>$value)
			{
				if (isset($_POST[$key."_".$site["LID"]]))
				{
					if (empty($_POST[$key."_".$site["LID"]]) && ($key == "user_name_template"))
						COption::RemoveOption("im", "user_name_template", $site["LID"]);
					else
						COption::SetOptionString("im", $key, $_POST[$key."_".$site["LID"]], false, $site["LID"]);
				}
			}
		}
		COption::SetOptionString("im", "turn_server_self", isset($_POST["TURN_SERVER_SELF"])? 'Y': 'N');
		if (isset($_POST["TURN_SERVER_SELF"]))
		{
			COption::SetOptionString("im", "turn_server", $_POST["TURN_SERVER"]);
			COption::SetOptionString("im", "turn_server_firefox", $_POST["TURN_SERVER_FIREFOX"]);
			COption::SetOptionString("im", "turn_server_login", $_POST["TURN_SERVER_LOGIN"]);
			COption::SetOptionString("im", "turn_server_password", $_POST["TURN_SERVER_PASSWORD"]);
		}
		else
		{
			COption::RemoveOption("im", "turn_server");
			COption::RemoveOption("im", "turn_server_firefox");
			COption::RemoveOption("im", "turn_server_login");
			COption::RemoveOption("im", "turn_server_password");
		}

		if(strlen($Update)>0 && strlen($_REQUEST["back_url_settings"])>0)
		{
			LocalRedirect($_REQUEST["back_url_settings"]);
		}
		else
		{
			LocalRedirect($APPLICATION->GetCurPage()."?mid=".urlencode($mid)."&lang=".urlencode(LANGUAGE_ID)."&back_url_settings=".urlencode($_REQUEST["back_url_settings"])."&".$tabControl->ActiveTabParam());
		}
	}
}
?>
<form method="post" action="<?echo $APPLICATION->GetCurPage()?>?mid=<?=htmlspecialcharsbx($mid)?>&lang=<?echo LANG?>">
<?php echo bitrix_sessid_post()?>
<?php
$tabControl->Begin();
$tabControl->BeginNextTab();
$selfVideoServer = COption::GetOptionString("im", "turn_server_self") == 'Y' && IsModuleInstalled('intranet')? true: false;
?>
	<tr <?if (!IsModuleInstalled('intranet')):?>style="display: none"<?endif;?>>
		<td class="adm-detail-content-cell-l" width="40%"><?=GetMessage("IM_OPTIONS_TURN_SERVER_SELF")?>:</td>
		<td class="adm-detail-content-cell-r" width="60%"><input type="checkbox" onclick="toogleVideoOptions(this)" name="TURN_SERVER_SELF" <?=($selfVideoServer?'checked="checked"' :'')?>></td>
	</tr>
	<tr id="video_group_2" <?if (!$selfVideoServer):?>style="display: none"<?endif;?>>
		<td class="adm-detail-content-cell-l"><?=GetMessage("IM_OPTIONS_TURN_SERVER")?>:</td>
		<td class="adm-detail-content-cell-r"><input type="input" size="40" value="<?=htmlspecialcharsbx(COption::GetOptionString("im", "turn_server"))?>" name="TURN_SERVER"></td>
	</tr>
	<tr id="video_group_3" <?if (!$selfVideoServer):?>style="display: none"<?endif;?>>
		<td class="adm-detail-content-cell-l"><?=GetMessage("IM_OPTIONS_TURN_SERVER_FIREFOX")?>:</td>
		<td class="adm-detail-content-cell-r"><input type="input" size="40" value="<?=htmlspecialcharsbx(COption::GetOptionString("im", "turn_server_firefox"))?>" name="TURN_SERVER_FIREFOX"></td>
	</tr>
	<tr id="video_group_4" <?if (!$selfVideoServer):?>style="display: none"<?endif;?>>
		<td class="adm-detail-content-cell-l"><?=GetMessage("IM_OPTIONS_TURN_SERVER_LOGIN")?>:</td>
		<td class="adm-detail-content-cell-r"><input type="input" size="20" value="<?=htmlspecialcharsbx(COption::GetOptionString("im", "turn_server_login"))?>" name="TURN_SERVER_LOGIN"></td>
	</tr>
	<tr id="video_group_5" <?if (!$selfVideoServer):?>style="display: none"<?endif;?>	>
		<td class="adm-detail-content-cell-l"><?=GetMessage("IM_OPTIONS_TURN_SERVER_PASSWORD")?>:<br><small>(<?=GetMessage("IM_OPTIONS_TURN_SERVER_PASSWORD_HINT")?>)</small></td>
		<td class="adm-detail-content-cell-r"><input type="input" size="20" value="<?=htmlspecialcharsbx(COption::GetOptionString("im", "turn_server_password"))?>" name="TURN_SERVER_PASSWORD"></td>
	</tr>
	<tr>
		<td align="right"></td>
		<td></td>
	</tr>
	<tr>
		<td colspan="2">
<?php
$subTabControl->Begin();
foreach ($arSites as $site)
{
	$subTabControl->BeginNextTab();
?>
	<table width="75%" align="center">
<?php
	$arDefValues = $site["LID"] == 'ex'? $arDefaultValues['extranet']: $arDefaultValues['default'];
	foreach($arDefValues as $key=>$value)
	{
		if ($key == "user_name_template")
		{
	?>
		<tr>
			<td align ="right" valign="middle" width="50%"><?=GetMessage("IM_OPTIONS_NAME_TEMPLATE");?>:</td>
			<td>
				<?$curVal = COption::GetOptionString("im", "user_name_template", "#LAST_NAME# #NAME#", $site["LID"]);?>
				<select name="<?php echo $key?>_<?php echo $site["LID"]?>">
					<?
					$arNameTemplates = CSite::GetNameTemplates();
					$arNameTemplates = array_reverse($arNameTemplates, true); //prepend array with default '' => Site Format value
					$arNameTemplates[""] = GetMessage("IM_OPTIONS_NAME_IN_SITE_FORMAT");
					$arNameTemplates = array_reverse($arNameTemplates, true);
					foreach ($arNameTemplates as $template => $phrase)
					{
						$template = str_replace(array("#NOBR#","#/NOBR#"), array("",""), $template);
						?><option value="<?= $template?>" <?=(($template == $curVal) ? " selected" : "")?> ><?= $phrase?></option><?
					}
					?>
				</select>
			</td>
		</tr>
	<?
		}
		else
		{
?>
		<tr>
			<td align="right"><?php echo GetMessage("IM_OPTIONS_".strtoupper($key))?>:</td>
			<td><input type="text" size="40" value="<?=htmlspecialcharsbx(COption::GetOptionString("im", $key, $value, $site["LID"]))?>" name="<?php echo $key?>_<?php echo $site["LID"]?>"></td>
		</tr>

<?php
		}
	}
?>
	</table>
<?php
}
$subTabControl->End();
?>
		</td>
	</tr>
<?$tabControl->Buttons();?>
<script language="JavaScript">
function toogleVideoOptions(el)
{
	BX.style(BX('video_group_2'), 'display', el.checked? 'table-row': 'none');
	BX.style(BX('video_group_3'), 'display', el.checked? 'table-row': 'none');
	BX.style(BX('video_group_4'), 'display', el.checked? 'table-row': 'none');
	BX.style(BX('video_group_5'), 'display', el.checked? 'table-row': 'none');

}
function RestoreDefaults()
{
	if(confirm('<?echo AddSlashes(GetMessage('MAIN_HINT_RESTORE_DEFAULTS_WARNING'))?>'))
		window.location = "<?echo $APPLICATION->GetCurPage()?>?RestoreDefaults=Y&lang=<?echo LANG?>&mid=<?echo urlencode($mid)."&".bitrix_sessid_get();?>";
}
</script>
<input type="submit" name="Update" <?if ($MOD_RIGHT<'W') echo "disabled" ?> value="<?echo GetMessage('MAIN_SAVE')?>">
<input type="reset" name="reset" value="<?echo GetMessage('MAIN_RESET')?>">
<?=bitrix_sessid_post();?>
<input type="button" <?if ($MOD_RIGHT<'W') echo "disabled" ?> title="<?echo GetMessage('MAIN_HINT_RESTORE_DEFAULTS')?>" OnClick="RestoreDefaults();" value="<?echo GetMessage('MAIN_RESTORE_DEFAULTS')?>">
<?$tabControl->End();?>
</form>