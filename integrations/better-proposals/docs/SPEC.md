# Better Proposals integration

## Authentication

Use an API token from the Better Proposals API key generator. Requests send the token in the `Bptoken` header to `https://api.betterproposals.io`. The provider documents API access on Premium or Enterprise plans after the trial; regenerating the token requires reconnecting with the new value. No OAuth refresh flow is documented.

## Available tools

| Area | Tools |
| --- | --- |
| Proposals | `create_proposal`, `edit_proposal`, `list_proposals`, `get_proposal`, `get_proposal_count`, `generate_document_links` |
| Covers and templates | `create_cover`, `list_templates`, `get_template` |
| Document types | `list_document_types`, `create_document_type` |
| Companies | `list_companies`, `get_company`, `create_company` |
| Quotes | `list_quotes`, `get_quote`, `create_quote` |
| Currencies | `list_currencies`, `get_currency` |
| Account context | `get_settings` |

List endpoints accept optional `page` and `perPage`. Proposal listing also accepts `documentTypeId` and the existing status filter. `get_settings` can retrieve account settings, brand settings, and custom merge tags; `mergeTagsPage` and `mergeTagsPerPage` paginate the merge tags. Select `account` to inspect connected account settings and `brand` to discover the default brand.

`create_proposal` accepts a client company ID or name; the provider requires the company when creating a proposal. Company, template, and document type IDs can be discovered through their list tools. Missing cover, template, brand, currency, tax, and document type settings use the provider's documented behavior. Contact signature requirements are sent only when supplied.

`edit_proposal` updates only supplied settings. Supplying a nonempty contact list replaces the unsigned contact list; the provider protects contacts that already signed. An empty contact list is rejected: omit contacts to keep existing contacts, or provide at least one contact. `generate_document_links` creates personal recipient links without sending email, optionally using existing contacts. Generating links counts as a send and is subject to plan limits, approval rules, and repeated-send restrictions. The returned proposal and recipient URLs open provider pages.

`create_cover` supports a name, background hex color, headline, brand, subheader, text color and alignment, and button style/text. Color values are passed unchanged. Background image or video uploads are not documented for this endpoint.

`create_quote` requires a client company ID and optionally takes quote amounts from a template. `create_company` creates a named client company. Results retain the provider's data and identifiers. Provider errors, including JSON bodies with `status: error`, fail the operation with the provider message.

## API boundaries

This integration uses documented REST endpoints. No native webhook endpoint, identity/profile endpoint, file-download endpoint, or email-send endpoint is documented in the API reference. Proposal lifecycle information is available through listing and detail tools. Pricing-block and cover-edit endpoints are documented but are not exposed by this integration.

## Official source

[Better Proposals API reference](https://betterproposals.io/resources/api/) — authentication, errors, proposals, templates, document types, companies, quotes, currencies, and settings. Reviewed 2026-10-15.
