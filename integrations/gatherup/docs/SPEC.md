# GatherUp integration

GatherUp manages business locations, customer feedback, and reviews. The integration
uses the provider's supported v1 REST API at `https://app.gatherup.com/api`.
[API v2 documentation](https://apidocs.gatherup.com/) confirms that v1 remains supported.

## Authentication and client targeting

Connect with a bearer token and Client ID from Account Owner Details. The token
is sent as an Authorization bearer header; the Client ID is included in request
parameters. The connection is checked with the provider's test endpoint. This
is static token authentication; the provider does not document token refresh.
See [bearer authentication](https://app.gatherup.com/api/doc/bearer).

Global agency credentials can target a client through the optional `agent`
connection setting. Call `list_agency_clients` to discover client IDs first.
Omit `agent` when using credentials for an individual client. Agency discovery
uses the global credentials without the configured target.
See [agency authentication](https://app.gatherup.com/api/doc/global-api).

## Available workflows

- Discover, create, read, update, search, delete, deactivate, and reactivate
  business locations. `list_business_types` finds valid category names.
- List, create, update, delete, and bulk-import customers. Bulk imports contain
  1–1000 customers; each customer needs email or phone, subject to plan rules.
- Send feedback requests and configure automatic request volumes. Delayed
  creation-time requests only apply in Manual Mode.
- Read first-party feedback and its owner/customer conversation history through
  `get_feedback_responses`. Read third-party reviews and Facebook recommendations.
- Reply to first-party feedback or eligible Google reviews connected through
  Google Business Profile authorization.
- Read survey averages and Google Q&A. Generate review widget or badge HTML,
  returned as embeddable code and a downloadable HTML file.
- Create dashboard users with documented roles and discover agency clients.

The API paginates business and customer/review lists. Returned `totalCount`
fields preserve the number of items in the provider's current page; use `pages`
and `page` to retrieve remaining results. Numbered responses are requested
explicitly for v1 list and survey operations.

## Provider constraints

Basic-plan customer imports require an email address; higher plans accept email
or phone. Update-customer docs label custom/job IDs as integers, while creation
and lookup support string identifiers. Existing string inputs are retained.
Update-business docs mark the business type required, although other fields are
partial updates; the existing optional business type input is retained.

No suitable current-user/profile endpoint is documented. API v2 includes
additional reporting and administration endpoints beyond this integration.
