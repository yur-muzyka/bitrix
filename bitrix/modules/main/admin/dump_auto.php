<?php
/**
 * Bitrix Framework
 * @package bitrix
 * @subpackage main
 * @copyright 2001-2013 Bitrix
 */

/**
 * Bitrix vars
 * @global CUser $USER
 * @global CMain $APPLICATION
 * @global CDatabase $DB
 */

require_once($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/include/prolog_admin_before.php");
define("HELP_FILE", "utilities/dump_auto.php");

if(!$USER->CanDoOperation('edit_php'))
	$APPLICATION->AuthForm(GetMessage("ACCESS_DENIED"));

if(!defined("START_EXEC_TIME"))
	define("START_EXEC_TIME", microtime(true));

IncludeModuleLangFile(dirname(__FILE__).'/dump.php');

require_once($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/classes/general/backup.php");
$strBXError = '';
$bGzip = function_exists('gzcompress');
$bMcrypt = function_exists('mcrypt_encrypt');
$bBitrixCloud = $bMcrypt;
if (!CModule::IncludeModule('bitrixcloud'))
{
	$bBitrixCloud = false;
	$strBXError = GetMessage('ERR_NO_BX_CLOUD');
}
elseif (!CModule::IncludeModule('clouds'))
{
	$bBitrixCloud = false;
	$strBXError = GetMessage('ERR_NO_CLOUDS');
}

$bCron = COption::GetOptionString("main", "agents_use_crontab", "N") == 'Y' || defined('BX_CRONTAB_SUPPORT') && BX_CRONTAB_SUPPORT === true || COption::GetOptionString("main", "check_agents", "Y") != 'Y';

require_once($_SERVER["DOCUMENT_ROOT"].BX_ROOT."/modules/main/prolog.php");
$APPLICATION->SetTitle(GetMessage("MAIN_DUMP_AUTO_PAGE_TITLE"));
require($_SERVER["DOCUMENT_ROOT"].BX_ROOT."/modules/main/include/prolog_admin_after.php");

$arAllBucket = CBackup::GetBucketList();
$strError = '';

if ($DB->type != 'MYSQL')
	echo BeginNote().GetMessage('MAIN_DUMP_MYSQL_ONLY').EndNote();

define('LOCK_FILE', $_SERVER['DOCUMENT_ROOT'].'/bitrix/backup/auto_lock');
if($_REQUEST['save'])
{
	if (!check_bitrix_sessid())
	{
		CAdminMessage::ShowMessage(array(
			"MESSAGE" => GetMessage("MAIN_DUMP_ERROR"),
			"DETAILS" => GetMessage("DUMP_MAIN_SESISON_ERROR"),
			"TYPE" => "ERROR",
			"HTML" => true));
	}
	else
	{
		$BUCKET_ID = $_REQUEST['dump_bucket_id'];
		if (!$bMcrypt)
		{
			$_REQUEST['dump_encrypt_key'] = '';
			if ($BUCKET_ID == -1)
				$BUCKET_ID = 0;
		}
		CPasswordStorage::Set('dump_temporary_cache', $_REQUEST['dump_encrypt_key']);

		IntOptionSet("dump_bucket_id", $BUCKET_ID);

		IntOptionSet("dump_auto_enable", $dump_auto_enable = $_REQUEST['dump_auto_enable'] == 'Y');
		if ($dump_auto_enable)
		{
			$t = preg_match('#^([0-9]{2}):([0-9]{2})$#', $_REQUEST['dump_auto_time'], $regs) ? $regs[1] * 60 + $regs[2] : 0;
			IntOptionSet("dump_auto_time", $t);

			$i = intval($_REQUEST['dump_auto_interval']);
			if (!$i)
				$i = 1;
			IntOptionSet("dump_auto_interval", $i);
			COption::SetOptionInt('main', 'last_backup_start_time', 0);
			COption::SetOptionInt('main', 'last_backup_end_time', 0);

			$start_time = time();
			$min_left = $t - date('H') * 60 - date('i');
			if ($min_left < -60)
			{
				$start_time += 86400;
				$day = 'TOMORROW';
			}
			else
				$day = 'TODAY';

			$strMessage = GetMessage("MAIN_DUMP_SHED_CLOSEST_TIME_".$day).FormatDate('FULL', strtotime(date('Y-m-d '.sprintf('%02d:%02d',floor($t/60), $t%60),$start_time)));
		}
		else
			$strMessage = GetMessage("MAIN_DUMP_SUCCESS_SAVED_DETAILS");

		IntOptionSet("dump_delete_old", $_REQUEST['dump_delete_old']);
		IntOptionSet("dump_old_time", $_REQUEST['dump_old_time']);
		IntOptionSet("dump_old_cnt", $_REQUEST['dump_old_cnt']);
		IntOptionSet("dump_old_size", $_REQUEST['dump_old_size']);

		IntOptionSet("dump_integrity_check", $_REQUEST['dump_integrity_check'] == 'Y');
		IntOptionSet("dump_use_compression", $bGzip && $_REQUEST['dump_disable_gzip'] != 'Y');

		$dump_archive_size_limit = intval($_REQUEST['dump_archive_size_limit'] * 1024 * 1024);
		if ($dump_archive_size_limit <= 10240 * 1024)
			$dump_archive_size_limit = 1024 * 1024 * 1024;
		IntOptionSet("dump_archive_size_limit", $dump_archive_size_limit);

		CAdminMessage::ShowMessage(array(
			"MESSAGE" => GetMessage("MAIN_DUMP_SUCCESS_SAVED"),
			"DETAILS" => $strMessage,
			"TYPE" => "OK",
			"HTML" => true));
	}
}
elseif (file_exists(LOCK_FILE))
{
	if ($t = intval(file_get_contents(LOCK_FILE)))
		CAdminMessage::ShowMessage(array(
			"MESSAGE" => GetMessage("MAIN_DUMP_AUTO_LOCK"),
			"DETAILS" => GetMessage("MAIN_DUMP_AUTO_LOCK_TIME", array('#TIME#' => HumanTime(time() - $t))),
			"TYPE" => "OK",
			"HTML" => true));
	else
		CAdminMessage::ShowMessage(array(
			"MESSAGE" => GetMessage("MAIN_DUMP_ERROR"),
			"DETAILS" => GetMessage("MAIN_DUMP_ERR_OPEN_FILE").' '.LOCK_FILE,
			"TYPE" => "ERROR",
			"HTML" => true));

}

if (!$bMcrypt)
{
	CAdminMessage::ShowMessage(array(
		"MESSAGE" => GetMessage("MAIN_DUMP_NOT_INSTALLED"),
		"DETAILS" => GetMessage("MAIN_DUMP_NO_ENC_FUNCTIONS"),
		"TYPE" => "ERROR",
		"HTML" => true));
}

$aMenu = array(
	array(
		"TEXT"	=> GetMessage("MAIN_DUMP_LIST_PAGE_TITLE"),
		"LINK"	=> "/bitrix/admin/dump_list.php?lang=".LANGUAGE_ID,
		"TITLE"	=> GetMessage("MAIN_DUMP_LIST_PAGE_TITLE"),
		"ICON"	=> "btn_list"
	)
);
$context = new CAdminContextMenu($aMenu);
$context->Show();
?>
<script>
function CheckEncrypt(ob)
{
	var enc;
	if(enc = document.fd1.dump_encrypt)
	{
		enc.disabled = (ob.value == -1);
	}
}

function CheckCron()
{
	var on = document.fd1.dump_auto_enable.checked;
	document.fd1.dump_auto_time.disabled = !on;
	document.fd1.dump_auto_interval.disabled = !on;
}
BX.ready(CheckCron);

function SavePassword()
{
	var key = BX('dump_encrypt_key').value;
	var l = key.length;

	var strError = '';
	if (!l)
		strError = '<?=GetMessageJS("MAIN_DUMP_EMPTY_PASS")?>';
	else if (!/^[\040-\176]*$/.test(key))
		strError = '<?=GetMessageJS('DUMP_ERR_NON_ASCII')?>';
	else if (l < 6)
		strError = '<?=GetMessageJS("MAIN_DUMP_ENC_PASS_DESC")?>';
	else if (key != BX('dump_encrypt_key_confirm').value)
		strError = '<?=GetMessageJS("DUMP_MAIN_ERR_PASS_CONFIRM")?>';

	if (strError)
	{
		BX('password_error').innerHTML = strError;
		BX('dump_encrypt_key').focus();
	}
	else
	{
		BX('password_error').innerHTML = '';
		BX.WindowManager.Get().Close();
		document.fd1.dump_encrypt_key.value = BX('dump_encrypt_key').value;
		document.fd1.submit();
	}
}

var PasswordDialog;
function SaveSettings()
{
	var ob;
	if (BX('bitrixcloud').checked || (ob = document.fd1.dump_encrypt) && ob.checked)
	{
		if (!PasswordDialog)
		{
			PasswordDialog = new BX.CDialog({
				title: '<?=GetMessage("DUMP_MAIN_ENC_ARC")?>',
				content: '<?
					echo '<div style="color:red" id=password_error></div>';
					echo CUtil::JSEscape(BeginNote().GetMessage('MAIN_DUMP_SAVE_PASS_AUTO').EndNote());
					echo '<table>';
					echo '<tr><td>'.GetMessage('MAIN_DUMP_ENC_PASS').'</td><td><input type="password" value="" id="dump_encrypt_key" onkeyup="if(event.keyCode==13) {BX(&quot;dump_encrypt_key_confirm&quot;).focus()}"/></td></tr>';
					echo '<tr><td>'.GetMessage('DUMP_MAIN_PASSWORD_CONFIRM').'</td><td><input type="password" value="" id="dump_encrypt_key_confirm"  onkeyup="if(event.keyCode==13) {SavePassword()}"/></td></tr>';
					echo '</table>';
				?>',
				height: 300,
				width: 600,
				resizable: false,
				buttons: [ {
					title: '<?=GetMessage("DUMP_MAIN_SAVE")?>',
	//				id: 'my_save',
	//				name: 'my_save',
					className: 'adm-btn-save',
					action: SavePassword

				}, BX.CAdminDialog.btnCancel ]
			})
		}
		PasswordDialog.Show();
		BX('dump_encrypt_key').focus();
	}
	else
	{
		document.fd1.dump_encrypt_key.value = "";
		document.fd1.submit();
	}
}
</script>

<form name="fd1" action="<?echo $APPLICATION->GetCurPage()?>?lang=<?=LANGUAGE_ID?>" method="POST">
<?=bitrix_sessid_post()?>
<input type=hidden name=save value=Y>
<input type=hidden name=dump_encrypt_key>
<?
$aTabs = array();
$aTabs[] = array("DIV"=>"expert", "TAB"=>GetMessage("DUMP_MAIN_PARAMETERS"), "ICON"=>"main_user_edit", "TITLE"=>GetMessage("DUMP_MAIN_AUTO_PARAMETERS"));

$editTab = new CAdminTabControl("editTab", $aTabs, true, true);
$editTab->Begin();
$editTab->BeginNextTab();

$BUCKET_ID = IntOption('dump_bucket_id');
if ($BUCKET_ID == -1 && !$bBitrixCloud)
	$BUCKET_ID = 0;
?>
<tr>
	<td class="adm-detail-valign-top" width=40%><?=GetMessage('MAIN_DUMP_ARC_LOCATION')?></td>
	<td>
		<div><label><input type=radio name=dump_bucket_id value="-1" <?=$BUCKET_ID == -1 ? "checked" : ""?> id="bitrixcloud" <?=!$bBitrixCloud ? 'disabled' : ''?> onclick="CheckEncrypt(this)"> <?=GetMessage('DUMP_MAIN_IN_THE_BXCLOUD')?></label><?=$strBXError ? ' <span style="color:red">('.$strBXError.')</span>' : ''?></div>
		<div><label><input type=radio name=dump_bucket_id value="0"  <?=$BUCKET_ID == 0  ? "checked" : ""?> onclick="CheckEncrypt(this)"> <?=GetMessage('MAIN_DUMP_LOCAL_DISK')?></label></div>
		<?
		$arWriteBucket = CBackup::GetBucketList($arFilter = array('READ_ONLY' => 'N'));
		if ($arWriteBucket)
		{
			foreach($arWriteBucket as $f)
				echo '<div><label><input type=radio name=dump_bucket_id value="'.$f['ID'].'" '.($BUCKET_ID == $f['ID'] ? "checked" : "").' onclick="CheckEncrypt(this)"> '.GetMessage('DUMP_MAIN_IN_THE_CLOUD').' '.htmlspecialcharsbx($f['BUCKET'].' ('.$f['SERVICE_ID'].')').'</label></div>';
		}
		?>
	</td>
</tr>
<tr class="heading">
	<td colspan="2"><?=GetMessage("MAIN_DUMP_SHED")?></td>
</tr>
<tr>
	<td width=40%><?=GetMessage("MAIN_DUMP_SHED_ENABLE")?><span class="required"><sup>1</sup></span></td>
	<td><input type="checkbox" name="dump_auto_enable" value="Y" <?=IntOption('dump_auto_enable') && $bCron ? 'checked' : '' ?> <?=$bCron ? '' : 'disabled'?> onchange="CheckCron()">
</tr>
<tr>
	<td><?=GetMessage("TIME_SPENT")?></td>
	<td><?
		require_once($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/tools/clock.php");
		$min = IntOption('dump_auto_time');
		CClock::Show(array(
			'view' => 'select',
			'inputName' => 'dump_auto_time',
			'initTime' => sprintf('%02d:%02d',floor($min / 60),($min % 60))
			)
		);
		?>
	</td>
</tr>
<tr>
	<td><?=GetMessage("MAIN_DUMP_PERIODITY")?></td>
	<td>
		<select name=dump_auto_interval>
		<?
			foreach(array(
				1 => GetMessage("MAIN_DUMP_PER_1"),
				2 => GetMessage("MAIN_DUMP_PER_2"),
				3 => GetMessage("MAIN_DUMP_PER_3"),
				5 => GetMessage("MAIN_DUMP_PER_5"),
				7 => GetMessage("MAIN_DUMP_PER_7"),
				14 => GetMessage("MAIN_DUMP_PER_14"),
				21 => GetMessage("MAIN_DUMP_PER_21"),
				30 => GetMessage("MAIN_DUMP_PER_30"),
				) as $k => $v)
					echo '<option value="'.$k.'" '.(IntOption('dump_auto_interval') == $k ? 'selected' : '').'>'.$v.'</option>';
		?>
		</select>
	</td>
</tr>
<tr class="heading">
	<td colspan="2"><?=GetMessage("MAIN_DUMP_DELETE_OLD")?></td>
</tr>
<tr>
	<td class="adm-detail-valign-top" width=40%><?=GetMessage('DUMP_DELETE')?>:</td>
	<td>
		<div><label><input type=radio name=dump_delete_old value=0 <?=IntOption('dump_delete_old') == 0 ? "checked" : ""?>> <?=GetMessage('DUMP_NOT_DELETE')?></label></div>
		<div><label><input type=radio name=dump_delete_old value=1 <?=IntOption('dump_delete_old') == 1 ? "checked" : ""?>> <?=GetMessage('DUMP_CLOUD_DELETE')?></label></div>
		<div><label><input type=radio name=dump_delete_old value=2 <?=IntOption('dump_delete_old') == 2 ? "checked" : ""?>> <?=GetMessage('DUMP_RM_BY_TIME', array('#TIME#' => '<input type=text name=dump_old_time size=2 value="'.IntOption('dump_old_time').'">'))?></label></div>
		<div><label><input type=radio name=dump_delete_old value=4 <?=IntOption('dump_delete_old') == 4 ? "checked" : ""?>> <?=GetMessage('DUMP_RM_BY_CNT',  array('#CNT#'  => '<input type=text name=dump_old_cnt size=2 value="'.IntOption('dump_old_cnt').'">'))?></label></div>
		<div><label><input type=radio name=dump_delete_old value=8 <?=IntOption('dump_delete_old') == 8 ? "checked" : ""?>> <?=GetMessage('DUMP_RM_BY_SIZE', array('#SIZE#' => '<input type=text name=dump_old_size size=1 value="'.IntOption('dump_old_size').'">'))?></label></div>
	</td>
</tr>


<tr class="heading">
	<td colspan="2"><?=GetMessage("DUMP_MAIN_ARC_MODE")?></td>
</tr>

<tr>
	<td><?=GetMessage("MAIN_DUMP_ENABLE_ENC")?><span class="required"><sup>2</sup></td>
	<td><input type="checkbox" name="dump_encrypt" value="Y" <?=($BUCKET_ID == -1 || CPasswordStorage::Get('dump_temporary_cache') ? "checked" : "")?> <?=!$bMcrypt || $BUCKET_ID == -1  ? 'disabled' : ''?>></td>
</tr>
<tr>
	<td width=40%><?=GetMessage('INTEGRITY_CHECK_OPTION')?></td>
	<td><input type="checkbox" name="dump_integrity_check" value="Y" <?=IntOption('dump_integrity_check') ? 'checked' : '' ?>>
</tr>
<tr>
	<td><?=GetMessage('DISABLE_GZIP')?></td>
	<td><input type="checkbox" name="dump_disable_gzip" value="Y" <?=IntOption('dump_use_compression') && $bGzip ? '' : 'checked' ?> <?=!$bGzip ? 'disabled' : ''?>>
</tr>

<tr>
	<td><?=GetMessage("MAIN_DUMP_MAX_ARCHIVE_SIZE")?></td>
	<td><input type="text" name="dump_archive_size_limit" value="<?=IntOption('dump_archive_size_limit', 1024 * 1024 * 1024) / 1024 / 1024?>" size=4></td>
</tr>
<?
$editTab->Buttons();
?>
<input type="button" class="adm-btn-save" value="<?=GetMessage("DUMP_MAIN_SAVE")?>" onclick="SaveSettings()">
<?
$editTab->End();
?>
</form>

<?
echo BeginNote();
echo '<div><span class=required><sup>1</sup></span> '.GetMessage("MAIN_DUMP_SHED_TIME_SET").'.</div>';
echo '<div><span class=required><sup>2</sup></span> '.GetMessage("MAIN_DUMP_BXCLOUD_ENC").'</div>';
echo EndNote();

require($_SERVER["DOCUMENT_ROOT"].BX_ROOT."/modules/main/include/epilog_admin.php");

#################################################
################## FUNCTIONS
function IntOption($name, $def = 0)
{
	static $CACHE;
	$name .= '_auto';

	if (!$CACHE[$name])
		$CACHE[$name] = COption::GetOptionInt("main", $name, $def);
	return $CACHE[$name];
}

function IntOptionSet($name, $val)
{
	COption::SetOptionInt('main', $name.'_auto', $val);
}
?>
