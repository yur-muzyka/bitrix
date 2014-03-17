<?$APPLICATION->IncludeComponent(
	"bitrix:photogallery.detail.list.ex",
	"yur",
	Array(
		"BEHAVIOUR" => (isset($arParams["BEHAVIOUR"]) && $arParams["BEHAVIOUR"] != "") ? $arParams["BEHAVIOUR"] : "SIMPLE",
		"USER_ALIAS" => $arParams["USER_ALIAS"],

		"IBLOCK_TYPE" => $arParams["IBLOCK_TYPE"],
		"IBLOCK_ID" => $arParams["IBLOCK_ID"],
		"SECTION_ID" => 1,
		"DRAG_SORT" => "N",
		"MORE_PHOTO_NAV" => "N",
		"THUMBNAIL_SIZE" => "70",
		"SHOW_CONTROLS" => "Y",
		"SHOW_RATING" => "Y",
		"SHOW_SHOWS" => "N",
		"SHOW_COMMENTS" => "Y",
		"MAX_VOTE" => $arParams["MAX_VOTE"],
		"VOTE_NAMES" => $arParams["VOTE_NAMES"],
		//"VOTE_NAMES" => array(),
		"DISPLAY_AS_RATING" => $arParams["DISPLAY_AS_RATING"],
		"SET_TITLE" => "N",
		"CACHE_TYPE" => "A",
		"CACHE_TIME" => $arParams["CACHE_TIME"],
		"CACHE_NOTES" => "",
		"ELEMENT_LAST_TYPE" => "none",
		"ELEMENT_FILTER" => array("INCLUDE_SUBSECTIONS" => "Y"),

		"RELOAD_ITEMS_ONLOAD" => "Y",
		"ELEMENT_SORT_FIELD" => $arParams["ELEMENT_SORT_FIELD"],
		"ELEMENT_SORT_ORDER" => $arParams["ELEMENT_SORT_ORDER"],
		"ELEMENT_SORT_FIELD1" => $arParams["ELEMENT_SORT_FIELD1"],
		"ELEMENT_SORT_ORDER1" => $arParams["ELEMENT_SORT_ORDER1"],
		"PROPERTY_CODE" => array(),

		"INDEX_URL" => $arParams["INDEX_URL"],
		"DETAIL_URL" => $arParams["DETAIL_URL"],
		"GALLERY_URL" => $arParams["GALLERY_URL"],
		"SECTION_URL" => $arParams["SECTION_URL"],
		"DETAIL_EDIT_URL" => $arParams["DETAIL_EDIT_URL"],

		"PERMISSION" => $arParams["PERMISSION"],
		"GROUP_PERMISSIONS" => array(),
		"PAGE_ELEMENTS" => $arParams["SHOWN_ITEMS_COUNT"],
		"DATE_TIME_FORMAT" => $arParams["DATE_TIME_FORMAT_DETAIL"],
		"SET_STATUS_404" => "N",
		"ADDITIONAL_SIGHTS" => array(),
		"PICTURES_SIGHT" => "real",

		"USE_COMMENTS" => $arParams["USE_COMMENTS"],
		"COMMENTS_TYPE" => $arParams["COMMENTS_TYPE"],
		"FORUM_ID" => $arParams["FORUM_ID"],
		"USE_CAPTCHA" => $arParams["USE_CAPTCHA"],
		"POST_FIRST_MESSAGE" => "Y",
		"SHOW_LINK_TO_FORUM" => "N",
		"BLOG_URL" => $arParams["BLOG_URL"],
		"PATH_TO_BLOG" => $arParams["PATH_TO_BLOG"],

		// Display user
		"PATH_TO_USER" => $arParams["PATH_TO_USER"],
		"NAME_TEMPLATE" => $arParams["NAME_TEMPLATE"],
		"SHOW_LOGIN" => $arParams["SHOW_LOGIN"],

		"~UNIQUE_COMPONENT_ID" => "bxfg_ucid_from_req_".$arParams["IBLOCK_ID"]."_".$res["ID"],
		"ACTION_URL" => $res["~LINK"]
	)
);?>

