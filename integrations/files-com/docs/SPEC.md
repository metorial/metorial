# Files.com integration scope

The integration exposes sixteen public tools: list_folder, get_file_info, manage_file, create_folder, list_users, manage_user, manage_group, manage_permission, manage_share_link, manage_automation, manage_notification, search_history, get_current_user, download_file, upload_file and get_file_operation. No triggers, remote-server management, API-key mutation, SSO administration or outbound webhook tools are registered.

API-key auth uses X-FilesAPI-Key and persists the selected Files.com origin. Discovery returns actual current-key/site/workspace context; site-wide keys may have no user owner. Historical configuration is a fallback only. No custom hostname or arbitrary URL is accepted as connection input.

Use native cursor headers and integer page sizes 1–10000. Folder search uses search rather than search_all. File metadata requests action=stat; copy/move returns native FileAction status and migration ID, not an invented completed file. History uses /history, /history/files/{path}, /history/folders/{path} or /history/users/{id}, with native when/source fields. Unsupported username or multiple-selector history requests receive remediation.

Downloads require native file size at most 10 MiB and use bounded content delivery because the documented signed download URI has no usable expiry contract. Uploads accept bounded UTF-8/Base64 content, open a native upload, request and PUT at most sixteen parts to provider-issued HTTPS targets without API-key forwarding, finalize and read metadata back. File contents, credentials, temporary upload references and signed URLs are not returned in structured output. No retry, rollback or idempotency guarantee is asserted for partial writes.

Legacy schemas remain protected; downloadUri is retained as an optional deprecated metadata field but is omitted by stat reads. Legacy require2fa=none maps to documented never_require, and grantPermission=none maps to documented blank. previewOnly is retained as an optional input but rejected with remediation because current Bundle create/update contracts do not document it as writable. Native preview_only remains a readable provider property. No unsupported enum retirement is invented.

Current contracts come from [official SDK model source](https://github.com/Files-com/files-sdk-javascript/tree/master/src/models) and [REST references](https://www.developers.files.com/rest/). Native security policies, feature plans, file transfer acceptance and file-delivery service behavior require live verification.
