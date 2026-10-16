# Breeze

Manage church member records, families, tags, events, attendance, contributions, forms, and volunteers. Create, update, and delete people profiles with custom fields. Organize members into families and tag-based groups with hierarchical folders. Create and manage church events and calendars, record attendance and check-ins. Add financial contributions with fund allocations, batch grouping, and donor matching. List and manage forms and form entries. Schedule volunteers with role assignments for events. Query the account activity log to detect changes across people, contributions, events, tags, forms, and more.


Use `get_account` to identify the connected church and `list_profile_fields` to
discover profile field IDs. `search_people` accepts Breeze's native filter object
for custom fields and tag criteria. Profile updates resolve field types from the
account before sending typed values; compound fields support `response` and
`details` values.

Event creation expects Unix seconds as strings. Event list/detail tools can
include check-in eligibility settings, and `list_events` can return calendars
and locations. Omitting `isArchived` requests active forms.

See the [integration specification](./docs/SPEC.md) and
[official API reference](https://app.breezechms.com/api).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
