# Evenium integration

The [official organizer API reference](https://static.evenium.com/api-docs/organizer/index-json.html)
documents API keys, contacts, events, guests, and sessions. The same reference is
available on [evenium.net](https://evenium.net/api-docs/organizer/index-json.html).

## Connection

Use an access token from Profile → API Key. Requests use HTTPS and the documented
`X-Evenium-Token` header. The connection requires no resource IDs or OAuth scopes.
The public organizer reference does not document a current-user/profile endpoint.

## Tools

- Events: `list_events`, `get_event`, `create_event`, `list_event_parts`.
- Contacts: `list_contacts`, `manage_contact`, `list_contact_events`.
- Participants: `list_participants`, `get_participant`, `add_participant`,
  `update_participant`, `update_participant_status`.

Creation uses API v2; other operations use API v1. Discover event and contact IDs
through list tools. Provider IDs and `ext:` external IDs are accepted as resource
path values. Participant updates may affect the associated contact record.

## Results and compatibility

List tools return one page and available continuation metadata; `totalCount`
preserves the provider's `nbrResults` value and is not guaranteed to be a global
total. Use `more`, `next`, and page offsets to continue.

All original tool keys, input types, and enum values remain. Explicit event date
filters are available; legacy `since`/`until` values remain forwarded unchanged
because the reference uses them inconsistently. Prefer explicit date filters.

Participant first name, last name, and email outputs may be omitted when absent
or null. Their string types remain unchanged. Full provider records, including
custom fields, remain available in `raw`.

Ticketing, attendance writes, contact deletion, bulk import, accommodations,
webhooks, and polling triggers are not implemented. No downloadable-file tools
are exposed. Runtime acceptance requires separate provider verification.
