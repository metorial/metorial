# CodeREADr Integration

CodeREADr provides barcode scanning workflows, validation databases, app users, and collected scan records. This integration exposes 29 tools through the documented API.

## Authentication and API

An API key from account settings is sent as `api_key` in a form-encoded POST body. The normal endpoint is `https://api.codereadr.com/api/`; barcode images use `https://barcode.codereadr.com/api/`. Requests select an operation using `section` and `action`. Normal operations return XML with a success status or provider error code and text. The deprecated `generate_barcode` tool preserves its original API-key GET URL behavior for compatibility; current provider documentation disables GET by default. API keys have no documented refresh flow. No account-owner profile or self-identity endpoint is documented; app users are distinct from the account authenticated by the API key.

## Capabilities

- Services: retrieve, create, update, delete, authorize or revoke app users, attach or remove questions, and configure documented postback forwarding options. On question association, required=true sends the selected question IDs; required=false or omitted sends no mandatory-ID list. When selecting all questions with required=true, authorized question IDs are retrieved and sent explicitly. Service updates accept optional comma-separated symbologies. Omission resets symbologies to the provider default even when only updating another setting; provide the current selection from service settings to retain custom formats. The retrieval documentation does not specify a current-selection response field, so no automatic preservation is attempted.
- App users: retrieve, create, update, delete, and configure device allowances. Email usernames receive invitations; other usernames require a password.
- Validation databases: retrieve, create, rename, delete, clear, search values, and add, upsert, edit, or delete values. Bulk upsert supports at most 100 values and preserves explicitly empty response text. Values support up to 500 characters.
- Scans: retrieve with filters and limit/offset pagination, retain names plus available relationship IDs, include properties when requested, and delete selected records. Scan upload discovery supplies IDs for filtering scan retrieval.
- Questions: retrieve, create, edit text and external identifiers, delete, and add or remove answer options. Question type is fixed at creation.
- Devices: retrieve and rename registered devices.
- API limits: retrieve each tracked metric's allowance and remaining requests; -1 means unlimited.
- Barcode images: `generate_barcode_file` POSTs generation parameters, validates the returned image format or XML error, and provides a downloadable PNG, JPEG, or GIF with filename and MIME metadata. The deprecated `generate_barcode` tool retains its original input/output schema and handler, including a credential-bearing `barcodeUrl`; it has not been secured or made compatible with the current GET restriction. Branded image settings may require a paid plan.

List endpoints return the provider's list without an invented pagination envelope. Scan and database-value searches expose the provider's limit/offset inputs; an offset requires an explicit limit. Provider field spellings remain available in existing extensible outputs alongside the advertised camel-case aliases. No CSV database upload, scan-property mutation, kiosk configuration, scan-validation endpoint, or trigger lifecycle is exposed by this package.

## Official references

- [Overview](https://developer.codereadr.com/1.0/api/overview/)
- [Services](https://developer.codereadr.com/1.0/api/services/)
- [Users](https://developer.codereadr.com/1.0/api/users/)
- [Databases](https://developer.codereadr.com/1.0/api/databases/)
- [Scans](https://developer.codereadr.com/1.0/api/scans/)
- [Questions](https://developer.codereadr.com/1.0/api/questions/)
- [Devices](https://developer.codereadr.com/1.0/api/devices/)
- [Barcode generator](https://developer.codereadr.com/1.0/api/barcode-generator/)
- [Limits](https://developer.codereadr.com/1.0/api/limits/)
- [Scan uploads](https://developer.codereadr.com/1.0/api/uploads/)
- [Scan properties](https://developer.codereadr.com/1.0/api/scan-properties/)
- [Errors](https://developer.codereadr.com/1.0/reference/error-codes/)
