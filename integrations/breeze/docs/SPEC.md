# Breeze integration specification

Breeze ChMS manages church people, families, tags, events, attendance, giving,
forms, and volunteers. This integration exposes 25 tools for those workflows.

## Authentication and connection settings

Use the account API key in the `Api-Key` header and configure the church's
subdomain from its `https://<subdomain>.breezechms.com` address. API keys are
account credentials; this integration does not implement OAuth. The existing
optional `teamId` setting is retained for connections that already use it; the
current public API reference does not document its header.

`get_account` retrieves the connected account identity. The authentication
profile label is generic because the authentication callback has no account
subdomain; retrieving the account requires the connection configuration.

## Tools

| Area | Tool keys |
| --- | --- |
| People and profile fields | `list_people`, `search_people`, `get_person`, `create_person`, `update_person`, `delete_person`, `list_profile_fields` |
| Families | `manage_family` |
| Tags and folders | `list_tags`, `manage_tag`, `assign_tag` |
| Events and discovery | `list_events`, `get_event`, `create_event`, `delete_event` |
| Attendance | `manage_attendance`, `list_attendance` |
| Giving | `add_contribution` |
| Forms | `list_forms`, `list_form_entries`, `remove_form_entry` |
| Volunteers | `manage_volunteers`, `manage_volunteer_roles` |
| Account | `get_account`, `query_account_log` |

`search_people` accepts Breeze's filter object, enabling custom profile field
criteria and the provider's tag-filter syntax. `list_people` retains its existing
convenience filters. Discover profile field IDs and option IDs with
`list_profile_fields`.

`create_person` and `update_person` accept a map of profile field IDs to values.
They retrieve the field definitions and send Breeze's typed field-update array.
Compound values can be objects with `response` and `details`; for example an email
field can use `{"response":true,"details":{"address":"member@example.com"}}`.
Checkbox values may be arrays, producing one field-update entry per selected value.

Event creation accepts Unix seconds as strings in `startsOn` and `endsOn`.
Strings are passed through unchanged for compatibility; callers must supply the
provider's supported timestamp format. The existing `previous` and `next`
schedule options map to `before` and `after`. Event list/detail calls can include
eligibility settings. Calendars and locations are available through the
`includeCalendars` and `includeLocations` options on `list_events`.

Omitting `isArchived` on `list_forms` requests active forms. Set it to true for
archived forms. Form field definitions are available through `list_forms.formId`.

Outputs retain provider records, including nested nulls and extra metadata.
`get_account` includes both its established identity fields and an additional
complete account summary. Provider failures and invalid responses raise errors;
missing provider data is not substituted with success, empty IDs, or empty lists.

## Limits

The public reference notes that event responses may lag behind changes because
of caching. Provider limits remain provider-controlled; no response counts,
names, timestamps, or pagination defaults are invented. Numeric tool inputs keep
their number schemas, with whole-number and documented limit checks at runtime.
There are no file download/export tools or webhook triggers in this package.
No live provider verification was performed for this refresh.

## Official references

- [API reference](https://app.breezechms.com/api)
- [People and filters](https://app.breezechms.com/api#list_people)
- [Profile updates](https://app.breezechms.com/api#update_person)
- [Events](https://app.breezechms.com/api#list_events)
- [Account identity](https://app.breezechms.com/api#account_summary)
- [Payment integration example](https://app.breezechms.com/api#payment_integration)
- [Provider PHP wrapper and API-key header](https://github.com/BreezeChMS/breeze-api-v1/blob/master/breeze.php)
