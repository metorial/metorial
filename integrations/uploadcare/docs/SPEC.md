# Uploadcare integration

Manage project files through the [REST API](https://uploadcare.com/docs/api/rest/) and upload public source URLs through the [Upload API](https://uploadcare.com/docs/api/upload/).

## Authentication and configuration

Connect with the project public and secret API keys. REST requests retain the supported `Uploadcare.Simple` authorization scheme and the `application/vnd.uploadcare-v0.7+json` version header. The provider recommends signature-based REST authorization for production clients. Upload API requests to `/from_url/` and `/group/` use endpoint-scoped HS256 tokens signed with the SHA-256 digest of the secret key, as documented in [Upload API authentication](https://uploadcare.com/docs/api/upload/authentication/). The project secret key and generated upload authorization tokens are not returned by tools.

`cdnBaseUrl` remains an image URL construction setting, with the established default `https://ucarecdn.com`. Set it to your actual project CDN domain when needed. It is independent of the fixed REST and Upload API origins.

## Available tools

- Files: `list_files`, `search_files`, `get_file`, `download_file`, `store_file`, `delete_file`, `copy_file`.
- Metadata and tags: `manage_metadata`, `get_file_tags`, `replace_file_tags`, `update_file_tags`.
- URL uploads: `upload_from_url`, `get_url_upload_status`.
- Groups: `list_groups`, `get_group`, `create_group`, `store_group`, `delete_group`.
- Document and video processing: `convert_document`, `get_document_conversion_status`, `encode_video`, `get_video_encoding_status`.
- Add-ons: `execute_addon`, `get_addon_status`.
- Project identity and webhooks: `get_project`, `list_webhooks`, `create_webhook`, `update_webhook`, `delete_webhook`.
- Image delivery: `build_cdn_url`.

## Behavior and limits

URL uploads keep the provider-side URL-fetching workflow. A new upload returns a task token; poll `get_url_upload_status` until the provider reports completion or failure. Duplicate prevention can instead return an already uploaded file, so that result has no task token and reports the provider response type `file`.

`download_file` prepares the public original CDN URL returned by the file-information endpoint. Files must be ready and not removed. Public URLs have no documented signed-URL expiry; access still depends on file retention and project delivery policy. This tool does not create secure delivery tokens.

File search supports full-text queries of at least four characters, optional image filtering and typo tolerance, and offset pagination. Each page accepts up to 100 files and offset plus page size cannot exceed 1000. New files may take time to appear in search. The broader structured search API remains available outside this tool.

Tag updates return the actual normalized tags and actual additions/deletions. Replacement with an empty list clears the tags. Atomic updates apply deletions before additions. Uploadcare permits at most 50 tags per file.

Groups are immutable. Deleting a group preserves its member files. `get_group.rawFiles` retains the provider file list, including null slots for deleted files; the legacy `files` summaries contain available file details only. The original provider `filesCount` remains unchanged.

Document conversion and video encoding start asynchronous jobs; their status tools report progress and result UUIDs. Use `download_file` after the resulting file becomes available. Existing conversion storage defaults are preserved. Paid add-ons and conversion operations require the corresponding project capabilities.

This integration does not expose direct binary or multipart uploads, secure-delivery URL signing, trigger subscriptions, account administration, or automatic polling.
