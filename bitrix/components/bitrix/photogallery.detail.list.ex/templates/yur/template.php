<style type="text/css">
    .fancybox-custom .fancybox-skin {
        box-shadow: 0 0 50px #222;
    }

    body {
        max-width: 700px;
        margin: 0 auto;
    }
</style>

<? foreach ($arResult["ELEMENTS_LIST"] as $key => $arItem) { 
	$src = $arItem["PREVIEW_PICTURE"]["SRC"]; ?>
<div style="margin-right: 10px; margin-bottom: 10px; float: left;">
		<a class="fancybox" href="<?= $src?>" data-fancybox-group="gallery" title="Lorem ipsum dolor sit amet"><img src="<?= $src?>" style="width: 100px; height: 80px;" alt="" /></a>

    <br>rate: <? echo $arItem['PROPERTIES']['rating']['VALUE']; ?>
    <?$APPLICATION->IncludeComponent("bitrix:iblock.vote","",Array(
            "IBLOCK_TYPE" => $arParams["IBLOCK_TYPE"],
            "IBLOCK_ID" => $arParams["IBLOCK_ID"],
            "ELEMENT_ID" => $arItem["ID"],
            "MAX_VOTE" => "5",
            "VOTE_NAMES" => $arParams["VOTE_NAMES"],
            "SET_STATUS_404" => "N",
            "CACHE_TYPE" => "A",
            "CACHE_TIME" => "3600"
        )
    );?>
                          </div>
<? } ?>
