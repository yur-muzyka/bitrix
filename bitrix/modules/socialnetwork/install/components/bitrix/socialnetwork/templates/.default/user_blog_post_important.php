<?if(!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true)die();

if(is_array($_REQUEST["options"]) && !empty($_REQUEST["options"]) && check_bitrix_sessid() && $USER->IsAuthorized()) {
	AddEventHandler("socialnetwork", "OnAfterCBlogUserOptionsSet", "__blogcleartagsimportant");
	if (!function_exists("__blogcleartagsimportant"))
	{
		function __blogcleartagsimportant($options, $cache_id, $cache_path)
		{
			$obCache = new CPHPCache;
			if ($cache_id != "")
				$obCache->Clean($cache_id, $cache_path);
			else
				$obCache->CleanDir($cache_path);
		}
	}

}

$arParams["BLOG_POSTS_FILTER"] = array(">UF_BLOG_POST_IMPRTNT" => 0);
$arParams["BLOG_POSTS_PAGE_SETTINGS"] = array("bDescPageNumbering" => true, "nPageSize" => 5);
$arParams["BLOG_POSTS_TEMPLATE"] = "widget";

$APPLICATION->IncludeComponent(
	"bitrix:socialnetwork.blog.blog",
	($_REQUEST["template"] !== "" ? $_REQUEST["template"] : ($arParams["BLOG_POSTS_TEMPLATE"] !== "" ? $arParams["BLOG_POSTS_TEMPLATE"] : ".default")),
	Array(
		"BLOG_URL" => "",
		"FILTER" => array(">UF_BLOG_POST_IMPRTNT" => 0, "!POST_PARAM_BLOG_POST_IMPRTNT" => array("USER_ID" => $GLOBALS["USER"]->GetId(), "VALUE" => "Y")),
		"FILTER_NAME" => "",
		"YEAR" => "",
		"MONTH" => "",
		"DAY" => "",
		"CATEGORY_ID" => "",
		"BLOG_GROUP_ID" => $_REQUEST["filter"]["BLOG_GROUP_ID"],
		"USER_ID" => $GLOBALS["USER"]->GetId(),
		"SOCNET_GROUP_ID" => 0,
		"SORT" => (!empty($_REQUEST["sort"]) ? $_REQUEST["sort"] : $arParams["BLOG_POSTS_SORT"]),
		"SORT_BY1" => "",
		"SORT_ORDER1" => "",
		"SORT_BY2" => "",
		"SORT_ORDER2" => "",
		/************** Page settings **************************************/
		"MESSAGE_COUNT" => 0,
		"NAV_TEMPLATE" => $arParams["NAV_TEMPLATE"],
		"PAGE_SETTINGS" => (!empty($_REQUEST["page_settings"]) ? $_REQUEST["page_settings"] : $arParams["BLOG_POSTS_PAGE_SETTINGS"]),
		/************** URL ************************************************/
		"BLOG_VAR" => $arResult["ALIASES"]["blog_id"],
		"POST_VAR" => $arResult["ALIASES"]["post_id"],
		"USER_VAR" => $arResult["ALIASES"]["user_id"],
		"PAGE_VAR" => $arResult["ALIASES"]["blog_page"],
		"PATH_TO_BLOG" => $arResult["PATH_TO_USER_BLOG"],
		"PATH_TO_BLOG_CATEGORY" => $arResult["PATH_TO_USER_BLOG_CATEGORY"],
		"PATH_TO_BLOG_POSTS" => $arResult["PATH_TO_USER_BLOG_POST_IMPORTANT"],
		"PATH_TO_POST" => $arResult["PATH_TO_USER_BLOG_POST"],
		"PATH_TO_POST_EDIT" => $arResult["PATH_TO_USER_BLOG_POST_EDIT"],
		"PATH_TO_USER" => $arResult["PATH_TO_USER"],
		"PATH_TO_SMILE" => $arParams["PATH_TO_BLOG_SMILE"],
		/************** ADDITIONAL *****************************************/
		"DATE_TIME_FORMAT" => $arResult["DATE_TIME_FORMAT"],
		"NAME_TEMPLATE" => $arParams["NAME_TEMPLATE"],
		"SHOW_LOGIN" => $arParams["SHOW_LOGIN"],
		"SHOW_YEAR" => $arParams["SHOW_YEAR"],
		"AVATAR_SIZE" => $arParams["LOG_THUMBNAIL_SIZE"],
		"SET_TITLE" => "N",
		"SHOW_RATING" => "N",
		"RATING_TYPE" => $arParams["RATING_TYPE"],
/************** CACHE **********************************************/
		"CACHE_TYPE" => $arResult["CACHE_TYPE"],
		"CACHE_TIME" => $arResult["CACHE_TIME"],
		"CACHE_TAGS" => array("IMPORTANT".$GLOBALS["USER"]->GetId()),
		/************** Template Settings **********************************/
		"OPTIONS" => array(array("name" => "BLOG_POST_IMPRTNT", "value" => "Y")),
	),
	$component,
	array("HIDE_ICONS" => "Y")
);
?>