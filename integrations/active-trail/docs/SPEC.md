# ActiveTrail integration

## Authentication

Create an API token in **Settings → API Apps** and supply its value as the
`Authorization` header. The fixed API base URL is
`https://webapi.mymarketing.co.il/api`. API tokens can be revoked, restricted by IP,
or assigned an expiry date. They do not use an OAuth refresh-token flow.

## Available capabilities

- Contacts: create, retrieve, update, delete, search, bulk import up to 1,000 contacts,
  inspect group/list memberships and activity, and list subscribers or unsubscribers.
- Groups: list, retrieve, create, rename, delete, and add/remove contacts. Group event
  counts require the provider event type through `get_group.eventType`.
- Mailing lists: list, retrieve, create, delete, inspect members, and add/remove contacts.
  Adding a member requires group IDs from `list_groups`.
- Email campaigns: list, retrieve details/design/schedule/targeting, create, update drafts,
  delete, and create from an existing template. Use `get_account_info` for profile IDs.
- SMS campaigns: list, retrieve, create, update, estimate unsent message usage, and retrieve reports.
  Set `includeNotSent: true` on `list_sms_campaigns` to discover unsent campaigns for estimates.
  Updates send or schedule a campaign only when `isSent` is explicitly true.
- Operational email and SMS: send individual transactional messages. Email calls accept
  1–500 recipients and optional personalization and BCC addresses.
- WhatsApp: discover sending profiles and approved templates, send campaigns and operational
  messages. ActiveTrail requires approved templates for initial messages; free-form content
  is limited to the provider's 24-hour reply window.
- Automations: list, inspect details/design/activation, activate/deactivate, delete, and
  retrieve overview, channel statistics, and start/completion reports.
- Templates: list, retrieve, create, update, delete, and list template categories.
- Webhooks: list, retrieve, create, update, and delete configured callbacks.
- Account data: balances, email/SMS sending profiles, contact fields, content categories,
  executive report, and contact growth.

Most paginated endpoints accept page numbers starting at 1 and limits from 1 to 100.
Templates and mailing-list discovery return their full lists; their legacy `page` and
`limit` inputs remain accepted for compatibility. Date-based endpoints generally
search the last three months when dates are omitted.

The API's account section has no documented current-user or account-identity endpoint;
credit balances and sending profiles are operational account data.

The integration does not download or export files. Template HTML is existing structured
content, returned only when explicitly requested. There are no inbound event triggers.

## Provider documentation

- [API reference](https://webapi.mymarketing.co.il/api/docs)
- [Authentication and API guidance](https://webapi.mymarketing.co.il/api/docs/Guides)
- [Contact management guide](https://webapi.mymarketing.co.il/api/docs/guides/GetView/manage-contacts-with-the-activetrail-api/)
