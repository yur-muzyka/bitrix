<?
if(!CModule::IncludeModule('rest'))
	return;

class CSocNetLogRestService extends IRestService
{
	private static $arAllowedOperations = array('', '!', '<', '<=', '>', '>=', '><', '!><', '?', '=', '!=', '%', '!%', '');

	public static function OnRestServiceBuildDescription()
	{
		return array(
			"log" => array(
				"log.blogpost.add" => array("CSocNetLogRestService", "AddBlogPost"),
			),
			"sonet_group" => array(
				"sonet_group.get" => array("CSocNetLogRestService", "getGroup"),
				"sonet_group.user.get" => array("CSocNetLogRestService", "getGroupUsers"),
				"sonet_group.user.groups" => array("CSocNetLogRestService", "getUserGroups"),
			),
		);
	}

	public static function AddBlogPost($arFields)
	{
/*
		$arFields["apply"] = "Y";
		$arFields["decode"] == "Y" // ???
		$arFields["POST_TITLE"]
		$arFields["POST_MESSAGE"]
		$arFields["SPERM"]

//		$arFields["GRAT"]
//		$arFields["GRAT_TYPE"]
*/

		if (!is_array($_POST))
			$_POST = array();

		$_POST = array_merge($_POST, array("apply" => "Y", "decode" => "Y"), $arFields);

		$strPathToPost = COption::GetOptionString("socialnetwork", "userblogpost_page", false, SITE_ID);
		$strPathToSmile = COption::GetOptionString("socialnetwork", "smile_page", false, SITE_ID);
		$BlogGroupID = COption::GetOptionString("socialnetwork", "userbloggroup_id", false, SITE_ID);

		$arBlogComponentParams = Array(
			"IS_REST" => "Y",
			"ID" => "new",
			"PATH_TO_POST" => $strPathToPost,
			"PATH_TO_SMILE" => $strPathToSmile,
			"GROUP_ID" => $BlogGroupID,
			"USER_ID" => $GLOBALS["USER"]->GetID(),
			"USE_SOCNET" => "Y",
			"MICROBLOG" => "Y"
		);

		ob_start();
		$result = $GLOBALS["APPLICATION"]->IncludeComponent(
			"bitrix:socialnetwork.blog.post.edit",
			"",
			$arBlogComponentParams,
			false,
			array("HIDE_ICONS" => "Y")
		);
		ob_end_clean();

		if (!$result)
			throw new Exception('Error');
		else
			return true;
	}

	public static function getGroup($arFields, $n, $server)
	{
		$arOrder = $arFields['ORDER'];
		if(!is_array($arOrder))
			$arOrder = array("ID" => "DESC");

		$arFilter = self::checkGroupFilter($arFields['FILTER']);
		$arFilter['CHECK_PERMISSIONS'] = 'Y';

		$result = array();
		$dbRes = CSocNetGroup::GetList($arOrder, $arFilter, false, self::getNavData($n));
		while($arRes = $dbRes->Fetch())
		{
			$arRes['DATE_CREATE'] = CRestUtil::ConvertDateTime($arRes['DATE_CREATE']);
			$arRes['DATE_UPDATE'] = CRestUtil::ConvertDateTime($arRes['DATE_UPDATE']);
			$arRes['DATE_ACTIVITY'] = CRestUtil::ConvertDateTime($arRes['DATE_ACTIVITY']);

			if($arRes['IMAGE_ID'] > 0)
			{
				$arRes['IMAGE'] = self::getFile($arRes['IMAGE_ID']);
			}

			unset($arRes['INITIATE_PERMS']);
			unset($arRes['SPAM_PERMS']);
			unset($arRes['IMAGE_ID']);

			$result[] = $arRes;
		}

		return self::setNavData($result, $dbRes);
	}

	public static function getGroupUsers($arFields, $n, $server)
	{
		$GROUP_ID = intval($arFields['ID']);

		if($GROUP_ID > 0)
		{
			$dbRes = CSocNetGroup::GetList(array(), array(
				'ID' => $GROUP_ID,
				'CHECK_PERMISSIONS' => 'Y'
			));
			$arGroup = $dbRes->Fetch();
			if(is_array($arGroup))
			{
				$dbRes = CSocNetUserToGroup::GetList(
					array('ID' => 'ASC'),
					array(
						'GROUP_ID' => $arGroup['ID'],
						'<=ROLE' => SONET_ROLES_USER
					), false, false, array('USER_ID', 'ROLE')
				);

				$res = array();
				while ($arRes = $dbRes->Fetch())
				{
					$res[] = $arRes;
				}

				return $res;
			}
			else
			{
				throw new Exception('Socialnetwork group not found');
			}
		}
		else
		{
			throw new Exception('Wrong socialnetwork group ID');
		}
	}

	public static function getUserGroups($arFields, $n, $server)
	{
		global $USER;

		$dbRes = CSocNetUserToGroup::GetList(
			array('ID' => 'ASC'),
			array(
				'USER_ID' => $USER->GetID(),
				'<=ROLE' => SONET_ROLES_USER
			), false, false, array('GROUP_ID', 'GROUP_NAME', 'ROLE')
		);

		$res = array();
		while ($arRes = $dbRes->Fetch())
		{
			$res[] = $arRes;
		}

		return $res;
	}

	private static function checkGroupFilter($arFilter)
	{

		if(!is_array($arFilter))
		{
			$arFilter = array();
		}
		else
		{
			foreach ($arFilter as $key => $value)
			{
				if(preg_match('/^([^a-zA-Z]*)(.*)/', $key, $matches))
				{
					$operation = $matches[1];
					$field = $matches[2];

					if(!in_array($operation, self::$arAllowedOperations))
					{
						unset($arFilter[$key]);
					}
					else
					{
						switch($field)
						{
							case 'DATE_CREATE':
							case 'DATE_ACTIVITY':
							case 'DATE_UPDATE':
								$arFilter[$key] = CRestUtil::unConvertDateTime($value);
							break;

							case 'CHECK_PERMISSIONS':
								unset($arFilter[$key]);
							break;

							default:
							break;
						}
					}
				}
			}
		}

		return $arFilter;
	}

	private static function getFile($fileId)
	{
		$arFile = CFile::GetFileArray($fileId);
		if(is_array($arFile))
		{
			return $arFile['SRC'];
		}
		else
		{
			return '';
		}
	}
}
?>