# Cardly API integration

Uses Cardly API v2 with API-key authentication via the `API-Key` header. JSON requests use `Content-type: text/json`. Test keys validate operations without mutating provider data; live keys can place billable orders.

The tools cover ordering and preview PDFs, artwork, templates, contact lists and contacts, design resources, account balances and credit history, users and invitations, and webhook subscriptions. `get_contact` retrieves a known contact ID; `list_invitations` discovers pending invitation IDs for subsequent management. The official API does not expose a current-user or organisation identity endpoint.

List responses read `data.results` and `data.meta`. Existing public field names are mapped to Cardly's API contract: contact `city` to `locality`, custom fields to `fields`, webhook `url` to `targetUrl`, enabled state to the inverse of `disabled`, and arrival dates to each order line's `requestedArrival`. Order responses expose actual item, cost, customer reference, and timing details.

Card and envelope previews are downloadable PDFs. The structured preview output preserves the full provider response, including original document URLs, costs, delivery estimates, and expiry. Expired document URLs can be renewed by regenerating the same preview.

Contact timestamps, contact-list slugs and timestamps, and media/font/writing-style slugs are optional because the documented provider schemas omit them. Contact last names and user first/last names are optional because Cardly documents them as supplied or known conditionally. Actual provider strings are preserved; missing values are omitted. Contact/list outputs also expose the complete original provider record in `raw`. Custom field `slug` values contain the stable provider field code. Doodle slugs remain required because Cardly documents them.

Official sources:

- [API overview, authentication, pagination and idempotency](https://api.card.ly/v2/docs)
- [Cardly OpenAPI 2.2.0](https://api.card.ly/openapi/en-AU/2.2.0/json)

Verification for this refresh is local build and static contract review. No live provider calls, E2E suites, or evals were run.
