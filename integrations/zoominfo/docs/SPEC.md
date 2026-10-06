# ZoomInfo API coverage

This integration exposes 15 tools for ZoomInfo data discovery and enrichment. Current connections use the GTM Data API at `https://api.zoominfo.com/gtm`; legacy Enterprise connections retain their original dialect and require independently confirmed availability and entitlement. The supported tools do not create CRM records, send outreach, or register webhooks. See the [current API overview](https://docs.gtm.ai/reference/api-overview).

## Authentication and connection migration

OAuth Authorization Code with PKCE uses `https://api.zoominfo.com/gtm/oauth/v1/authorize` and exchanges codes at `https://api.zoominfo.com/gtm/oauth/v1/token`. Requests use S256, callback state, and client credentials in HTTP Basic authentication. The same token endpoint supports client credentials for eligible Standard applications. Partner applications require the user authorization flow. Token lifetimes come from `expires_in`; no fixed lifetime is assumed. See [PKCE](https://docs.gtm.ai/docs/authorization-code-flow-pkce) and [client credentials](https://docs.gtm.ai/docs/client-credentials-flow).

ZoomInfo rotates refresh tokens and invalidates the used token. A refresh response must supply its replacement; the invalidated token is never retained as a fallback. See [refresh tokens](https://docs.gtm.ai/docs/refresh-tokens-flow).

The five Data API scopes cover contacts, companies, intent, news and scoops. Access also depends on the application's scopes and account entitlements. Usage access validates credentials without claiming an authenticated user identity. See [scopes](https://docs.gtm.ai/docs/zoominfo-oauth-scopes) and [usage](https://docs.gtm.ai/reference/userinterface_userusage).

The retained `legacy_password` and `legacy_pki` methods call `https://api.zoominfo.com/authenticate`. PKI requires a username, client ID and RSA private key; the key stays local and signs an RS256 assertion with the documented audience and issuer. The returned JWT's expiry is used only for refresh scheduling. Existing auth method keys and stored configuration remain compatible. New auth output persists the API dialect and takes precedence over legacy configuration fallback. The protocol is grounded in ZoomInfo's [official legacy authentication client](https://github.com/Zoominfo/api-auth-python-client/blob/master/zi_api_auth_client/zi_api_auth_client.py); this does not prove current availability of every legacy data route.

## Tools and request boundaries

| Tools | Current API operation |
| --- | --- |
| Search Contacts / Search Companies | POST `/data/v1/contacts/search` / `/data/v1/companies/search` |
| Enrich Contacts / Enrich Companies | POST `/data/v1/contacts/enrich` / `/data/v1/companies/enrich` |
| Search Intent / Enrich Intent | POST `/data/v1/intent/search` / `/data/v1/intent/enrich` |
| Search Scoops | POST `/data/v1/scoops/search` |
| Search News | POST `/data/v1/news/search`; explicitly authorized company requests use `/data/v1/news/enrich` |
| Enrich Corporate Hierarchy | POST `/data/v1/companies/corporate-hierarchy/enrich` |
| Enrich Technographics | POST `/data/v1/companies/technologies/enrich` |
| Get API Usage | GET `/data/v1/users/usage` |
| Lookup Data | GET `/data/v1/lookup/{fieldName}` |
| Lookup Fields | GET `/data/v1/lookup/search` or `/data/v1/lookup/enrich` |
| WebSights IP Lookup / Compliance Check | Retained legacy-only routes; no current GTM replacement is assumed |

Current requests and responses use JSON:API resource envelopes. Search pagination uses `page[number]` and `page[size]`, with page sizes from 1 to 100; totals are included only when supplied by the provider. Contact/company enrichment supports 1–25 matches and selected output fields. The endpoint request schema nests `matchPersonInput` or `matchCompanyInput` and `outputFields` under `data.attributes`. See [contact enrichment](https://docs.gtm.ai/reference/enrichinterface_enrichcontact), [company enrichment](https://docs.gtm.ai/reference/enrichinterface_enrichcompany) and [hierarchy](https://docs.gtm.ai/reference/enrichinterface_enrichcorporatehierarchy). A contact-search tutorial currently shows a conflicting enrichment envelope; the integration follows the endpoint schema.

Current intent requests require subscribed topics; current audience strength uses A–E. Unsupported legacy city, numeric intent-strength, and news keyword inputs remain in their public schemas but receive explicit validation on current connections. Current publishing-date filters require a calendar day and reject timestamp precision loss. Name/domain technology and company-news requests must resolve one exact company before enrichment; callers can supply the company ID directly. Technology product filters are validated before any billable request and applied to the returned data. See [intent](https://docs.gtm.ai/reference/searchinterface_searchintent), [news enrichment](https://docs.gtm.ai/reference/enrichinterface_enrichnews), [technology enrichment](https://docs.gtm.ai/reference/enrichinterface_enrichtechnology) and [field discovery](https://docs.gtm.ai/reference/lookupenrichinterface_lookupenrich).

## Costs, errors and verification limits

Search and lookup do not consume enrichment credits, but request and record limits apply. Enrichment can consume credits and establish retained purchased-record/usage history. Failed and unmatched enrichment has endpoint-specific billing rules. No history-deletion workflow is assumed. See [credit usage](https://docs.gtm.ai/docs/credit-usage-and-limits).

The client checks response status and envelopes, preserves matching metadata, excludes unmatched results from match counts, and exposes safe failures without transport credentials or raw provider payloads. Redirects are disabled. It does not automatically retry potentially billable enrichment requests.

Private live verification requires dedicated-account setup, controlled company/contact fixtures, separate data/credit/retained-history approvals and independent provider readbacks. Usage resource binding is not a verified account or user identity. Legacy routes require separate availability and entitlement confirmation. Static verification alone does not establish live account access or legacy service availability.
