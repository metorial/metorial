# Listclean API specification

Reviewed against the [official API reference](https://api.listclean.xyz/) and its [Swagger schema](https://api.listclean.xyz/v1/spec.json) on 2026-10-15.

## Authentication and responses

Base URL: `https://api.listclean.xyz/v1`. Authenticate with the `X-Auth-Token` header. JSON responses wrap payloads in `data` and carry numeric `success` (`1` for success, `0` for failure), a message, and sometimes `error_code`. A successful HTTP status alone does not prove success. The client handles both these envelopes and the existing tools' flat legacy payloads.

## Documented workflows

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `verify_email` | `GET /verify/email/{email}` | Returns email, status, and remarks. Status can be clean, dirty, unknown, or error. |
| `get_account` | `GET /account/profile/` and `GET /credits` | Profile and credit balance are separate resources. Profile ID and email are not documented; name is optional in the profile schema. |
| `verify_email_batch` | `POST /verify/email/batch` | Sends emails (maximum 3,000) and optional filename; returns the asynchronous job's list ID. |
| `list_verification_lists` | `GET /lists/` | Reads `data.lists`, total, and cursor. |
| `get_verification_list` | `GET /lists/{list_id}` | Returns the provider's array of matching list records. States include SUBMITTED, INPROCESS, and COMPLETED. |
| `download_list_results` | `GET /downloads/{list_id}/{type}` | Provides a downloadable CSV for clean, dirty, or unknown results using authenticated access. |

No pagination request parameter is documented for `/lists/`; no parameter is guessed. The new list tools expose documented identity, filename, size, upload reference, request time, and processing state. Financial analytics are outside these tools' compact result schema.

## Preserved legacy workflows

| Tool | Preserved request |
| --- | --- |
| `upload_bulk_list` | `POST /bulk/upload/` with the existing multipart file payload |
| `get_bulk_list_status` | `GET /bulk/list/{listId}/` |
| `list_bulk_lists` | `GET /bulk/lists/` |
| `download_bulk_results` | `GET /bulk/list/{listId}/download/` with existing all/ok/bad filter mapping |

These routes are not in the current public schema. Their retirement, aliases, and live response shapes have not been established, so they remain unchanged rather than being redirected or disabled. Their original output fields and raw CSV content contract remain. Missing metadata is no longer replaced by invented empty strings, zero counts, or processing states. The legacy CSV download additionally provides a downloadable file.

The published chunk-upload API uses `POST /uploads/`, `POST /uploads/{upload_id}`, and `GET /uploads/{upload_id}`. It does not establish the initial chunk sequence or that its `request_id` equals a list ID. No upload-to-list identifier mapping is assumed.

## Other API capabilities

The reference also documents single-verification logs, profile updates, list deletion, and JSON result downloads. They were not added because the refresh focuses on the core verification workflow. Email finding, mail delivery, and delivery webhooks are not documented in this API schema and are not advertised by this integration.
