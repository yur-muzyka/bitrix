<?if(!Defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true) die();?>

<?if(isset($arParams["TITLE"])):?>
	<div class="order_title"><?=$arParams["TITLE"]?></div>
<?endif;?>
<form id="filter_form">
	<table border="1" cellspacing="0">
		<?foreach ($arParams['FIELDS'] as $fieldID => $arField):?>
			<tr style="height: 35px;">
				<td width="40%" >
					<a id="filter_<?=$fieldID?>" href="javascript:void(0);" onclick="maAdminFilter.showDiv(this);">
						<?=$arField["NAME"]?>:
					</a>
				</td>
				<td width="50%" id="cond_<?=$fieldID?>"><?=$arField["VALUE"]?></td>
				<td width="50%" onclick="maAdminFilter.deleteField('<?=$fieldID?>');" >
					<span style="color: red;">
						Х
					</span>
				</td>
			</tr>
		<?endforeach;?>
	</table>
</form>

<br><a href="javascript:void(0);" onclick="maAdminFilter.addField();">Добавить поле</a>

<div id="float_div" style="display:none;   background: none repeat scroll 0 0 white; position:
absolute; top: 8px; left: 8px; z-index: 1000; padding: 14px 12px; width: 95%; opacity: 0.9;">
	<form id="float_div_form">
		<div id="float_title">Заголовок</div>
		<div id="float_body">Тельце</div>
		<div id="float_bottom" style="margin:30px 0 0 0;">
			<a href="javascript:void(0);" onclick="maAdminFilter.onSaveFieldValue();">Установить</a>&nbsp;
			<a href="javascript:void(0);" onclick="maAdminFilter.hideDiv();">Закрыть</a>
		</div>
	</form>
</div>

<script type="text/javascript">

	app.setPageTitle({title: "<?=$arParams['TITLE']?>"});

	var filterParams = {
							filterFields: <?=CUtil::PhpToJsObject($arParams["FIELDS"])?>,
							filterId: "<?=$arParams["FILTER_ID"]?>",
							applyEvent: "<?=$arParams["JS_EVENT_APPLY"]?>"
						};


	maAdminFilter = new __MAAdminFilter (filterParams);

	fltMenuItems = {
	items: [
		{
			name: "Применить фильтр",
			action: function(){filterApply();},
			icon: "filter"
		},
		{
			name: "Добавить поле",
			action: function(){addFilterField();},
			icon: "add"
		},
		{
			name: "Очистить поля",
			action: function(){resetFields();}
		}
		]
	};

	app.menuCreate(fltMenuItems);

	app.addButtons({
		cancelButton:
		{
			type: "back_text",
			style: "custom",
			position: "left",
			name: "<?=GetMessage('SMOL_BACK');?>",
			callback: function()
			{
				app.closeModalDialog();
			}
		},

		menuButton:
		{
			type:     'context-menu',
			style:    'custom',
			callback: function()
			{
				app.menuShow();
			}
		}
	});

	BX.ready(maAdminFilter.init);

</script>
