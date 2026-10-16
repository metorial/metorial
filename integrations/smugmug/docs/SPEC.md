# SmugMug integration specification

## Authentication and account discovery

[SmugMug OAuth 1.0a](https://api.smugmug.com/api/v2/doc/tutorial/authorization.html) uses HMAC-SHA1-signed requests. Request tokens, authorization, and access-token exchange use the documented `https://api.smugmug.com/services/oauth/1.0a/` endpoints. Request tokens last five minutes and are single-use; access tokens last until revoked. No OAuth refresh endpoint is documented or needed.

The original `oauth1` connection requests `Modify`, and separate `oauth1_read` and `oauth1_add` methods request `Read` and `Add`. All use `Access=Full` so private resources are accessible when the account grants access. The `api_keys` method accepts an existing consumer key/secret and access token/secret. No account IDs or credentials belong in connection configuration. Omitting `nickname` from `get_user` calls the real [`/api/v2!authuser`](https://api.smugmug.com/api/v2/doc/reference/user.html) identity endpoint.

## Tools

The integration registers 22 tools:

- Account: `get_user`, `update_profile_biography`.
- Albums: `create_album`, `update_album`, `delete_album`, `get_album`, `list_album_images`, `get_album_share_uris`.
- Images: `get_image`, `update_image`, `delete_image`, `upload_image_from_url`, `move_or_collect_images`, `export_image_metadata`.
- Organization: `get_node`, `create_node`, `update_node`, `delete_node`, `browse_folder`.
- Discovery: `search`, `get_comments`, `get_watermarks`.

Album and node operations use the provider's [album](https://api.smugmug.com/api/v2/doc/reference/album.html) and [node](https://api.smugmug.com/api/v2/doc/reference/node.html) resources. Folder paths use each folder's URL-name segments. `browse_folder` returns folder details and its node ID; use `get_node` with `includeChildren` to browse a page of descendants. Existing folder APIs are retained for [legacy-account compatibility](https://api.smugmug.com/api/v2/doc/reference/folder.html).

List and search inputs retain their existing number schemas. Positive integral `start` and `count` values are checked at runtime. Pagination reads the provider's actual `Pages.Total`, `Pages.Start`, and `Pages.Count`; see [paging](https://api.smugmug.com/api/v2/doc/tutorial/paging.html). Watermarks are fetched across pages.

Biography updates modify only the documented writable `BioText` field in the authenticated user's [profile](https://api.smugmug.com/api/v2/doc/reference/user-profile.html).

## Files

[Uploader API](https://api.smugmug.com/api/v2/doc/reference/upload.html) requests POST binary media to `https://upload.smugmug.com/`, with OAuth in the Authorization header and the required album URI, response-type, and version headers. The source URL must be directly accessible over HTTP(S), without redirects or embedded credentials. Upload success requires `stat=ok` and actual image response data.

`get_image` retains its existing metadata, size-details, archive URL, and scalar output contracts. [Image documentation](https://api.smugmug.com/api/v2/doc/reference/image.html) says private media downloads may require OAuth. Provider-scoped download URL signatures are preserved. Returned size details do not prove that a later client can access private media.

`export_image_metadata` retrieves actual image data and original-file metadata, creates a JSON file, and prepares it for download. `status=prepared` means that file preparation was registered; subsequent upload or download success is not established by this status. It does not download image/video bytes. No media URL expiry or renewal interval is invented.

## Limitations

No triggers are registered. The static documentation does not establish a webhook subscription contract. This refresh does not claim complete coverage of site settings, featured albums, watermark editing, comment writes, or private media downloading. No live account, OAuth consent, media upload/download, or deployed file-delivery verification was performed.
