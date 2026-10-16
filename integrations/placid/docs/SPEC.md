# Placid Integration Specification

The integration uses the project-specific Bearer token and REST API at `https://api.placid.app/api/rest`. Obtain the token from **Projects → Select Project → API Tokens**. No OAuth refresh is required.

| Tool | Operations |
| --- | --- |
| `generate_image` | Create an image with dynamic layers, optional synchronous rendering, output modifications, callbacks, and storage transfer. |
| `generate_pdf` | Render ordered template pages into a PDF. |
| `generate_video` | Render ordered clips with optional audio, frame rate, size, and background settings. |
| `merge_pdfs` | Merge 2–10 existing PDF URLs. |
| `get_generation_status` | Retrieve an image, PDF, or video job and download its completed file. |
| `delete_generation` | Permanently delete an image, PDF, or video by ID. |
| `upload_media` | Legacy submission of 1–5 source URLs to temporary media storage; URL acceptance is unverified against current binary-upload documentation. |
| `manage_templates` | List, retrieve, create, duplicate, update, and delete templates; filter by collection, title, or tag and follow the returned next-page URL. |
| `manage_collections` | List, retrieve, create, update, and delete collections; paginate using the returned cursor URL and replace, add, or remove template membership. |

Completed generation and merge responses include a downloadable file when the provider returns its URL. Queued jobs must be retrieved again with `get_generation_status`. Existing URL fields remain available for downstream requests. Templates and uploaded-media records expose preview or source URLs as metadata.

The legacy `upload_media` operation preserves provider-side URL submission and does not fetch the source files in the integration runtime. Current media documentation requires binary file uploads, so the provider may reject this operation. Source image URLs can instead be used directly in picture layers.

Use template discovery to obtain UUIDs and layer names. Unspecified layer properties retain the template defaults. Image format maps to `modifications.image_format`; PDF and video modifications follow their respective REST contracts. For duplication, `fromTemplate` selects the source template and the provider overrides the supplied title and dimensions.

Placid temporarily stores generated and uploaded files. Save important files to your own storage or request an S3-compatible transfer. The API does not document a file-URL renewal operation or an exact expiration timestamp. Completion callbacks are supplied per generation request; this integration does not expose global event subscriptions.

## Official API documentation

- [Authentication](https://placid.app/docs/2.0/rest/authentication)
- [Images](https://placid.app/docs/2.0/rest/images)
- [PDFs and PDF merge](https://placid.app/docs/2.0/rest/pdfs)
- [Videos](https://placid.app/docs/2.0/rest/videos)
- [Templates](https://placid.app/docs/2.0/rest/templates)
- [Template collections](https://placid.app/docs/2.0/rest/collections)
- [Media uploads](https://placid.app/docs/2.0/rest/media)
