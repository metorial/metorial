# Sanity

Query and mutate Content Lake documents, read exact current or historical content, discover projects/datasets, manage dataset and document-webhook lifecycles, upload assets, and download original dataset files.

Connect with a personal or robot API token. Personal tokens can read `/users/me`; robot tokens do not expose user identity. Where the user-profile endpoint is unavailable, connection profile setup requires successful native project discovery and reports only verified project access. Token permissions and expiry are managed in Sanity; there is no token refresh flow here.

Call `list_projects`, then `manage_datasets` with `action: list`, and pass the selected `projectId` and `dataset` to content tools. Existing stored project/dataset settings remain valid fallbacks. API behavior remains pinned to `2024-01-01` by default; set `apiVersion` explicitly to opt into other documented date-version behavior. The query perspective default changes to published at `2025-02-19`; `previewDrafts` remains the supported legacy alias for `drafts`, which requires `useCdn: false`.

## Tools

- `list_projects`: native project discovery or exact project read.
- `manage_datasets`: list, exact discovery-row read, create, or confirmed permanent deletion.
- `query_documents`: parameterized GROQ with native result shape; use explicit ordering, slices, or `_id` cursor filters to bound reads. No total or completion marker is inferred.
- `get_document`: exact current IDs or one revision/time/last-revision selector, preserving native omission metadata. Permission omission is not proof of deletion.
- `mutate_documents`: one operation per mutation in a native transaction, revision guards, explicit sync/async/deferred visibility, and dry-run validation. `createIfNotExists` may leave existing content unchanged; `createOrReplace` is full replacement.
- `manage_webhooks`: list, exact read, create with native readback, or confirmed deletion. Secrets and custom header values are omitted from results.
- `upload_asset`: canonical base64 up to 32 MiB decoded bytes. `assetId` retains its native content-hash meaning; `documentId` and `_id` identify the asset document used for references and deletion.
- `download_asset`: exact original dataset asset via its native `cdn.sanity.io` URL. No transformations, Media Library signed/container URLs, custom CDN domains, or invented URL renewal.
- `get_current_user`: actual personal user identity; unsupported for robot tokens.

Document and dataset deletion can leave history, backups, CDN caches, webhook deliveries, notifications, and external automation records. Asset uploads are content-deduplicated: a returned asset is not automatically newly owned. There are no blind write retries or guarantees that deletion clears CDN content. Ambiguous multi-step receipts advise exact readback before retrying.

GraphQL deployment, vector indexes, account/role administration, dataset export/import, and triggers are outside this tool set.
