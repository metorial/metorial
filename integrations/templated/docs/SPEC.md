# Templated integration

Templated generates images, videos, and PDFs from reusable designs. All tools use the connected API key as a Bearer token against `https://api.templated.io/v1`. `get_account` reads the actual connected account identity, usage, and plan; no OAuth or resource IDs are needed during connection setup.

## Render workflows

- `create_render` preserves provider metadata and URLs for single, multi-page, and batch results. It supports JPG, PNG, WebP, PDF, and MP4, plus an optional ZIP bundle. `zip` and `merge` cannot both be enabled.
- With `async: true`, the provider accepts the render request for processing. Inspect the returned render ID with `get_render`, or receive completion through `webhookUrl`. Asynchronous ZIP requests require a webhook URL. Avoid repeating creation while a render is processing.
- `get_render` retrieves an existing result without generating another render. `duplicate_render` creates a new render from the original template and payload and consumes API quota.
- `merge_renders` combines render IDs, then optional external PDF URLs, in their supplied order. Each merge consumes one credit. The default response is binary PDF content; `hosted: true` instead returns the provider's hosted URL. The optional `name` controls the resulting filename. The direct response status and headers are retained before its body is read as a bounded stream. PDF content must remain within 50 MiB and include its header and end marker before preparing a downloadable result. Oversized, interrupted, or invalid bodies return the observed HTTP status and known metadata with an explicit preparation warning; completion is unconfirmed when the full PDF was not validated. The merge is never repeated to recover a file.
- Provider-hosted render URLs are prepared as downloadable files on documented Templated origins. Custom storage URLs remain available in the provider metadata but are not fetched. Query-bearing provider URLs are retrieved once without following redirects, with MIME and 50 MiB size checks; the integration never creates a second render to renew a file URL. A prepared file does not establish that a later transfer completed.

## Templates and discovery

`list_templates`, `browse_gallery`, and `get_template` discover designs and editable layers. `list_template_pages` returns actual page IDs and their layer dictionaries, including locked layers when requested. Use those identifiers in per-page render modifications. The layer values in `create_render` are forwarded as supplied; when pages are supplied, Templated ignores top-level layers.

Templates can be created, updated, deleted, duplicated, or cloned. Duplicate names use the documented `name` query parameter. Clones retain their source-template relationship and are only visible through the API. `create_template_from_render` creates an editable clone with a saved render payload applied and does not consume render credits. Older renders without saved payloads produce a plain source clone; for multi-page payloads any page render ID recreates all referenced pages. Render-only options are not persisted in that template.

`update_template` supports partial layers/pages, descriptions, external IDs, print-safe margin guides, and tag additions/removals. Replacing layers removes unspecified layers; page `hide: true` in a template update permanently removes that page. Top-level dimensions apply to every page and cannot be used on templates with differing page sizes; specify dimensions inside pages instead.

## Organization and assets

`manage_folder` creates, renames, deletes, and moves templates/renders into folders. Deleting folders preserves their contents. `list_folders` optionally returns a folder's templates or renders. Upload and font tools list or delete existing assets; image/font upload operations and inbound webhook subscriptions are not exposed.

Pagination remains provider-controlled: template, gallery, and folder lists accept zero-based `page` and `limit` (default 25); uploads default to 15 per page. Account render and font lists have no documented pagination inputs. Omitted values are not replaced by local defaults. Structured metadata tools retain the complete provider response in optional `raw` alongside their original summary fields.

## Official references

- [Authentication](https://templated.io/docs/authentication/) and [account identity](https://templated.io/docs/account/)
- [Create renders](https://templated.io/docs/renders/create/), [retrieve](https://templated.io/docs/renders/retrieve/), [list](https://templated.io/docs/renders/list/), [delete](https://templated.io/docs/renders/delete/), [duplicate](https://templated.io/docs/renders/duplicate/), and [merge](https://templated.io/docs/renders/merge/)
- [Template creation](https://templated.io/docs/templates/create/), [update](https://templated.io/docs/templates/update/), [list](https://templated.io/docs/templates/list/), [gallery](https://templated.io/docs/templates/gallery/), [layers](https://templated.io/docs/templates/layers/), [pages](https://templated.io/docs/templates/pages/), [duplicate](https://templated.io/docs/templates/duplicate/), [clone](https://templated.io/docs/templates/clone/), and [create from render](https://templated.io/docs/templates/create-from-render/)
- [Folder lists](https://templated.io/docs/folders/list/), [templates](https://templated.io/docs/folders/templates/), and [renders](https://templated.io/docs/folders/renders/)
- [Upload lists](https://templated.io/docs/uploads/list/) and [deletion](https://templated.io/docs/uploads/delete/); [font lists](https://templated.io/docs/fonts/list/) and [deletion](https://templated.io/docs/fonts/delete/)
- [Render persistence after cancellation](https://help.templated.io/en/article/cancel-pause-or-refund-eujgha/)
