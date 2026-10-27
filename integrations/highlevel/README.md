# <img src="https://provider-logos.metorial-cdn.com/highlevel.png" height="20"> HighLevel

Work with contacts, calendars, conversations, opportunities, payment records, blogs, email templates, and Social Planner in one HighLevel sub-account. This integration provides 37 tools through direct HighLevel REST calls.

## Connect a sub-account

Choose either authentication method:

- **OAuth:** configure a HighLevel Marketplace app and connect a single sub-account through the location chooser. The connection requests a Location token, stores the granted permissions, and renews access using the rotated refresh token. Agency and bulk installations are unsupported.
- **Private Integration Token:** create the token inside the intended sub-account, enable the permissions required by your actions, and provide its HTTPS dashboard URL containing `/location/<locationId>`. A sub-account-created token is required; agency-created tokens are unsupported. The connection extracts the account identifier and verifies access to that account through HighLevel's API. This access check does not introspect the token's creation level or grants. Credentials are never sent to the supplied dashboard URL.

Both methods require `locations.readonly` to validate the account. Each tool declares its required OAuth permission; missing OAuth grants produce a reconnect instruction. HighLevel checks Private Integration Token permissions. The [specification](docs/SPEC.md) lists all required scopes. There is no separate account-ID configuration: the connection supplies account context to each request and rejects conflicting location values.

OAuth deployment requires a registered Marketplace app and its configured redirect URI. See [HighLevel's OAuth documentation](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/) and [location-ID guidance](https://help.gohighlevel.com/support/solutions/articles/48001204848-how-do-i-find-my-client-s-location-id-).

## Discover resources before changing them

- Start with `locations_get_location` to inspect the connected sub-account and `locations_get_custom_fields` to discover custom-field identifiers.
- Use `contacts_get_contacts` to search contacts. It uses the current search endpoint with either page-based or cursor pagination. Contact updates preserve omitted properties; supplying `tags` replaces the list, while the add/remove tools change individual tags. Supply the primary email or phone when replacing its additional addresses.
- Use `calendars_get_calendars` to discover calendar identifiers, then fetch events for a calendar, group, or user within an explicit interval. Calendar interval timestamps use milliseconds; message scheduling uses seconds.
- Use `conversations_search_conversation` before reading messages, and `opportunities_get_pipelines` before updating an opportunity's pipeline or stage. A successful send confirms request acceptance, not delivery.
- Payment tools only read orders and transactions from the connected sub-account.
- Discover blog sites, authors, and categories before creating posts. Blog writes require explicit publication state; use `DRAFT` for content that should remain private.
- Email template creation supports HTML/text content and Mailchimp/ActiveCampaign URL imports. Template creation does not send email. `emails_fetch_template` lists template and folder metadata.
- Discover connected social accounts before creating a social post. Supply explicit publishing state and platform-specific options. Drafts also require connected account IDs and an authoring user; OAuth defaults to its connected user when available. Platform limits and provider account configuration still apply; acceptance does not prove publication.

List and search tools return one bounded page and endpoint-specific continuation values. Preserve cursor types when requesting another page. Requests are not automatically replayed after ambiguous timeouts; inspect the provider before retrying a write.

## Scope and verification

The tool names cover the 36 capabilities in HighLevel's [older MCP article](https://help.gohighlevel.com/support/solutions/articles/155000005741-how-to-use-the-highlevel-mcp-server), plus calendar discovery. This is documented capability parity. The article does not publish its full input/output schemas, and the hosted MCP catalog was not verified. The newer [MCP operation catalog](https://marketplace.gohighlevel.com/docs/other/mcp/) is outside this release.

The [complete tool specification](docs/SPEC.md) records endpoints, scopes, pagination, API caveats, source references, and verification status for every tool.

On 2026-10-26, OAuth and Private Integration Token each passed the full live suite with 31 tests passed and 8 explicitly skipped for missing account resources or authorized destinations. OAuth refresh persisted rotated credentials with unchanged account identity. The skipped paths and negative credential-setup cases remain unverified. Outbound messaging and public publishing must use authorized test destinations. The private live suite records missing-fixture coverage explicitly; static/schema checks do not establish delivery, publication, or live OAuth success.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
