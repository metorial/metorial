# Unisender Integration Specification

## Authentication and API

The Unisender marketing API uses an API key from account settings. Requests use UTF-8 URL-encoded POST parameters at `https://api.unisender.com/{locale}/api/{method}`, with `api_key` and `format=json`. The locale is `en` or `ru`. Unisender Go uses a separate API and credentials.

Successful responses normally contain `result`; failures contain `error` and `code`. The test email endpoint also documents a direct `message` confirmation. Provider failures and invalid input combinations are returned as structured errors.

## Tools

| Workflow | Tools |
| --- | --- |
| Lists | `get_lists`, `manage_lists` |
| Contacts | `subscribe_contact`, `unsubscribe_contact`, `get_contact`, `import_contacts` |
| Fields and tags | `manage_fields`, `get_fields_and_tags`, `delete_tag` |
| Email messages | `create_email_message`, `update_email_message`, `list_messages`, `send_test_email` |
| Campaigns | `launch_campaign`, `cancel_campaign`, `list_campaigns`, `get_campaign_stats` |
| Individual messages | `send_email`, `send_sms`, `check_email_delivery`, `check_sms_delivery` |
| Templates | `manage_templates`, `get_templates` |
| Account and sender addresses | `get_account_info`, `validate_sender` |

Contact imports accept up to 500 rows. Each row must match the field names, including `email`. Use `email_list_ids` with comma-separated IDs from `get_lists` to set list memberships. Contact lookups request list memberships, custom fields, and activity details.

Email message updates can produce a new version ID. Use the returned `messageId` when launching the updated message. Campaign `count` is retained for compatibility; the current API documents it as always zero. Campaign status filtering applies to the retrieved page.

Date-only listing filters are expanded to the beginning or end of that UTC day. Message listing supplies an all-history start and the current UTC end when dates are omitted. Campaign listing supplies an all-history start when omitted. Pagination uses provider limits: 1–100 messages/templates and 1–10,000 campaigns, with non-negative offsets.

`send_test_email` previews an existing message for verified recipient addresses. `check_email_delivery` accepts up to 500 individual email IDs; the API retains their statuses for one month. `check_sms_delivery` accepts the SMS ID as a string to retain compound IDs exactly.

## Compatibility and documented limits

Existing tool keys, input types, optionality, and output values are preserved. Sender remains optional in the `send_sms` schema, with runtime validation because the API requires a registered sender. Template subject/body remain optional in the schema, with validation for the create action. Custom field type defaults to `string` when omitted. Legacy subscription opt-in value `1` is retained; the current provider documentation lists `0`, `3`, and `4`.

The existing `getUserInfo`, `validateSender`, and `getCheckedEmail` endpoints are retained. Their current official method pages could not be retrieved during this refresh, so their exact provider payloads remain unverified. Import `doubleOptin`, autoresponder series parameters, and template `listId` are also retained for compatibility despite their omission from the retrieved method documentation.

## Official documentation

- [Marketing API](https://www.unisender.com/ru/support/api/common/bulk-email/)
- [Contact methods](https://www.unisender.com/ru/support/category/api/contacts/)
- [Message methods](https://www.unisender.com/ru/support/category/api/messages/)
- [Statistics methods](https://www.unisender.com/ru/support/category/api/statistics/)
- [Template methods](https://www.unisender.com/ru/support/category/api/templates/)
- [Custom fields and tags](https://www.unisender.com/ru/support/category/api/inputs/)

## Verification

Local package build, scoped formatting/lint, registration, schema compatibility, and diff checks are recorded in the refresh report. Provider execution and live delivery were not checked during this refresh.
