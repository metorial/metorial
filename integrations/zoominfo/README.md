# ZoomInfo

Search and enrich B2B contact and company data through ZoomInfo's current GTM Data API. Discover intent topics and accepted filter/output-field values, retrieve scoops and news, inspect corporate hierarchy and technologies, and track request limits and credits.

## Authentication

OAuth PKCE and OAuth Client Credentials use the documented GTM OAuth endpoints. Connections persist their API dialect; older stored connections fall back to the existing apiVersion configuration. Usage access verifies current credentials without claiming that a usage-resource ID is a user identity.

Existing Enterprise username/password and PKI connection keys remain available. PKI requires a ZoomInfo username and signs an RSA assertion locally; the private key is never sent to ZoomInfo. Current public GTM documentation does not establish availability of every legacy endpoint. Confirm Enterprise API availability and entitlement with ZoomInfo before using it.

## Tools

- Search Contacts and Search Companies return previews with provider IDs. Enrich Contacts and Enrich Companies retrieve selected fields for up to 25 matches.
- Search Intent and Enrich Intent use subscribed topics from Lookup Data. Current audience strength values are letters A–E; legacy numeric input remains available for Enterprise connections.
- Search Scoops accepts provider lookup values, keywords and a publishing date.
- Search News uses categories, URLs or a publishing date. Current company-specific news uses credit-consuming enrichment and requires allowCompanyEnrichment=true. Legacy keyword search remains specific to Enterprise connections.
- Enrich Corporate Hierarchy and Enrich Technographics inspect a selected company. Name/domain technology lookups require an exact, complete company match; provide companyId when discovery is ambiguous.
- Get API Usage returns provider usage and credit limits.
- Lookup Data discovers accepted values. Lookup Fields discovers input/output field names.
- WebSights IP Lookup and Compliance Check retain their Enterprise contracts. They are absent from the current published GTM Data API and require separately confirmed routes and entitlement. Compliance results do not establish legal compliance or authorize outreach.

Search and lookup do not consume enrichment credits, but provider request and record limits still apply. Enrichment can consume credits and retain purchased-record/usage history. Pagination totals are returned only when ZoomInfo supplies them. Current JSON:API records retain their id, type, attributes and matching metadata; NoMatch records are returned but excluded from matchCount.

The current API has no contact/company CRUD or purchase-history deletion workflow. This integration does not send outreach, manage campaigns or invent administrative cleanup routes.

Official reference: [GTM Data API](https://docs.gtm.ai/reference/data-api-overview), [OAuth](https://docs.gtm.ai/docs/authorization-code-flow-pkce), [API usage](https://docs.gtm.ai/reference/userinterface_userusage).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
