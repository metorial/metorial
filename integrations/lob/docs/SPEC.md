# Lob Integration Specification

Lob uses HTTP Basic authentication with the API key as username and an empty password. The API base URL is `https://api.lob.com/v1`. Secret test and live keys provide the full API surface; publishable keys are limited to US and international verification and US autocomplete.

## Supported workflows

- Create, retrieve, list, and delete addresses and bank accounts.
- Verify US and international addresses, autocomplete US addresses, and look up the cities and counties associated with a US ZIP code.
- Create, retrieve, and cancel postcards, letters, self-mailers, and checks; list postcards and letters.
- Download PDF previews of supported mail pieces. A preview request returns `ready`, `pending`, or `failed` and the upstream render status when available. Retry a pending request after the suggested delay.
- Create, retrieve, list, update, and delete templates and create template versions.
- Create, retrieve, list, update, send, and delete campaigns. Configure creative designs and audience uploads in Lob before sending.

## Provider requirements

Use either a freeform address or structured fields for address verification. Structured US verification requires a primary line and either a ZIP code or both city and state. Structured international verification requires a primary line and country code.

Bank-account verification uses the `microdepositType` returned by account retrieval: `amounts` requires two whole-cent amounts from 1 to 100; `descriptor_code` requires the six-character statement code starting with `SM`. Verified accounts return a null verification type.

Letters with a return envelope require a positive whole-number `perforatedPage`. Checks require either `message` or `checkBottom`. Existing numeric inputs retain their number schema type and are validated at runtime where the provider requires whole numbers.

Campaign creation supplies the documented `immediate` schedule type. The existing optional string `scheduleSendDate` input is retained for compatibility, but a nonempty value is rejected on create and update because Lob's published schedule-type enum currently lists only `immediate`. Future scheduling modes mentioned in property help are not exposed without a supported API contract. Campaign retrieval still reads an existing `send_date` into the scheduled-date output when the provider returns it.

PDF preview links expire after 30 days. Retrieving the mail piece renews its signed URL. Downloads use the provider's PDF URL and renew it ahead of expiry; existing preview URL output fields remain available.

## Official references

- [Lob API documentation](https://docs.lob.com/)
- [Lob official OpenAPI specification](https://github.com/lob/lob-openapi)
- [Campaign request schema](https://github.com/lob/lob-openapi/blob/main/resources/campaigns/models/campaign_writable.yml)
- [Asset URL contract](https://docs.lob.com/#tag/Asset-URLs)
