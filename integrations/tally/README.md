# Tally

Manage Tally forms, submissions and workspaces, inspect your authenticated user, and download an available submission PDF. This integration uses the REST API at `https://api.tally.so` with the documented `tally-version: 2026-08-04` header.

| Capability | Tools |
| --- | --- |
| Forms | `list_forms`, `get_form`, `create_form`, `update_form`, `delete_form` |
| Questions and submissions | `list_questions`, `list_submissions`, `get_submission`, `delete_submission` |
| Identity and workspaces | `get_user`, `list_workspaces`, `get_workspace`, `create_workspace`, `delete_workspace` |
| Files | `download_submission_pdf` |

API keys inherit the user's permissions. New OAuth connections use Tally's published authorization-server metadata, S256 PKCE and the `user`, `forms` and `responses` permissions. Existing unmarked OAuth connections keep their original issuer and token encoding; their continued server acceptance requires live verification. Reconnect to establish a connection using the current issuer. Workspace creation requires the applicable Pro subscription.

Lists return one numbered page; inspect `hasMore` before claiming completeness. Form listing accepts one legacy `workspaceId` or multiple distinct `workspaceIds`. Submission filters support all, completed and partial responses; an unanswered partial submission has no inferred respondent identity. Dates require valid ISO date-times with a timezone.

Form block updates replace the complete block array; first read the current form and preserve every block you want to keep. Supplied settings merge with the independently read current settings. This preserves omitted values but cannot make concurrent updates atomic. Form deletion moves a form and its submissions to trash; workspace deletion moves the workspace and its forms to trash. Submission deletion permanently removes the exact submission and responses.

The PDF tool reads the exact submission and uses its native signed PDF URL. That URL grants access to the document; no API key is forwarded to the download. No URL expiry or renewal is invented. Availability and deployed download behavior require provider verification.

[API reference](https://developers.tally.so/api-reference/introduction), [versioning](https://developers.tally.so/api-reference/versioning), [authorization-server metadata](https://api.tally.so/.well-known/oauth-authorization-server).
