<?$APPLICATION->IncludeComponent(
	"bitrix:photogallery.section.list",
	"yur",
	Array(
		"CACHE_TYPE" => $arParams["CACHE_TYPE"],
		"CACHE_TIME" => $arParams["CACHE_TIME"],
		"PHOTO_LIST_MODE" => $arParams["PHOTO_LIST_MODE"],
		"SHOWN_ITEMS_COUNT" => $arParams["SHOWN_ITEMS_COUNT"],

		"IBLOCK_TYPE" => $arParams["IBLOCK_TYPE"],
		"IBLOCK_ID" => $arParams["IBLOCK_ID"],
		"USE_PERMISSIONS" => $arParams["USE_PERMISSIONS"],
		"GROUP_PERMISSIONS" => $arParams["GROUP_PERMISSIONS"],
		"DATE_TIME_FORMAT" => $arParams["DATE_TIME_FORMAT_SECTION"],

		"PAGE_NAVIGATION_TEMPLATE" => $arParams["PAGE_NAVIGATION_TEMPLATE"],
		"PAGE_ELEMENTS" => $arParams["SECTION_PAGE_ELEMENTS"],
		"SORT_BY" => $arParams["SECTION_SORT_BY"],
		"SORT_ORD" => $arParams["SECTION_SORT_ORD"],

		"DISPLAY_PANEL" => $arParams["DISPLAY_PANEL"],
		"SHOW_TAGS" => $arParams["SHOW_TAGS"],

		"SECTION_URL" => $arResult["URL_TEMPLATES"]["section"],
		"SECTION_EDIT_URL" => $arResult["URL_TEMPLATES"]["section_edit"],
		"SECTION_EDIT_ICON_URL" => $arResult["URL_TEMPLATES"]["section_edit_icon"],
		"DETAIL_URL" => $arResult["URL_TEMPLATES"]["detail"],
		"SEARCH_URL" => $arResult["URL_TEMPLATES"]["search"],
		"UPLOAD_URL" => $arResult["URL_TEMPLATES"]["upload"],
		"DETAIL_EDIT_URL" => $arResult["URL_TEMPLATES"]["detail_edit"],

		"ALBUM_PHOTO_THUMBS_SIZE"	=>	$arParams["ALBUM_PHOTO_THUMBS_SIZE"],
		"ALBUM_PHOTO_SIZE"	=>	$arParams["ALBUM_PHOTO_SIZE"],
		"SET_STATUS_404" => $arParams["SET_STATUS_404"],

		"SET_TITLE"	=>	"N",
		"SHOW_RATING" => $arParams["USE_RATING"],
		"SHOW_SHOWS" => $arParams["SHOW_SHOWS"],
		"SHOW_COMMENTS" => $arParams["USE_COMMENTS"],
		"SHOW_TAGS" => $arParams["SHOW_TAGS"],
		"SHOW_DATE" => $arParams["SHOW_DATE"],
		"SHOW_DESRIPTION" => $arParams["SHOW_DESRIPTION"],

		"USE_RATING" => $arParams["USE_RATING"],
		"MAX_VOTE" => $arParams["MAX_VOTE"],
		"VOTE_NAMES" => $arParams["VOTE_NAMES"],
		"DISPLAY_AS_RATING" => $arParams["DISPLAY_AS_RATING"],
		"RATING_MAIN_TYPE" => $arParams["RATING_MAIN_TYPE"],

		"USE_COMMENTS" => $arParams["USE_COMMENTS"],
		"COMMENTS_TYPE" => $arParams["COMMENTS_TYPE"],

		"COMMENTS_COUNT" => $arParams["COMMENTS_COUNT"],
		"PATH_TO_SMILE" => $arParams["PATH_TO_SMILE"],
		"FORUM_ID" => $arParams["FORUM_ID"],
		"USE_CAPTCHA" => $arParams["USE_CAPTCHA"],
		"URL_TEMPLATES_READ" => $arParams["URL_TEMPLATES_READ"],
		"URL_TEMPLATES_PROFILE_VIEW" => $arParams["URL_TEMPLATES_PROFILE_VIEW"],
		"POST_FIRST_MESSAGE" => $arParams["POST_FIRST_MESSAGE"],
		"PREORDER" => $arParams["PREORDER"],
		"SHOW_LINK_TO_FORUM" => $arParams["SHOW_LINK_TO_FORUM"] == "Y" ? "Y" : "N",

		"BLOG_URL" => $arParams["BLOG_URL"],
		"PATH_TO_BLOG" => $arParams["PATH_TO_BLOG"],

		"PATH_TO_USER" => $arParams["PATH_TO_USER"],
		"NAME_TEMPLATE" => $arParams["NAME_TEMPLATE"],
		"SHOW_LOGIN" => $arParams["SHOW_LOGIN"],

		"ELEMENT_SORT_ORDER" => $arParams["ELEMENT_SORT_ORDER"],
		"ELEMENT_SORT_FIELD" => $arParams["ELEMENT_SORT_FIELD"],
	),
	$component,
	array("HIDE_ICONS" => "Y")
);
?>
