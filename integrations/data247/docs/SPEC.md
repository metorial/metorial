# Data247 API integration

## API and authentication

Requests use `https://api.data247.com/v3.0` with an API key in the `key` parameter. JSON is selected explicitly with `out=json`. The [official API manual](https://www.data247.com/api_user_manual) links to the version 3.0 reference, updated June 19, 2026.

## Capabilities

Existing lookup keys and input contracts remain available. Requests use the documented service identifiers: `MT`, `CU`, `CI`, `CT`, `VE`, `VA`, `VP`, `AP`, `AE`, `APR`, `AER`, `AN`, `AG`, `AZ`, `AZR`, `AR`, `ARE`, `GI`, `DC`, and `TI`.

- `get_account_info` uses `QR` to inspect account access and service rates.
- `get_usage` uses `QU` with a `today`, `month`, or `year` period.
- `verify_phone_owner` uses `VO` with a phone and either a subscriber name or company.

Batch queries use the documented POST JSON format rather than the limited numbered-phone parameter format. Query-level status is returned when present. Numeric and boolean provider scalars are represented as strings in existing string-valued outputs. Original structured results are additionally available for profile, property, and fraud responses.

Provider failures and invalid local input produce actionable errors. DNC access is configured with Data247; existing optional organization and subscription parameters remain supported. The legacy phone-spam option and its request are retained because omission from the current manual does not establish retirement.

## Verification limits

The refresh was checked against public documentation and local builds. Provider acceptance, account access, legacy phone-spam behavior, and billing require authorized live verification.
