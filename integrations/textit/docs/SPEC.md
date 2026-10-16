# TextIt integration specification

## Authentication and identity

Use an API token in the `Authorization: Token ...` header over HTTPS. The API is fixed to `https://textit.com/api/v2`; connection config has no duplicate credentials or workspace IDs. Authentication verifies the token through `workspace.json`, and `get_workspace` exposes the current workspace's UUID, name, country, languages, timezone, date style, and anonymous mode.

## Tools

The 29 registered tools cover contact CRUD and bulk actions; contact/group/message/flow/run/campaign/channel/ticket lists; group and label CRUD; field/global creation and updates; single messages and translated broadcasts; flow starts; campaign/event management; ticket assignment, notes, closure, and reopening. Additional discovery/status tools are `list_labels`, `list_fields`, `list_globals`, `list_topics`, `list_users`, `list_broadcasts`, `list_flow_starts`, and `list_campaign_events`.

All list tools return one page, `hasMore`, and nullable `nextCursor`. Continue by passing `cursor` and the same filters. Provider links are validated against the HTTPS TextIt origin and the same resource path; a cursor is sent as a query value rather than followed as a URL. Responses include sanitized provider data in `raw` for details beyond the normalized fields.

Single-message `quickReplies` remain an array of strings and are encoded as provider objects. Broadcasts additionally accept translated media UUIDs and typed quick reply objects. Message listings accept current media objects and legacy media strings while retaining string media references and normalized incoming/outgoing directions. Lists expose metadata; they do not download media files.

Conditional mutation inputs are validated before requests. Partial campaign and campaign-event updates first retrieve the current resource when required to preserve omitted values. Event offsets and delivery hours are validated as integers without narrowing the existing numeric schemas. Ticket action `note` is encoded as `add_note` upstream.

For channels without country or a first synchronization, normalized `country` and `lastSeen` are omitted when the provider returns null; the actual null remains in `raw`. All pre-existing nullable output branches remain nullable.

## Limits

No trigger handlers, webhook registration, archive downloads, media uploads, classifier discovery, or message bulk-action tool are registered. Token rotation is manual; this is not OAuth. Messaging can incur provider or channel charges. Asynchronous acceptance does not establish delivery to recipients.

## Provider references

- [API overview and authentication](https://textit.com/api/v2/)
- [Contacts](https://textit.com/api/v2/contacts), [groups](https://textit.com/api/v2/groups), [fields](https://textit.com/api/v2/fields), [labels](https://textit.com/api/v2/labels)
- [Messages](https://textit.com/api/v2/messages), [broadcasts](https://textit.com/api/v2/broadcasts)
- [Flows](https://textit.com/api/v2/flows), [flow starts](https://textit.com/api/v2/flow_starts), [runs](https://textit.com/api/v2/runs)
- [Campaigns](https://textit.com/api/v2/campaigns), [campaign events](https://textit.com/api/v2/campaign_events)
- [Channels](https://textit.com/api/v2/channels), [tickets](https://textit.com/api/v2/tickets), [topics](https://textit.com/api/v2/topics), [users](https://textit.com/api/v2/users), [workspace](https://textit.com/api/v2/workspace)
- [Provider-owned serializer source](https://github.com/rapidpro/rapidpro/blob/main/temba/api/v2/serializers.py) for validation and nullable channel fields. Its older numeric-message examples differ from current TextIt UUID examples; current TextIt contracts take precedence.
