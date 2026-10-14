# Gorgias integration

Gorgias provides per-account helpdesk APIs at `https://{subdomain}.gorgias.com/api`.

## Authentication

Connections support user API keys with HTTP Basic authentication and OAuth2
Bearer tokens. The account subdomain belongs to authentication setup and is saved
with the credentials. Existing stored configuration subdomains remain a fallback
for older connections. OAuth code exchange and refresh use form-encoded requests
with HTTP Basic client authentication. Refresh preserves a previous refresh token
when the provider omits a replacement. Zero or missing token lifetime uses the
documented 24-hour lifetime; positive provider lifetimes are retained.

## Tools

- Tickets: list, get, create, update, delete, and manage ticket tags.
- Messages: create customer/agent messages and internal notes, and list messages.
- Customers: create, update, get, list, and merge secondary customers into a target.
- Tags, macros, and rules: list, create, update, and delete.
- Discovery: get the current user, list/get users, list teams, list saved ticket views,
  and get account information.
- Feedback and search: list satisfaction surveys and search resources.

Use `list_teams` before assigning a ticket to a team. Use `list_views` to discover a
saved view and supply its ID to `list_tickets` for documented ticket filtering.
Lists use cursors and a page limit between 1 and 100. Search uses a maximum of 50
results and defaults to customer search; legacy ticket search and cursor inputs
remain available but are not fully described in the current public reference.

Messages created through these tools use `via: api`. Incoming messages reference a
customer sender. Outgoing messages and internal notes reference an agent sender,
with the current user as the default. Internal notes use `internal-note` and are
private. Outgoing email must route from a connected Gorgias email integration;
`sourceFromAddress` can differ from the agent's email. Message creation does not
prove delivery, which occurs asynchronously in Gorgias.

Ticket priority supports `critical`, `high`, `normal`, and `low`; the existing
`urgent` input remains an alias for `critical`. Rule logic is supplied as
JavaScript `code`. Events map to comma-separated `event_types`, enabled state maps
to `deactivated_datetime`, and higher numeric priority executes first. Legacy
conditions/actions inputs remain in the schema and report a remediation error.
Macro actions accept provider `type`, `name`, `title`, and `arguments`; `args`
remains an alias for `arguments`.

## Sources

- [OAuth2 setup](https://developers.gorgias.com/docs/set-up-oauth2-app-store)
- [User identity](https://developers.gorgias.com/reference/get-user)
- [Tickets](https://developers.gorgias.com/reference/list-tickets)
- [Messages](https://developers.gorgias.com/docs/create-a-new-message-in-ticket-via-api)
- [Customer merge](https://developers.gorgias.com/reference/merge-customers)
- [Rules](https://developers.gorgias.com/reference/create-rule)
- [Macros](https://developers.gorgias.com/reference/the-macro-object)
- [Teams](https://developers.gorgias.com/reference/list-teams)
- [Views](https://developers.gorgias.com/reference/list-views)
- [Search](https://developers.gorgias.com/reference/search-1)
