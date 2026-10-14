# PostGrid Verify Specification

## Authentication

Use an Address Verification API key from the PostGrid Developers dashboard. Requests use the `x-api-key` header. Secret keys are required for batch verification; public keys may be restricted to browser origins. The API key is validated for a non-empty value and stored without surrounding whitespace.

## API coverage

Standard US/Canada requests use `https://api.postgrid.com/v1/addver`; international requests use `https://api.postgrid.com/v1/intl_addver`.

- `verify_address` and `verify_international_address` accept exactly one of `freeformAddress` or structured `address`.
- `batch_verify_addresses` and `batch_verify_international_addresses` preserve input order, support up to 2,000 addresses, and retain individual failures.
- `autocomplete_address` returns a `previewId` selection token containing the partial-street search and candidate index when the provider supplies preview-only results. `complete_address_suggestion` resolves that token with the documented index-based standard completion request and verification. Provider-issued legacy IDs remain accepted.
- `autocomplete_international_address` and `complete_international_address_suggestion` use provider-issued preview IDs. Non-address suggestions can be drilled down using `containerId`. Requesting geographic data after completion performs a separate international verification.
- `get_lookup_info` reads standard lookup usage, plan status, and a nullable unlimited lookup limit.
- `parse_address` separates a freeform address into components without claiming deliverability.
- `lookup_city_state` reads US/Canadian localities for a postal or ZIP code.

Standard failed verification results may contain null address components. International coordinate strings are converted to numeric latitude and longitude to preserve the tool output contract; `geoAccuracy` is exposed through `accuracy`. The current international `verificationStatus` is also exposed through the existing summary `status` field. Detailed components and individual batch error messages remain available.

## Official references

- [Getting started and API keys](https://guides.postgrid.com/address-verification/getting-started-1/)
- [Address verification concepts](https://guides.postgrid.com/address-verification/concepts/)
- [Standard API reference](https://guides.postgrid.com/api/typescript/resources/addressVerification/)
- [Standard autocomplete](https://guides.postgrid.com/api/typescript/resources/addressVerification/methods/autocomplete/)
- [International API reference](https://guides.postgrid.com/api/typescript/resources/intlAddressVerification/)
- [International completion](https://guides.postgrid.com/api/typescript/resources/intlAddressVerification/methods/autocomplete/)

## Limits

Address verification and autocomplete are read-only operations that consume lookups according to the account plan. Preview requests do not consume lookups. Geocoding must be enabled for the account and may incur an additional lookup. No webhook or identity tool is exposed because the documented Address Verification API has no suitable account-profile or webhook endpoint.
