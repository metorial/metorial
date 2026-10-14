# Parsio.io Specification

## Authentication

API-key authentication uses the `X-API-Key` header with the key from
https://app.parsio.io/account. API base: `https://api.parsio.io`. Missing or malformed
keys fail locally; upstream HTTP failures surface structured service errors.

## Capabilities

- Mailboxes: list, inspect settings/table fields, create, update, and delete.
  Optional parser/model settings follow the provider's `preset`, `ml_model`,
  `has_raw_data`, `parse_sig`, and `receive_email` parameters.
- Documents: list/search one page, fetch extracted JSON, submit HTML/text
  asynchronously, synchronously parse HTML/text, reprocess, and skip in bulk.
  Existing `limit` maps to `per_page` (1–500), and the existing single `status`
  filter is serialized as a one-element query array. Dates use `YYYY-MM-DD`.
- Parsed data: retrieve a page of extracted records and collected email addresses.
- Templates: list a page, inspect, enable, disable, delete, and clone existing
  templates into another mailbox. Use list_templates on the target to discover
  cloned template IDs.
- Webhooks: list, inspect, create, and delete. Supported events are `doc.parsed`,
  `doc.parsed.flat`, `doc.fail`, `doc.received`, and `table.parsed`; the last requires
  a table ID from get_mailbox. Optional creation settings include name/enabled.

## Parsing behavior

`submit_document` remains asynchronous at `POST /mailboxes/<id>/doc`.
`parse_document_sync` uses `POST /mailboxes/<id>/doc-sync`. Both require non-empty
HTML or text; HTML takes precedence, and legacy subject input supplies the name
when a name is absent. These endpoints support template-based and GPT-powered
parsers. AI-powered parsers and OCR converters require file upload workflows.

The synchronous response provides doc_id, parsing_in_progress, status, metadata,
and extracted json. Nullable metadata is omitted from optional fields. When
parsing_in_progress is true, fetch the document later with get_document.

## Sources

- https://help.parsio.io/public-api/parsio-public-api
- https://help.parsio.io/public-api/parse-html-and-text-documents-using-api-1
- https://help.parsio.io/public-api/parse-pdf-and-files-using-api-1
- Public Postman collection linked from the API reference:
  https://help.parsio.io/file/90921d2e-8d34-431e-8072-d43f93114c0c

No account/self endpoint is documented. File upload, download/export, template
creation, and webhook callback processing are outside this package's tool coverage.
