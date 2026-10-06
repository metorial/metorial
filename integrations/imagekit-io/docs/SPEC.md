# ImageKit integration

Fourteen public tools retain the twelve existing keys and add `get_bulk_job_status` and `download_file`. Authentication uses a private API key as the HTTP Basic username with an empty password, against the current v1 API. Connection validation reads a single Media Library page. A validated connection fingerprint identifies key continuity; it is not a provider account or user ID. The API offers no suitable self/profile endpoint.

| Capability | Tools |
| --- | --- |
| Upload/search/detail/update/delete | `upload_file`, `list_files`, `get_file`, `update_file`, `delete_files` |
| Copy/move/rename; tags | `copy_move_file`, `manage_tags` |
| Custom field definitions; technical metadata | `manage_custom_metadata_fields`, `get_file_metadata` |
| Folders and async jobs | `manage_folders`, `get_bulk_job_status` |
| Version history and restore/delete | `manage_file_versions` |
| Purge requests and status | `purge_cache` |
| Original published-file or version download | `download_file` |

List results expose a page count and an optional next offset when the provider page is full; this does not guarantee another page or provide a total. Search can contain folder entries, which are omitted while preserving the provider’s page offset. ImageKit ignores tags/name parameters with `searchQuery`; combine filters inside the query instead. Standard native thumbnails use `thumbnail`, while uploads use `thumbnailUrl`.

Uploads use multipart v1 server-side authentication. Supported post-processing types are transformation, gif-to-video, thumbnail, and abs, with the documented value/protocol requirements. Queued pre-processing returns `status: queued` without fabricated file fields. Processing and extensions can consume credits. Update publish options retain `publish.isPublished` and `publish.includeFileVersions`.

Bulk deletion and tag operations use native success arrays and preserve partial/unconfirmed outcomes. File rename can succeed while its requested purge fails. Folder copy sends `includeVersions`; file copy sends `includeFileVersions`. Folder jobs retain native Pending, Completed, and Partial success statuses, bound to the requested job ID. No automatic write retry or chained resource creation is performed.

Version identities come from `versionInfo.id`. A historical version’s asset `fileId` may differ from its parent’s current file ID. Restore/delete apply only to noncurrent versions. Downloads resolve the exact parent and requested version, preserve the native object-version query, use `orig-true` to disable automatic optimization, and sign the encoded endpoint-relative URL using the documented HMAC-SHA1 algorithm. Links expire after five minutes and can be renewed only for the same connection, asset identity, path, version, and endpoint. The optional custom CDN endpoint must exactly match the provider URL; unpublished assets are unavailable through CDN delivery.

Deletes leave audit history and may leave cached copies. Deleted custom field names cannot be reused; reserved fields cannot be deleted, and schema types cannot be changed. Copy/move into existing destinations can append versions, so controlled tests reject occupied destinations. The private suite is active, with independent native readbacks and original-byte checks; writes require explicit authorization for controlled media, delivery bandwidth, and retained history. No authenticated provider operation was performed during this refresh. Paid cache purges, global metadata field writes, and AI processing remain live-unverified.

Official sources:

- [Current OpenAPI](https://github.com/imagekit-developer/openapi/blob/main/openapi.yml)
- [API keys](https://imagekit.io/docs/api-keys)
- [List and search](https://imagekit.io/docs/api-reference/digital-asset-management-dam/list-and-search-assets)
- [Original delivery and download links](https://imagekit.io/docs/core-delivery-features)
- [URL signing](https://imagekit.io/docs/media-delivery-basic-security)
- [Official signing implementation](https://github.com/imagekit-developer/imagekit-nodejs/blob/main/src/resources/helper.ts)
- [Asset versioning](https://imagekit.io/docs/dam/asset-versioning)
- [Manage files and folders](https://imagekit.io/docs/dam/manage-assets)
- [Metadata fields](https://imagekit.io/docs/dam/custom-metadata)

Current-file download links use ImageKit’s native current URL and can follow a later overwrite during their five-minute validity. Exact historical downloads require a native `ik-obj-version` selector; version IDs are not substituted for this opaque selector. Renewal rechecks the original version, asset ID, path, connection, and endpoint, and refuses changed bindings.

Renewal also preserves the exact opaque CDN selector. A changed current version requires a new download; an unpinned historical URL cannot substitute for it. Previously prepared downloads without this proof must be requested again.

Controlled cleanup checks the complete bounded native version inventory and independently verifies every known version’s original bytes and associated state. Missing privacy or publish proof, extra history, changed metadata, or unavailable historical selectors block destructive cleanup. Native omissions and concurrent changes remain reasons to inspect retained state; deletion does not imply erasing caches or audit history.
