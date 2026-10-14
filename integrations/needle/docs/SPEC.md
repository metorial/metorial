# Needle Integration

The integration targets Needle's document collection and retrieval-augmented generation API.

## Authentication

Use an API key from Needle Developer Settings. Requests send the key in the `x-api-key` header. The official SDK states that keys remain valid until revoked; no OAuth token refresh applies.

## Tools

| Tool | Request | Response |
| --- | --- | --- |
| `list_collections` | `GET /api/v1/collections` | Accessible collection IDs, names, creation times, and search query counts. |
| `get_collection` | Collection details and `/stats` | Collection details and statistics; maps API `files` and `bytes` to the existing `count` and `size` fields. |
| `get_collection_stats` | `GET /api/v1/collections/{id}/stats` | Indexing status, file counts, bytes, chunks, characters, and users. Unknown bytes are null. |
| `create_collection` | `POST /api/v1/collections` | Created collection ID, name, and creation time. Optional `fileIds` and `model` are supported. |
| `delete_collection` | `DELETE /api/v1/collections/{id}` | Confirmation after a successful response. |
| `search_collection` | `POST https://search.needle.app/api/v1/collections/{id}/search` | Ranked passage IDs, content, and source file IDs. |
| `list_collection_files` | `GET /api/v1/collections/{id}/files` | File metadata with optional offset and limit. |
| `add_files_to_collection` | `POST /api/v1/collections/{id}/files` | Per-file IDs, source URLs, indexing status, and errors. |
| `delete_files_from_collection` | `DELETE /api/v1/collections/{id}/files` | Confirmation after deletion; 1–100 file IDs. |
| `get_file_upload_url` | `GET /api/v1/files/upload_url` | Upload/reference URL pairs; each MIME type is sent as a repeated `content_type` parameter. |
| `get_file_download_url` | `GET /api/v1/files/{id}/download_url` | A downloadable file and the existing signed URL field. |
| `list_connectors` | `GET /api/v1/connectors` | Connector IDs, names, types, collection assignments, and available metadata. |
| `list_connector_files` | `GET /api/v1/connectors/{id}/files` | Source file IDs, URLs, types, ownership, sizes, hashes, and timestamps. |

File listing limits are 0–500 and offsets are non-negative whole numbers. Upload URLs expire quickly; upload immediately with a PUT and the requested Content-Type header, then use the reference URL to add the file. Download links are renewed when a downloadable file is requested again.

## Compatibility and evidence limits

Existing tool keys, field types, optionality, and output meanings remain unchanged. If Needle does not report a numeric byte size, `get_collection` cannot satisfy its existing numeric `size` output and directs the caller to `get_collection_stats`. The official generic connector SDK schema does not describe `collection_id`; `list_connectors` preserves that field when supplied and reports an actionable error when it is absent. This omission does not establish that the API removed the field.

Official RAG documentation has become inconsistently accessible and some pages redirect to Needle's outreach product. The official RAG SDK remains the source for collection, file, search, and connector payloads. The SDK and indexed reference do not establish current availability of the existing collection deletion endpoint or a RAG current-user endpoint. The deletion tool is retained for compatibility; no identity endpoint is invented.

## Official sources

- [Official TypeScript SDK](https://github.com/needle-ai/needle-typescript/tree/704a2d3506b38cab538e4a30380383393dad14fb/src/v1)
- [Collections reference](https://docs.needle-ai.com/docs/api-reference/collections/)
- [Upload URL reference](https://docs.needle-ai.com/docs/api-reference/get-upload-url/)
- [Official Python SDK](https://github.com/needle-ai/needle-python/tree/6fa1b745b8b1ac58f1c8166d883f7705ee39d7ce/needle/v1)
