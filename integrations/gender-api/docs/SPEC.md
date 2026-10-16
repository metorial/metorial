# Gender API Integration

This integration uses API v2 bearer-token authentication. Create a token in the [account dashboard](https://gender-api.com/en/account/auth-tokens). The connection stores only the existing `token` credential and has no required configuration fields.

## Tools

- `detect_gender`: classify a first name, full name, or email address with optional country, browser locale, or IP localization. Existing single-query routes and the legacy `strict` parameter are retained. Current documentation only guarantees strict surname handling on the v1 split endpoint; the existing v2 option is forwarded unchanged.
- `country_of_origin`: return country probabilities and regions, plus the name language, meaning, ethnic group distribution, and complete provider response. The interactive map link is returned only when the provider supplies it.
- `account_statistics`: report the remaining credits, limit state, request cost, and previous month's usage. `creditsUsed` is the cost of the statistics request, not current-month usage.
- `detect_gender_batch`: submit 1–100 first-name queries to the documented unified `/v2/gender` endpoint with optional per-entry localization and correlation IDs. Some tokens restrict batches to three queries. Each lookup costs one credit. Results retain the provider's original fields.

The service provides statistical name-based predictions rather than a person's self-reported identity. Unknown results and missing name metadata must be handled by callers. Country-of-origin lookups cost two credits. The API documents no suitable current-user profile endpoint, webhooks, or event subscriptions. Account statistics provide the available account-level read operation.

## Compatibility and errors

The original tool keys and input types, optionalness, defaults, and request precedence remain available. Multiple identifiers in `detect_gender` retain the existing firstName, fullName, email precedence; callers should submit one identifier. Origin requests retain the existing fields. Omitted surname and map values are not replaced with invented strings. Sparse full-name metadata and map links may be absent as shown in the provider's complete examples.

HTTP errors and explicit failure envelopes use structured service errors, retaining provider messages and error codes. Credit exhaustion is preserved as the provider's `limit-exceeded` condition, including any upgrade URL in its error details. No OAuth refresh or file delivery is involved.

## Official references

- [API v2](https://gender-api.com/en/api-docs/v2)
- [Name splitting and sparse full-name response](https://gender-api.com/en/split-first-and-last-name)
- [Country-of-origin response](https://gender-api.com/en/api-docs/v2/country-of-origin)
- [Account statistics](https://gender-api.com/en/api-docs/v2/statistic)
- [Error codes and account limits](https://gender-api.com/en/api-docs/v2/error-codes)
- [Bulk lookup limits](https://gender-api.com/en/bulk-gender-lookup)

Verification in this refresh is offline. Provider execution and credit/account-specific behavior have not been live-tested.
