# Typless integration specification

Typless extracts structured data from configured document types and learns from verified examples. Authentication uses `Authorization: Token <API key>`, with the key stored on the connection. No additional configuration is required.

## Current JSON API workflow

The base URL is `https://developers.typless.com/api/`. These operations follow the current official OpenAPI reference:

| Tool | Endpoint | Purpose |
| --- | --- | --- |
| `extract_document_async` | `POST /v1/extract-data-async` | Send base64 file content, file name, document type, optional customer, and optional text block parsing. |
| `get_extraction_data` | `GET /v1/get-extraction-data` | Retrieve status and the provider's original result and error objects by `extraction_id`, optionally including text blocks. |
| `list_pending_extractions` | `GET /v1/awaiting-poll` | Discover completed extraction IDs, optionally filtered by the same customer identifier used at submission. |
| `add_training_document` | `POST /v1/add-document` | Add an original file with verified metadata, line item, and VAT rate value blocks to a dataset. |

Only poll again for `IN_PROGRESS`. `SUCCESS`, `ERROR`, and `EXPIRED` are terminal states. The guide documents result expiry 48 hours after processing completes. The reference schema omits `EXPIRED` from its enum, so status is preserved as a string rather than narrowed to an incomplete list. Pending result/error objects can be empty or null; returned values are preserved. A provider-supplied adjusted document URL is offered for download without assuming a URL expiry or regenerating the extraction.

Dataset value blocks use optional `value`, `x`, `y`, `width`, `height`, and `page_number`; value may be null. Positional values must be whole numbers. The provider supplies its defaults when optional values are omitted.

## Legacy compatibility

The following tools retain their existing route and request formats:

| Tool | Endpoint |
| --- | --- |
| `extract_document` | `POST /document-types/extract-data/` (multipart) |
| `add_document_feedback` | `POST /document-types/learn/` (multipart) |
| `start_training` | `POST /start-training/` with `document_type_name` query |
| `list_document_types` | `GET /document-types/` |
| `manage_user_profile` | `GET` or `PATCH /user-profile/` |
| `get_extraction_result` | `GET /receive-result/{extractionId}/` |
| `get_current_user` | `GET /user-profile/` (read only) |

The current OpenAPI files do not specify these legacy routes. Their continued runtime support, complete profile fields, and document type counts require provider verification. They are not automatically redirected to a different API. Missing names, counts, IDs, and statuses are not replaced with invented values; an incompatible legacy response produces a service error.

For legacy synchronous extraction, the provider's exact-route tutorial explicitly allows a null recognized value. The normalized `value` remains a string when known and is omitted when null; the added `raw` response preserves the original null. Confidence strings are converted to numbers for the established numeric output. Existing line item values are preserved unchanged.

## Sources

- [Authorization](https://typless.gitbook.io/typlessapi/authorization)
- [API schema and linked OpenAPI files](https://typless.gitbook.io/typlessapi/api-docs/api-schema)
- [Asynchronous processing and queue retrieval](https://typless.gitbook.io/typlessapi/typless/data-extraction/asynchronous-extraction)
- [Dataset building](https://typless.gitbook.io/typlessapi/typless/training/building-a-dataset)
- [Data extraction](https://typless.gitbook.io/typlessapi/typless/data-extraction)
- [Legacy exact-route extraction and feedback tutorial](https://typless.com/blog/start-with-typless-invoice-ocr/)
