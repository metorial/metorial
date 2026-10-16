# Ragic Integration

Manage records, file fields, exports, comments, and configured action buttons in a Ragic database. The account/database name comes from the URL you use to open Ragic; each sheet is selected by its folder path and numeric index.

## Authentication

- **API Key:** generate a key in Personal Settings > Profile. Requests use `Authorization: Basic <API key>` exactly as Ragic documents. Enter the server domain from the account URL when it differs from `www.ragic.com`.
- **Email & Password:** authenticate on that server through `GET /AUTH` with `login_type=sessionId` and `json=1`. Requests use the returned `sid` as a session query parameter. Sessions can expire; reconnect if Ragic rejects the session.
- The server domain is stored with the authentication connection. Older stored connections can still read their previous configured server domain. Password connections saved before session-mode persistence require reconnection.

## Tools

| Tool | Behavior |
| --- | --- |
| `list_records` | Read records with repeated field filters, full-text search, sorting, limit/offset, subtables, comments, and field name/ID options. The default page is 1000 records. |
| `get_record` | Read one record, including optional subtables, comments, and creation information. |
| `get_sheet_schema` | Read field IDs/types and subtable definitions. Ragic restricts this endpoint to account managers/administrators; hidden field definitions are included. |
| `create_record` / `update_record` | Write JSON field values by field ID, including multiple selections and subtable rows. Formula, default value, link/load, workflow, validation, notification, and lock options use provider parameters. Explicit `doWorkflow: false` skips workflow execution. |
| `delete_record` | Delete one record. |
| `upload_file` | Download an accessible HTTPS source file, then send it as multipart data to a file/image field. Supply recordId for an update or omit it for a new record. |
| `get_file_url` | Prepare a downloadable file/image and retain its provider URL and original file name. For authenticated file downloads, provide the owning folder, sheet index, and record ID together. |
| `export_record` | Prepare HTML, PDF, Excel, Mail Merge, or Custom Print exports. Mail Merge requires a template ID. Custom Print requires a template ID and supports pdf/png/docx. |
| `add_comment` | Add a text comment with a multipart request. |
| `lock_record` | Lock or unlock a record; update_record can enforce locks with checkLock. |
| `list_action_buttons` / `execute_action_button` | Discover configured action buttons and execute one against a record. |

Successful raw provider response objects are retained in existing response/field outputs. Creation IDs are omitted when Ragic omits them, rather than inventing an identifier. Export MIME type is omitted when the provider omits its Content-Type header. Provider error bodies, including HTTP-success error envelopes, produce actionable errors.

The API guide does not document a standalone profile/self endpoint for API-key connections. Login details require email/password authentication, so this integration does not advertise an identity operation available to all connections. There are no registered event triggers. Periodic URL imports, mass operations, approval workflows, and webhook administration are outside the current tool surface.

## Provider reference

Contracts were checked against the [official Ragic HTTP API guide](https://www.ragic.com/intl/en/doc-http-api), including authentication, record formats, filters, multipart uploads/comments, protected downloads, exports, schema metadata, and error responses. Record requests retain supported `v=3`; the guide identifies `version=2025-01-01` as its equivalent.
