<?
if(!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true) die();

$arResult["THEME_COMPONENT"] = $this->getParent();
if(!is_object($arResult["THEME_COMPONENT"]))
	$arResult["THEME_COMPONENT"] = $this;

if (!isset($arParams['ELEMENT_SORT_FIELD2']))
	$arParams['ELEMENT_SORT_FIELD2'] = '';
if (!isset($arParams['ELEMENT_SORT_ORDER2']))
	$arParams['ELEMENT_SORT_ORDER2'] = '';
if (!isset($arParams['HIDE_NOT_AVAILABLE']))
	$arParams['HIDE_NOT_AVAILABLE'] = '';
if (!isset($arParams['OFFERS_SORT_FIELD2']))
	$arParams['OFFERS_SORT_FIELD2'] = '';
if (!isset($arParams['OFFERS_SORT_ORDER2']))
	$arParams['OFFERS_SORT_ORDER2'] = '';

$this->IncludeComponentTemplate();
?>