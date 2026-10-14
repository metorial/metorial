# Autobound Integration

## Authentication

Requests use `X-API-KEY`. Content generation and AI Studio imports use the Content API key from [Autobound settings](https://app2.autobound.ai/settings/api-keys). Content generation requires provider-authorized access under a sales agreement.

The [Signal API portal](https://signalapi.autobound.ai) issues a separate key for company/contact enrichment, account lookup, and signal-type discovery. Choose `signal_api_key` for a signal-only connection. The existing `api_key` method accepts an optional `signalApiKey` for connections that use both API families. Existing connections retain their original token fallback.

## Tools

| Tool key | Endpoint | Behavior |
| --- | --- | --- |
| `generate_content` | `POST https://api.autobound.ai/api/external/generate-content/v3.6` | Generate outreach content for an identified prospect and seller. |
| `generate_insights` | `POST https://api.autobound.ai/api/external/generate-insights/v1.4` | Legacy seller-ranked insights; provider retirement is announced for October 30, 2026. |
| `import_campaign_contact` | `POST https://api.autobound.ai/api/workflows/campaigns/{campaignId}/execute/` | Import named contact fields and optional custom key-value inputs into an existing campaign. Configure field mappings in AI Studio. |
| `enrich_company` | `POST https://signals.autobound.ai/v1/companies/enrich` | Retrieve domain-based company signals with optional type, subtype, and date filters. |
| `enrich_contact` | `POST https://signals.autobound.ai/v1/contacts/enrich` | Retrieve signals and resolved entities for an email address or LinkedIn profile. |
| `get_account` | `GET https://signals.autobound.ai/v1/account` | Return the authenticated account identifier, name, rate limit, and running credit balance. |
| `list_signal_types` | `GET https://signals.autobound.ai/v1/signals/types` | Discover current types, subtype vocabulary, metadata, and optional row counts. |

## Content generation

Provide `contactEmail` or `contactLinkedinUrl`, and `userEmail` or `userLinkedinUrl`. Company URLs override resolved company information. Existing company-domain fields remain accepted and also populate the corresponding company URL override.

All existing content types remain available. Optional `customWritingStyle` works with `writingStyle: custom`; `n` requests one to three alternatives except for sequences; `userCompanyUrl` supplies the seller company override. The existing `sonnet` model value is mapped to the documented `sonnet_3.5` value; additional documented model values are accepted.

The existing string outputs remain strings, using an empty string when the provider reports an unresolved contact field. Existing required content-item insight arrays remain arrays. Sequence steps, character counts, per-item sales assets/value propositions, and sequence insights are exposed additively. `rawResponse` preserves the complete original response, including nullable and additional fields.

## Signals

The public camel-case filters are sent as the documented `signal_types`, `signal_subtypes`, and `detected_after` request fields. Enrichment `limit` is a whole number from 1 to 500, with provider default 20. At most 25 subtypes can be supplied. Discover current company/contact associations and subtype values with `list_signal_types`.

Company output retains `domain`, normalized `signals`, and `signalCount`, plus additive company, summary, coverage, warnings, and complete provider response fields. Existing `variables` values are preserved; when absent, that field retains the complete original signal. Contact output includes the original signal records and the complete provider response. Contact signal coverage may be sparse; use the resolved employer domain with `enrich_company` for company signals.

The catalog supports string-based default results and object-based counted results without flattening either variant. Account credits may contain null numeric fields for exempt keys.

## Legacy insights

`generate_insights` remains registered with its existing key, handler, input schema, and output schema. It is tagged deprecated and points to company/contact enrichment. The provider announces HTTP 410 with code 4006 from October 30, 2026; no retirement or live response has been inferred before that date. Signal enrichment returns structured events rather than seller-ranked insight prose.

## Errors and limits

HTTP failures use the shared structured API error handling. Provider-specific content `errorCode` values and numeric nested error codes are captured before HTTP error normalization. Documented recovery hints, next steps, and validation details remain in error data and messages, including nested retry bodies. Local invalid combinations use service errors without narrowing existing number schemas.

No tools here generate downloadable files. Rate limits, credits, endpoint availability, and contact coverage remain provider-controlled. Unused historical webhook client methods are not registered as tools or triggers.

## Official documentation

- [Content request and response reference](https://autobound-api.readme.io/reference/generate-personalized-content)
- [Content parameters](https://autobound-api.readme.io/docs/parameters)
- [Legacy insight parameters](https://autobound-api.readme.io/docs/parameters-for-generate-insights)
- [AI Studio imports](https://autobound-api.readme.io/docs/add-contact-to-ai-studio-via-api)
- [Company enrichment](https://autobound-api.readme.io/reference/enrichcompany)
- [Contact enrichment](https://autobound-api.readme.io/reference/enrichcontact)
- [Signal types](https://autobound-api.readme.io/reference/listsignaltypes)
- [Account details](https://autobound-api.readme.io/reference/getaccount)
- [Insights retirement announcement](https://autobound-api.readme.io/changelog/generate-insights-api-retires-move-to-the-signal-api)
