let eventTypeMap: Record<number, string> = {
  // User events
  1000: 'user.logged_in',
  1001: 'user.changed_password',
  1002: 'user.updated_2fa',
  1003: 'user.disabled_2fa',
  1004: 'user.recovered_2fa',
  1005: 'user.failed_login',
  1006: 'user.failed_login_2fa',
  1007: 'user.exported_vault',
  1008: 'user.updated_temp_password',
  1009: 'user.migrated_key_connector',
  1010: 'user.requested_device_approval',
  1011: 'user.tde_offboarding_password_set',

  // Cipher/Item events
  1100: 'item.created',
  1101: 'item.updated',
  1102: 'item.deleted',
  1103: 'item.attachment_created',
  1104: 'item.attachment_deleted',
  1105: 'item.shared',
  1106: 'item.updated_collections',
  1107: 'item.viewed',
  1108: 'item.toggled_password_visible',
  1109: 'item.toggled_hidden_field_visible',
  1110: 'item.toggled_card_code_visible',
  1111: 'item.copied_password',
  1112: 'item.copied_hidden_field',
  1113: 'item.copied_card_code',
  1114: 'item.autofilled',
  1115: 'item.soft_deleted',
  1116: 'item.restored',
  1117: 'item.toggled_card_number_visible',

  // Collection events
  1300: 'collection.created',
  1301: 'collection.updated',
  1302: 'collection.deleted',

  // Group events
  1400: 'group.created',
  1401: 'group.updated',
  1402: 'group.deleted',

  // Org user events
  1500: 'member.invited',
  1501: 'member.confirmed',
  1502: 'member.updated',
  1503: 'member.removed',
  1504: 'member.updated_groups',
  1505: 'member.unlinked_sso',
  1506: 'member.reset_password_enroll',
  1507: 'member.reset_password_withdraw',
  1508: 'member.admin_reset_password',
  1509: 'member.reset_sso_link',
  1510: 'member.first_sso_login',
  1511: 'member.revoked',
  1512: 'member.restored',
  1513: 'member.approved_auth_request',
  1514: 'member.rejected_auth_request',
  1515: 'member.deleted',
  1516: 'member.left',
  1517: 'member.automatically_confirmed',
  1518: 'member.self_revoked',

  // Organization events
  1600: 'organization.updated',
  1601: 'organization.purged_vault',
  1602: 'organization.exported_vault',
  1603: 'organization.vault_accessed',
  1604: 'organization.enabled_sso',
  1605: 'organization.disabled_sso',
  1606: 'organization.enabled_key_connector',
  1607: 'organization.disabled_key_connector',
  1608: 'organization.sponsorships_synced',

  // Policy events
  1700: 'policy.updated',

  // Provider events
  1800: 'provider_user.invited',
  1801: 'provider_user.confirmed',
  1802: 'provider_user.updated',
  1803: 'provider_user.removed',
  1900: 'provider_organization.created',
  1901: 'provider_organization.added',
  1902: 'provider_organization.removed',
  1903: 'provider_organization.vault_accessed',

  // Domain events
  2000: 'domain.added',
  2001: 'domain.removed',
  2002: 'domain.verified',
  2003: 'domain.not_verified',

  // Secret events (Secrets Manager)
  2100: 'secret.retrieved',
  2101: 'secret.created',
  2102: 'secret.edited',
  2103: 'secret.deleted',
  2104: 'secret.permanently_deleted',
  2105: 'secret.restored',

  // Project events (Secrets Manager)
  2200: 'project.retrieved',
  2201: 'project.created',
  2202: 'project.edited',
  2203: 'project.deleted',

  // Service account events
  2300: 'service_account.user_added',
  2301: 'service_account.user_removed',
  2302: 'service_account.group_added',
  2303: 'service_account.group_removed',
  2304: 'service_account.created',
  2305: 'service_account.deleted'
};

export let getEventTypeName = (eventTypeCode: number): string => {
  return eventTypeMap[eventTypeCode] ?? `unknown.${eventTypeCode}`;
};
