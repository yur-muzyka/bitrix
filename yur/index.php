<? require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php"); ?>

<? CJSCore::Init(array("jquery")); ?>
<? 
    $APPLICATION->AddHeadScript('/fancybox/lib/jquery.mousewheel-3.0.6.pack.js');
    $APPLICATION->AddHeadScript('/fancybox/source/jquery.fancybox.js?v=2.1.5');
    $APPLICATION->SetAdditionalCSS('/fancybox/source/jquery.fancybox.css?v=2.1.5'); 
?>
                        

<?$APPLICATION->IncludeComponent("bitrix:photogallery","yur",Array(
		"SHOW_LINK_ON_MAIN_PAGE" => array("id","rating","comments","shows"),
		"USE_LIGHT_VIEW" => "Y",
		"SEF_MODE" => "Y",
		"IBLOCK_TYPE" => "gallery",
		"IBLOCK_ID" => "1",
		"SECTION_SORT_BY" => "UF_DATE",
		"SECTION_SORT_ORD" => "DESC",
		"ELEMENT_SORT_FIELD" => "sort",
		"ELEMENT_SORT_ORDER" => "desc",
		"PATH_TO_USER" => "",
		"SECTION_PAGE_ELEMENTS" => "15",
		"ELEMENTS_PAGE_ELEMENTS" => "50",
		"PAGE_NAVIGATION_TEMPLATE" => "",
		"ALBUM_PHOTO_SIZE" => "120",
		"THUMBNAIL_SIZE" => "100",
		"JPEG_QUALITY1" => "100",
		"ORIGINAL_SIZE" => "1280",
		"JPEG_QUALITY" => "100",
		"ADDITIONAL_SIGHTS" => array(),
		"PHOTO_LIST_MODE" => "Y",
		"SHOWN_ITEMS_COUNT" => "6",
		"SHOW_NAVIGATION" => "N",
		"DATE_TIME_FORMAT_DETAIL" => "d.m.Y",
		"DATE_TIME_FORMAT_SECTION" => "d.m.Y",
		"SET_TITLE" => "Y",
		"CACHE_TYPE" => "A",
		"CACHE_TIME" => "3600",
		"CACHE_NOTES" => "",
		"USE_RATING" => "Y",
		"SHOW_TAGS" => "Y",
		"DRAG_SORT" => "Y",
		"UPLOADER_TYPE" => "applet",
		"APPLET_LAYOUT" => "extended",
		"UPLOAD_MAX_FILE_SIZE" => "1024",
		"USE_WATERMARK" => "Y",
		"WATERMARK_RULES" => "ALL",
		"WATERMARK_TYPE" => "PICTURE",
		"WATERMARK_FILE" => "",
		"WATERMARK_FILE_ORDER" => "usual",
		"WATERMARK_POSITION" => "mc",
		"WATERMARK_TRANSPARENCY" => "20",
		"PATH_TO_FONT" => "",
		"WATERMARK_MIN_PICTURE_SIZE" => "800",
		"MAX_VOTE" => "10",
		"VOTE_NAMES" => array("1","2","3","4","5"),
		"DISPLAY_AS_RATING" => "rating",
		"USE_COMMENTS" => "Y",
		"COMMENTS_TYPE" => "blog",
		"BLOG_URL" => "admin-blg",
		"COMMENTS_COUNT" => "10",
		"PATH_TO_BLOG" => "",
		"PATH_TO_SMILE" => "/bitrix/images/forum/smile/",
		"NAME_TEMPLATE" => "#NOBR##LAST_NAME# #NAME##/NOBR#",
		"TAGS_PAGE_ELEMENTS" => "150",
		"TAGS_PERIOD" => "",
		"TAGS_INHERIT" => "Y",
		"TAGS_FONT_MAX" => "30",
		"TAGS_FONT_MIN" => "10",
		"TAGS_COLOR_NEW" => "3E74E6",
		"TAGS_COLOR_OLD" => "C0C0C0",
		"TAGS_SHOW_CHAIN" => "Y",
		"SEF_FOLDER" => "/yur/",
		"SEF_URL_TEMPLATES" => Array(
			"index" => "index2.php",
			"section" => "#SECTION_ID#/",
			"section_edit" => "#SECTION_ID#/action/#ACTION#/",
			"section_edit_icon" => "#SECTION_ID#/icon/action/#ACTION#/",
			"upload" => "#SECTION_ID#/action/upload/",
			"detail" => "#SECTION_ID#/#ELEMENT_ID#/",
			"detail_edit" => "#SECTION_ID#/#ELEMENT_ID#/action/#ACTION#/",
			"detail_list" => "list/",
			"search" => "search/"
		),
		"VARIABLE_ALIASES" => Array(
			"index" => Array(),
			"section" => Array(),
			"section_edit" => Array(),
			"section_edit_icon" => Array(),
			"upload" => Array(),
			"detail" => Array(),
			"detail_edit" => Array(),
			"detail_list" => Array(),
			"search" => Array(),
		)
	)
);?>


<? require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>
