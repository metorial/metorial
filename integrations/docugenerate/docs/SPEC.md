# DocuGenerate integration

DocuGenerate creates documents by merging reusable templates with JSON data.

## Authentication and regions

The API key from Settings → Developers is sent unchanged in the `Authorization` header, without a Bearer prefix. The regional configuration selects the US, EU, UK, or AU API endpoint. There is no OAuth flow. The current public API has no profile or account identity endpoint.

## Tools

- `create_template` uploads a publicly accessible DOCX, DOC, ODT, RTF, TXT, or SQL file and returns its ID and detected tags.
- `list_templates` and `get_template` expose template metadata and merge tags. Structured list/table tags are represented as JSON strings to preserve the string-array output contract.
- `update_template` supports metadata, delimiters, folder paths, storage region, and optional source-file replacement. Updates use multipart form data. Folder paths repeat the `folder` field; an empty array removes the folder assignment.
- `delete_template` removes a template.
- `generate_document` merges a nonempty JSON array and returns document metadata plus downloadable output. Multiple rows combine into one file by default; `singleFile: false` produces a ZIP archive. `outputName` controls filenames separately from the document’s logical `name`.
- `list_documents`, `get_document`, `update_document`, and `delete_document` manage stored generated documents.
- `download_document` downloads an existing generated file.
- `download_template` downloads its source, PDF preview, or PNG thumbnail.

PDF attachments and merging require an explicit PDF/PDF-A output format. Output quality must be a whole number from 1 to 100. Provider timestamps are milliseconds since the Unix epoch. Existing metadata URL fields remain available.

Template version history depends on the account plan; the API cannot list, restore, or delete historical versions. Spreadsheet generation and binary response mode are not exposed. Provider download URLs have no documented expiration interval; no lifetime is assumed.

## Official references

- [Current API reference](https://api.docugenerate.com/) and [embedded OpenAPI schema, version 1.9.1](https://api.docugenerate.com/swagger-ui-init.js)
- [Multipart uploads and folder serialization](https://www.docugenerate.com/help/articles/generate-pdfs-from-word-templates-in-go/)
- [Regional endpoints](https://www.docugenerate.com/help/articles/can-i-use-regional-api-endpoints/)
- [Template version history limitations](https://www.docugenerate.com/blog/introducing-template-version-history/)
