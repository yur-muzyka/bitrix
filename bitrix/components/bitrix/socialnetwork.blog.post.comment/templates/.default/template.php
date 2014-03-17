<?if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true)die();?>
<?CUtil::InitJSCore(array("tooltip", "popup", "fx", "image", 'viewer'));?>
<?
if($arResult["is_ajax_post"] == "Y")
{
	$APPLICATION->RestartBuffer();
	?>
	<script bxrunfirst="yes">
	window.BX = top.BX;
	<?if($arResult["use_captcha"] === true && $arResult["CanUserComment"])
	{
		?>

		var cc;
		if(document.cookie.indexOf('<?echo session_name()?>'+'=') == -1)
			cc = Math.random();
		else
			cc ='<?=$arResult["CaptchaCode"]?>';

		BX('captcha').src='/bitrix/tools/captcha.php?captcha_code='+cc;
		BX('captcha_code').value = cc;
		BX('captcha_word').value = "";
		<?
	}
	?>
	</script><?

	if(strlen($arResult["COMMENT_ERROR"])>0)
	{
		?>
		<script>top.commentEr = 'Y';</script>
		<div class="feed-add-error">
			<span class="feed-add-info-text"><span class="feed-add-info-icon"></span><?=$arResult["COMMENT_ERROR"]?></span>
		</div>
		<?
	}
}

if(strlen($arResult["MESSAGE"])>0)
{
	?>
	<div class="feed-add-successfully">
		<span class="feed-add-info-text"><span class="feed-add-info-icon"></span><?=$arResult["MESSAGE"]?></span>
	</div>
	<?
}
if(strlen($arResult["ERROR_MESSAGE"])>0)
{
	?>
	<div class="feed-add-error">
		<span class="feed-add-info-text"><span class="feed-add-info-icon"></span><?=$arResult["ERROR_MESSAGE"]?></span>
	</div>
	<?
}
if(strlen($arResult["FATAL_MESSAGE"])>0)
{
	?>
	<div class="feed-add-error">
		<span class="feed-add-info-text"><span class="feed-add-info-icon"></span><?=$arResult["FATAL_MESSAGE"]?></span>
	</div>
	<?
}
else
{
	if($arResult["imageUploadFrame"] == "Y")
	{
		?>
		<script>
			<?if(!empty($arResult["Image"])):?>
				if(!top.arImagesId)
					var arImagesId = [];
				if(!top.arImagesSrc)
					var arImagesSrc = [];
				top.arImagesId.push('<?=$arResult["Image"]["ID"]?>');
				top.arImagesSrc.push('<?=CUtil::JSEscape($arResult["Image"]["SRC"])?>');

				top.bxBlogImageId = '<?=$arResult["Image"]["ID"]?>';
				top.bxBlogImageIdWidth = '<?=CUtil::JSEscape($arResult["Image"]["WIDTH"])?>';
				top.bxBlogImageIdSrc = '<?=CUtil::JSEscape($arResult["Image"]["SRC"])?>';
			<?elseif(strlen($arResult["ERROR_MESSAGE"]) > 0):?>
				top.bxBlogImageError = '<?=CUtil::JSEscape($arResult["ERROR_MESSAGE"])?>';
			<?endif;?>
		</script>
		<?
		die();
	}
	elseif(!empty($arResult["CommentsResult"]) || $arResult["CanUserComment"])
	{
		$rnd = randString(3);
		$commentsCnt = count($arResult["CommentsResult"]);
		if($arResult["is_ajax_post"] != "Y")
		{
			?>
			<script>
			BX.viewElementBind(
				'blg-comment-<?=$arParams["ID"]?>',
				{},
				function(node){
					return BX.type.isElementNode(node) && (node.getAttribute('data-bx-viewer') || node.getAttribute('data-bx-image'));
				}
			);
			</script>

			<div class="feed-comments-block" id="blg-comment-<?=$arParams["ID"]?>">
			<a name="comments"></a>
			<?
			if(
				(strlen($_REQUEST["bxajaxid"]) <= 0 && strlen($_REQUEST["logajax"]) <= 0)
				|| (
					$_REQUEST["RELOAD"] == "Y" 
					&& (strlen($_REQUEST["bxajaxid"]) > 0 || strlen($_REQUEST["logajax"]) > 0)
				)
			)
				include_once($_SERVER["DOCUMENT_ROOT"].$templateFolder."/script.php");
		}

		if(!empty($arResult["CommentsResult"]))
		{
			$i = 0;
			$bImagesShow = false;
			$ajax_page = CUtil::JSEscape($APPLICATION->GetCurPageParam("", array("logajax", "bxajaxid", "logout")));
			$oldCnt = $commentsCnt - $arResult["newCount"];
			$moreCommentId =  IntVal($_REQUEST["last_comment_id"]);

			if($commentsCnt > $arResult["newCount"] && $arResult["newCount"] > 0 && $moreCommentId <= 0) //splice for new comments/default
				array_splice($arResult["CommentsResult"], 0, $oldCnt);

			if($moreCommentId > 0)
			{
				array_splice($arResult["CommentsResult"], -$moreCommentId);
				$prev = IntVal(count($arResult["CommentsResult"])-$arParams["PAGE_SIZE"]);
				if($prev <= 0)
					$prev = 0;
				?>
				<script>
				BX('comcntshow-<?=$arParams["ID"]?>').value = <?=IntVal($commentsCnt - $prev)?>;
				<?
				if($prev > 0)
				{
					?>BX('comcntleave-<?=$arParams["ID"]?>').innerHTML = '<?=$prev?>';<?
				}
				else
				{
					?>
					BX.findChild(BX('blogCommentMoreHide-<?=$arParams["ID"]?>'), {'className': 'feed-com-all-text' }, true, false).style.display = "none";
					BX.findChild(BX('blogCommentMoreHide-<?=$arParams["ID"]?>'), {'className': 'feed-com-all-hide' }, true, false).style.display = "inline-block";
					BX.findChild(BX('blogCommentMoreHide-<?=$arParams["ID"]?>'), {'className': 'feed-com-all-hide' }, true, false).style.display = "inline-block";
					BX.addClass('blogCommentMoreHide-<?=$arParams["ID"]?>', "feed-com-all-expanded");
					BX('comshowend-<?=$arParams["ID"]?>').value = "Y";
					BX('comcntleave-<?=$arParams["ID"]?>').innerHTML = '<?=$commentsCnt?>';
					BX('comcntshow-<?=$arParams["ID"]?>').value = 0;
					BX.findChild(BX('blogCommentMoreHide-<?=$arParams["ID"]?>'), {'className': 'feed-com-all-text-old' }, true, false).style.display = "none";
					BX.findChild(BX('blogCommentMoreHide-<?=$arParams["ID"]?>'), {'className': 'feed-com-all-text-all' }, true, false).style.display = "inline-block";
					<?
				}
				?>
				</script>
				<?
				if($prev > 0)
					array_splice($arResult["CommentsResult"], 0, $prev);
			}

			$todayString = ConvertTimeStamp();
			foreach($arResult["CommentsResult"] as $comment)
			{
				$i++;
				if($i == 1 && $commentsCnt > $arResult["newCount"] && $moreCommentId <= 0)
				{
					$adit1 = " style=\"display:none;\"";
					$adit2 = "";
					if($commentsCnt > ($arResult["newCount"]+$arParams["PAGE_SIZE"]))
					{
						$adit1 = "";
						$adit2 = " style=\"display:none;\"";
					}
					?>
					<div class="feed-com-header" id="blogCommentMoreHide-<?=$arParams["ID"]?>">
						<a href="javascript:void(0)" class="feed-com-all" onclick="showMoreComments('<?=$arParams["ID"]?>', this)"><span class="feed-com-all-text"><span class="feed-com-all-text-old"<?=$adit1?>><?=GetMessage("BLOG_C_VIEW_OLD")?></span><span class="feed-com-all-text-all"<?=$adit2?>><?=GetMessage("BLOG_C_VIEW_ALL")?></span> (<span id="comcntleave-<?=$arParams["ID"]?>"><?=$commentsCnt?></span>)</span><span class="feed-com-all-hide"><?=GetMessage("BLOG_C_HIDE")?></span><i></i></a>
					</div>
					<div id="blog-comment-hidden-<?=$arParams["ID"]?>" style="display:none; overflow:hidden;"></div>
					<input type="hidden" name="comcntshow-<?=$arParams["ID"]?>" id="comcntshow-<?=$arParams["ID"]?>" value="<?=$arResult["newCount"]?>">
					<input type="hidden" name="comshowend-<?=$arParams["ID"]?>" id="comshowend-<?=$arParams["ID"]?>" value="N">
					<?
				}
				?>
				<a name="<?=$comment["ID"]?>"></a>
				<div id="blg-comment-<?=$comment["ID"]?>" onmouseover="BX.show(BX.findChild(this, {className: 'feed-com-block-menu'}, true, false))" onmouseout="BX.hide(BX.findChild(this, {className: 'feed-com-block-menu'}, true, false))">
				<?
				$aditStyle = "feed-com-block";
				if($arParams["FOLLOW"] != "N" && $comment["NEW"] == "Y")
					$aditStyle .= " feed-com-block-new";
				if($comment["AuthorIsAdmin"] == "Y")
					$aditStyle = " blog-comment-admin";
				if(IntVal($comment["AUTHOR_ID"]) > 0)
				{
					$aditStyle .= " blog-comment-user-".IntVal($comment["AUTHOR_ID"]);
					$aditStyle .= " sonet-log-comment-createdby-".IntVal($comment["AUTHOR_ID"]);
				}
				if($comment["AuthorIsPostAuthor"] == "Y")
					$aditStyle .= " blog-comment-author";
				if($comment["PUBLISH_STATUS"] != BLOG_PUBLISH_STATUS_PUBLISH)
					$aditStyle .= " feed-com-block-hidden";
				?>
				<div class="<?=$aditStyle?>">
				<div class="feed-com-avatar"<?=(strlen($arResult["userCache"][$comment["AUTHOR_ID"]]["PERSONAL_PHOTO_resized_30"]["src"]) > 0 ? " style=\"background:url('".$arResult["userCache"][$comment["AUTHOR_ID"]]["PERSONAL_PHOTO_resized_30"]["src"]."') no-repeat center;\"" : "")?>></div>
				<?
				if(!empty($arResult["userCache"][$comment["AUTHOR_ID"]]))
				{
					$anchor_id = $comment["ID"];
					if(strlen($arResult["userCache"][$comment["AUTHOR_ID"]]["NAME_FORMATED"]) <= 0)
					{
						$arTmpUser = array(
								"NAME" => $arResult["userCache"][$comment["AUTHOR_ID"]]["~NAME"],
								"LAST_NAME" => $arResult["userCache"][$comment["AUTHOR_ID"]]["~LAST_NAME"],
								"SECOND_NAME" => $arResult["userCache"][$comment["AUTHOR_ID"]]["~SECOND_NAME"],
								"LOGIN" => $arResult["userCache"][$comment["AUTHOR_ID"]]["~LOGIN"],
								"NAME_LIST_FORMATTED" => "",
							);
						$arResult["userCache"][$comment["AUTHOR_ID"]]["NAME_FORMATED"] = CUser::FormatName($arParams["NAME_TEMPLATE"], $arTmpUser, ($arParams["SHOW_LOGIN"] != "N" ? true : false));
					}
					if($arParams["SEO_USER"] == "Y")
					{
						?><noindex><?
					}
					?><a class="feed-com-name" id="bpc_<?=$anchor_id?>" href="<?=$arResult["userCache"][$comment["AUTHOR_ID"]]["url"]?>"><?=$arResult["userCache"][$comment["AUTHOR_ID"]]["NAME_FORMATED"]?></a><script type="text/javascript">BX.tooltip('<?=$comment["AUTHOR_ID"]?>', "bpc_<?=$anchor_id?>", "<?=$ajax_page?>");</script><?
					if($arParams["SEO_USER"] == "Y")
					{
						?></noindex><?
					}
					$authorName = $arResult["userCache"][$comment["AUTHOR_ID"]]["NAME_FORMATED"];
				}
				else
				{
					?><span class="feed-com-name"><?echo $comment["AuthorName"];
					if(strlen($comment["urlToDelete"])>0 && strlen($comment["AuthorEmail"])>0)
					{
						?>(<a href="mailto:<?=$comment["AuthorEmail"]?>"><?=$comment["AuthorEmail"]?></a>)<?
					}
					?></span><?
					$authorName = $comment["AuthorName"];
				}
				?>
				<div class="feed-com-informers">
					<?if (ConvertTimeStamp(($comment["DATE_CREATE_TS"] + $arResult["TZ_OFFSET"]), "SHORT") == $todayString)
					{
						?><span class="feed-time"><?=ToLower($comment["DATE_CREATE_TIME"])?></span><?
					}
					else
					{
						?><span class="feed-time"><?=ToLower($comment["DateFormated"])?></span><?
					}?>
					<?if ($arParams["SHOW_RATING"] == "Y")
					{
						?>
						<?$GLOBALS["APPLICATION"]->IncludeComponent(
							"bitrix:rating.vote", $arParams["RATING_TYPE"],
							Array(
								"ENTITY_TYPE_ID" => "BLOG_COMMENT",
								"ENTITY_ID" => $comment["ID"],
								"OWNER_ID" => $comment["AUTHOR_ID"],
								"USER_VOTE" => $arResult["RATING"][$comment["ID"]]["USER_VOTE"],
								"USER_HAS_VOTED" => $arResult["RATING"][$comment["ID"]]["USER_HAS_VOTED"],
								"TOTAL_VOTES" => $arResult["RATING"][$comment["ID"]]["TOTAL_VOTES"],
								"TOTAL_POSITIVE_VOTES" => $arResult["RATING"][$comment["ID"]]["TOTAL_POSITIVE_VOTES"],
								"TOTAL_NEGATIVE_VOTES" => $arResult["RATING"][$comment["ID"]]["TOTAL_NEGATIVE_VOTES"],
								"TOTAL_VALUE" => $arResult["RATING"][$comment["ID"]]["TOTAL_VALUE"],
								"PATH_TO_USER_PROFILE" => $arParams["~PATH_TO_USER"],
							),
							$arParams["component"],
							array("HIDE_ICONS" => "Y")
						);?>
						<?
					}
					if($arResult["CanUserComment"])
					{
						?><a href="javascript:void(0);" class="feed-com-reply" onclick="commentReply('<?=$comment["POST_ID"]?>', '<?=$comment["AUTHOR_ID"]?>', '<?=CUtil::JSEscape($arResult["userCache"][$comment["AUTHOR_ID"]]["NAME_FORMATED"])?>')"><?=GetMessage("BLOG_C_REPLY")?></a><?
					}
					?>
				</div>
				<div class="feed-com-text">
					<div class="feed-com-text-inner">
						<div class="feed-com-text-inner-inner">
							<?=$comment["TextFormated"]?>
						</div>
					</div>
					<div class="feed-post-text-more" onclick="showHiddenComments('<?=$arParams["ID"]?>', this, '<?=$comment["ID"]?>')">
						<div class="feed-post-text-more-but"><div class="feed-post-text-more-left"></div><div class="feed-post-text-more-right"></div></div>
					</div>
				</div>
				<?if(!empty($arResult["arImages"][$comment["ID"]]))
				{
					?>
					<div class="feed-com-files">
						<div class="feed-com-files-title"><?=GetMessage("BLOG_PHOTO")?></div>
						<div class="feed-com-files-cont">
							<?
							foreach($arResult["arImages"][$comment["ID"]] as $val)
							{
								?><span class="feed-com-files-photo"><img src="<?=$val["small"]?>" alt="" border="0" data-bx-image="<?=$val["full"]?>" data-bx-title="<?=$authorName?>"/></span><?
							}
							?>
						</div>
					</div>
					<?
				}?>

				<?
				if($comment["COMMENT_PROPERTIES"]["SHOW"] == "Y")
				{
					$eventHandlerID = false;
					$eventHandlerID = AddEventHandler('main', 'system.field.view.file', Array('CBlogTools', 'blogUFfileShow'));
					foreach ($comment["COMMENT_PROPERTIES"]["DATA"] as $FIELD_NAME => $arPostField)
					{
						if(!empty($arPostField["VALUE"]))
						{
							$APPLICATION->IncludeComponent(
								"bitrix:system.field.view",
								$arPostField["USER_TYPE"]["USER_TYPE_ID"],
								array("arUserField" => $arPostField), null, array("HIDE_ICONS"=>"Y"));
						}
					}
					if ($eventHandlerID !== false && ( intval($eventHandlerID) > 0 ))
						RemoveEventHandler('main', 'system.field.view.file', $eventHandlerID);
				}
				if($comment["CAN_EDIT"] == "Y")
				{
					?>
					<script>
						top.text<?=$comment["ID"]?> = text<?=$comment["ID"]?> = '<?=CUtil::JSEscape(htmlspecialcharsBack($comment["POST_TEXT"]))?>';
						top.title<?=$comment["ID"]?> = title<?=$comment["ID"]?> = '<?=CUtil::JSEscape($comment["TITLE"])?>';
						top.arComFiles<?=$comment["ID"]?> = [];<?
						if (!!$comment["COMMENT_PROPERTIES"]["DATA"] && array_key_exists("UF_BLOG_COMMENT_FILE", $comment["COMMENT_PROPERTIES"]["DATA"])){?>
						top.arComDocs<?=$comment["ID"]?> = <?=CUtil::PhpToJSObject($comment["COMMENT_PROPERTIES"]["DATA"]["UF_BLOG_COMMENT_FILE"]["~VALUE"])?>;
						<?}
						if(!empty($comment["showedImages"]))
						{
							foreach($comment["showedImages"] as $imgId)
								{
									if(!empty($arResult["Images"][$imgId]))
									{
												?>
								top.arComFiles<?=$comment["ID"]?>.push({
										id : '<?=$imgId?>',
										name : '<?=CUtil::JSEscape($arResult["Images"][$imgId]["fileName"])?>',
										type: 'image',
										src: '<?=CUtil::JSEscape($arResult["Images"][$imgId]["source"]["src"])?>',
										thumbnail: '<?=CUtil::JSEscape($arResult["Images"][$imgId]["src"])?>',
										isImage: true
									});
								<?
								}
							}
						}
						?>
					</script>
					<?
				}
				?>

				<div class="feed-com-block-menu" onmousedown="BX.addClass(this, 'feed-com-block-menu-act')" onmouseup="BX.removeClass(this, 'feed-com-block-menu-act')" onclick="BX.addClass(this, 'feed-com-block-menu-act');
					var el = this;
					BX.PopupMenu.show('blog-comment-act-<?=$comment["ID"]."-".$rnd?>', this, [
						{ text : '<?=GetMessage("B_B_MS_LINK")?>', href : '<?=CUtil::JSEscape(str_replace("#comment_id#", $comment["ID"], $arResult["commentUrl"]))?>', className: 'blog-comment-popup-menu'}
						<?if($comment["CAN_EDIT"] == "Y"):?>
							, { text : '<?=GetMessage("BPC_MES_EDIT")?>', onclick : function() {showComment('<?=$comment["ID"]?>', '<?=$arParams["ID"]?>', '', '', '', '', 'Y'); this.popupWindow.close();}, className: 'blog-comment-popup-menu'}
						<?endif;?>
						<?if($comment["CAN_SHOW"] == "Y"):?>
							, { text : '<?=GetMessage("BPC_MES_SHOW")?>', onclick : function() {hideShowComment('<?=$comment["ID"]?>', '<?=$arParams["ID"]?>', false); this.popupWindow.close(); CFbuttonShowWait(el);}, className: 'blog-comment-popup-menu'}
						<?endif;?>
						<?if($comment["CAN_HIDE"] == "Y"):?>
							, { text : '<?=GetMessage("BPC_MES_HIDE")?>', onclick : function() {hideShowComment('<?=$comment["ID"]?>', '<?=$arParams["ID"]?>', true); this.popupWindow.close(); CFbuttonShowWait(el);}, className: 'blog-comment-popup-menu'}
						<?endif;?>
						<?if($comment["CAN_DELETE"] == "Y"):?>
							, { text : '<?=GetMessage("BPC_MES_DELETE")?>', onclick : function() { if(confirm('<?=GetMessage("BPC_MES_DELETE_POST_CONFIRM")?>')) deleteComment('<?=$comment["ID"]?>', '<?=$arParams["ID"]?>'); this.popupWindow.close(); CFbuttonShowWait(el);}, className: 'blog-comment-popup-menu'}
						<?endif;?>
						],
					{
						/*offsetLeft: 10,*/
						offsetLeft: -33,
						offsetTop: 23,
						lightShadow: false,
						angle: {position: 'top', offset: 50},
						events : {
							onPopupClose : function(popupWindow) {BX.removeClass(this.bindElement, 'feed-com-block-menu-act');}
						}
					});" style="display:none;">
					<div class="feed-com-block-menu-but"></div>
				</div>
				</div>
				</div>

				<div id="new_comment_cont_<?=$comment['ID']?>"></div>
				<div id="new_comment_<?=$comment['ID']?>" style="display:none;"></div>
				<div id="err_comment_<?=$comment['ID']?>"></div>
				<div id="form_comment_<?=$comment['ID']?>"></div>
				<?
			}
		}

		if($arResult["is_ajax_post"] != "Y")
		{
			if($arResult["CanUserComment"])
			{
				?>
				<div id="form_comment_<?=$arParams["ID"]?>_0">
					<div id="new_comment_cont_<?=$arParams["ID"]?>_0"></div>
					<div id="new_comment_<?=$arParams["ID"]?>_0" style="display:none;"></div>
					<div id="err_comment_<?=$arParams["ID"]?>_0"></div>
					<div id="form_comment_<?=$arParams["ID"]?>_0"></div>
				</div>
				<div class="feed-com-footer"><a href="javascript:void(0)" onclick="return showComment('0', '<?=$arParams["ID"]?>', '', '', '', 'N', 'N', <?=intval($arParams["LOG_ID"])?>)" style="outline: none;" hidefocus="true"><?=GetMessage("B_B_MS_ADD_COMMENT")?></a></div>
				<?
			}
			?><div class="feed-com-corner"></div></div><?
			if(empty($arResult["CommentsResult"]))
			{
				?>
				<script>
					BX.hide(BX.findChild(BX('blg-post-<?=$arParams["ID"]?>'), {className: 'feed-comments-block'}, true, false));
					el = BX.findChild(BX('blg-post-<?=$arParams["ID"]?>'), {className: 'feed-inform-comments'}, true, false);
					el.innerHTML = '<?=GetMessageJS("B_B_MS_ADD_COMMENT")?>';
					el.style.cursor = 'pointer';
					BX.bind(el, "click", function(){BX.show(BX.findChild(BX('blg-post-<?=$arParams["ID"]?>'), {className: 'feed-comments-block'}, true, false)); showComment('0', '<?=$arParams["ID"]?>', '', '', '', 'N', 'N', <?=intval($arParams["LOG_ID"])?>)});
				</script>
				<?
			}
			if(CModule::IncludeModule("pull") && IntVal($arResult["userID"]) > 0 && !$arParams["bFromList"] /*(!$arParams["bFromList"] || CModule::IncludeModule("bitrix24"))*/)
			{
				?>
				<script>
					BX.PULL.extendWatch('BLOG_POST_<?=$arParams["ID"]?>');
				</script>
				<?
			}
		}
	}
}

if($arResult["is_ajax_post"] == "Y")
	die();
?>