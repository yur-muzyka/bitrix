<?php
$push_default_option = array(
	'path_to_listener' => (CMain::IsHTTPS() ? "https" : "http")."://#DOMAIN#".(CMain::IsHTTPS() ? ":8894" : ":8893").'/bitrix/sub/',
	'path_to_websocket' => (CMain::IsHTTPS() ? "wss" : "ws")."://#DOMAIN#".(CMain::IsHTTPS() ? ":8894" : ":8893").'/bitrix/subws/',
	'path_to_publish' => 'http://127.0.0.1:8895/bitrix/pub/',
	'websocket' => 'N',
	'nginx' => 'N',
	'push' => 'N',
);
?>