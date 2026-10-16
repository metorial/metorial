# Veriphone Integration Reference

Veriphone validates phone numbers, retrieves numbering-plan and carrier information, generates example numbers, and processes CSV lists.

## Authentication

Connect with the API key from your Veriphone account. Requests use the documented `Authorization: Bearer` header. Connection settings remain an API key named `token` under the `api_key` auth method, with no additional configuration or OAuth scopes.

## Tools

| Tool | Provider route | Behavior |
| --- | --- | --- |
| `verify_phone` | `GET /v2/verify` | Preserve the existing validation and camel-case metadata contract. An invalid-number result is returned as a verdict rather than treated as an account error. |
| `generate_example_phone` | `GET /v2/example` | Preserve the existing example-number route and contract. The current REST reference omits this route; the official integration guide still lists the example-number capability. |
| `get_credits` | `GET /v3/credits` | Identify the account by email and return plan, active state, balances, and usage. |
| `get_current_coverage` | `GET /v3/coverage/current` | Return country coverage and its update timestamp. |
| `lookup_current_carrier` | `GET /v3/verify?mode=current` | Return the original and current carrier details, portability state, and available formatting and validity metadata. |
| `upload_bulk_file` | `POST /v3/file/upload` | Upload CSV content using multipart form data with zero-based phone-column and first-data-row indexes. |
| `start_bulk_verification` | `POST /v3/file/verify` | Start verification for an uploaded file, optionally selecting a country and lookup mode. |
| `list_bulk_files` | `GET /v3/file/list` | Return all non-deleted uploads, newest first. No pagination is documented. |
| `get_bulk_file` | `GET /v3/file/get` | Return upload metadata, or the provider's empty object for an inaccessible or missing file. |
| `get_bulk_status` | `GET /v3/file/status` | Return the processing state; the provider uses an empty status for an inaccessible or missing file. |
| `download_bulk_file` | `GET /v3/file/download` | Prepare an authenticated CSV download for an existing upload. Returns verified results if available and otherwise the original CSV. |
| `delete_bulk_file` | `POST /v3/file/delete` | Permanently delete an upload and its results. |

The two original tools retain v2 behavior. The provider explicitly supports existing v2 integrations; the new tools use the current v3 API. No tool is deprecated.

## Credit and data behavior

Static verification costs one credit for a successful verification. Current carrier resolution costs ten credits when resolved, or one when resolution is unavailable and static results are returned. Current lookup does not establish device reachability. Account and coverage checks do not spend verification credits.

For bulk work, upload first and inspect the returned samples before starting verification. CSV files must be non-empty, at most 100 MB, and no more than one million rows; the provider enforces CSV parsing and row limits. Column and first-row indexes must be non-negative whole numbers. Before starting, the account must cover the full file cost at the selected mode's full rate. Poll until `completed` before expecting verified results in a download.

Download preparation does not confirm subsequent retrieval. The provider download endpoint is accessed with the account's credentials while the upload exists; deleting the upload removes its original file and results.

No raw CSV content, credentials, or download authentication fields are returned in structured output. Metadata and current carrier responses retain additional provider fields without substituting missing facts.

## References

- [Current API reference](https://veriphone.io/docs/v3)
- [Supported v2 API reference](https://veriphone.io/docs/v2)
- [Bulk verification API](https://veriphone.io/docs/bulk)
- [Official integration guide and example-number capability](https://veriphone.io/docs/mcp)
