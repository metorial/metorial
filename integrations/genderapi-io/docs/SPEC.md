# GenderAPI.io specification

Estimate gender from a first name, full name, email address or username, validate and format phone numbers, and monitor account credits. Predictions describe naming patterns; they do not verify an individual's identity.

## Authentication and configuration

Connect with an API key from [app.genderapi.io](https://app.genderapi.io). Requests use `Authorization: Bearer <API_KEY>` over HTTPS to `https://api.genderapi.io`. The connection checks `GET /api/remaining` to validate the key and show the remaining balance. No OAuth, scopes, refresh tokens, account IDs or additional configuration are required.

## Existing V1 tools

- `detect_gender`: exactly one name, email or username; optional two-letter country context and AI fallback. `forceToGenderize` is supported for names and usernames, but not emails. Returns the original query, analyzed name, nullable gender, percentage probability, sample count and credit usage.
- `detect_gender_bulk`: exactly one homogeneous input array. Submit 1–100 names or 1–50 emails/usernames, optionally with country and string reference IDs. AI options are unavailable in V1 bulk requests.
- `validate_phone`: validate and format a number. Supply address context when the number lacks an international `+` prefix. Returns the provider's validity, formatting, number type and geographic metadata.
- `check_usage`: remaining account credits, the package expiration timestamp and its formatted representation.

The V1 routes and public input/output contracts remain available. Invalid combinations, provider error responses and malformed required response fields raise clear errors.

## Current V2 prediction tools

- `predict_gender_v2`: one typed value (`name`, `email` or `username`), optional uppercase country context, AI mode and nickname inference.
- `predict_gender_batch_v2`: 1–50 mixed typed values, with per-item country/AI options and optional source record IDs. Each outcome retains its index, prediction or item error, and billed credits when supplied.

V2 returns the original `data` and `meta` envelope, including nullable name/gender/country/confidence/sample counts, confidence kind, prediction source, request ID and billing metadata. Confidence is a fraction from 0 to 1. Single requests default to AI fallback; batch items default to AI off. Nickname inference requires fallback mode. Automatic fallback costs 1 credit in total; forced AI can cost 2. Unknown predictions are successful billable outcomes. Inspect per-item errors and billing status before retrying a batch.

## Boundaries

No identity/profile endpoint appears in the official API contract; balance endpoints do not identify a person or account. There are no documented webhook or event receiver APIs. These tools return structured JSON and do not create downloadable files.

## Official references

- [V1 reference](https://www.genderapi.io/api-documentation/v1)
- [Authentication](https://www.genderapi.io/docs-authentication)
- [V2 documentation](https://www.genderapi.io/api-documentation)
- [Canonical V2 OpenAPI](https://api.genderapi.io/api/v2/openapi.json)
- [V1 to V2 migration](https://www.genderapi.io/docs/v2/migration)
