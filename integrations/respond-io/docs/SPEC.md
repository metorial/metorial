# Respond.io API specification

The integration uses the Respond.io Developer API v2 at `https://api.respond.io/v2` with a workspace API access token sent as `Authorization: Bearer <token>`. Generate tokens under **Settings > Integrations > Developer API**. Developer API access requires Growth Plan or above.

Contacts are addressed with `id:`, `phone:`, or `email:` identifiers. Tools that accept a contact ID construct the `id:` prefix automatically. Create Contact requires a first name and looks up the new profile after the creation acknowledgement. Custom-field input maps are sent as arrays of `{ name, value }` entries; Get Contact returns them as a key-value map.

List Contacts sends `search`, `timezone`, and `$and`/`$or` filter groups. The existing `eq` and `ne` operator aliases map to `isEqualTo` and `isNotEqualTo`. Set the category for tag or lifecycle filters; the `tag` field defaults to the contact-tag category. List operations return the next cursor extracted from the provider pagination URL.

Send Message supports text and media URLs. Send Template Message sends `languageCode` and template components. Simple body parameters may be supplied through `templateParameters`; use `templateComponents` for complete header, body, footer, or button components. Get Message retrieves message content, sender metadata, and delivery history. List Contact Channels discovers channel IDs and latest interaction timestamps.

Conversation management uses `/conversation/status` with `open` or `close`; assignment uses `/conversation/assignee` with a numeric user ID or `null`. Workspace discovery uses the singular `/space/user`, `/space/channel`, and `/space/custom_field` endpoints.

## Sources

- [Developer API guide](https://respond.io/help/integrations/developer-api)
- [API reference](https://developers.respond.io/)
- [Provider TypeScript SDK](https://github.com/respond-io/typescript-sdk)
- [Contact client](https://github.com/respond-io/typescript-sdk/blob/master/src/clients/contact.ts)
- [Conversation client](https://github.com/respond-io/typescript-sdk/blob/master/src/clients/conversation.ts)
- [Messaging client](https://github.com/respond-io/typescript-sdk/blob/master/src/clients/messaging.ts)
- [Workspace client](https://github.com/respond-io/typescript-sdk/blob/master/src/clients/space.ts)
