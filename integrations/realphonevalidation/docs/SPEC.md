# RealPhoneValidation API integration

## Authentication and transport

Use the API token supplied by RealValidation. Requests send `token` and `output=json` to `https://api.realvalidation.com/rpvWebService/` over HTTPS. JSON results and documented XML responses are accepted; XML text values remain strings. No OAuth, scopes, account IDs, or connection config are needed. Empty tokens are rejected before a request. The provider recommends no more than 10 calls per second; the client does not retry billable lookups automatically.

## Tools

| Tool | Provider endpoint and behavior |
| --- | --- |
| `validate_phone` | Full mode uses `TurboV3.php` for connection status, phone type, carrier, caller name, and caller type. Standard mode retains `RealPhoneValidationTurbo.php`, the legacy Turbo endpoint that returns `iscell` and carrier. The current Turbo Standard service is a different response contract. |
| `scrub_phone` | Plus mode uses `ScrubPlus.php`. Basic mode uses `RealPhoneValidationScrub.php`; phone type and carrier can depend on account options. |
| `check_phone_active` | `RealPhoneValidationActive.php` returns L/C/V for active landline/mobile/VoIP, or N for inactive. Active carrier assignment does not prove subscriber connectivity. |
| `identify_phone_type` | `WirelessID.php` returns the provider phone-type code. |
| `dnc_lookup` | `DNCLookup.php` or `DNCPlus.php`. The provider requires a SAN before using these services. Unknown or missing list checks fail explicitly; they are never reported as false. Plus mode also returns connection status. |
| `score_fraud_risk` | `RealPhoneValidationFraudChk.php` returns risk score, recommendation, phone/carrier details, and location. The complete provider response includes numbering details and partial-transaction metadata. |
| `check_reassigned_number` | `ReassignedNumberLookup.php` sends `phone` and `contact_date` in YYYY-MM-DD format. Returns reassignment status and transaction ID. |
| `verify_email` | Retains legacy `EmailVerify.php` and its validity, disposable, and connected-network fields. |
| `validate_email_lightning` | Current `RealEmailLightning.php` returns reachability, catch-all, disposable, free-service, ISP, and caution flags with transaction ID and complete response. Y/N/? results remain provider strings; ? means unknown. |

Phone services accept exactly 10 numeric US digits. Consent dates must be valid calendar dates. Provider HTTP failures, error return codes, incomplete required results, and unresolved DNC checks raise an actionable service error. Validation outcomes such as disconnected phone numbers and invalid email status remain results when the provider successfully completed the request. No absent risk score or identifier is synthesized.

## Capability boundaries

The public API catalog documents request-response validation services, with no suitable current-account/profile endpoint, REST batch lifecycle, or event/webhook API. Portal and FTP bulk validation are outside these tools. No file output is produced. The legacy Turbo carrier contract is preserved rather than silently changing existing standard-mode output fields.

## Official references

- [API catalog](https://realphonevalidation.com/api-documentation/)
- [API best practices](https://realphonevalidation.com/api-best-practices/)
- [Turbo V3](https://realphonevalidation.com/api-documentation/turbo-v3-api-doc/) and [legacy Turbo](https://realphonevalidation.com/api-documentation/turbo-api/)
- [Scrub Plus](https://realphonevalidation.com/api-documentation/scrub-plus-api-doc/) and [Scrub](https://realphonevalidation.com/api-documentation/scrub-api/)
- [Active](https://realphonevalidation.com/api-documentation/active-api/) and [Wireless ID](https://realphonevalidation.com/api-documentation/wireless-id-api-doc/)
- [DNC Lookup](https://realphonevalidation.com/api-documentation/dnc-lookup-api-doc/) and [DNC Plus](https://realphonevalidation.com/api-documentation/dnc-plus-api-doc/)
- [Fraud Check](https://realphonevalidation.com/api-documentation/fraud-check-api-doc/)
- [Reassigned Number](https://realphonevalidation.com/api-documentation/reassigned-number-api-doc/)
- [Legacy Email Verification](https://realphonevalidation.com/api-documentation/email-verification-api-doc/) and [REV Lightning](https://realphonevalidation.com/api-documentation/email-validation-api-doc/)
