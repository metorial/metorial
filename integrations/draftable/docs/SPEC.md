# Draftable API capabilities

Draftable compares two documents and exposes comparison metadata, an interactive viewer, structured change details, and PDF exports. The integration supports cloud, regional, and self-hosted API base URLs.

## Authentication and configuration

The API Token connection stores the Account ID and Auth Token from the [credentials page](https://api.draftable.com/account/credentials). API requests use `Authorization: Token {token}`. The Account ID and Auth Token also sign private viewer links. Token authentication has no OAuth scope or refresh-token flow.

The optional `baseUrl` setting defaults to `https://api.draftable.com/v1`; self-hosted deployments may use a base such as `https://draftable.example.com/api/v1`. It should include the deployment's API version path. The official API reference and client expose no current-account/profile endpoint.

## Tools

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `create_comparison` | `POST /comparisons` | Compare two publicly accessible document URLs. |
| `create_comparison_from_files` | `POST /comparisons` | Upload both files as multipart document bytes supplied in base64 form. |
| `get_comparison` | `GET /comparisons/{identifier}` | Retrieve metadata and asynchronous processing state. |
| `list_comparisons` | `GET /comparisons` | Retrieve one page using integer limit/offset. The provider caps pages at 300 comparisons and returns the total count. |
| `delete_comparison` | `DELETE /comparisons/{identifier}` | Permanently delete a comparison. |
| `get_viewer_url` | Local generation of the documented viewer URL | Generate a public link or an HMAC-SHA256 signed private link using an integer Unix expiry timestamp. The default duration is 30 minutes. |
| `get_change_details` | `GET /comparisons/{identifier}/change-details` | Retrieve changes, optional summary, and the complete original JSON object. |
| `export_comparison` | `POST /exports` | Request an asynchronous PDF export. |
| `get_export_status` | `GET /exports/{identifier}` | Poll export state and obtain a downloadable PDF when ready. |

Comparisons are immutable; the official API has no comparison update operation. Optional comparison expiry is a future UTC ISO 8601 timestamp. A private comparison is the default; setting `isPublic` grants access to anyone with its viewer link.

The hosted API schema lists PDF, Word, PowerPoint, RTF, text, and Markdown input types. Product documentation additionally advertises Excel. The existing Excel, CSV, and ODT input values are retained for deployment compatibility; support must be confirmed with the target deployment.

PDF export kinds are `single_page` (right document with change highlights and deletion markers), `combined` (both documents), `left` (left document), and `right` (right document). `includeCoverPage` applies to `combined`; the API schema documents a default of true, while the Python client's default is false. The integration sends the option only when explicitly provided and otherwise preserves the API default.

The comparison and export APIs omit some state-specific fields. Missing optional values remain absent; explicit null values remain null. Missing required identifiers, sides, status booleans, timestamps, or list totals produce a provider-response error rather than invented values.

Ready exports produce a downloadable PDF and retain the existing download URL metadata. Signed export URLs are resolved again on subsequent downloads because the provider documents no fixed URL lifetime.

No webhook registration or event subscription endpoint is documented in the API reference or official client; comparison and export completion use polling.

## Official references

- [API explorer and schema](https://api.draftable.com/api-explorer)
- [OpenAPI source](https://api.draftable.com/api-explorer/spec)
- [Official Python client](https://github.com/draftable/compare-api-python-client)
- [Viewer reference](https://api.draftable.com/reference/comparison-viewer)
- [Export reference](https://api.draftable.com/reference/exporting-comparisons)
