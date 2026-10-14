# Sender integration

The integration uses Sender's documented v2 REST API at `https://api.sender.net/v2` with a Bearer API access token from account settings. There are no connection configuration fields or OAuth scopes.

## Tools

- Subscribers: `create_subscriber`, `update_subscriber`, `get_subscriber`, `delete_subscribers`, `list_subscribers`, and `manage_subscriber_groups`.
- Groups and segments: `manage_group`, `list_groups`, and `list_segments`.
- Discovery: `list_fields` returns custom-field names, including their template braces; `list_workflows` lists workflow IDs and supports page, limit, status, and title-prefix filtering.
- Campaigns: `create_campaign`, `list_campaigns`, `get_campaign`, and `get_campaign_statistics`. Creation produces a draft. Campaign sending and scheduling are outside this tool set.
- Transactional delivery and automation: `send_transactional_email` sends custom content or a transactional template, with variables, custom headers, and publicly accessible HTTPS file URLs; `start_workflow` enrolls a subscriber in an existing active workflow.

## Response compatibility

Subscriber read tools expose a string `subscriberKey` for current opaque IDs; `subscriberId` retains its numeric type and is optional for legacy numeric responses. Channel statuses read the documented nested `status` object while retaining legacy response aliases. SMS status is omitted if the provider does not return it. Subscriber custom fields retain the string-map output and convert the documented field-list values to strings, keyed by field name when provided or field ID otherwise. Use `list_fields` for write keys.

Campaign content format reads the documented `editor` property and retains the legacy `content_type` alias. Campaign and engagement list endpoints accept either array data or the single-object data shown in endpoint examples. Workflow lists and subscriber lists follow the documented paginated array envelope.

Group additions use `subscribers_added_to_group` and accept the legacy response key. Removal can return only an overall confirmation: in that case the tool exposes `success` and `confirmationMessage`, with empty individual result arrays, and does not claim per-subscriber success.

## Official references

- [Authentication](https://api.sender.net/authentication/) and [errors](https://api.sender.net/errors/)
- [Pagination](https://api.sender.net/pagination/)
- [Create subscriber](https://api.sender.net/subscribers/add-subscriber/), [get subscriber](https://api.sender.net/subscribers/get-one/), [list subscribers](https://api.sender.net/subscribers/list-all/), [update subscriber](https://api.sender.net/subscribers/update-subscriber/)
- [Add group membership](https://api.sender.net/subscribers/add-group/) and [remove group membership](https://api.sender.net/subscribers/remove-group/)
- [List fields](https://api.sender.net/fields/get-all/) and [list workflows](https://api.sender.net/workflows/list/)
- [Create campaign](https://api.sender.net/campaigns/create-campaign/), [list campaigns](https://api.sender.net/campaigns/get-all/), [get campaign](https://api.sender.net/campaigns/get-one/)
- [Transactional delivery](https://api.sender.net/transactional-campaigns/send-transactional/), [template delivery](https://api.sender.net/transactional-campaigns/send-campaign/), and [attachment limits](https://www.sender.net/help/transactional-emails/attachments-and-size-limits/)

The documented REST catalog does not expose a profile/self/account identity endpoint. Sender's separate hosted MCP account tool uses different OAuth authentication and is outside this integration's REST API scope.
