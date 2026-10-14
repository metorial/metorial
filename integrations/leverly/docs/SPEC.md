# Leverly integration

## Supported actions

- `create_call`: submit a phone number and optional lead details for an automated call sequence.
- `stop_reattempts`: submit a request to stop automated call reattempts for a lead's phone number.

Both actions retain the existing form-encoded POST to `https://app.leverly.com/main/ingestor/process`, with `AccountID` in the query string. Lead submissions retain `Phone1` plus the existing optional fields. Stop requests retain `Phone1` and `stopReattempts=1`.

## Connection

The existing connection captures username, API key, and account ID. The ingestion client currently sends only the account ID; the username and API key remain stored for compatibility. A public provider authentication reference was not available during this audit, so this behavior has not been changed speculatively. Confirm the required account-specific connection details with Leverly.

## Response and failure handling

Successful HTTP responses retain the raw provider response as a string. Non-string responses are JSON-serialized as before. HTTP failures are reported as service errors with the provider name and operation. Blank account IDs and phone numbers are rejected before a submission is sent. Success messages acknowledge submission rather than promise a completed call or cancellation.

## Official sources and limitations

Audited on October 14, 2026:

- [Leverly FAQ](https://www.leverly.com/faq/): describes Form-to-Phone, reattempts, and provider-managed setup and integration.
- [Leverly product](https://www.leverly.com/product/): describes the product's lead response capabilities.

These pages do not document API endpoints, payload field names, authentication, response schemas, or application-level success indicators. No public developer reference was found. Legacy integration-documentation URLs were inaccessible. The existing wire requests and public schemas were retained, but their provider acceptance remains unverified. No additional endpoint, current-account tool, or file action has been added without a documented API contract.
