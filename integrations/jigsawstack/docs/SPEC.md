# JigsawStack integration

## Authentication

Use an API key from the JigsawStack dashboard. Requests send `x-api-key` over HTTPS to `https://api.jigsawstack.com`. Secret keys support all APIs; public keys can restrict API access and require allowed domains. No OAuth refresh is needed.

## Capabilities

The integration provides website extraction, web search and suggestions, sentiment, translation, summaries, OCR, audio transcription, content checks, object detection, HTML conversion, image generation, SQL generation, time-series prediction, embedding vectors, geographic search, and stored-file retrieval and deletion.

`classify_content` calls `POST /v1/classification` with 1-32 same-type text or image samples and 2-24 custom labels. Label keys merge examples into a class, with at least two distinct classes required. Multiple labels and an optional task instruction are supported.

`generate_embedding_v2` calls `POST /v2/embedding`. It supports the existing content types, 32-4096 dimensions, text query instructions, overflow control, and audio speaker fingerprints. `generate_embedding` remains on `POST /v1/embedding` with its original contract.

`search_suggestions` calls `GET /v1/web/search/suggest` for queries of up to 200 characters. Geographic search retains its existing endpoint and optional suggestions; that geographic endpoint is absent from the current documentation index, so its provider behavior needs separate live verification.

## Payloads and results

Existing keys, types, optional fields, and enum values are preserved. Additions include source search URLs, word timestamps, segmentation masks, scrape features and screen presets, and PDF printing options. Existing numeric schemas remain numbers. Provider bounds and source exclusivity are checked at invocation time.

Provider responses are checked before mapping. Text search content stays in the existing string field; structured content, geographic results, related indices, and complete raw responses are available through added fields. Null GUI content maps to an omitted optional string, with its original value retained in the raw response. Null spelling or profanity terms are recovered from their offsets in the original input text, with the raw result retained.

File tools return downloadable results alongside the existing URL fields. Binary stored-file downloads use the authenticated stable GET endpoint. Legacy metadata responses use their actual returned file URL, with API-key authentication only for the provider API origin. File retrieval handles both documented legacy metadata and binary file responses; arbitrary or malformed stored JSON remains file data. Stable generated URLs are used directly for downloads. Signed URLs can expire and have no documented renewal API, so their file bytes are copied immediately for download; original URL values are preserved.

## Provider limitations

Image generation is explicitly documented as deprecated and unmaintained. Embedding v1, spell checking, and spam checking remain documented under the archive; their omission from the primary navigation is not evidence that the endpoints were removed. Existing keys are retained. The docs expose no suitable current-account identity endpoint. Upload, deep research, prompt engine, streaming transcription, webhooks, and triggers are not exposed by this package.

## Sources

- [Authentication](https://jigsawstack.com/docs/api-reference/authentication)
- [API index](https://jigsawstack.com/docs/llms.txt)
- [Classification](https://jigsawstack.com/docs/api-reference/classification/classification)
- [Embedding v2](https://jigsawstack.com/docs/api-reference/ai/embedding-v2)
- [Search suggestions](https://jigsawstack.com/docs/api-reference/web/search-suggestions)
- [Image generation](https://jigsawstack.com/docs/api-reference/ai/image-generation)
- [HTML conversion](https://jigsawstack.com/docs/api-reference/web/html-to-any)
- [Stored-file retrieval](https://jigsawstack.com/docs/api-reference/store/file/get)
